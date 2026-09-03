import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { createOAuthState, googleAuthorizationUrl } from '@/lib/google-oauth';
import { requireSupabaseUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const state = createOAuthState(user.id);
    const response = NextResponse.json({ authorizationUrl: googleAuthorizationUrl(state) });
    response.cookies.set('bibledesk_google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/api/google/callback',
    });
    return response;
  } catch (error) {
    return apiError(error, 'POST /api/google/connect/start');
  }
}

