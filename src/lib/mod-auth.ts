import { NextRequest } from 'next/server';
import { getDb } from '@/db';
import { moderators } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';

export interface ActiveModerator {
  id: string;
  role: 'moderator' | 'admin' | string;
  active: boolean;
  user_id?: string;
}

/**
 * Verifies the JWT Bearer token and checks that the authenticated user
 * has an active moderator row in the moderators table.
 * Returns null if the token is invalid or the user is not an active moderator.
 */
export async function getActiveModerator(req: NextRequest): Promise<ActiveModerator | null> {
  const user = await getAuthenticatedUser(req);
  if (!user) return null;

  try {
    const db = await getDb();
    const rows = await db
      .select({
        id:      moderators.id,
        role:    moderators.role,
        active:  moderators.active,
        user_id: moderators.userId,
      })
      .from(moderators)
      .where(
        and(
          eq(moderators.userId, user.id),
          eq(moderators.active, true)
        )
      )
      .limit(1);

    if (rows.length === 0) return null;

    const mod = rows[0];
    return {
      id:      mod.id,
      role:    mod.role ?? 'moderator',
      active:  mod.active,
      user_id: mod.user_id ?? undefined,
    };
  } catch (err) {
    console.error('[mod-auth] getActiveModerator error:', err);
    return null;
  }
}
