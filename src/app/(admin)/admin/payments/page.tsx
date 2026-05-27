import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PaymentStatusBadge } from "@/components/billing/payment-status-badge";
import { formatDate, formatNairaFromKobo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      user: true,
    },
  });

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        description="Monitor payment status, references, plans, packages and customer records."
      />

      <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-4">Customer</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Item</th>
              <th className="py-3 pr-4">Amount</th>
              <th className="py-3 pr-4">Credits</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Paid</th>
              <th className="py-3 pr-4">Reference</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-white/5 text-slate-300"
              >
                <td className="py-4 pr-4">
                  <p className="font-bold text-white">{payment.user.email}</p>
                  <p className="text-xs text-slate-500">{payment.user.plan}</p>
                </td>
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
                  <code className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400">
                    {payment.reference.slice(0, 24)}...
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
