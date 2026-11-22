import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../dist/app.js';
import { loadConfig } from '../dist/config/env.js';

test('liveness stays healthy without a database connection', async () => {
  const app = buildApp({ logger: false, database: null });
  const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { data: { status: 'ok' } });
  await app.close();
});

test('readiness is unavailable when no database is configured', async () => {
  const app = buildApp({ logger: false, database: null });
  const response = await app.inject({ method: 'GET', url: '/api/v1/ready' });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    error: { code: 'service_unavailable', message: 'Service is not ready.' },
  });
  await app.close();
});

test('readiness does not disclose database connection errors', async () => {
  const database = {
    $queryRaw: async () => { throw new Error('password=do-not-leak'); },
    $disconnect: async () => {},
  };
  const app = buildApp({ logger: false, database });
  const response = await app.inject({ method: 'GET', url: '/api/v1/ready' });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.includes('do-not-leak'), false);
  await app.close();
});

test('readiness succeeds when PostgreSQL accepts a query', async () => {
  const database = {
    $queryRaw: async () => [{ server_version_num: 170005 }],
    $disconnect: async () => {},
  };
  const app = buildApp({ logger: false, database });
  const response = await app.inject({ method: 'GET', url: '/api/v1/ready' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { data: { status: 'ready' } });
  await app.close();
});

test('readiness rejects PostgreSQL versions below the migration minimum', async () => {
  const database = {
    $queryRaw: async () => [{ server_version_num: 140012 }],
    $disconnect: async () => {},
  };
  const app = buildApp({ logger: false, database });
  const response = await app.inject({ method: 'GET', url: '/api/v1/ready' });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    error: { code: 'service_unavailable', message: 'Service is not ready.' },
  });
  await app.close();
});

test('errors use a generic response and server-generated request ID', async () => {
  const app = buildApp({ logger: false, database: null });
  const response = await app.inject({
    method: 'GET',
    url: '/private/missing',
    headers: { 'x-request-id': 'attacker-controlled-value' },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.headers['x-request-id'], response.json().error.requestId);
  assert.notEqual(response.json().error.requestId, 'attacker-controlled-value');
  assert.deepEqual(response.json().error, {
    code: 'not_found',
    message: 'Resource not found.',
    requestId: response.json().error.requestId,
  });
  await app.close();
});

test('CORS only allows the configured browser origin and credentialed preflight', async () => {
  const app = buildApp({ logger: false, database: null, webOrigin: 'https://app.example.test' });
  const allowed = await app.inject({
    method: 'OPTIONS',
    url: '/api/v1/tasks/11111111-1111-4111-8111-111111111111',
    headers: { origin: 'https://app.example.test', 'access-control-request-method': 'PATCH' },
  });
  const rejected = await app.inject({
    method: 'GET',
    url: '/api/v1/health',
    headers: { origin: 'https://attacker.example.test' },
  });

  assert.equal(allowed.statusCode, 204);
  assert.equal(allowed.headers['access-control-allow-origin'], 'https://app.example.test');
  assert.equal(allowed.headers['access-control-allow-credentials'], 'true');
  assert.match(allowed.headers['access-control-allow-methods'], /PATCH/);
  assert.match(allowed.headers['access-control-allow-methods'], /DELETE/);
  assert.equal(rejected.statusCode, 403);
  assert.equal(rejected.headers['access-control-allow-origin'], undefined);
  await app.close();
});

test('signup stores only a session hash and sets secure browser session cookie flags', async () => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'person@example.test', name: 'Test Person', avatar_url: null };
  let sessionInsert;
  let sessionRevoked = false;
  const database = {
    $queryRawUnsafe: async (sql, ...values) => {
      if (sql.includes('INSERT INTO users')) {
        assert.equal(values[1], 'person@example.test');
        return [user];
      }
      if (sql.includes('SELECT u.id::text, u.email')) {
        return !sessionRevoked && values[0] === sessionInsert?.[1]
          ? [{ ...user, expires_at: new Date(Date.now() + 60_000) }]
          : [];
      }
      return [];
    },
    $executeRawUnsafe: async (sql, ...values) => {
      if (sql.includes('INSERT INTO auth_sessions')) sessionInsert = values;
      if (sql.includes('UPDATE auth_sessions')) sessionRevoked = true;
      return 1;
    },
    $disconnect: async () => {},
  };
  const app = buildApp({ logger: false, database, secureCookies: true });
  const signup = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { name: 'Test Person', email: 'PERSON@example.test', password: 'correct-horse-battery' },
  });
  const cookie = signup.headers['set-cookie'];
  const cookiePair = cookie.split(';')[0];
  const session = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: cookiePair } });
  const forged = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: 'lifestack_session=forged-token' } });
  const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: cookiePair } });
  const afterLogout = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: cookiePair } });

  assert.equal(signup.statusCode, 201);
  assert.equal(typeof sessionInsert?.[1], 'string');
  assert.match(sessionInsert[1], /^[a-f0-9]{64}$/);
  assert.equal(cookie.includes(sessionInsert[1]), false);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(session.statusCode, 200);
  assert.deepEqual(session.json().data.user, { id: user.id, email: user.email, name: user.name, avatarUrl: null });
  assert.equal(forged.statusCode, 401);
  assert.equal(logout.statusCode, 200);
  assert.equal(afterLogout.statusCode, 401);
  await app.close();
});

test('production configuration requires a PostgreSQL URL', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /DATABASE_URL is required/);
  assert.throws(() => loadConfig({ DATABASE_URL: 'https://example.test/db' }), /postgres/);
  assert.throws(() => loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@db.example.test/app',
    WEB_ORIGIN: 'https://app.example.test',
    LOG_LEVEL: 'debug',
  }), /must not be debug or trace in production/);
  assert.equal(
    loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@db.example.test/app',
      WEB_ORIGIN: 'https://app.example.test',
    }).host,
    '0.0.0.0',
  );
  assert.equal(loadConfig({}).host, '127.0.0.1');
  assert.equal(loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:pass@db.example.test/app', WEB_ORIGIN: 'https://app.example.test' }).allowSignups, false);
  assert.equal(loadConfig({}).allowSignups, true);
  assert.throws(() => loadConfig({ ALLOW_SIGNUPS: 'yes' }), /ALLOW_SIGNUPS must be true or false/);
});

test('registration can be disabled before public testing', async () => {
  const database = { $disconnect: async () => {} };
  const app = buildApp({ logger: false, database, allowSignups: false });
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { name: 'Tester', email: 'tester@example.test', password: 'correct-horse-battery' },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, 'signup_disabled');
  await app.close();
});

test('authentication routes are rate limited and return a generic response', async () => {
  const app = buildApp({ logger: false, database: null });
  let lastResponse;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    lastResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'tester@example.test', password: 'not-the-password' },
    });
  }

  assert.equal(lastResponse.statusCode, 429);
  assert.equal(lastResponse.json().error.code, 'rate_limited');
  assert.equal(lastResponse.body.includes('not-the-password'), false);
  await app.close();
});
