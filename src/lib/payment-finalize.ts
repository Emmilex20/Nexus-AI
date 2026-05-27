import { PaymentStatus, Prisma } from "@prisma/client";
import { planLimits } from "@/config/billing";
import { createBillingEvent } from "@/lib/billing-events";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { getNextRenewalDate } from "@/lib/plan-renewal";
import { prisma } from "@/lib/prisma";

export async function finalizePayment(reference: string) {
  const existingPayment = await prisma.payment.findUnique({
    where: { reference },
  });

  if (!existingPayment) {
    throw new Error("Payment record not found");
  }

  if (existingPayment.status === "SUCCESS") {
    return existingPayment;
  }

  const verified = await verifyPaystackTransaction(reference);

  if (verified.reference !== reference) {
    throw new Error("Payment reference mismatch");
  }

  if (verified.amount !== existingPayment.amountKobo) {
    throw new Error("Payment amount mismatch");
  }

  if (verified.currency !== existingPayment.currency) {
    throw new Error("Payment currency mismatch");
  }

  const verifiedMetadata = JSON.parse(
    JSON.stringify(verified)
  ) as Prisma.InputJsonValue;

  if (verified.status !== "success") {
    const nextStatus =
      verified.status === "abandoned"
        ? PaymentStatus.ABANDONED
        : PaymentStatus.FAILED;

    const updatedPayment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: nextStatus,
        failureReason: verified.status,
        metadata: verifiedMetadata,
      },
    });

    if (existingPayment.status !== nextStatus) {
      await createBillingEvent({
        userId: existingPayment.userId,
        type:
          nextStatus === "ABANDONED" ? "PAYMENT_ABANDONED" : "PAYMENT_FAILED",
        note: `Payment ${verified.status}`,
        metadata: {
          reference,
          status: verified.status,
        },
      });
    }

    return updatedPayment;
  }

  return prisma.$transaction(async (tx) => {
    const freshPayment = await tx.payment.findUnique({
      where: { reference },
    });

    if (!freshPayment) {
      throw new Error("Payment record not found");
    }

    if (freshPayment.status === "SUCCESS") {
      return freshPayment;
    }

    const completed = await tx.payment.updateMany({
      where: {
        id: freshPayment.id,
        status: {
          not: "SUCCESS",
        },
      },
      data: {
        status: "SUCCESS",
        paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(),
        failureReason: null,
        metadata: verifiedMetadata,
      },
    });

    const completedPayment = await tx.payment.findUnique({
      where: { id: freshPayment.id },
    });

    if (!completedPayment) {
      throw new Error("Payment record not found");
    }

    if (completed.count === 0) {
      return completedPayment;
    }

    if (freshPayment.type === "CREDITS") {
      await tx.user.update({
        where: { id: freshPayment.userId },
        data: {
          credits: {
            increment: freshPayment.credits,
          },
        },
      });

      await tx.billingEvent.create({
        data: {
          userId: freshPayment.userId,
          type: "CREDITS_PURCHASED",
          note: `${freshPayment.credits} credits purchased`,
          metadata: {
            paymentId: freshPayment.id,
            reference: freshPayment.reference,
            credits: freshPayment.credits,
          },
        },
      });
    }

    if (freshPayment.type === "PLAN" && freshPayment.plan) {
      const plan = planLimits[freshPayment.plan];
      const now = new Date();

      await tx.user.update({
        where: { id: freshPayment.userId },
        data: {
          plan: freshPayment.plan,
          planStartedAt: now,
          planRenewsAt: getNextRenewalDate(now),
          credits: {
            increment: plan.monthlyCredits,
          },
        },
      });

      await tx.billingEvent.create({
        data: {
          userId: freshPayment.userId,
          type: "PLAN_PURCHASED",
          note: `${plan.name} plan purchased`,
          metadata: {
            paymentId: freshPayment.id,
            reference: freshPayment.reference,
            plan: freshPayment.plan,
            monthlyCredits: plan.monthlyCredits,
          },
        },
      });
    }

    return completedPayment;
  });
}
