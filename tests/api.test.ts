import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { GET as getChapter } from '../src/app/api/bible/chapter/route';
import { GET as getCrossReferences } from '../src/app/api/cross-references/route';
import { GET as getCommentary } from '../src/app/api/commentary/route';
import { POST as postResearch } from '../src/app/api/research/route';
import { GET as getNotes, POST as postNote, DELETE as deleteNote } from '../src/app/api/notes/route';
import { GET as getCollections, POST as postCollection } from '../src/app/api/collections/route';
import { GET as getSearch } from '../src/app/api/search/route';
import { seedDatabase } from '../src/db/seed';

describe('BibleDesk Core Backend API Routes', () => {
  before(async () => {
    await seedDatabase();
  });

  test('GET /api/bible/chapter returns scripture from database', async () => {
    const req = new NextRequest('http://localhost:3000/api/bible/chapter?book=John&chapter=1&translation=web');
    const res = await getChapter(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.source, 'database');
    assert.ok(body.passage.verses.length > 0);
    assert.strictEqual(body.passage.verses[0].verse, 1);
    assert.ok(body.passage.verses[0].text.includes('In the beginning was the Word'));
  });

  test('GET /api/cross-references surfaces related verses with text from DB', async () => {
    const req = new NextRequest('http://localhost:3000/api/cross-references?book=Genesis&chapter=1&verse=1');
    const res = await getCrossReferences(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.crossReferences.length > 0);
    assert.ok(body.crossReferences[0].reference);
  });

  test('GET /api/commentary returns structured 5D evidence and confidence explanation', async () => {
    const req = new NextRequest('http://localhost:3000/api/commentary?verseRef=John 1:1');
    const res = await getCommentary(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    const comm = body.commentary;
    assert.strictEqual(comm.verseRef, 'John 1:1');
    assert.strictEqual(comm.confidence, 'high');
    assert.ok(comm.dimensions.scripture);
    assert.ok(comm.dimensions.historical);
    assert.ok(comm.dimensions.original_language);
    assert.ok(comm.dimensions.theological);
    assert.ok(comm.dimensions.practical);
    assert.ok(comm.confidenceDerivation.rationale);
    assert.ok(comm.confidenceDerivation.factorScores);
  });

  test('POST /api/research processes research query, evaluates confidence, and cites real sources', async () => {
    const req = new NextRequest('http://localhost:3000/api/research', {
      method: 'POST',
      body: JSON.stringify({
        query: 'What is the historical background and meaning of Logos in John 1:1?',
        verseRef: 'John 1:1',
        userId: 'user_demo_01',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postResearch(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    const { finding } = body;
    assert.ok(finding.id);
    assert.strictEqual(finding.verseRef, 'John 1:1');
    assert.ok(finding.sources.length >= 2, 'Expected real sources');
    assert.ok(finding.sources[0].url.startsWith('https://'), 'Sources must be real URLs');
    assert.ok(finding.confidenceDerivation.rationale);
  });

  test('CRUD /api/notes persists and deletes notes per user', async () => {
    const testId = 'test_note_' + Date.now();
    // 1. Create note
    const postReq = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        id: testId,
        userId: 'user_demo_01',
        verseRef: 'John 3:16',
        title: 'Unconditional Love',
        content: 'God gave His unique Son (monogenes) so all who believe have life.',
        tags: ['gospel', 'grace'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const postRes = await postNote(postReq);
    assert.strictEqual(postRes.status, 200);

    // 2. Fetch notes
    const getReq = new NextRequest('http://localhost:3000/api/notes?userId=user_demo_01');
    const getRes = await getNotes(getReq);
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    const created = getBody.notes.find((n: any) => n.id === testId);
    assert.ok(created);
    assert.strictEqual(created.title, 'Unconditional Love');

    // 3. Delete note
    const delReq = new NextRequest(`http://localhost:3000/api/notes?id=${testId}`, { method: 'DELETE' });
    const delRes = await deleteNote(delReq);
    assert.strictEqual(delRes.status, 200);
  });

  test('POST and GET /api/collections organizes study collections and items', async () => {
    const collId = 'test_coll_' + Date.now();
    const createReq = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        id: collId,
        userId: 'user_demo_01',
        name: 'Gospel of Grace Collection',
        description: 'Key passages on sovereign grace and salvation.',
        color: '#059669',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const createRes = await postCollection(createReq);
    assert.strictEqual(createRes.status, 200);

    // Add item to collection
    const addItemReq = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        action: 'add_item',
        collectionId: collId,
        itemType: 'verse',
        itemRef: 'John 3:16',
        notes: 'Golden verse of the New Testament',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const addItemRes = await postCollection(addItemReq);
    assert.strictEqual(addItemRes.status, 200);

    // Retrieve collection with items
    const getReq = new NextRequest(`http://localhost:3000/api/collections?id=${collId}`);
    const getRes = await getCollections(getReq);
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.collection.name, 'Gospel of Grace Collection');
    assert.strictEqual(getBody.items.length, 1);
    assert.strictEqual(getBody.items[0].itemRef, 'John 3:16');
  });

  test('GET /api/search performs search across scripture, commentary, and notes', async () => {
    const req = new NextRequest('http://localhost:3000/api/search?q=beginning&scope=all');
    const res = await getSearch(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.results.totalCount > 0);
    assert.ok(body.results.scripture.length > 0, 'Expected scripture matches for "beginning"');
    assert.ok(body.results.scripture.some((v: any) => v.book === 'John' || v.book === 'Genesis'));
  });
});
