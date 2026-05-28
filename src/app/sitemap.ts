import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/features", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/pricing", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/security", priority: 0.65, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.45, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.45, changeFrequency: "yearly" as const },
    {
      path: "/acceptable-use",
      priority: 0.45,
      changeFrequency: "yearly" as const,
    },
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
