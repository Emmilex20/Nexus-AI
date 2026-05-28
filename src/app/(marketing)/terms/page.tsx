import type { Metadata } from "next";
import { Container } from "@/components/shared/container";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Nexus AI terms of service for platform access, responsible usage, billing, AI outputs, and account rules.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
          Legal
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Terms of Service
        </h1>

        <div className="mt-10 space-y-7 text-base leading-8 text-slate-300">
          <p>
            By using Nexus AI, users agree to use the platform responsibly and in
            compliance with applicable laws and platform policies.
          </p>

          <h2 className="text-2xl font-bold text-white">User responsibility</h2>
          <p>
            Users are responsible for the content they submit, generate, save or
            share through the platform.
          </p>

          <h2 className="text-2xl font-bold text-white">Service availability</h2>
          <p>
            We aim to keep the platform reliable, but access may occasionally be
            interrupted due to maintenance, updates or third-party provider issues.
          </p>

          <h2 className="text-2xl font-bold text-white">Payments</h2>
          <p>
            Paid features, subscriptions and usage limits will be clearly shown
            before purchase when billing is added.
          </p>

          <h2 className="text-2xl font-bold text-white">Contact</h2>
          <p>For terms-related questions, contact support@yourdomain.com.</p>
        </div>
      </Container>
    </section>
  );
}
