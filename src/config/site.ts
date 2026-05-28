const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const vercelAppUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const productionUrl = vercelAppUrl ? `https://${vercelAppUrl}` : undefined;
const shouldIgnoreLocalUrl =
  process.env.NODE_ENV === "production" && configuredAppUrl?.includes("localhost");
const resolvedSiteUrl =
  shouldIgnoreLocalUrl
    ? productionUrl ?? "https://nexus-ai-jet-kappa.vercel.app"
    : configuredAppUrl ?? productionUrl ?? "https://nexus-ai-jet-kappa.vercel.app";
const siteUrl = resolvedSiteUrl.replace(/\/$/, "");

export const siteConfig = {
  name: "Nexus AI",
  shortName: "Nexus",
  description:
    "Nexus AI is a professional AI workspace for chat, coding, research, files, projects, billing, and productivity.",
  url: siteUrl,
  ogImage: "/opengraph-image",
  keywords: [
    "AI assistant",
    "AI chat assistant",
    "AI workspace",
    "AI search engine",
    "AI code assistant",
    "AI research assistant",
    "AI file assistant",
    "AI productivity platform",
    "ChatGPT alternative",
    "AI for developers",
    "Nexus AI",
  ],
  links: {
    twitter: "",
    github: "",
    support: "support@nexusai.app",
  },
  nav: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
};
