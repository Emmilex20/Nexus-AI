import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for Nexus AI.",
};

const plans = [
  {
    name: "Free",
    price: "₦0",
    description: "For testing the AI workspace.",
    features: ["Limited AI chats", "Basic search", "Basic code help"],
  },
  {
    name: "Pro",
    price: "₦5,000",
    description: "For serious daily users.",
    features: ["More chats", "AI search", "Code assistant", "File tools soon"],
  },
  {
    name: "Builder",
    price: "₦12,000",
    description: "For developers and power users.",
    features: ["Higher limits", "Priority models", "Developer tools", "Projects soon"],
  },
];

export default function PricingPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple plans for every kind of user."
          description="Start free, then upgrade when you need more power, more usage, and better tools."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8"
            >
              <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              <p className="mt-3 text-slate-300">{plan.description}</p>
              <p className="mt-8 text-4xl font-black text-white">
                {plan.price}
                <span className="text-sm font-medium text-slate-400"> / month</span>
              </p>

              <ul className="mt-8 space-y-4 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
