import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/config/env";

export default function robots(): MetadataRoute.Robots {
  const env = getEnv();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/newsroom", "/newsroom/*", "/api/*"],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
