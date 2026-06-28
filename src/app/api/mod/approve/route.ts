// BibleDesk — POST /api/mod/approve
// Admin manually promotes a flagged answer to canonical_answers,
// bypassing the vote threshold (e.g. for seed content or obvious accuracy).
// Auth-gated: admin role only.
//
// Request body:
//   { flagId: string }
//
// Response:
//   200 { success: true, promoted: true }
//   400 { success: false, error: '...', code: 'INVALID_INPUT' }
//   401 { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
//   403 { success: false, error: 'Admin only', code: 'FORBIDDEN' }
//   500 { success: false, error: '...', code: 'PROMOTE_FAILED' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promoteToCanonical } from '@/lib/moderation';

// ─── Auth helper ──────────────────────────────────────────────────────────

async function getActiveModerator(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: mod } = await svc
    .from('moderators')
    .select('id, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .single();

  return mod ?? null;
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth
  const mod = await getActiveModerator(req);
  if (!mod) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Admin only — moderators can vote but only admins can force-promote
  if (mod.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin role required to promote answers.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // ── Parse body
  let body: { flagId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const { flagId } = body;
  if (!flagId || typeof flagId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'flagId is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  // ── Promote
  try {
    const promoted = await promoteToCanonical(flagId, mod.id);
    if (!promoted) {
      return NextResponse.json(
        { success: false, error: 'Promotion failed — check server logs.', code: 'PROMOTE_FAILED' },
        { status: 500 }
      );
    }

    // Also resolve the flag itself
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await svc
      .from('flags')
      .update({ status: 'approved' })
      .eq('id', flagId);
    await svc
      .from('answers')
      .update({ status: 'approved' })
      .eq(
        'id',
        (await svc.from('flags').select('answer_id').eq('id', flagId).single()).data?.answer_id
      );

    return NextResponse.json({ success: true, promoted: true });
  } catch (err) {
    console.error('[mod/approve] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Promotion failed.', code: 'PROMOTE_FAILED' },
      { status: 500 }
    );
  }
}
