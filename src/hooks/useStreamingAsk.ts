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
  ask: (question: string, translation: TranslationId, isNonAI?: boolean) => void;
  retry: () => void;
}

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
  const [lastIsNonAI, setLastIsNonAI] = useState(false);

  const ask = useCallback((question: string, translation: TranslationId, isNonAI = false) => {
    setLastQ(question);
    setLastT(translation);
    setLastIsNonAI(isNonAI);

    setState((prev) => ({
      status: 'loading',
      stages: [],
      answer: null,
      shareSlug: null,
      error: null,
      rateLimit: prev.rateLimit,
    }));

    if (isNonAI) {
      // Direct Non-AI search mode
      fetch('/api/search/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question, translation }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.answer) {
            setState((s) => ({
              ...s,
              status: 'done',
              answer: data.answer,
            }));
          } else {
            setState((s) => ({
              ...s,
              status: 'error',
              error: data.error || 'Failed to complete direct concordance search.',
            }));
          }
        })
        .catch(() => {
          setState((s) => ({
            ...s,
            status: 'error',
            error: 'Failed to complete direct concordance search.',
          }));
        });
      return;
    }

    // AI Streaming Mode
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

          switch (eventType) {
            case 'stage': {
              const p = payload as StageProgress;
              setState((s) => ({ ...s, stages: [...s.stages, p] }));
              break;
            }
            case 'answer': {
              const p = payload as { answer: BibleAnswer; shareSlug: string };
              setState((s) => ({
                ...s,
                answer: p.answer,
                shareSlug: p.shareSlug,
              }));
              break;
            }
            case 'rate_limit': {
              const p = payload as RateLimitInfo;
              setState((s) => ({ ...s, rateLimit: p }));
              break;
            }
            case 'done': {
              setState((s) => ({ ...s, status: 'done' }));
              break;
            }
            case 'error': {
              const p = payload as { message: string };
              setState((s) => ({ ...s, status: 'error', error: p.message }));
              break;
            }
          }
        }
      }
    }).catch(() => {
      setState((s) => ({ ...s, status: 'error', error: 'Network error. Please try again.' }));
    });
  }, []);

  const retry = useCallback(() => {
    if (lastQ) ask(lastQ, lastT, lastIsNonAI);
  }, [ask, lastQ, lastT, lastIsNonAI]);

  return { ...state, ask, retry };
}
