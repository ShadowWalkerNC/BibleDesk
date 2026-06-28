// BibleDesk — GET /api/mod/queue
// Returns all pending flags with answer JSON + vote summaries.
// Auth-gated: caller must be an active moderator (Supabase session).
//
// Response:
//   200 { success: true, queue: FlagQueueItem[] }
//   401 { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
//   500 { success: false, error: '...', code: 'DB_ERROR' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFlagQueue } from '@/lib/moderation';

// ─── Auth helper ──────────────────────────────────────────────────────────
// Validate the Supabase session from the Authorization header and confirm
// the user exists as an active moderator in our moderators table.

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

  // Confirm active moderator row
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
