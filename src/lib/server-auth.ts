import 'server-only';

import { jwtVerify } from 'jose';
import type { AuthUser } from '@/lib/auth';

export class AuthenticationError extends Error {
  status = 401;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new AuthenticationError('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

/**
 * Verifies a JWT access token from the Authorization Bearer header.
 * Route handlers must derive ownership from this result, never request JSON.
 * Throws AuthenticationError if missing, invalid, or expired.
 */
export async function requireUser(request: Request): Promise<AuthUser> {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    throw new AuthenticationError();
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    const id = typeof payload.sub === 'string' ? payload.sub : (payload.id as string | undefined);
    const email = payload.email as string | undefined;

    if (!id || !email) {
      throw new AuthenticationError('Invalid token payload');
    }

    return {
      id,
      email,
      name: (payload.name as string | null) ?? null,
    };
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    throw new AuthenticationError('Invalid or expired session');
  }
}
