import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["builder.blipmade.com", "*.blipmade.com"],
};

export default nextConfig;
