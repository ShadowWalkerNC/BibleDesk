import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { getDb } from '@/db';
import { googleConnections } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.compose',
] as const;

function required(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_TOKEN_ENCRYPTION_KEY' | 'NEXT_PUBLIC_APP_URL'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function appUrl(): URL {
  const value = new URL(required('NEXT_PUBLIC_APP_URL'));
  if (!['http:', 'https:'].includes(value.protocol)) throw new Error('NEXT_PUBLIC_APP_URL must be HTTP(S)');
  return value;
}

function encryptionKey(): Buffer {
  const configured = required('GOOGLE_TOKEN_ENCRYPTION_KEY');
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(configured)) key = Buffer.from(configured, 'hex');
  else {
    try {
      key = Buffer.from(configured, 'base64');
    } catch {
      key = Buffer.alloc(0);
    }
  }
  if (key.length !== 32) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64 hex characters');
  }
  return key;
}

export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptToken(envelope: string): string {
  const [version, ivValue, tagValue, ciphertextValue, extra] = envelope.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue || extra) {
    throw new Error('Invalid encrypted token envelope');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function stateKey(): string {
  return required('GOOGLE_TOKEN_ENCRYPTION_KEY');
}

export function createOAuthState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({
    userId,
    nonce: randomBytes(24).toString('base64url'),
    expiresAt: Date.now() + 10 * 60 * 1000,
  })).toString('base64url');
  const signature = createHmac('sha256', stateKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string): { userId: string; nonce: string } {
  const [payload, signature, extra] = state.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid OAuth state');
  const expected = createHmac('sha256', stateKey()).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error('Invalid OAuth state');
  }
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    userId?: unknown;
    nonce?: unknown;
    expiresAt?: unknown;
  };
  if (typeof parsed.userId !== 'string' || typeof parsed.nonce !== 'string' ||
      typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now()) {
    throw new Error('Expired OAuth state');
  }
  return { userId: parsed.userId, nonce: parsed.nonce };
}

export function googleAuthorizationUrl(state: string): string {
  const redirectUri = new URL('/api/google/callback', appUrl()).toString();
  const query = new URLSearchParams({
    client_id: required('GOOGLE_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

async function tokenRequest(params: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    cache: 'no-store',
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Google token exchange failed');
  return payload;
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
  email: string;
}> {
  const payload = await tokenRequest(new URLSearchParams({
    code,
    client_id: required('GOOGLE_CLIENT_ID'),
    client_secret: required('GOOGLE_CLIENT_SECRET'),
    redirect_uri: new URL('/api/google/callback', appUrl()).toString(),
    grant_type: 'authorization_code',
  }));
  if (typeof payload.access_token !== 'string') throw new Error('Google did not return an access token');
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${payload.access_token}` },
    cache: 'no-store',
  });
  const profile = await profileResponse.json() as { email?: string };
  if (!profileResponse.ok || !profile.email) throw new Error('Unable to read Google account email');
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    expiresAt: typeof payload.expires_in === 'number'
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null,
    scopes: typeof payload.scope === 'string' ? payload.scope.split(' ') : [...GOOGLE_SCOPES],
    email: profile.email,
  };
}

export async function saveGoogleConnection(
  ownerId: string,
  tokens: Awaited<ReturnType<typeof exchangeGoogleCode>>,
): Promise<void> {
  const db = await getDb();

  // Check for existing refresh token to preserve it
  const existing = await db
    .select({ encryptedRefreshToken: googleConnections.encryptedRefreshToken })
    .from(googleConnections)
    .where(eq(googleConnections.ownerId, ownerId))
    .limit(1);

  await db
    .insert(googleConnections)
    .values({
      ownerId,
      googleAccountEmail: tokens.email,
      encryptedAccessToken: encryptToken(tokens.accessToken),
      encryptedRefreshToken: tokens.refreshToken
        ? encryptToken(tokens.refreshToken)
        : existing[0]?.encryptedRefreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
    })
    .onConflictDoUpdate({
      target: googleConnections.ownerId,
      set: {
        googleAccountEmail: tokens.email,
        encryptedAccessToken: encryptToken(tokens.accessToken),
        encryptedRefreshToken: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : existing[0]?.encryptedRefreshToken ?? null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        updatedAt: new Date(),
      },
    });
}

async function loadGoogleConnection(ownerId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(googleConnections)
    .where(eq(googleConnections.ownerId, ownerId))
    .limit(1);

  if (rows.length === 0) throw new Error('Google account is not connected');
  return rows[0];
}

export async function getGoogleAccessToken(ownerId: string): Promise<string> {
  const connection = await loadGoogleConnection(ownerId);
  const expiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return decryptToken(connection.encryptedAccessToken);
  if (!connection.encryptedRefreshToken) throw new Error('Google connection needs to be re-authorized');

  const payload = await tokenRequest(new URLSearchParams({
    refresh_token: decryptToken(connection.encryptedRefreshToken),
    client_id: required('GOOGLE_CLIENT_ID'),
    client_secret: required('GOOGLE_CLIENT_SECRET'),
    grant_type: 'refresh_token',
  }));
  if (typeof payload.access_token !== 'string') throw new Error('Google token refresh failed');
  const expiresAtIso = typeof payload.expires_in === 'number'
    ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
    : null;

  const db = await getDb();
  await db
    .update(googleConnections)
    .set({
      encryptedAccessToken: encryptToken(payload.access_token),
      tokenExpiresAt: expiresAtIso,
      scopes: typeof payload.scope === 'string' ? payload.scope.split(' ') : connection.scopes,
      updatedAt: new Date(),
    })
    .where(eq(googleConnections.ownerId, ownerId));

  return payload.access_token;
}

export async function googleApi<T>(
  ownerId: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = await getGoogleAccessToken(ownerId);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || `Google API returned ${response.status}`);
  return payload;
}
