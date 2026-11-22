import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { findSessionUser, hashSessionToken, readSessionToken, SESSION_COOKIE_NAME } from './session.js';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const AUTH_WINDOW_MS = 15 * 60 * 1000;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, SCRYPT_OPTIONS, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

type AuthOptions = {
  database: PrismaClient | null;
  googleClientId: string | null;
  secureCookies: boolean;
  allowSignups: boolean;
};
type SignupInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };
type GoogleInput = { idToken: string };
type UserRow = { id: string; email: string; name: string; avatar_url: string | null };
type GoogleClaims = { sub: string; email: string; name?: string; picture?: string; email_verified: string };

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'requestId'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        requestId: { type: 'string' },
      },
    },
  },
} as const;

function emailSchema() {
  return { type: 'string', minLength: 3, maxLength: 254, format: 'email' } as const;
}

function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/api/v1; Max-Age=0${secure ? '; Secure' : ''}`;
}

function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/api/v1; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure ? '; Secure' : ''}`;
}

function sendError(
  request: FastifyRequest,
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  return reply.code(statusCode).send({
    error: { code, message, requestId: request.id },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  const fallbackSalt = Buffer.from('lifestack-auth-fallback-salt');
  const parts = storedHash?.split('$');
  const salt = parts?.[0] === 'scrypt' ? Buffer.from(parts[1] ?? '', 'base64url') : fallbackSalt;
  const expected = parts?.[0] === 'scrypt' ? Buffer.from(parts[2] ?? '', 'base64url') : Buffer.alloc(64);
  const actual = await deriveKey(password, salt);
  if (!storedHash || expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}

async function createSession(database: PrismaClient, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  await database.$executeRawUnsafe(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
     VALUES ($1::uuid, $2, now() + interval '14 days')`,
    userId,
    tokenHash,
  );
  return token;
}

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url };
}

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleClaims | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const claims = await response.json() as GoogleClaims & { aud: string; iss: string; exp: string };
    if (claims.aud !== clientId
      || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)
      || Number(claims.exp) <= Math.floor(Date.now() / 1000)
      || claims.email_verified !== 'true'
      || !claims.sub
      || !claims.email) return null;
    return claims;
  } catch {
    return null;
  }
}

async function findOrCreateGoogleUser(database: PrismaClient, claims: GoogleClaims): Promise<UserRow> {
  return database.$transaction(async (transaction) => {
    const email = normalizeEmail(claims.email);
    // Serialize account lookup/linking for this address so simultaneous Google
    // callbacks cannot both observe a missing user and race the unique insert.
    await transaction.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', email);
    const existingIdentity = await transaction.$queryRawUnsafe<UserRow[]>(
      `SELECT u.id::text, u.email, u.name, u.avatar_url
       FROM auth_identities i JOIN users u ON u.id = i.user_id
       WHERE i.provider = 'google' AND i.provider_subject = $1 LIMIT 1`,
      claims.sub,
    );
    if (existingIdentity[0]) return existingIdentity[0];

    let users = await transaction.$queryRawUnsafe<UserRow[]>(
      'SELECT id::text, email, name, avatar_url FROM users WHERE email = $1 LIMIT 1',
      email,
    );
    let user: UserRow | undefined = users[0];
    if (!user) {
      users = await transaction.$queryRawUnsafe<UserRow[]>(
        `INSERT INTO users (email, name, avatar_url)
         VALUES ($1, $2, $3)
         RETURNING id::text, email, name, avatar_url`,
        email,
        (claims.name?.trim() || email.split('@')[0] || 'lifestack-user').slice(0, 100),
        claims.picture ?? null,
      );
      user = users[0];
    }
    if (!user) throw new Error('Google account could not be created.');

    const linked = await transaction.$queryRawUnsafe<(UserRow & { provider_subject: string })[]>(
      `SELECT u.id::text, u.email, u.name, u.avatar_url, i.provider_subject
       FROM auth_identities i JOIN users u ON u.id = i.user_id
       WHERE i.user_id = $1::uuid AND i.provider = 'google' LIMIT 1`,
      user.id,
    );
    if (linked[0]) {
      if (linked[0].provider_subject !== claims.sub) throw new Error('A different Google account is already linked.');
      return linked[0];
    }

    await transaction.$executeRawUnsafe(
      `INSERT INTO auth_identities (user_id, provider, provider_subject)
       VALUES ($1::uuid, 'google', $2)`,
      user.id,
      claims.sub,
    );
    return user;
  });
}

export const registerAuthRoutes: FastifyPluginAsync<AuthOptions> = async (app, options) => {
  const { database, googleClientId, secureCookies, allowSignups } = options;
  const requireDatabase = (request: FastifyRequest, reply: FastifyReply) => {
    if (database) return true;
    sendError(request, reply, 503, 'service_unavailable', 'Account service is not ready.');
    return false;
  };

  app.post<{ Body: SignupInput }>('/api/v1/auth/signup', {
    config: { rateLimit: { max: 10, timeWindow: AUTH_WINDOW_MS } },
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: emailSchema(),
          password: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
      response: { 400: errorSchema, 409: errorSchema, 503: errorSchema },
    },
  }, async (request, reply) => {
    if (!requireDatabase(request, reply) || !database) return;
    if (!allowSignups) return sendError(request, reply, 403, 'signup_disabled', 'New account registration is currently closed.');
    const email = normalizeEmail(request.body.email);
    const name = request.body.name.trim();
    if (!name || Buffer.byteLength(request.body.password, 'utf8') > 128) {
      return sendError(request, reply, 400, 'validation_error', 'Name or password is invalid.');
    }
    try {
      const rows = await database.$queryRawUnsafe<UserRow[]>(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id::text, email, name, avatar_url`,
        name,
        email,
        await hashPassword(request.body.password),
      );
      const user = rows[0];
      if (!user) return sendError(request, reply, 500, 'internal_error', 'Account could not be created.');
      const token = await createSession(database, user.id);
      reply.header('set-cookie', sessionCookie(token, secureCookies)).code(201);
      return { data: { user: publicUser(user) } };
    } catch (error) {
      if (typeof error === 'object' && error !== null) {
        const databaseError = error as { code?: string; meta?: { code?: string } };
        if (databaseError.code === 'P2002' || databaseError.code === '23505' || databaseError.meta?.code === '23505') {
        return sendError(request, reply, 409, 'account_conflict', 'Unable to create an account with those details.');
        }
      }
      throw error;
    }
  });

  app.post<{ Body: LoginInput }>('/api/v1/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: AUTH_WINDOW_MS } },
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['email', 'password'],
        properties: { email: emailSchema(), password: { type: 'string', minLength: 1, maxLength: 128 } },
      },
      response: { 401: errorSchema, 503: errorSchema },
    },
  }, async (request, reply) => {
    if (!requireDatabase(request, reply) || !database) return;
    const rows = await database.$queryRawUnsafe<(UserRow & { password_hash: string | null })[]>(
      `SELECT id::text, email, name, avatar_url, password_hash FROM users WHERE email = $1 LIMIT 1`,
      normalizeEmail(request.body.email),
    );
    const user = rows[0];
    if (!await verifyPassword(request.body.password, user?.password_hash ?? null) || !user?.password_hash) {
      return sendError(request, reply, 401, 'invalid_credentials', 'Email or password is incorrect.');
    }
    const token = await createSession(database, user.id);
    reply.header('set-cookie', sessionCookie(token, secureCookies));
    return { data: { user: publicUser(user) } };
  });

  app.post<{ Body: GoogleInput }>('/api/v1/auth/google', {
    config: { rateLimit: { max: 10, timeWindow: AUTH_WINDOW_MS } },
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['idToken'],
        properties: { idToken: { type: 'string', minLength: 1, maxLength: 8192 } },
      },
      response: { 401: errorSchema, 503: errorSchema },
    },
  }, async (request, reply) => {
    if (!requireDatabase(request, reply) || !database) return;
    if (!googleClientId) return sendError(request, reply, 503, 'google_auth_unconfigured', 'Google sign-in is not configured.');
    const claims = await verifyGoogleIdToken(request.body.idToken, googleClientId);
    if (!claims) return sendError(request, reply, 401, 'invalid_google_token', 'Google sign-in could not be verified.');
    if (!allowSignups) {
      const linked = await database.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id::text FROM auth_identities WHERE provider = 'google' AND provider_subject = $1 LIMIT 1`,
        claims.sub,
      );
      if (!linked[0]) return sendError(request, reply, 403, 'signup_disabled', 'New account registration is currently closed.');
    }
    const user = await findOrCreateGoogleUser(database, claims);
    const token = await createSession(database, user.id);
    reply.header('set-cookie', sessionCookie(token, secureCookies));
    return { data: { user: publicUser(user) } };
  });

  app.get('/api/v1/auth/me', async (request, reply) => {
    if (!requireDatabase(request, reply) || !database) return;
    const token = readSessionToken(request);
    const user = token ? await findSessionUser(database, token) : null;
    if (!user) return sendError(request, reply, 401, 'unauthenticated', 'Sign in to continue.');
    return { data: { user: publicUser(user) } };
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    if (!requireDatabase(request, reply) || !database) return;
    const token = readSessionToken(request);
    if (token) {
      await database.$executeRawUnsafe(
        'UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
        hashSessionToken(token),
      );
    }
    reply.header('set-cookie', clearSessionCookie(secureCookies));
    return { data: { signedOut: true } };
  });
};
