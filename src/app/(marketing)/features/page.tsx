import type { Metadata } from "next";
import { Code2, FileText, MessageSquare, Search, Settings, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Nexus AI features for AI chat, coding help, research, file workflows, projects, billing, and productivity.",
  alternates: {
    canonical: "/features",
  },
};

const features = [
  {
    title: "AI chat",
    description: "Ask questions, brainstorm ideas, plan projects and continue conversations.",
    icon: MessageSquare,
  },
  {
    title: "AI search",
    description: "Research topics and get direct answers with sources in future batches.",
    icon: Search,
  },
  {
    title: "Code assistant",
    description: "Generate, debug, explain and refactor code in a clean developer workflow.",
    icon: Code2,
  },
  {
    title: "File assistant",
    description: "Analyze PDFs, documents, CSV files and images in later production phases.",
    icon: FileText,
  },
  {
    title: "Workspace settings",
    description: "Control preferences, usage, billing and account settings from one place.",
    icon: Settings,
  },
  {
    title: "Trust foundation",
    description: "Built with professional policy pages, secure structure and scalable planning.",
    icon: ShieldCheck,
  },
];

export default function FeaturesPage() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="A clean AI platform designed for real daily use."
          description="Nexus AI starts with the core tools users need most: chat, search, coding help, files and productivity."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-white">{feature.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
