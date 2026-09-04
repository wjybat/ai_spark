import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: "/api/v1/:path*" },
      { source: "/health", destination: "/api/health" },
    ];
  },
};

export default nextConfig;
