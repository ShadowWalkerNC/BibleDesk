import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

// Execute real route modules with an isolated, in-memory Drizzle/JWT boundary.
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
    }, console, process: { env: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test', JWT_SECRET: 'test-secret' } },
    ...globals,
  }, { filename: file });
  return exports;
}

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const OWN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const toSnake = (key) => key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const toCamel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// Minimal Drizzle stand-ins: tables are proxies yielding column tokens, and the
// fake db evaluates the same select/insert/update chains as the real routes.
function tableMock(name) {
  return new Proxy({ _table: name }, {
    get(target, prop) {
      if (prop === '_table') return name;
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      return { _table: name, _col: prop };
    },
  });
}
const colKey = (col) => (col && typeof col === 'object' && '_col' in col ? toSnake(col._col) : col);
const mapRowCamel = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v]));

function setup(overrides = {}) {
  const tables = {
    prayer_requests: [
      { id: OWN, user_id: A, request: 'Public prayer', display_name: 'Hidden name', status: 'published', escalation_level: 'atlas', is_public: true, consent_atlas: true, is_restricted: false, is_restricted_region: false, deleted_at: null, privacy_mode: 'approximate', is_anonymous: true, latitude: 35.12, longitude: -80.1, likes_count: 3, category: 'community', country_code: 'US', country_name: 'United States', created_at: new Date('2026-01-01T00:00:00Z'), wrapped_dek: 'secret', text_ciphertext: 'secret' },
      { id: OTHER, user_id: B, request: 'Private B', status: 'pending', escalation_level: 'private', deleted_at: null, created_at: new Date('2026-01-02T00:00:00Z') },
    ],
    churches: [{ id: 'church-a', admin_user_id: A }, { id: 'church-b', admin_user_id: B }],
  };
  const tableName = (table) => (table && table._table) || table;
  const rowsOf = (table) => tables[tableName(table)] || [];

  const db = {
    select(fields) {
      const q = {
        _fields: fields, _table: null, _where: null, _order: null, _limit: null,
        from(table) { q._table = table; return q; },
        where(cond) { q._where = cond; return q; },
        orderBy(spec) { q._order = spec; return q; },
        limit(n) { q._limit = n; return q; },
        then(resolve, reject) {
          try {
            if (overrides.databaseError) throw new Error('Missing column');
            let rows = rowsOf(q._table).filter((r) => (!q._where || q._where(r)));
            if (q._order && q._order._desc) {
              const k = colKey(q._order._desc);
              rows = [...rows].sort((a, b) => (a[k] < b[k] ? 1 : -1));
            }
            if (q._limit != null) rows = rows.slice(0, q._limit);
            const out = q._fields
              ? rows.map((r) => Object.fromEntries(Object.entries(q._fields).map(([alias, col]) => [alias, r[colKey(col)]])))
              : rows.map(mapRowCamel);
            return Promise.resolve(out).then(resolve, reject);
          } catch (err) { return Promise.reject(err).then(resolve, reject); }
        },
      };
      return q;
    },
    insert(table) {
      return {
        values(obj) {
          return {
            returning() {
              if (overrides.databaseError) return Promise.reject(new Error('Missing column'));
              const stored = {};
              for (const [k, v] of Object.entries(obj)) stored[toSnake(k)] = v;
              if (!stored.created_at) stored.created_at = new Date();
              rowsOf(table).push(stored);
              return Promise.resolve([mapRowCamel(stored)]);
            },
          };
        },
      };
    },
    update(table) {
      return {
        set(obj) {
          return {
            where(cond) {
              return {
                returning() {
                  if (overrides.databaseError) return Promise.reject(new Error('Missing column'));
                  const matched = rowsOf(table).filter((r) => (!cond || cond(r)));
                  for (const r of matched) {
                    for (const [k, v] of Object.entries(obj)) {
                      if (v && typeof v === 'object' && v._sql) {
                        if (toSnake(k) === 'likes_count') r.likes_count = (r.likes_count || 0) + 1;
                      } else {
                        r[toSnake(k)] = v;
                      }
                    }
                  }
                  return Promise.resolve(matched.map(mapRowCamel));
                },
              };
            },
          };
        },
      };
    },
  };

  const drizzle = {
    and: (...conds) => (row) => conds.every((c) => (typeof c === 'function' ? c(row) : true)),
    eq: (col, val) => (row) => row[colKey(col)] === val,
    isNull: (col) => (row) => row[colKey(col)] == null,
    inArray: (col, arr) => (row) => arr.includes(row[colKey(col)]),
    desc: (col) => ({ _desc: col }),
    sql: () => ({ _sql: true }),
  };

  const userFor = (token) =>
    token === 'token-a' ? { id: A, email: 'a@example.com' }
    : token === 'token-b' ? { id: B, email: 'b@example.com' }
    : null;
  const imports = {
    'next/server': { NextRequest, NextResponse },
    uuid: { v4: () => '99999999-9999-4999-8999-999999999999' },
    '@/db': { getDb: async () => db },
    '@/db/schema': { prayerRequests: tableMock('prayer_requests'), churches: tableMock('churches') },
    'drizzle-orm': drizzle,
    '@/lib/answers': { isDatabaseConfigured: () => !overrides.dbUnconfigured },
    '@/lib/auth': {
      getAuthenticatedUser: async (req) => {
        const header = req.headers.get('authorization') || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        return userFor(token);
      },
    },
    '@/lib/rate-limit': {
      checkRateLimit: async () => ({ allowed: true }),
      getClientIp: () => '127.0.0.1',
      RateLimitNamespace: { prayerEscalate: 'prayer:escalate' },
    },
  };
  return {
    tables,
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

test('guest and invalid tokens cannot escalate prayers', async () => {
  const { escalate } = setup();
  for (const token of [null, 'invalid']) {
    assert.equal((await escalate.POST(request('POST', '/', { prayerId: OWN, targetLevel: 'atlas' }, token))).status, 401);
  }
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
test('likes increment only visible public prayers', async () => {
  const { prayer, tables } = setup();
  const ok = await prayer.PUT(request('PUT', '/', { id: OWN }, null));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).prayer.likes_count, 4);
  assert.equal(tables.prayer_requests[0].likes_count, 4);
  assert.equal((await prayer.PUT(request('PUT', '/', { id: OTHER }, null))).status, 404);
  assert.equal((await prayer.PUT(request('PUT', '/', { id: 'not-a-uuid' }, null))).status, 400);
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

function loginHarness({ localProfiles = false, signUp = false, error = null } = {}) {
  const writes = [], messages = [], routes = [], events = [];
  let hook = 0;
  const values = [signUp, 'student@example.com', 'password', false, 'Student', '', 'member', false, null];
  const fail = async () => { if (error) throw error; return { token: 'jwt', user: { id: 'u', email: 'student@example.com' } }; };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { useState: initial => { const index = hook++; return [index < values.length ? values[index] : initial, value => { if (index === 8) messages.push(value); }]; }, useEffect() {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: path => routes.push(path), refresh() {} }) },
    'lucide-react': {},
    '@/lib/client-auth': {
      getAuthToken: () => null,
      isLocalStudyProfileEnabled: () => localProfiles,
      signInRequest: fail,
      signUpRequest: fail,
    },
    '@/lib/syncGuestData': { syncGuestDataToAccount: async () => ({}) }, './page.module.css': { default: {} },
  };
  const component = moduleAt('src/app/login/page.tsx', imports, {
    localStorage: { getItem: () => null, setItem: (...args) => writes.push(args) },
    window: { dispatchEvent: event => events.push(event.type), location: { origin: 'https://test.example' } },
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
  };
}
test('password/signup failures never create local identity', async () => {
  for (const signUp of [false, true]) {
    const h = loginHarness({ signUp, error: new Error('Invalid email or password.') });
    await h.submit(); assert.equal(h.writes.length, 0); assert.equal(h.routes.length, 0);
    assert.equal(h.messages.at(-1).type, 'error');
  }
});
test('unconfigured production auth cannot create an authenticated-looking local identity', async () => {
  for (const signUp of [false, true]) {
    const h = loginHarness({ signUp, error: new Error('Authentication has not been configured for this deployment.') });
    await h.submit(); assert.equal(h.writes.length, 0); assert.deepEqual(h.events, []);
    assert.match(h.messages.at(-1).text, /authentication has not been configured/); assert.deepEqual(h.routes, []);
  }
});
test('development fallback creates a local-only profile only when auth is unconfigured', async () => {
  const h = loginHarness({ localProfiles: true, error: new Error('Authentication has not been configured for this deployment.') });
  await h.submit();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0][0], 'bibledesk_local_user');
  assert.equal(h.messages.at(-1).type, 'success');
  const locked = loginHarness({ localProfiles: true, error: new Error('Invalid email or password.') });
  await locked.submit();
  assert.equal(locked.writes.length, 0);
  assert.equal(locked.messages.at(-1).type, 'error');
});
