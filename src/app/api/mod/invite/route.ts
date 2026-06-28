// BibleDesk — POST /api/mod/invite
// Admin invites a new moderator by email.

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { inviteModerator } from '@/lib/moderation';
import { getActiveModerator } from '@/lib/mod-auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      { success: false, error: 'Admin role required to invite moderators.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

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

  const svc = getServerClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing } = await svc
    .from('moderators')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'This email is already registered as a moderator.', code: 'DUPLICATE' },
      { status: 409 }
    );
  }

  try {
    const ok = await inviteModerator({
      email: normalizedEmail,
      name: name.trim(),
      role: (role as 'moderator' | 'admin') ?? 'moderator',
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
