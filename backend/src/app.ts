import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';
import { randomUUID } from 'node:crypto';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from './generated/prisma/client.js';
import { checkDatabase } from './infrastructure/database/client.js';
import { registerHealthRoutes } from './modules/health/routes.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerTaskRoutes } from './modules/tasks/routes.js';
import { registerProjectRoutes } from './modules/projects/routes.js';

export type AppOptions = FastifyServerOptions & {
  database: PrismaClient | null;
  webOrigin?: string;
  googleClientId?: string | null;
  allowSignups?: boolean;
  secureCookies?: boolean;
};

export function buildApp(options: AppOptions) {
  const {
    database,
    webOrigin = 'http://localhost:5173',
    googleClientId = null,
    allowSignups = true,
    secureCookies = false,
    ...serverOptions
  } = options;
  const app = Fastify({
    logger: { level: 'info' },
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    bodyLimit: 1_048_576,
    requestTimeout: 30_000,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5_000,
    ...serverOptions,
  });

  app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      statusCode: context.statusCode,
      error: {
        code: 'rate_limited',
        message: 'Too many requests. Try again later.',
        requestId: request.id,
      },
    }),
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    const origin = request.headers.origin;
    if (origin === webOrigin) {
      reply.header('access-control-allow-origin', webOrigin);
      reply.header('access-control-allow-credentials', 'true');
      reply.header('vary', 'Origin');
    } else if (origin) {
      return reply.code(403).send({
        error: { code: 'origin_not_allowed', message: 'Request origin is not allowed.', requestId: request.id },
      });
    }

    if (request.method === 'OPTIONS') {
      return reply
        .header('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        .header('access-control-allow-headers', 'content-type')
        .header('access-control-max-age', '600')
        .code(204)
        .send();
    }
  });
  app.setErrorHandler((error, request, reply) => {
    const requestError = error as FastifyError;
    const statusCode = requestError.validation ? 400
      : (requestError.statusCode && requestError.statusCode < 500 ? requestError.statusCode : 500);
    const code = statusCode === 400 ? 'validation_error'
      : statusCode === 404 ? 'not_found'
        : statusCode === 429 ? 'rate_limited'
        : statusCode < 500 ? 'request_error' : 'internal_error';
    request.log[statusCode >= 500 ? 'error' : 'warn']({
      requestId: request.id,
      statusCode,
      errorName: requestError.name,
    }, 'Request failed');

    return reply.code(statusCode).send({
      error: {
        code,
        message: statusCode === 400 ? 'Request validation failed.'
          : statusCode === 404 ? 'Resource not found.'
            : statusCode === 429 ? 'Too many requests. Try again later.'
            : statusCode < 500 ? 'Request could not be completed.'
              : 'Unexpected server error.',
        requestId: request.id,
      },
    });
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send({
    error: {
      code: 'not_found',
      message: 'Resource not found.',
      requestId: request.id,
    },
  }));

  app.register(registerHealthRoutes, {
    databaseReady: () => checkDatabase(database),
  });
  app.register(registerAuthRoutes, { database, googleClientId, secureCookies, allowSignups });
  app.register(registerTaskRoutes, { database });
  app.register(registerProjectRoutes, { database });
  app.addHook('onClose', async () => {
    await database?.$disconnect();
  });

  return app;
}
