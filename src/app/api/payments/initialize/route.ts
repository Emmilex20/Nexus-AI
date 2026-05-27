import type { Plan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreditPackage, planLimits } from "@/config/billing";
import { requireActiveUser } from "@/lib/current-user";
import { initializePaystackTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

const initializePaymentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PLAN"),
    plan: z.enum(["PRO", "BUILDER", "TEAM"]),
  }),
  z.object({
    type: z.literal("CREDITS"),
    packageId: z.enum(["starter", "growth", "power"]),
  }),
]);

function createReference(userId: string) {
  return `nexus_${userId}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function POST(req: Request) {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = initializePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payment request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not set" },
      { status: 500 }
    );
  }

  let amountKobo = 0;
  let credits = 0;
  let plan: Plan | undefined;
  let packageId: string | undefined;
  let description = "";

  if (parsed.data.type === "PLAN") {
    plan = parsed.data.plan;
    amountKobo = planLimits[plan].amountKobo;
    credits = planLimits[plan].monthlyCredits;
    description = `${planLimits[plan].name} plan`;
  }

  if (parsed.data.type === "CREDITS") {
    const selectedPackage = getCreditPackage(parsed.data.packageId);

    if (!selectedPackage) {
      return NextResponse.json(
        { error: "Credit package not found" },
        { status: 404 }
      );
    }

    packageId = selectedPackage.id;
    amountKobo = selectedPackage.amountKobo;
    credits = selectedPackage.credits;
    description = selectedPackage.name;
  }

  if (amountKobo <= 0) {
    return NextResponse.json(
      { error: "Invalid payment amount" },
      { status: 400 }
    );
  }

  const reference = createReference(user.id);

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      reference,
      type: parsed.data.type,
      plan,
      packageId,
      amountKobo,
      credits,
      status: "PENDING",
    },
  });

  const initialized = await initializePaystackTransaction({
    email: user.email,
    amount: amountKobo,
    reference,
    callback_url: `${appUrl}/billing/callback`,
    metadata: {
      paymentId: payment.id,
      userId: user.id,
      type: parsed.data.type,
      plan,
      packageId,
      credits,
      description,
    },
  });

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      paystackUrl: initialized.authorization_url,
    },
  });

  return NextResponse.json({
    authorizationUrl: initialized.authorization_url,
    reference,
  });
}
