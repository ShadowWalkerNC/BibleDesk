// BibleDesk — Server Auth Helper
// Validates incoming Bearer tokens (JWT) across API routes.
// SERVER ONLY

import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export function isJwtConfigured(): boolean {
  return Boolean(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET);
}

/**
 * Signs a stateless 7-day JWT for an authenticated user.
 * Payload: sub=user.id, email, name. Throws when JWT_SECRET is unset.
 */
export async function signAuthToken(user: AuthUser): Promise<string> {
  return await new SignJWT({ email: user.email, name: user.name ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

/**
 * Extracts and verifies the authenticated user from the incoming request.
 * Checks the Authorization header: `Bearer <jwt_token>`.
 * Returns null when the token is missing, invalid, or expired.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return null;
    }

    const { payload } = await jwtVerify(token, getJwtSecret());

    const id = typeof payload.sub === 'string' ? payload.sub : (payload.id as string | undefined);
    const email = payload.email as string | undefined;

    if (!id || !email) return null;

    return {
      id,
      email,
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    // Token invalid or expired — not an error worth logging loudly
    return null;
  }
}
