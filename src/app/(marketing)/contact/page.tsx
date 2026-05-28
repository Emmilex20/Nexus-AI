import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Nexus AI support for product questions, billing, partnerships, account help, and feedback.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Contact"
          title="Need help or want to reach us?"
          description="Contact our support team for product questions, billing, partnerships, or feedback."
        />

        <div className="mx-auto mt-12 max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
            <Mail className="h-7 w-7" />
          </div>

          <h3 className="mt-6 text-2xl font-bold text-white">Email support</h3>

          <p className="mt-3 text-slate-300">{siteConfig.links.support}</p>
        </div>
      </Container>
    </section>
  );
}
