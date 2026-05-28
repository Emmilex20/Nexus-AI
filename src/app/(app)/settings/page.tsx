import { Bell, CreditCard, Shield, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DeveloperTokenPanel } from "@/components/settings/developer-token-panel";
import { getCurrentDbUser } from "@/lib/current-user";

const settings = [
  {
    title: "Profile",
    description: "Name, email and account details will appear here after auth.",
    icon: User,
  },
  {
    title: "Security",
    description: "Password, sessions and account protection will be added later.",
    icon: Shield,
  },
  {
    title: "Billing",
    description: "Manage plan, credits, invoices and usage from the billing page.",
    icon: CreditCard,
  },
  {
    title: "Notifications",
    description: "Email and product notification preferences will be added later.",
    icon: Bell,
  },
];

export default async function SettingsPage() {
  const user = await getCurrentDbUser();

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Manage your workspace."
        description="Manage account settings, security, billing, notifications and developer access for Nexus AI."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {settings.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Icon className="h-6 w-6" />
              </div>

              <h2 className="text-xl font-black text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <DeveloperTokenPanel currentPlan={user?.plan ?? "FREE"} />
    </div>
  );
}
