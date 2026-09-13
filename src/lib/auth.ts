// BibleDesk — Server Auth Helper
// Validates incoming Bearer tokens from Supabase Auth across API routes.
// SERVER ONLY

import { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Extracts and verifies the authenticated Supabase user from the incoming request.
 * Checks the Authorization header: `Bearer <jwt_token>`.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<User | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }

    const supabase = getServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('[getAuthenticatedUser] Error validating token:', err);
    return null;
  }
}
