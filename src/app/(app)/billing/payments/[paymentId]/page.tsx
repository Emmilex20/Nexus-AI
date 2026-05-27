import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNairaFromKobo } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/billing/payment-status-badge";

type PaymentReceiptPageProps = {
  params: Promise<{
    paymentId: string;
  }>;
};

export default async function PaymentReceiptPage({
  params,
}: PaymentReceiptPageProps) {
  const user = await getCurrentDbUser();

  if (!user) {
    notFound();
  }

  const { paymentId } = await params;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: user.id,
    },
  });

  if (!payment) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/billing"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to billing
      </Link>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <Receipt className="h-7 w-7" />
            </div>

            <h1 className="mt-6 text-3xl font-black text-white">
              Payment receipt
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Reference: {payment.reference}
            </p>
          </div>

          <PaymentStatusBadge status={payment.status} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Info label="Type" value={payment.type} />
          <Info
            label="Item"
            value={
              payment.type === "PLAN"
                ? payment.plan ?? "Plan"
                : payment.packageId ?? "Credits"
            }
          />
          <Info label="Amount" value={formatNairaFromKobo(payment.amountKobo)} />
          <Info label="Credits" value={payment.credits.toLocaleString()} />
          <Info label="Created" value={formatDate(payment.createdAt)} />
          <Info label="Paid" value={formatDate(payment.paidAt)} />
          <Info label="Currency" value={payment.currency} />
          <Info label="Failure reason" value={payment.failureReason ?? "—"} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}
