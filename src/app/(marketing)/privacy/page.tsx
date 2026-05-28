import type { Metadata } from "next";
import { Container } from "@/components/shared/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the Nexus AI privacy policy for account data, usage data, billing information, AI workspace content, and user rights.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
          Legal
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Privacy Policy
        </h1>

        <div className="mt-10 space-y-7 text-base leading-8 text-slate-300">
          <p>
            Nexus AI respects user privacy and is designed to protect account,
            usage and communication data responsibly.
          </p>

          <h2 className="text-2xl font-bold text-white">Information we collect</h2>
          <p>
            We may collect account details, usage activity, billing information,
            support messages and content submitted into the AI workspace.
          </p>

          <h2 className="text-2xl font-bold text-white">How we use information</h2>
          <p>
            We use information to provide the service, improve user experience,
            secure accounts, process payments and respond to support requests.
          </p>

          <h2 className="text-2xl font-bold text-white">Data security</h2>
          <p>
            We apply reasonable technical and organizational safeguards to reduce
            unauthorized access, misuse or loss of user data.
          </p>

          <h2 className="text-2xl font-bold text-white">Contact</h2>
          <p>For privacy questions, contact support@yourdomain.com.</p>
        </div>
      </Container>
    </section>
  );
}
