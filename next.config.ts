import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["builder.blipmade.com", "*.blipmade.com"],
  agentRules: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
