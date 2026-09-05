import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-coding-agent",
  ],
  // 与参考 UI 对比时隐藏开发模式左下角 Next.js 标识；生产构建本来也不会显示。
  devIndicators: false,
};

export default nextConfig;
