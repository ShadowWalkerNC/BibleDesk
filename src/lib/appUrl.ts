/**
 * appUrl.ts — Centralized Application Base URL Resolution
 *
 * Resolves the canonical base URL for BibleDesk across local dev,
 * Vercel preview/production deployments, and custom domains.
 */

export const DEFAULT_PRODUCTION_URL = 'https://bibledesk.up.railway.app';

export function getAppUrl(): string {
  // 1. Explicit environment variable set by user / deploy configuration
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }

  // 2. Client-side browser window origin (always 100% accurate in client sessions)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  // 3. Railway system environment variables (injected during Railway deployments)
  const railwayDomain =
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN ||
    process.env.RAILWAY_STATIC_URL;
  if (railwayDomain) {
    const domain = railwayDomain.trim().replace(/\/+$/, '');
    return domain.startsWith('http://') || domain.startsWith('https://') ? domain : `https://${domain}`;
  }

  // 4. Vercel system environment variables (injected during Vercel builds & serverless functions)
  const vercelProductionUrl =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl.replace(/\/+$/, '')}`;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, '')}`;
  }

  // 4. Default fallback: BibleDesk production deployment on Vercel
  return DEFAULT_PRODUCTION_URL;
}
