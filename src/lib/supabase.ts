// BibleDesk — Supabase client
// Two exports: serverClient (service role, server-only) and browserClient (anon, safe in browser)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy-init: clients are only created when first used, not at module load time.
// This prevents build-time failures when env vars aren't set.

let _browserClient: SupabaseClient | null = null;
let _serverClient: SupabaseClient | null = null;

// Browser-safe client (anon key, respects RLS)
export function getBrowserClient(): SupabaseClient {
  if (!_browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase URL/Anon key missing; using dummy credentials for offline client initialization.');
    }
    _browserClient = createClient(url, key);
  }
  return _browserClient;
}

// Server-only client (service role, bypasses RLS for admin ops)
// SECURITY: Never expose SUPABASE_SERVICE_ROLE_KEY to the browser
export function getServerClient(): SupabaseClient {
  if (!_serverClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    _serverClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return _serverClient;
}

// ── Type-safe DB helpers ────────────────────────────────────────────────────

import type { BibleAnswer } from '@/types';
import { writeGraphFromAnswer } from '@/lib/graph';

export async function saveAnswer(answer: BibleAnswer): Promise<string | null> {
  const client = getServerClient();
  const slug = answer.id.slice(0, 8); // short slug for sharing

  const { error } = await client.from('answers').insert({
    id: answer.id,
    question: answer.question,
    answer_json: answer,
    translation: answer.translation_used,
    share_slug: slug,
    created_at: answer.created_at,
  });

  if (error) {
    console.error('Supabase saveAnswer error:', error.message);
    return null;
  }

  // Fire-and-forget: populate the knowledge graph from this answer.
  // Non-blocking — graph failures never surface to the user.
  writeGraphFromAnswer(answer, answer.id).catch((err) =>
    console.warn('writeGraphFromAnswer failed (non-fatal):', err)
  );

  return slug;
}

export async function getAnswerBySlug(slug: string): Promise<BibleAnswer | null> {
  const client = getServerClient();

  const { data, error } = await client
    .from('answers')
    .select('answer_json')
    .eq('share_slug', slug)
    .single();

  if (error || !data) return null;
  return data.answer_json as BibleAnswer;
}

export async function getAnswerById(id: string): Promise<BibleAnswer | null> {
  const client = getServerClient();

  const { data, error } = await client
    .from('answers')
    .select('answer_json')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data.answer_json as BibleAnswer;
}
