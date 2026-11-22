import type { FastifyInstance } from 'fastify';

export type HealthRoutesOptions = {
  databaseReady: () => Promise<boolean>;
};

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRoutesOptions,
): Promise<void> {
  app.get('/api/v1/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          additionalProperties: false,
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['status'],
              properties: {
                status: { type: 'string', const: 'ok' },
              },
            },
          },
        },
      },
    },
  }, async () => ({ data: { status: 'ok' } }));

  app.get('/api/v1/ready', {
    schema: {
      response: {
        200: {
          type: 'object',
          additionalProperties: false,
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['status'],
              properties: { status: { type: 'string', const: 'ready' } },
            },
          },
        },
        503: {
          type: 'object',
          additionalProperties: false,
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              additionalProperties: false,
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', const: 'service_unavailable' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    if (!(await options.databaseReady())) {
      return reply.code(503).send({
        error: { code: 'service_unavailable', message: 'Service is not ready.' },
      });
    }
    return { data: { status: 'ready' } };
  });
}
