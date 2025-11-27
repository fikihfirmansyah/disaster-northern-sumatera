import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Cloudflare Pages compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
