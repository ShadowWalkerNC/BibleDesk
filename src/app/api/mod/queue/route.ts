// BibleDesk — GET /api/mod/queue
// Returns all pending flags with answer JSON + vote summaries.
// Auth-gated: caller must be an active moderator (Supabase session).

import { NextRequest, NextResponse } from 'next/server';
import { getFlagQueue } from '@/lib/moderation';
import { getActiveModerator } from '@/lib/mod-auth';

export async function GET(req: NextRequest) {
  const mod = await getActiveModerator(req);
  if (!mod) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const queue = await getFlagQueue();
    return NextResponse.json({ success: true, queue });
  } catch (err) {
    console.error('[mod/queue] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load moderation queue.', code: 'DB_ERROR' },
      { status: 500 }
    );
  }
}
