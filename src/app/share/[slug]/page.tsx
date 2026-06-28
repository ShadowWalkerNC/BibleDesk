// BibleDesk — /share/[slug]
// SSR page: fetches a stored answer by its 8-char share slug and renders it.
// Includes full OpenGraph + Twitter card meta for rich link previews.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAnswerBySlug } from '@/lib/supabase';
import SharePageClient from './SharePageClient';

// ─── Dynamic metadata for OG previews ─────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const answer   = await getAnswerBySlug(slug);

  if (!answer) {
    return { title: 'Answer not found — BibleDesk' };
  }

  const title       = `${answer.question} — BibleDesk`;
  const description = answer.summary;
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const canonical   = `${appUrl}/share/${slug}`;

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

  if (!answer) notFound();

  return <SharePageClient answer={answer} shareSlug={slug} />;
}
