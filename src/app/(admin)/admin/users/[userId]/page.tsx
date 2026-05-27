import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { UserSuspensionControl } from "@/components/admin/user-suspension-control";
import { PaymentStatusBadge } from "@/components/billing/payment-status-badge";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      conversations: {
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      usageLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) notFound();

  const auditLogs = await prisma.adminAuditLog.findMany({
    where: { targetUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <AdminPageHeader
        title={user.email}
        description="View user activity, billing, usage and safely apply admin changes."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-5">
        <Stat label="Role" value={user.role} />
        <Stat label="Status" value={user.isSuspended ? "Suspended" : "Active"} />
        <Stat label="Plan" value={user.plan} />
        <Stat label="Credits" value={user.credits.toLocaleString()} />
        <Stat label="Joined" value={formatDate(user.createdAt)} />
      </div>

      <AdminUserActions userId={user.id} currentPlan={user.plan} />

      <section className="mt-8">
        <UserSuspensionControl
          userId={user.id}
          isSuspended={user.isSuspended}
          reason={user.suspensionReason}
        />
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black text-white">Recent payments</h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Credits</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {user.payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-white/5 text-slate-300"
                >
                  <td className="py-4 pr-4">{payment.type}</td>
                  <td className="py-4 pr-4">{payment.amountKobo / 100}</td>
                  <td className="py-4 pr-4">{payment.credits}</td>
                  <td className="py-4 pr-4">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="py-4 pr-4">{formatDate(payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black text-white">Admin audit logs</h2>

        <div className="mt-5 space-y-3">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
              >
                <p className="font-bold text-white">{log.action}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {log.note ?? "No note"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatDate(log.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No admin changes yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}
