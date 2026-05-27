import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizePayment } from "@/lib/payment-finalize";

const verifySchema = z.object({
  reference: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
  }

  try {
    const payment = await finalizePayment(parsed.data.reference);

    return NextResponse.json({
      payment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify payment",
      },
      { status: 400 }
    );
  }
}
