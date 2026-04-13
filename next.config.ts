import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 서버리스에서 fs 모듈 사용을 위해 필요
  serverExternalPackages: [],
};

export default nextConfig;
