import Link from "next/link";
import { ArrowRight, Brain, Code2, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

const options = [
  {
    title: "Research and search",
    description: "Use Nexus AI to understand topics, compare ideas and summarize information.",
    icon: Search,
  },
  {
    title: "Coding and debugging",
    description: "Use Nexus AI to write, explain, improve and debug code faster.",
    icon: Code2,
  },
  {
    title: "Productivity and planning",
    description: "Use Nexus AI to brainstorm, plan projects, write content and organize work.",
    icon: Brain,
  },
];

export default function OnboardingPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="Set up your AI workspace."
        description="Choose how you plan to use Nexus AI most. Full preferences will be saved in later batches."
      />

      <div className="grid gap-5 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <div
              key={option.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Icon className="h-6 w-6" />
              </div>

              <h2 className="text-xl font-black text-white">{option.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {option.description}
              </p>
            </div>
          );
        })}
      </div>

      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
      >
        Continue to dashboard
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
