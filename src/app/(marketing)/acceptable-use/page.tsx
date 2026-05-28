import type { Metadata } from "next";
import { Container } from "@/components/shared/container";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    "Read the Nexus AI acceptable use policy for safe, lawful, and responsible use of AI chat, research, file, and coding tools.",
  alternates: {
    canonical: "/acceptable-use",
  },
};

export default function AcceptableUsePage() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
          Policy
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Acceptable Use Policy
        </h1>

        <div className="mt-10 space-y-7 text-base leading-8 text-slate-300">
          <p>
            Nexus AI should be used for lawful, safe and productive activities.
            Users must not misuse the platform or attempt to harm others.
          </p>

          <h2 className="text-2xl font-bold text-white">Not allowed</h2>
          <p>
            Users may not use Nexus AI for fraud, illegal activity, harassment,
            unauthorized access, malware, spam, exploitation or harmful deception.
          </p>

          <h2 className="text-2xl font-bold text-white">Responsible AI use</h2>
          <p>
            Users should verify important outputs before relying on them for
            medical, legal, financial, academic or business decisions.
          </p>

          <h2 className="text-2xl font-bold text-white">Enforcement</h2>
          <p>
            Accounts that violate this policy may be limited, suspended or removed.
          </p>
        </div>
      </Container>
    </section>
  );
}
