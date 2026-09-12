import { MetadataRoute } from 'next';
import { getServerClient } from '@/lib/supabase';
import { getAppUrl } from '@/lib/appUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();

  // Base routes
  const routes = ['', '/bible', '/study-resources'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Fetch shareable answers from Supabase to include in sitemap
  let answersSitemap: MetadataRoute.Sitemap = [];
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping sitemap answer generation: SUPABASE_SERVICE_ROLE_KEY is not set.');
    } else {
      const supabase = getServerClient();
      const { data: answers } = await supabase
        .from('answers')
        .select('share_slug, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (answers) {
        answersSitemap = answers.map((answer) => ({
          url: `${baseUrl}/share/${answer.share_slug}`,
          lastModified: new Date(answer.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }));
      }
    }
  } catch (error) {
    console.error('Sitemap answer generation failed:', error);
  }

  return [...routes, ...answersSitemap];
}
