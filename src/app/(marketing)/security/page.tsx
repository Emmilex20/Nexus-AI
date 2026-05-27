import type { Metadata } from "next";
import { Lock, ShieldCheck, UserCheck } from "lucide-react";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

export const metadata: Metadata = {
  title: "Security",
  description: "Security information for Nexus AI.",
};

const items = [
  {
    title: "Account protection",
    description: "Authentication and account protection will be added with secure production standards.",
    icon: UserCheck,
  },
  {
    title: "Data safeguards",
    description: "The platform is structured to protect user data and reduce unnecessary exposure.",
    icon: Lock,
  },
  {
    title: "Responsible AI",
    description: "Policies and usage limits help keep the platform safe, reliable and trustworthy.",
    icon: ShieldCheck,
  },
];

export default function SecurityPage() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Security"
          title="Built with trust and safety from the foundation."
          description="Nexus AI is being structured for secure accounts, safe usage, clear policies and responsible AI workflows."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
