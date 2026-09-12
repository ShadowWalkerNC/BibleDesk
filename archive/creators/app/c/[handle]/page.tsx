import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CreatorProfileView from '@/components/CreatorProfileView/CreatorProfileView';
import { getCreatorByHandle, DEFAULT_CREATOR_PROFILES } from '@/lib/creatorStore';

interface PageProps {
  params: Promise<{
    handle: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const creator = getCreatorByHandle(handle);

  if (!creator) {
    return {
      title: 'Creator Not Found | BibleDesk',
    };
  }

  return {
    title: `${creator.display_name} (@${creator.handle}) | BibleDesk Christian Creator Hub`,
    description: creator.tagline || creator.bio,
    openGraph: {
      title: `${creator.display_name} | BibleDesk Ministry Page`,
      description: creator.tagline,
      images: creator.avatar_url ? [creator.avatar_url] : [],
    },
  };
}

export default async function CreatorHandlePage({ params }: PageProps) {
  const { handle } = await params;
  const creator = getCreatorByHandle(handle);

  if (!creator) {
    notFound();
  }

  return <CreatorProfileView creator={creator} />;
}
