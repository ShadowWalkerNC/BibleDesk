import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { googleConnections } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const db = await getDb();
    await db
      .delete(googleConnections)
      .where(eq(googleConnections.ownerId, user.id));
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/google/disconnect');
  }
}
