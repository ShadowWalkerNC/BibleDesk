// BibleDesk — /share/[slug]
// SSR page: fetches a stored answer by its 8-char share slug and renders it.
// Includes full OpenGraph + Twitter card meta for rich link previews.

import type { Metadata } from 'next';
import { getAnswerBySlug } from '@/lib/supabase';
import { getAppUrl } from '@/lib/appUrl';
import SharePageClient from './SharePageClient';

// ─── Dynamic metadata for OG previews ─────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const answer   = await getAnswerBySlug(slug);

  const appUrl = getAppUrl();
  const canonical = `${appUrl}/share/${slug}`;

  if (!answer) {
    return {
      title: 'Shared Study — BibleDesk',
      description: 'Explore deep 5-dimension sourced biblical answers on BibleDesk.',
      alternates: { canonical },
    };
  }

  const title       = `${answer.question} — BibleDesk`;
  const description = answer.summary;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url:      canonical,
      siteName: 'BibleDesk',
      type:     'article',
    },
    twitter: {
      card:        'summary',
      title,
      description,
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function SharePage({ params }: Props) {
  const { slug } = await params;
  const answer   = await getAnswerBySlug(slug);

  return <SharePageClient initialAnswer={answer} shareSlug={slug} />;
}
