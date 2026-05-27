import type { BillingEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateBillingEventInput = {
  userId: string;
  type: BillingEventType;
  note?: string;
  metadata?: Record<string, unknown>;
};

function toJsonValue(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
}

export async function createBillingEvent({
  userId,
  type,
  note,
  metadata,
}: CreateBillingEventInput) {
  return prisma.billingEvent.create({
    data: {
      userId,
      type,
      note,
      metadata: toJsonValue(metadata),
    },
  });
}
