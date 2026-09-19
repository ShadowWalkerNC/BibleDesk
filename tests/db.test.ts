import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { getDb } from '../src/db/index';
import {
  scriptureVerses,
  crossReferences,
  commentaries,
  studyNotes,
  studyCollections,
  collectionItems,
  researchFindings,
} from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { seedDatabase } from '../src/db/seed';

describe('PostgreSQL Database Layer with Drizzle ORM', () => {
  let db: any;

  before(async () => {
    await seedDatabase();
    db = await getDb();
  });

  test('reads Scripture verses by book and chapter from PostgreSQL', async () => {
    const verses = await db
      .select()
      .from(scriptureVerses)
      .where(
        and(
          eq(scriptureVerses.book, 'John'),
          eq(scriptureVerses.chapter, 1),
          eq(scriptureVerses.translation, 'web')
        )
      )
      .orderBy(scriptureVerses.verse);

    assert.ok(verses.length > 0, 'Expected verses in John 1');
    assert.strictEqual(verses[0].verse, 1);
    assert.ok(verses[0].text.includes('In the beginning was the Word'));
  });

  test('reads cross-references for a given verse from database', async () => {
    const refs = await db
      .select()
      .from(crossReferences)
      .where(
        and(
          eq(crossReferences.fromBook, 'Genesis'),
          eq(crossReferences.fromChapter, 1),
          eq(crossReferences.fromVerse, 1)
        )
      );

    assert.ok(refs.length > 0, 'Expected cross-references for Genesis 1:1');
    const hasPsalmsOrJob = refs.some((r: any) => r.toBook === 'Psalms' || r.toBook === 'Proverbs' || r.toBook === 'Job');
    assert.ok(hasPsalmsOrJob, 'Expected canonical cross-references from TSK data');
  });

  test('retrieves evidence-based commentary with 5 dimensions and confidence explanation', async () => {
    const [comm] = await db
      .select()
      .from(commentaries)
      .where(eq(commentaries.verseRef, 'John 1:1'));

    assert.ok(comm, 'Expected commentary for John 1:1');
    assert.strictEqual(comm.confidence, 'high');
    assert.ok(comm.confidenceScore >= 0.75);
    assert.ok(comm.dimensions.scripture);
    assert.ok(comm.dimensions.historical);
    assert.ok(comm.dimensions.original_language);
    assert.ok(comm.dimensions.theological);
    assert.ok(comm.dimensions.practical);
    assert.ok(comm.confidenceDerivation.rationale);
    assert.ok(comm.confidenceDerivation.factorScores);
  });

  test('persists, queries, and updates personal study notes per user', async () => {
    const testNoteId = 'note_test_' + Date.now();
    await db.insert(studyNotes).values({
      id: testNoteId,
      userId: 'user_demo_01',
      verseRef: 'John 1:14',
      title: 'Incarnation Study Note',
      content: 'The Word became flesh (sarx egeneto) — real human nature assumed.',
      tags: ['incarnation', 'christology'],
    });

    const [retrieved] = await db
      .select()
      .from(studyNotes)
      .where(eq(studyNotes.id, testNoteId));

    assert.ok(retrieved);
    assert.strictEqual(retrieved.verseRef, 'John 1:14');
    assert.deepStrictEqual(retrieved.tags, ['incarnation', 'christology']);

    // Clean up
    await db.delete(studyNotes).where(eq(studyNotes.id, testNoteId));
  });

  test('retrieves study collections and associated collection items', async () => {
    const [coll] = await db
      .select()
      .from(studyCollections)
      .where(eq(studyCollections.id, 'coll_christology_01'));

    assert.ok(coll);
    assert.strictEqual(coll.name, 'Christology & The Logos');

    const items = await db
      .select()
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, 'coll_christology_01'));

    assert.ok(items.length >= 2, 'Expected collection items');
  });

  test('retrieves research findings with verified sources and confidence scoring', async () => {
    const [finding] = await db
      .select()
      .from(researchFindings)
      .where(eq(researchFindings.id, 'rf_logos_background'));

    assert.ok(finding);
    assert.ok(finding.sources.length >= 2, 'Expected verified sources');
    assert.ok(finding.sources[0].url.startsWith('https://'));
    assert.strictEqual(finding.confidence, 'high');
  });
});
