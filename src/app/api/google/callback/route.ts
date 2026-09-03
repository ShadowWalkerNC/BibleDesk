import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, saveGoogleConnection, verifyOAuthState } from '@/lib/google-oauth';

function prayerRedirect(status: 'connected' | 'error'): URL {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new URL(`/prayer?google=${status}#prayer-care`, base);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set('bibledesk_google_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/api/google/callback',
  });
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const cookieState = request.cookies.get('bibledesk_google_oauth_state')?.value;

  try {
    if (!state || !code || !cookieState || state !== cookieState) {
      throw new Error('Invalid OAuth state');
    }
    const { userId } = verifyOAuthState(state);
    const tokens = await exchangeGoogleCode(code);
    await saveGoogleConnection(userId, tokens);
    const response = NextResponse.redirect(prayerRedirect('connected'));
    clearStateCookie(response);
    return response;
  } catch (error) {
    console.error('GET /api/google/callback', error);
    const response = NextResponse.redirect(prayerRedirect('error'));
    clearStateCookie(response);
    return response;
  }
}
