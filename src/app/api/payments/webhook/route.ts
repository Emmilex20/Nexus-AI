import crypto from "crypto";
import { NextResponse } from "next/server";
import { finalizePayment } from "@/lib/payment-finalize";

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return NextResponse.json({ error: "Missing secret" }, { status: 500 });
  }

  const rawBody = await req.text();

  const signature = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  const paystackSignature = req.headers.get("x-paystack-signature");

  if (signature !== paystackSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    data?: {
      reference?: string;
    };
  };

  if (event.event === "charge.success" && event.data?.reference) {
    await finalizePayment(event.data.reference);
  }

  return NextResponse.json({ received: true });
}
