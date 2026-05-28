import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/billing",
          "/chat",
          "/dashboard",
          "/history",
          "/onboarding",
          "/projects",
          "/settings",
          "/sign-in",
          "/sign-up",
          "/suspended",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
