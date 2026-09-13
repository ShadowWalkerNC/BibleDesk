import { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/appUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/api/v1/', '/mod'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
