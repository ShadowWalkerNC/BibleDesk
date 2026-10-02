import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { googleConnections } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const db = await getDb();
    const rows = await db
      .select({
        googleAccountEmail: googleConnections.googleAccountEmail,
        scopes: googleConnections.scopes,
        createdAt: googleConnections.createdAt,
        updatedAt: googleConnections.updatedAt,
      })
      .from(googleConnections)
      .where(eq(googleConnections.ownerId, user.id))
      .limit(1);
    const data = rows[0] ?? null;
    return NextResponse.json({
      connected: Boolean(data),
      accountEmail: data?.googleAccountEmail ?? null,
      scopes: data?.scopes ?? [],
      connectedAt: data?.createdAt ? data.createdAt.toISOString() : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'GET /api/google/status');
  }
}
