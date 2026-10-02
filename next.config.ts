import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Allow the Base44 preview origin (hostname changes per environment) to access
  // dev assets/HMR. Without this, Next.js blocks the preview's cross-origin requests.
  allowedDevOrigins: process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [],
};

export default nextConfig;
