import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow the Base44 preview origin (hostname changes per environment) to access
  // dev assets/HMR. Without this, Next.js blocks the preview's cross-origin requests.
  allowedDevOrigins: process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [],
  async rewrites() {
    return [
      {
        source: '/@:handle',
        destination: '/c/:handle',
      },
    ];
  },
};

export default nextConfig;
