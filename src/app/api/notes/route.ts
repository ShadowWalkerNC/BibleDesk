import { NextRequest, NextResponse } from 'next/server';
import { getDb, studyNotes, users } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_USER_ID = 'user_demo_01';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const verseRef = searchParams.get('verseRef');

    const db = await getDb();
    const query = db
      .select()
      .from(studyNotes)
      .where(eq(studyNotes.userId, userId))
      .orderBy(desc(studyNotes.updatedAt));

    const notes = await query;
    const filtered = verseRef
      ? notes.filter((n: any) => n.verseRef === verseRef)
      : notes;

    return NextResponse.json({
      success: true,
      total: filtered.length,
      notes: filtered,
    });
  } catch (err: any) {
    console.error('[API /notes GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve study notes', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId?.trim() || DEFAULT_USER_ID;
    const verseRef = body.verseRef?.trim() || 'General';
    const title = body.title?.trim() || 'Untitled Note';
    const content = body.content?.trim() || '';
    const tags = Array.isArray(body.tags) ? body.tags : [];

    if (!content && !title) {
      return NextResponse.json(
        { error: 'Note title or content is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Ensure user exists
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@bibledesk.local`,
        name: 'BibleDesk Scholar',
      })
      .onConflictDoNothing();

    const noteId = body.id || `note_${uuidv4().slice(0, 8)}`;
    const now = new Date();

    const [saved] = await db
      .insert(studyNotes)
      .values({
        id: noteId,
        userId,
        verseRef,
        title,
        content,
        tags,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studyNotes.id,
        set: {
          title,
          content,
          tags,
          updatedAt: now,
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      note: saved,
    });
  } catch (err: any) {
    console.error('[API /notes POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to save study note', details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required for deletion' },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db.delete(studyNotes).where(eq(studyNotes.id, id));

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (err: any) {
    console.error('[API /notes DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete study note', details: err.message },
      { status: 500 }
    );
  }
}
