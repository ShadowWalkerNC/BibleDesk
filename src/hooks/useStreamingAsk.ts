'use client';

import { useState, useCallback } from 'react';
import type { BibleAnswer, TranslationId } from '@/types';

export interface StageProgress {
  stage: number;
  name: string;
  duration_ms: number;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
}

export type StreamStatus = 'idle' | 'loading' | 'done' | 'error';

export interface StreamingAskState {
  status: StreamStatus;
  stages: StageProgress[];
  answer: BibleAnswer | null;
  shareSlug: string | null;
  error: string | null;
  rateLimit: RateLimitInfo | null;
}

export interface UseStreamingAskReturn extends StreamingAskState {
  ask: (question: string, translation: TranslationId) => void;
  retry: () => void;
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Classifying question',
  2: 'Searching Scripture',
  3: 'Checking accuracy',
  4: 'Researching history',
  5: 'Synthesising theology',
  6: 'Assembling answer',
};

export function useStreamingAsk(): UseStreamingAskReturn {
  const [state, setState] = useState<StreamingAskState>({
    status: 'idle',
    stages: [],
    answer: null,
    shareSlug: null,
    error: null,
    rateLimit: null,
  });

  const [lastQ, setLastQ] = useState('');
  const [lastT, setLastT] = useState<TranslationId>('web');

  const ask = useCallback((question: string, translation: TranslationId) => {
    setLastQ(question);
    setLastT(translation);

    setState((prev) => ({
      status: 'loading',
      stages: [],
      answer: null,
      shareSlug: null,
      error: null,
      // preserve previous rateLimit so bar doesn’t disappear while loading
      rateLimit: prev.rateLimit,
    }));

    fetch('/api/ask/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, translation }),
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        setState((s) => ({ ...s, status: 'error', error: 'Server error. Please try again.' }));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const eventMatch = part.match(/^event: (\w+)/);
          const dataMatch  = part.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          let payload: unknown;
          try { payload = JSON.parse(dataMatch[1]); } catch { continue; }

          if (eventType === 'stage') {
            const s = payload as { stage: number; name: string; duration_ms: number };
            setState((prev) => ({
              ...prev,
              stages: [...prev.stages, {
                stage: s.stage,
                name: STAGE_NAMES[s.stage] ?? s.name,
                duration_ms: s.duration_ms,
              }],
            }));
          } else if (eventType === 'answer') {
            const a = payload as BibleAnswer & { shareSlug?: string; rateLimit?: RateLimitInfo };
            const { shareSlug, rateLimit, ...answer } = a;
            setState((prev) => ({
              ...prev,
              status: 'done',
              answer: answer as BibleAnswer,
              shareSlug: shareSlug ?? null,
              rateLimit: rateLimit ?? prev.rateLimit,
            }));
          } else if (eventType === 'error') {
            const e = payload as { message: string; rateLimit?: RateLimitInfo };
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: e.message,
              rateLimit: e.rateLimit ?? prev.rateLimit,
            }));
          }
        }
      }
    }).catch(() => {
      setState((s) => ({ ...s, status: 'error', error: 'Network error. Please check your connection.' }));
    });
  }, []);

  const retry = useCallback(() => {
    if (lastQ) ask(lastQ, lastT);
  }, [ask, lastQ, lastT]);

  return { ...state, ask, retry };
}
