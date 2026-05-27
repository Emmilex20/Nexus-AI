import { CreditCard, MessageSquare, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function AdminOverviewPage() {
  const [users, conversations, payments, usage] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count(),
    prisma.payment.count(),
    prisma.usageLog.aggregate({
      _sum: {
        creditsUsed: true,
        tokensUsed: true,
      },
    }),
  ]);

  const stats = [
    {
      label: "Users",
      value: users,
      icon: Users,
    },
    {
      label: "Conversations",
      value: conversations,
      icon: MessageSquare,
    },
    {
      label: "Payments",
      value: payments,
      icon: CreditCard,
    },
    {
      label: "Credits used",
      value: usage._sum.creditsUsed ?? 0,
      icon: Wallet,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Platform overview"
        description="Monitor users, conversations, payments and usage from a safe admin-only area."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex items-center gap-3 text-slate-400">
                <Icon className="h-5 w-5 text-red-300" />
                <p className="text-sm">{stat.label}</p>
              </div>

              <p className="mt-3 text-3xl font-black text-white">
                {stat.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
