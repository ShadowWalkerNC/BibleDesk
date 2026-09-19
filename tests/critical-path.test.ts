import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { seedDatabase } from '../src/db/seed';

// Import route handlers
import { GET as getSearch } from '../src/app/api/search/route';
import { GET as getCrossRefs } from '../src/app/api/cross-references/route';
import { GET as getCommentary } from '../src/app/api/commentary/route';
import { POST as postResearch } from '../src/app/api/research/route';
import { GET as getNotes, POST as postNotes } from '../src/app/api/notes/route';
import { GET as getCollections, POST as postCollections } from '../src/app/api/collections/route';

describe('Critical Path End-to-End Workflow: Search -> Cross-Refs -> Research -> Notes -> Collections', () => {
  before(async () => {
    await seedDatabase();
  });

  test('Step 1: Search a verse in the database via full-text search', async () => {
    const req = new NextRequest('http://localhost:3000/api/search?q=beginning&type=scripture');
    const res = await getSearch(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.results.scripture.length > 0, 'Should find scripture matches for "beginning"');

    // Verify John 1:1 is found in the search results
    const johnMatch = data.results.scripture.find((s: any) => s.book === 'John' && s.chapter === 1 && s.verse === 1);
    assert.ok(johnMatch, 'John 1:1 should be in the search results');
    assert.ok(johnMatch.text.includes('beginning'), 'Matched text should contain search keyword');
  });

  test('Step 2: View cross-references for the targeted verse', async () => {
    const req = new NextRequest('http://localhost:3000/api/cross-references?reference=John%201:1');
    const res = await getCrossRefs(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.reference, 'John 1:1');
    assert.ok(data.count > 0, 'Should return cross-references from database');
    assert.ok(data.crossReferences.length > 0, 'Cross-references array should not be empty');

    // Verify first cross-reference has target reference and valid structure
    const firstRef = data.crossReferences[0];
    assert.ok(firstRef.target_reference, 'Cross-reference must have target reference');
    assert.ok(typeof firstRef.votes === 'number', 'Cross-reference should include vote count');
  });

  test('Step 3: Retrieve 5-dimension commentary with derived confidence explanation', async () => {
    const req = new NextRequest('http://localhost:3000/api/commentary?reference=John%201:1');
    const res = await getCommentary(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.commentary, 'Commentary object must exist');
    assert.ok(data.commentary.dimensions.scripture, 'Dimension 1 (Scripture) must be present');
    assert.ok(data.commentary.dimensions.historical, 'Dimension 2 (Historical) must be present');
    assert.ok(data.commentary.dimensions.original_language, 'Dimension 3 (Original Language) must be present');
    assert.ok(data.commentary.dimensions.theological, 'Dimension 4 (Theological) must be present');
    assert.ok(data.commentary.dimensions.practical, 'Dimension 5 (Practical) must be present');

    assert.ok(['high', 'moderate', 'low'].includes(data.commentary.confidence.toLowerCase()), 'Confidence rating must be valid tier');
    assert.ok(data.commentary.confidenceDerivation.rationale, 'Confidence derivation rationale must be present');
    assert.ok(data.commentary.confidenceDerivation.factorScores, 'Confidence factor breakdown must be present');
  });

  test('Step 4: Run research assistant with 5D evidence model and traceable citations', async () => {
    const req = new NextRequest('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Examine the theological meaning and original Greek usage of Logos in John 1:1',
        verseRef: 'John 1:1',
      }),
    });

    const res = await postResearch(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.finding.summary.length > 0, 'Research summary must be generated');
    assert.ok(data.finding.dimensions, '5 Dimensions must be structured in finding');
    assert.ok(data.finding.confidence, 'Confidence score must be evaluated');
    assert.ok(data.finding.sources.length > 0, 'Traceable sources with URLs must be provided');
    assert.ok(data.finding.sources[0].url.startsWith('http'), 'Source URL must be valid link');
  });

  test('Step 5: Save personal study note and organize in collection', async () => {
    // 5a: Save note
    const noteReq = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: 'John 1:1',
        title: 'Critical Path Insight on the Word',
        content: 'Personal synthesis: John presents Jesus not merely as a prophet, but as the eternal divine Logos.',
        tags: ['christology', 'logos', 'john'],
      }),
    });

    const noteRes = await postNotes(noteReq);
    assert.strictEqual(noteRes.status, 200);
    const noteData = await noteRes.json();
    assert.strictEqual(noteData.success, true);
    const createdNoteId = noteData.note.id;

    // 5b: Verify note is queryable
    const getNotesReq = new NextRequest('http://localhost:3000/api/notes?reference=John%201:1');
    const getNotesRes = await getNotes(getNotesReq);
    const getNotesData = await getNotesRes.json();
    assert.strictEqual(getNotesData.success, true);
    const foundNote = getNotesData.notes.find((n: any) => n.id === createdNoteId);
    assert.ok(foundNote, 'Created note should be retrievable by reference');

    // 5c: Create study collection
    const colReq = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Johannine Christology Study',
        description: 'Passages and research on the divinity of Christ in John',
        color: '#b58414',
      }),
    });
    const colRes = await postCollections(colReq);
    assert.strictEqual(colRes.status, 200);
    const colData = await colRes.json();
    assert.strictEqual(colData.success, true);
    const collectionId = colData.collection.id;

    // 5d: Verify collection list includes new collection
    const getColsReq = new NextRequest('http://localhost:3000/api/collections');
    const getColsRes = await getCollections(getColsReq);
    const getColsData = await getColsRes.json();
    assert.strictEqual(getColsData.success, true);
    assert.ok(getColsData.collections.some((c: any) => c.id === collectionId), 'Collection must be in user collections');
  });
});
