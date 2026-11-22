import 'dotenv/config';
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createDatabaseClient } from './infrastructure/database/client.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const database = config.databaseUrl ? createDatabaseClient(config.databaseUrl) : null;
  const app = buildApp({
    logger: {
      level: config.logLevel,
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.token', 'req.body.idToken'],
        censor: '[REDACTED]',
      },
    },
    database,
    webOrigin: config.webOrigin,
    googleClientId: config.googleClientId,
    allowSignups: config.allowSignups,
    secureCookies: config.nodeEnv === 'production',
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'Shutting down LifeStack API');
    await app.close();
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error, 'Unable to start LifeStack API');
    process.exitCode = 1;
    await app.close();
  }
}

void main();
