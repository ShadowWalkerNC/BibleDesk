// BibleDesk — POST /api/mod/approve
// Admin manually promotes a flagged answer to canonical_answers.

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { promoteToCanonical } from '@/lib/moderation';
import { getActiveModerator } from '@/lib/mod-auth';

export async function POST(req: NextRequest) {
  const mod = await getActiveModerator(req);
  if (!mod) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (mod.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin role required to promote answers.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

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

  try {
    const promoted = await promoteToCanonical(flagId, mod.id);
    if (!promoted) {
      return NextResponse.json(
        { success: false, error: 'Promotion failed — check server logs.', code: 'PROMOTE_FAILED' },
        { status: 500 }
      );
    }

    const svc = getServerClient();

    const { data: flagRow } = await svc
      .from('flags')
      .select('answer_id')
      .eq('id', flagId)
      .single();

    await svc
      .from('flags')
      .update({ status: 'approved' })
      .eq('id', flagId);

    if (flagRow?.answer_id) {
      await svc
        .from('answers')
        .update({ status: 'approved' })
        .eq('id', flagRow.answer_id);
    }

    return NextResponse.json({ success: true, promoted: true });
  } catch (err) {
    console.error('[mod/approve] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Promotion failed.', code: 'PROMOTE_FAILED' },
      { status: 500 }
    );
  }
}
