// apps/desktop/electron/next.config.ts
// Next.js config for desktop builds.
// Static export is enabled when ELECTRON_BUILD=1.

import type { NextConfig } from 'next';

const config: NextConfig = {
  output:      process.env.ELECTRON_BUILD === '1' ? 'export'  : undefined,
  assetPrefix: process.env.ELECTRON_BUILD === '1' ? '.'       : undefined,
  experimental: {
    externalDir: true,   // allows importing from ../../src
  },
};

export default config;
