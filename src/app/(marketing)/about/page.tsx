import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Nexus AI, a modern AI workspace built for builders, creators, students, teams, and businesses.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="About"
          title="A modern AI workspace for builders, creators, students and businesses."
          description="Nexus AI is being built as a clean, affordable and powerful AI platform for search, coding, files, productivity and everyday work."
        />

        <div className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-base leading-8 text-slate-300">
          <p>
            Our goal is to make advanced AI easier to use, easier to understand,
            and more useful for real work. The platform will combine AI chat,
            web search, code assistance, file understanding, and productivity
            workflows in one beautiful interface.
          </p>
        </div>
      </Container>
    </section>
  );
}
