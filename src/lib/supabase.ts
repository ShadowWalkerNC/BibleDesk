// BibleDesk — Supabase client
// Two exports: serverClient (service role, server-only) and browserClient (anon, safe in browser)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser-safe client (anon key, respects RLS)
export const browserClient = createClient(supabaseUrl, supabaseAnonKey);

// Server-only client (service role, bypasses RLS for admin ops)
// SECURITY: Never expose supabaseServiceKey to the browser
export function getServerClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — server client unavailable');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// ── Type-safe DB helpers ────────────────────────────────────────────────────

import type { BibleAnswer } from '@/types';

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
