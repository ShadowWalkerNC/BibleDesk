import 'server-only';

import type { User } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase';

export class AuthenticationError extends Error {
  status = 401;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Verifies a Supabase access token with Supabase Auth and returns its user.
 * Route handlers must derive ownership from this result, never request JSON.
 */
export async function requireSupabaseUser(request: Request): Promise<User> {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    throw new AuthenticationError();
  }

  const { data, error } = await getServerClient().auth.getUser(token);
  if (error || !data.user) {
    throw new AuthenticationError('Invalid or expired session');
  }

  return data.user;
}

