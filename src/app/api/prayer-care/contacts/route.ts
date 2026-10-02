import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiError } from '@/lib/api-response';
import { parseContactInput } from '@/lib/prayer-care';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { prayerContacts, type PrayerContact } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function toContactJson(contact: PrayerContact) {
  return {
    id: contact.id,
    display_name: contact.displayName,
    email: contact.email,
    phone: contact.phone,
    category: contact.category,
    is_sensitive: contact.isSensitive,
    is_archived: contact.isArchived,
    created_at: contact.createdAt.toISOString(),
    updated_at: contact.updatedAt ? contact.updatedAt.toISOString() : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const db = await getDb();
    const data = await db
      .select()
      .from(prayerContacts)
      .where(
        and(
          eq(prayerContacts.userId, user.id),
          eq(prayerContacts.isArchived, false)
        )
      )
      .orderBy(prayerContacts.displayName);
    return NextResponse.json(
      { contacts: data.map(toContactJson) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error, 'GET /api/prayer-care/contacts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const input = parseContactInput(await request.json());
    const db = await getDb();
    const inserted = await db
      .insert(prayerContacts)
      .values({
        id: uuidv4(),
        userId: user.id,
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        category: input.category,
        isSensitive: input.isSensitive,
      })
      .returning();
    const contact = inserted[0];
    if (!contact) throw new Error('Unable to create prayer contact');
    return NextResponse.json({ contact: toContactJson(contact) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/contacts');
  }
}
