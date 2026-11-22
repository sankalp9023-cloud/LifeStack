import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client.js';

export const SESSION_COOKIE_NAME = 'lifestack_session';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
};

export type SessionDatabase = Pick<PrismaClient, '$queryRawUnsafe'> | null;
type SessionQueryClient = Pick<PrismaClient, '$queryRawUnsafe'>;

type AuthenticatedRequest = FastifyRequest & { authUserId: string | null };

export function authenticatedUserId(request: FastifyRequest): string {
  return (request as AuthenticatedRequest).authUserId as string;
}

export function addSessionAuthentication(
  app: FastifyInstance,
  database: SessionDatabase,
  serviceName: string,
): void {
  app.decorateRequest('authUserId', null);
  app.addHook('preHandler', async (request, reply) => {
    if (!database) {
      reply.code(503).send({
        error: { code: 'service_unavailable', message: `${serviceName} service is not ready.`, requestId: request.id },
      });
      return;
    }
    const token = readSessionToken(request);
    const user = token ? await findSessionUser(database, token) : null;
    if (!user) {
      reply.code(401).send({
        error: { code: 'unauthenticated', message: 'Sign in to continue.', requestId: request.id },
      });
      return;
    }
    (request as AuthenticatedRequest).authUserId = user.id;
  });
}

export function readSessionToken(request: FastifyRequest): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  const value = header.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return value ? value.slice(SESSION_COOKIE_NAME.length + 1) : null;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function findSessionUser(
  database: SessionQueryClient,
  token: string,
): Promise<(AuthenticatedUser & { expires_at: Date }) | null> {
  const rows = await database.$queryRawUnsafe<(AuthenticatedUser & { expires_at: Date })[]>(
    `SELECT u.id::text, u.email, u.name, u.avatar_url, s.expires_at
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
     LIMIT 1`,
    hashSessionToken(token),
  );
  return rows[0] ?? null;
}
