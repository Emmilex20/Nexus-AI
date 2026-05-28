import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { imageGenerationConfig, planLimits } from "@/config/billing";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Nexus AI plans, monthly credits, model access, and VS Code coding assistant limits.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Plans for chat, research and coding."
          description="Start free, then upgrade when you need better models, more monthly credits, and VS Code workspace assistance."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {Object.entries(planLimits).map(([key, plan]) => (
            <div
              key={key}
              className={
                key === "BUILDER"
                  ? "rounded-[2rem] border border-cyan-300/40 bg-cyan-400/10 p-6 shadow-2xl shadow-cyan-950/20"
                  : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
              }
            >
              <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              <p className="mt-3 min-h-16 text-sm leading-7 text-slate-300">
                {plan.tagline}
              </p>
              <p className="mt-6 text-3xl font-black text-white">
                {plan.monthlyPrice}
                <span className="text-sm font-medium text-slate-400"> / month</span>
              </p>
              <p className="mt-2 text-sm font-bold text-cyan-200">
                {plan.monthlyCredits.toLocaleString()} credits/month
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {plan.vscodeMonthlyRequests > 0
                  ? `${plan.vscodeMonthlyRequests.toLocaleString()} VS Code requests/month`
                  : "No VS Code integration"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {plan.imageMonthlyGenerations > 0
                  ? `${plan.imageMonthlyGenerations.toLocaleString()} GPT Image 2 generations/month`
                  : "No image generation"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Image generations use {imageGenerationConfig.creditsPerImage} credits each
              </p>

              <ul className="mt-8 space-y-4 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/billing"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
              >
                {key === "FREE" ? "Start free" : `Choose ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
