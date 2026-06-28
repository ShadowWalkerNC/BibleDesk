// BibleDesk — POST /api/mod/invite
// Admin invites a new moderator by email.
// Creates a moderators row and sends a Supabase Auth magic-link invite.
// Auth-gated: admin role only.
//
// Request body:
//   { email: string, name: string, role?: 'moderator' | 'admin' }
//
// Response:
//   200 { success: true, invited: true }
//   400 { success: false, error: '...', code: 'INVALID_INPUT' }
//   401 { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
//   403 { success: false, error: 'Admin only', code: 'FORBIDDEN' }
//   409 { success: false, error: 'Already a moderator', code: 'DUPLICATE' }
//   500 { success: false, error: '...', code: 'INVITE_FAILED' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { inviteModerator } from '@/lib/moderation';

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

// ─── Validators ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (mod.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin role required to invite moderators.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // ── Parse body
  let body: { email?: string; name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const { email, name, role } = body;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: 'A valid email address is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: 'A name of at least 2 characters is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }
  if (role && role !== 'moderator' && role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'role must be "moderator" or "admin".', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  // ── Duplicate check
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: existing } = await svc
    .from('moderators')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'This email is already registered as a moderator.', code: 'DUPLICATE' },
      { status: 409 }
    );
  }

  // ── Invite
  try {
    const ok = await inviteModerator({
      email: email.toLowerCase().trim(),
      name:  name.trim(),
      role:  (role as 'moderator' | 'admin') ?? 'moderator',
      invitedBy: mod.id,
    });

    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Invite failed — check server logs.', code: 'INVITE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, invited: true });
  } catch (err) {
    console.error('[mod/invite] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Invite failed.', code: 'INVITE_FAILED' },
      { status: 500 }
    );
  }
}
