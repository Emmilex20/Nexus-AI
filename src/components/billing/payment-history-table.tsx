import Link from "next/link";
import type { Payment } from "@prisma/client";
import { formatDate, formatNairaFromKobo } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/billing/payment-status-badge";

type PaymentHistoryTableProps = {
  payments: Payment[];
};

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Payment history</h2>
          <p className="mt-2 text-sm text-slate-400">
            View recent plan purchases and credit top-ups.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-4 font-semibold">Type</th>
              <th className="py-3 pr-4 font-semibold">Item</th>
              <th className="py-3 pr-4 font-semibold">Amount</th>
              <th className="py-3 pr-4 font-semibold">Credits</th>
              <th className="py-3 pr-4 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Paid</th>
              <th className="py-3 pr-4 font-semibold">Reference</th>
            </tr>
          </thead>

          <tbody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-white/5 text-slate-300"
                >
                  <td className="py-4 pr-4">{payment.type}</td>
                  <td className="py-4 pr-4">
                    {payment.type === "PLAN"
                      ? payment.plan
                      : payment.packageId ?? "Credits"}
                  </td>
                  <td className="py-4 pr-4">
                    {formatNairaFromKobo(payment.amountKobo)}
                  </td>
                  <td className="py-4 pr-4">
                    {payment.credits.toLocaleString()}
                  </td>
                  <td className="py-4 pr-4">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="py-4 pr-4">{formatDate(payment.paidAt)}</td>
                  <td className="py-4 pr-4">
                    <Link
                      href={`/billing/payments/${payment.id}`}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-violet-300 transition hover:bg-white/10"
                    >
                      View receipt
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
