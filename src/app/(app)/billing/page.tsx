import { Check, CreditCard, Wallet, Zap } from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { creditPackages, planLimits } from "@/config/billing";
import { formatDate } from "@/lib/format";
import { BillingEventsTable } from "@/components/billing/billing-events-table";
import { PaymentButton } from "@/components/billing/payment-button";
import { PaymentHistoryTable } from "@/components/billing/payment-history-table";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function BillingPage() {
  const user = await getCurrentDbUser();

  const usage = user
    ? await prisma.usageLog.aggregate({
        where: {
          userId: user.id,
        },
        _sum: {
          creditsUsed: true,
          tokensUsed: true,
        },
      })
    : null;

  const recentUsage = user
    ? await prisma.usageLog.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      })
    : [];

  const payments = user
    ? await prisma.payment.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      })
    : [];

  const billingEvents = user
    ? await prisma.billingEvent.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      })
    : [];

  const currentPlan = user ? planLimits[user.plan] : planLimits.FREE;
  const successfulPayments = payments.filter(
    (payment) => payment.status === "SUCCESS"
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Manage credits and usage."
        description="Track plan access, credits, usage history and future top-ups."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-violet-300" />
            <p className="text-sm text-slate-400">Available credits</p>
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {user?.credits ?? 0}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-violet-300" />
            <p className="text-sm text-slate-400">Current plan</p>
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {currentPlan.name}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-violet-300" />
            <p className="text-sm text-slate-400">Credits used</p>
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {usage?._sum.creditsUsed ?? 0}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Successful payments</p>
          <p className="mt-3 text-3xl font-black text-white">
            {successfulPayments}
          </p>
        </div>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/10 to-blue-500/10 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-300">
              Current plan
            </p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              {currentPlan.name} - {currentPlan.monthlyPrice}/month
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Includes {currentPlan.monthlyCredits.toLocaleString()} monthly credits.
              {user?.planRenewsAt
                ? ` Next renewal: ${formatDate(user.planRenewsAt)}.`
                : " Renewal will appear after a paid plan is activated."}
            </p>
          </div>

          <div className="w-full max-w-xs lg:w-60">
            <PaymentButton type="PLAN" plan="PRO" label="Upgrade to Pro" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-black text-white">Plans</h2>

        <div className="mt-5 grid gap-5 lg:grid-cols-4">
          {Object.entries(planLimits).map(([key, plan]) => {
            const active = user?.plan === key;

            return (
              <div
                key={key}
                className={
                  active
                    ? "rounded-[2rem] border border-violet-400/50 bg-violet-500/10 p-6"
                    : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
                }
              >
                <p className="text-xl font-black text-white">{plan.name}</p>
                <p className="mt-3 text-3xl font-black text-white">
                  {plan.monthlyPrice}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {plan.monthlyCredits.toLocaleString()} credits/month
                </p>

                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex gap-2 text-sm text-slate-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                      {feature}
                    </div>
                  ))}
                </div>

                {key === "FREE" ? (
                  <button
                    type="button"
                    disabled
                    className="mt-6 w-full rounded-full bg-white/10 px-5 py-3 text-sm font-black text-slate-500"
                  >
                    Current free option
                  </button>
                ) : (
                  <PaymentButton
                    type="PLAN"
                    plan={key as "PRO" | "BUILDER" | "TEAM"}
                    label={active ? "Current plan" : `Choose ${plan.name}`}
                    disabled={active}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-black text-white">Credit packages</h2>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {creditPackages.map((pack) => (
            <div
              key={pack.id}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <p className="text-xl font-black text-white">{pack.name}</p>
              <p className="mt-3 text-3xl font-black text-white">{pack.price}</p>
              <p className="mt-2 text-sm text-slate-400">
                {pack.credits.toLocaleString()} credits
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {pack.description}
              </p>

              <PaymentButton
                type="CREDITS"
                packageId={pack.id as "starter" | "growth" | "power"}
                label={`Buy ${pack.name}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <PaymentHistoryTable payments={payments} />
      </section>

      <section className="mt-8">
        <BillingEventsTable events={billingEvents} />
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black text-white">Recent usage</h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 font-semibold">Action</th>
                <th className="py-3 pr-4 font-semibold">Model</th>
                <th className="py-3 pr-4 font-semibold">Tokens</th>
                <th className="py-3 pr-4 font-semibold">Credits</th>
                <th className="py-3 pr-4 font-semibold">Date</th>
              </tr>
            </thead>

            <tbody>
              {recentUsage.length > 0 ? (
                recentUsage.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 text-slate-300"
                  >
                    <td className="py-4 pr-4">{log.action}</td>
                    <td className="py-4 pr-4">{log.model ?? "-"}</td>
                    <td className="py-4 pr-4">{log.tokensUsed}</td>
                    <td className="py-4 pr-4">{log.creditsUsed}</td>
                    <td className="py-4 pr-4">
                      {log.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No usage yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
