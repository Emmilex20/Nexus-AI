import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Code2,
  FolderKanban,
  MessageSquare,
  Search,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Container } from "@/components/shared/container";

const flowSteps = [
  {
    label: "01",
    title: "Create your account",
    description: "Sign up once and land in a focused onboarding path.",
  },
  {
    label: "02",
    title: "Choose your workspace mode",
    description: "Start with chat, code, research or file-focused work.",
  },
  {
    label: "03",
    title: "Work from the dashboard",
    description: "Open chats, projects, history, billing and settings from one place.",
  },
  {
    label: "04",
    title: "Save every useful answer",
    description: "Conversations, usage and credits stay attached to your account.",
  },
];

const capabilities = [
  {
    title: "Ask better questions",
    description: "Explore ideas, summarize plans and turn rough thinking into next steps.",
    icon: Brain,
    tone: "text-emerald-300 bg-emerald-500/10",
  },
  {
    title: "Build with code mode",
    description: "Debug errors, generate snippets and reason through implementation details.",
    icon: Code2,
    tone: "text-sky-300 bg-sky-500/10",
  },
  {
    title: "Organize by project",
    description: "Keep apps, research, clients and experiments in separate workspaces.",
    icon: FolderKanban,
    tone: "text-amber-300 bg-amber-500/10",
  },
  {
    title: "Track usage clearly",
    description: "Plans, credits, billing history and usage events are visible by design.",
    icon: Wallet,
    tone: "text-violet-300 bg-violet-500/10",
  },
];

const starterPrompts = [
  "Plan a SaaS MVP launch checklist",
  "Refactor this React component",
  "Compare two market ideas",
  "Draft a support response",
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,1)_45%,rgba(9,9,11,1))]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

        <Container className="grid min-h-[calc(100vh-5rem)] gap-12 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
          <div>
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              AI workspace for builders
            </div>

            <h1 className="mt-7 max-w-4xl text-balance text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Think, build and organize with one AI command center.
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-slate-300 sm:text-lg">
              Nexus AI takes users from a polished homepage into a protected
              dashboard where chat, code help, research, projects, billing and
              history all feel connected.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-cyan-500/10 transition hover:bg-slate-200 sm:text-base"
              >
                Start free
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10 sm:text-base"
              >
                Open workspace
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["100", "free credits"],
                ["4", "work modes"],
                ["24/7", "saved history"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-black/40">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-white">Nexus assistant</p>
                      <p className="text-xs text-slate-500">General chat mode</p>
                    </div>
                  </div>

                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                    Online
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="ml-auto max-w-[82%] rounded-[1.5rem] bg-white px-5 py-4 text-sm leading-7 text-slate-950">
                    Help me turn this app idea into a clean product roadmap.
                  </div>

                  <div className="max-w-[88%] rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                      <Sparkles className="h-4 w-4" />
                      Nexus AI
                    </div>
                    <p className="text-sm leading-7 text-slate-200">
                      Start with a product promise, define the core workflow,
                      build the dashboard around daily actions, then use saved
                      conversations as the memory layer.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {starterPrompts.map((prompt) => (
                      <div
                        key={prompt}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-slate-300"
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Chat", icon: MessageSquare },
                { label: "Search", icon: Search },
                { label: "Code", icon: Code2 },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-300"
                  >
                    <Icon className="h-4 w-4 text-cyan-300" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-white/10 bg-slate-950 py-16 sm:py-20">
        <Container>
          <div className="grid gap-5 lg:grid-cols-4">
            {flowSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  {step.label}
                </p>
                <h2 className="mt-4 text-xl font-black text-white">{step.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-slate-950 py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                Why it feels different
              </p>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
                A workspace flow that feels useful before it feels complicated.
              </h2>
            </div>
            <p className="text-base leading-8 text-slate-300">
              The product is arranged around user intent: start a chat, save it
              to a project, review history, understand credits, and return to
              the next best action without hunting through menus.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {capabilities.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6"
                >
                  <div
                    className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${item.tone}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02] py-14">
        <Container className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              Ready for real work
            </div>
            <h2 className="mt-3 text-3xl font-black text-white">
              Move from homepage to dashboard in one clean path.
            </h2>
          </div>

          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-200"
          >
            Create workspace
            <Zap className="h-5 w-5" />
          </Link>
        </Container>
      </section>
    </>
  );
}
