import { MetadataRoute } from 'next';
import { getDb } from '@/db';
import { answers } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getAppUrl } from '@/lib/appUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();

  const routes = ['', '/bible', '/study-resources', '/prayer', '/developers', '/download'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  let answersSitemap: MetadataRoute.Sitemap = [];
  try {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping sitemap answer generation: DATABASE_URL is not set.');
    } else {
      const db = await getDb();
      const rows = await db
        .select({ shareSlug: answers.shareSlug, createdAt: answers.createdAt })
        .from(answers)
        .orderBy(desc(answers.createdAt))
        .limit(1000);

      answersSitemap = rows
        .filter((r) => r.shareSlug)
        .map((r) => ({
          url: `${baseUrl}/share/${r.shareSlug}`,
          lastModified: r.createdAt,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }));
    }
  } catch (error) {
    console.error('Sitemap answer generation failed:', error);
  }

  return [...routes, ...answersSitemap];
}
