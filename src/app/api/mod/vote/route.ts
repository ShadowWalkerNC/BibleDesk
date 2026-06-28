// BibleDesk — POST /api/mod/vote
// Submit a moderator vote on a flagged answer.

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { castVote } from '@/lib/moderation';
import { getActiveModerator } from '@/lib/mod-auth';

export async function POST(req: NextRequest) {
  const mod = await getActiveModerator(req);
  if (!mod) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

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

  const svc = getServerClient();
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

  try {
    const voteId = await castVote({
      flagId,
      moderatorId: mod.id,
      vote: vote as 'accurate' | 'inaccurate',
      correction: correction?.trim(),
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
