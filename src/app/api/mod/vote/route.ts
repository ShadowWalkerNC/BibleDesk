// BibleDesk — POST /api/mod/vote
// Submit a moderator vote on a flagged answer.
// Auth-gated: active moderator only.
//
// Request body:
//   { flagId: string, vote: 'accurate' | 'inaccurate',
//     correction?: string, scriptureRefs?: string[] }
//
// Response:
//   200 { success: true, voteId: string, resolved: boolean }
//   400 { success: false, error: '...', code: 'INVALID_INPUT' }
//   401 { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
//   409 { success: false, error: 'Already voted', code: 'DUPLICATE_VOTE' }
//   500 { success: false, error: '...', code: 'DB_ERROR' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { castVote } from '@/lib/moderation';

// ─── Auth helper (shared pattern — extract to lib/mod-auth.ts in Phase 4) ───

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

  // ── Parse body
  let body: {
    flagId?: string;
    vote?: string;
    correction?: string;
    scriptureRefs?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const { flagId, vote, correction, scriptureRefs } = body;

  if (!flagId || typeof flagId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'flagId is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }
  if (vote !== 'accurate' && vote !== 'inaccurate') {
    return NextResponse.json(
      { success: false, error: 'vote must be "accurate" or "inaccurate".', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }
  if (correction && typeof correction !== 'string') {
    return NextResponse.json(
      { success: false, error: 'correction must be a string.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }
  if (scriptureRefs && !Array.isArray(scriptureRefs)) {
    return NextResponse.json(
      { success: false, error: 'scriptureRefs must be an array.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  // ── Duplicate vote check (DB unique constraint will also catch this,
  //    but we give a cleaner 409 before hitting the DB)
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: existing } = await svc
    .from('moderation_votes')
    .select('id')
    .eq('flag_id', flagId)
    .eq('moderator_id', mod.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'You have already voted on this flag.', code: 'DUPLICATE_VOTE' },
      { status: 409 }
    );
  }

  // ── Cast vote
  try {
    const voteId = await castVote({
      flagId,
      moderatorId:   mod.id,
      vote:          vote as 'accurate' | 'inaccurate',
      correction:    correction?.trim(),
      scriptureRefs: scriptureRefs?.map((r: string) => r.trim()).filter(Boolean),
    });

    if (!voteId) {
      return NextResponse.json(
        { success: false, error: 'Failed to record vote.', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, voteId });
  } catch (err) {
    console.error('[mod/vote] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to record vote.', code: 'DB_ERROR' },
      { status: 500 }
    );
  }
}
