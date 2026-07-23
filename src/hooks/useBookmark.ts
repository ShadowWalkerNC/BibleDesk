'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BibleAnswer } from '@/types';

export interface UseBookmarkReturn {
  bookmarked: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

export function useBookmark(answer: BibleAnswer | null, shareSlug: string | null): UseBookmarkReturn {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading,    setLoading]    = useState(false);

  // Check current bookmark state on mount / answer change
  useEffect(() => {
    if (!answer?.id) { setBookmarked(false); return; }
    fetch(`/api/bookmarks?check=${encodeURIComponent(answer.id)}`)
      .then((r) => r.json())
      .then((d) => setBookmarked(!!d.bookmarked))
      .catch(() => {});
     
  }, [answer?.id]);

  const toggle = useCallback(async () => {
    if (!answer || !shareSlug || loading) return;
    setLoading(true);
    try {
      if (bookmarked) {
        const res = await fetch('/api/bookmarks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerId: answer.id }),
        });
        if (res.ok) setBookmarked(false);
      } else {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answerId:   answer.id,
            shareSlug,
            question:   answer.question,
            summary:    answer.summary ?? null,
            translation: answer.translation_used ?? null,
            confidence: answer.confidence ?? null,
          }),
        });
        if (res.ok) setBookmarked(true);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [answer, shareSlug, bookmarked, loading]);

  return { bookmarked, loading, toggle };
}
