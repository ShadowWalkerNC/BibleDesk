import test from 'node:test';
import assert from 'node:assert/strict';
import { createBibleDeskClient, BibleDeskClient } from '../dist/esm/index.mjs';

test('@bibledesk/sdk initializes with default and custom base URLs', () => {
  const clientDefault = createBibleDeskClient();
  assert.ok(clientDefault instanceof BibleDeskClient);

  const clientCustom = createBibleDeskClient({
    baseUrl: 'https://my-bibledesk.org',
    apiKey: 'custom-gemini-key',
  });
  assert.ok(clientCustom instanceof BibleDeskClient);
});

test('@bibledesk/sdk exposes all core API domains including study, notes, and graph', () => {
  const client = createBibleDeskClient({ baseUrl: 'http://localhost:3000' });
  assert.ok(typeof client.bible.getChapter === 'function');
  assert.ok(typeof client.bible.search === 'function');
  assert.ok(typeof client.bible.getLexicon === 'function');
  assert.ok(typeof client.study.getCommentary === 'function');
  assert.ok(typeof client.study.getCrossReferences === 'function');
  assert.ok(typeof client.study.research === 'function');
  assert.ok(typeof client.notes.list === 'function');
  assert.ok(typeof client.notes.create === 'function');
  assert.ok(typeof client.notes.delete === 'function');
  assert.ok(typeof client.graph.query === 'function');
  assert.ok(typeof client.prayer.list === 'function');
  assert.ok(typeof client.prayer.submit === 'function');
  assert.ok(typeof client.prayer.escalate === 'function');
  assert.ok(typeof client.church.list === 'function');
  assert.ok(typeof client.church.register === 'function');
  assert.ok(typeof client.export.getObsidianVault === 'function');
  assert.ok(typeof client.mcp.getSetupConfig === 'function');
});

test('@bibledesk/sdk generates valid MCP configs for Claude, Cursor, and Muse', () => {
  const client = createBibleDeskClient({ baseUrl: 'http://localhost:3000' });
  const claudeConfig = client.mcp.getSetupConfig('claude');
  assert.ok(claudeConfig.mcpServers.bibledesk.command === 'npx');
  assert.equal(claudeConfig.mcpServers.bibledesk.env.BIBLEDESK_URL, 'http://localhost:3000');

  const cursorConfig = client.mcp.getSetupConfig('cursor');
  assert.equal(cursorConfig.mcpServers.bibledesk.url, 'http://localhost:3000/api/mcp');

  const museConfig = client.mcp.getSetupConfig('muse');
  assert.deepEqual(museConfig.tools, ['@bibledesk/mcp-server']);
  assert.equal(museConfig.env.BIBLEDESK_URL, 'http://localhost:3000');
});

