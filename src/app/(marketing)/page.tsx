import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Code2,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Container } from "@/components/shared/container";

const features = [
  {
    title: "AI search",
    description: "Ask questions and get clear answers for research, learning and decisions.",
    icon: Search,
  },
  {
    title: "Code assistant",
    description: "Generate, debug, explain and improve code with clean developer output.",
    icon: Code2,
  },
  {
    title: "File intelligence",
    description: "Prepare for PDF, document and image analysis in future batches.",
    icon: FileText,
  },
  {
    title: "Conversation workspace",
    description: "Keep your ideas, projects and chats organized in one simple interface.",
    icon: MessageSquare,
  },
];

const useCases = [
  "Developers",
  "Students",
  "Creators",
  "Startups",
  "Small businesses",
  "Researchers",
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />

        <Container className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center py-16 text-center sm:py-24">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur sm:text-sm">
            <Sparkles className="h-4 w-4 text-violet-300" />
            AI Search • Coding • Research • Productivity
          </div>

          <h1 className="max-w-5xl text-balance text-4xl font-black text-white sm:text-6xl lg:text-7xl">
            One sleek AI workspace for answers, code, files and ideas.
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-slate-300 sm:text-lg">
            Nexus AI helps users search smarter, build faster, understand files,
            write better code, and organize conversations in one clean platform.
          </p>

          <div className="mt-10 grid w-full max-w-md gap-3 sm:flex sm:max-w-none sm:justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-white/10 transition hover:bg-slate-200 sm:text-base"
            >
              Start free
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              href="/features"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10 sm:text-base"
            >
              Explore features
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {useCases.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] py-16 sm:py-24">
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Brain,
                title: "Built for thinking",
                text: "Plan, brainstorm, research, explain and create with structured AI conversations.",
              },
              {
                icon: Zap,
                title: "Built for speed",
                text: "Clean navigation, fast pages, responsive layouts and simple user journeys.",
              },
              {
                icon: ShieldCheck,
                title: "Built for trust",
                text: "Professional pages, security-first structure and production-ready policies.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"
                >
                  <div className="mb-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-black text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
              Features
            </p>
            <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
              Everything starts with a simple, useful AI workspace.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 transition hover:border-violet-400/40"
                >
                  <div className="mb-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black text-white">{feature.title}</h3>
                  <p className="mt-3 text-base leading-8 text-slate-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
