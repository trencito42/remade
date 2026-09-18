import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["builder.blipmade.com", "*.blipmade.com"],
  agentRules: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.theverge.com" },
      { protocol: "https", hostname: "**.vox-cdn.com" },
      { protocol: "https", hostname: "**.arstechnica.net" },
      { protocol: "https", hostname: "**.polygon.com" },
      { protocol: "https", hostname: "**.eurogamer.net" },
      { protocol: "https", hostname: "**.ign.com" },
      { protocol: "https", hostname: "**.ignimgs.com" },
      { protocol: "https", hostname: "**.wp.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
