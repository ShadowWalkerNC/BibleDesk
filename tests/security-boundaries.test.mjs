import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

// Execute real route modules with an isolated, in-memory Supabase boundary.
// No network, credentials, live records, or provider calls are used.
function moduleAt(file, imports, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require(name) {
      if (!(name in imports)) throw Error('Unexpected dependency: ' + name);
      return imports[name];
    }, console, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test' } },
    ...globals,
  }, { filename: file });
  return exports;
}

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const OWN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function setup(overrides = {}) {
  const tables = {
    sermon_notes: [{ id: OWN, user_id: A, title: 'A', content: 'Private A' }, { id: OTHER, user_id: B, title: 'B', content: 'Private B' }],
    prayer_requests: [
      { id: OWN, user_id: A, request: 'Public prayer', display_name: 'Hidden name', status: 'published', escalation_level: 'atlas', is_restricted: false, is_restricted_region: false, deleted_at: null, privacy_mode: 'approximate', is_anonymous: true, latitude: 35.12, longitude: -80.1, wrapped_dek: 'secret', text_ciphertext: 'secret' },
      { id: OTHER, user_id: B, request: 'Private B', status: 'pending', escalation_level: 'private', deleted_at: null },
    ],
    churches: [{ id: 'church-a', admin_user_id: A }, { id: 'church-b', admin_user_id: B }],
  };
  const db = {
    auth: { getUser: async token => ({ data: { user: token === 'token-a' ? { id: A } : token === 'token-b' ? { id: B } : null }, error: null }) },
    from(table) {
      let operation = 'read', payload, fields = '*', single = false;
      const filters = [];
      const q = {
        select(value = '*') { fields = value; return q; },
        eq(key, value) { filters.push(row => row[key] === value); return q; },
        is(key, value) { filters.push(row => row[key] === value); return q; },
        in(key, values) { filters.push(row => values.includes(row[key])); return q; },
        order() { return q; }, limit() { return q; },
        maybeSingle() { single = true; return q; }, single() { single = true; return q; },
        update(value) { operation = 'update'; payload = value; return q; },
        insert(value) { operation = 'insert'; payload = value; return q; },
        delete() { operation = 'delete'; return q; },
        then(resolve, reject) {
          try {
            if (overrides.databaseError) return Promise.resolve({ data: null, error: { message: 'Missing column' } }).then(resolve, reject);
            let rows = (tables[table] || []).filter(row => filters.every(filter => filter(row)));
            if (operation === 'update') rows.forEach(row => Object.assign(row, payload));
            if (operation === 'delete') tables[table] = tables[table].filter(row => !rows.includes(row));
            if (operation === 'insert') { const row = { id: 'new-record', ...payload }; tables[table].push(row); rows = [row]; }
            const result = rows.map(row => fields === '*' ? { ...row } : Object.fromEntries(fields.split(',').map(key => [key, row[key]])));
            return Promise.resolve({ data: single ? result[0] || null : result, error: null }).then(resolve, reject);
          } catch (err) { return Promise.reject(err).then(resolve, reject); }
        },
      };
      return q;
    },
  };
  const imports = { 'next/server': { NextRequest, NextResponse }, '@/lib/supabase': { getServerClient: () => db }, '@/lib/rate-limit': { checkRateLimit: async () => ({ allowed: true }) } };
  imports['@/lib/auth'] = moduleAt('src/lib/auth.ts', imports);
  return {
    tables,
    sermons: moduleAt('src/app/api/sermons/route.ts', imports),
    prayer: moduleAt('src/app/api/prayer/route.ts', imports),
    escalate: moduleAt('src/app/api/prayer/escalate/route.ts', imports),
  };
}
function request(method, path, body, token = 'token-a') {
  return new NextRequest('http://localhost' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test('guest and invalid tokens cannot operate on sermons or escalation', async () => {
  const { sermons, escalate } = setup();
  for (const token of [null, 'invalid']) {
    assert.equal((await sermons.GET(request('GET', '/?userId=' + A, null, token))).status, 401);
    assert.equal((await sermons.POST(request('POST', '/', { user_id: A, title: 'attack', content: 'attack' }, token))).status, 401);
    assert.equal((await sermons.DELETE(request('DELETE', '/?id=' + OWN + '&userId=' + A, null, token))).status, 401);
    assert.equal((await escalate.POST(request('POST', '/', { prayerId: OWN, targetLevel: 'atlas' }, token))).status, 401);
  }
});
test('sermon reads and creates derive identity from the verified token', async () => {
  const { sermons, tables } = setup();
  const result = await (await sermons.GET(request('GET', '/?userId=' + B))).json();
  assert.deepEqual(result.outlines.map(row => row.user_id), [A]);
  const created = await sermons.POST(request('POST', '/', { user_id: B, title: 'New', content: 'Text' }));
  assert.equal(created.status, 200);
  assert.equal(tables.sermon_notes.at(-1).user_id, A);
});
test('another user cannot update, delete, or publish a sermon', async () => {
  const { sermons, tables } = setup();
  assert.equal((await sermons.POST(request('POST', '/', { id: OTHER, user_id: B, title: 'Attack', content: 'Attack', publishToDiscord: true }))).status, 404);
  assert.equal((await sermons.DELETE(request('DELETE', '/?id=' + OTHER + '&userId=' + B))).status, 404);
  assert.equal(tables.sermon_notes.find(row => row.id === OTHER).content, 'Private B');
  assert.equal((await sermons.POST(request('POST', '/', { id: OWN, title: 'Updated', content: 'New text' }))).status, 200);
  assert.equal((await sermons.DELETE(request('DELETE', '/?id=' + OWN))).status, 200);
});
test('public feed excludes all private states and strips sensitive fields and coordinates', async () => {
  const { prayer, tables } = setup();
  for (const variation of [
    { escalation_level: 'church' }, { escalation_level: 'circle' }, { escalation_level: 'private' },
    { status: 'pending' }, { is_restricted: true }, { is_restricted_region: true },
    { privacy_mode: 'restricted' }, { deleted_at: '2026-01-01' },
  ]) tables.prayer_requests.push({ ...tables.prayer_requests[0], id: JSON.stringify(variation), ...variation });
  const result = await (await prayer.GET()).json();
  assert.equal(result.prayers.length, 1);
  assert.equal(result.prayers[0].display_name, 'Anonymous');
  assert.equal(result.prayers[0].latitude, null);
  for (const key of ['user_id', 'wrapped_dek', 'text_ciphertext']) assert.equal(key in result.prayers[0], false);
  assert.equal((await setup({ databaseError: true }).prayer.GET()).status, 503);
});
test('submission ignores forged owner and publication status; restricted content stays private', async () => {
  const { prayer, tables } = setup();
  const response = await prayer.POST(request('POST', '/', { request: 'Please pray for me.', user_id: B, status: 'published', privacy_mode: 'restricted', latitude: 12, longitude: 34 }));
  assert.equal(response.status, 201);
  const row = tables.prayer_requests.at(-1);
  assert.equal(row.user_id, A); assert.equal(row.status, 'pending');
  assert.equal(row.escalation_level, 'private'); assert.equal(row.latitude, null);
  assert.equal(row.display_name, 'Anonymous');
});
test('escalation enforces ownership, restriction and destination authorization', async () => {
  const { escalate, tables } = setup();
  const call = body => escalate.POST(request('POST', '/', body));
  assert.equal((await call({ prayerId: OTHER, targetLevel: 'atlas' })).status, 404);
  assert.equal((await call({ prayerId: OWN, targetLevel: 'church', churchId: 'church-b' })).status, 403);
  assert.equal((await call({ prayerId: OWN, targetLevel: 'circle' })).status, 409);
  assert.equal((await call({ prayerId: OWN, targetLevel: 'church', churchId: 'church-a' })).status, 200);
  assert.equal((await call({ prayerId: OWN, targetLevel: 'atlas' })).status, 200);
  assert.equal(tables.prayer_requests[0].status, 'pending');
  tables.prayer_requests[0].is_restricted = true;
  assert.equal((await call({ prayerId: OWN, targetLevel: 'atlas' })).status, 403);
  assert.equal((await call({ prayerId: OWN, targetLevel: 'private' })).status, 200);
});

function loginHarness({ configured = true, signUp = false, error = null } = {}) {
  const writes = [], messages = [], routes = [], events = [];
  let hook = 0;
  const values = [signUp, 'student@example.com', 'password', false, 'Student', '', 'member', false, null];
  const auth = {
    signInWithPassword: async () => ({ error }),
    signInWithOAuth: async () => ({ error }),
    signUp: async () => ({ data: { session: null }, error }),
  };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { useState: initial => { const index = hook++; return [index < values.length ? values[index] : initial, value => { if (index === 8) messages.push(value); }]; }, useEffect() {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: path => routes.push(path), refresh() {} }) },
    'lucide-react': {}, '@/lib/supabase': { getBrowserClient: () => ({ auth }), isSupabaseConfigured: () => configured },
    '@/lib/syncGuestData': { syncGuestDataToAccount: async () => ({}) }, './page.module.css': { default: {} },
  };
  const component = moduleAt('src/app/login/page.tsx', imports, {
    localStorage: { setItem: (...args) => writes.push(args) }, window: { dispatchEvent: event => events.push(event.type), location: { origin: 'https://test.example' } },
    Event, setTimeout: callback => callback(),
  }).default();
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
      const match = find(child, predicate); if (match) return match;
    }
    return null;
  }
  return { writes, messages, routes, events,
    submit: () => find(component, node => node.type === 'form').props.onSubmit({ preventDefault() {} }),
    google: () => find(component, node => node.type === 'button' && node.props.onClick?.name === 'handleGoogleSignIn').props.onClick(),
  };
}
test('configured password/OAuth/signup failures never create local identity', async () => {
  for (const method of ['submit', 'google']) {
    const h = loginHarness({ error: new Error('Invalid credentials') });
    await h[method](); assert.equal(h.writes.length, 0); assert.equal(h.routes.length, 0);
    assert.equal(h.messages.at(-1).type, 'error');
  }
  const h = loginHarness({ signUp: true, error: new Error('Signup failed') });
  await h.submit(); assert.equal(h.writes.length, 0); assert.equal(h.messages.at(-1).type, 'error');
});
test('pending email confirmation does not grant an authenticated-looking local identity', async () => {
  const h = loginHarness({ signUp: true });
  await h.submit(); assert.equal(h.writes.length, 0); assert.equal(h.routes.length, 0);
  assert.match(h.messages.at(-1).text, /confirm/);
});
test('unconfigured email and Google flows preserve labeled local study and storage events', async () => {
  for (const signUp of [false, true]) {
    const h = loginHarness({ configured: false, signUp });
    await h.submit(); assert.equal(h.writes.length, 1); assert.deepEqual(h.events, ['storage']);
    assert.match(h.messages.at(-1).text, /Local study/); assert.deepEqual(h.routes, ['/bible']);
  }
  const h = loginHarness({ configured: false }); await h.google();
  assert.equal(h.writes.length, 1); assert.deepEqual(h.events, ['storage']);
});
