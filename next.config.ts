import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["builder.blipmade.com", "*.blipmade.com"],
  agentRules: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
