import type { PaymentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-black",
        status === "SUCCESS" && "bg-emerald-500/15 text-emerald-300",
        status === "PENDING" && "bg-yellow-500/15 text-yellow-300",
        status === "FAILED" && "bg-red-500/15 text-red-300",
        status === "ABANDONED" && "bg-slate-500/15 text-slate-300"
      )}
    >
      {status}
    </span>
  );
}
