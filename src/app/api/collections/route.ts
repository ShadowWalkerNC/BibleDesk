import { NextRequest, NextResponse } from 'next/server';
import { getDb, studyCollections, collectionItems, users } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_USER_ID = 'user_demo_01';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const collectionId = searchParams.get('id');

    const db = await getDb();

    if (collectionId) {
      const [coll] = await db
        .select()
        .from(studyCollections)
        .where(eq(studyCollections.id, collectionId));

      if (!coll) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      const items = await db
        .select()
        .from(collectionItems)
        .where(eq(collectionItems.collectionId, collectionId))
        .orderBy(desc(collectionItems.createdAt));

      return NextResponse.json({
        success: true,
        collection: coll,
        items,
      });
    }

    const colls = await db
      .select()
      .from(studyCollections)
      .where(eq(studyCollections.userId, userId))
      .orderBy(desc(studyCollections.createdAt));

    // Get item counts for each collection
    const result = [];
    for (const c of colls) {
      const items = await db
        .select()
        .from(collectionItems)
        .where(eq(collectionItems.collectionId, c.id));
      result.push({
        ...c,
        itemCount: items.length,
      });
    }

    return NextResponse.json({
      success: true,
      collections: result,
    });
  } catch (err: any) {
    console.error('[API /collections GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve collections', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'create_collection'; // 'create_collection' | 'add_item'
    const userId = body.userId?.trim() || DEFAULT_USER_ID;

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

    if (action === 'add_item') {
      const { collectionId, itemType, itemRef, notes } = body;
      if (!collectionId || !itemType || !itemRef) {
        return NextResponse.json(
          { error: 'collectionId, itemType, and itemRef are required to add an item' },
          { status: 400 }
        );
      }

      const itemId = `ci_${uuidv4().slice(0, 8)}`;
      const [item] = await db
        .insert(collectionItems)
        .values({
          id: itemId,
          collectionId,
          itemType,
          itemRef,
          notes: notes || null,
        })
        .returning();

      return NextResponse.json({
        success: true,
        item,
      });
    }

    // Default: create a new collection
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    const collId = body.id || `coll_${uuidv4().slice(0, 8)}`;
    const [created] = await db
      .insert(studyCollections)
      .values({
        id: collId,
        userId,
        name,
        description: body.description?.trim() || null,
        color: body.color || '#b58414',
      })
      .returning();

    return NextResponse.json({
      success: true,
      collection: created,
    });
  } catch (err: any) {
    console.error('[API /collections POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to save collection', details: err.message },
      { status: 500 }
    );
  }
}
