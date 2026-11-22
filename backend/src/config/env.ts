const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '127.0.0.1';
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type AppConfig = {
  host: string;
  port: number;
  logLevel: (typeof LOG_LEVELS)[number];
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string | null;
  webOrigin: string;
  googleClientId: string | null;
  allowSignups: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = env.PORT === undefined ? DEFAULT_PORT : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const logLevel = env.LOG_LEVEL ?? 'info';
  if (!LOG_LEVELS.includes(logLevel as AppConfig['logLevel'])) {
    throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}.`);
  }

  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production.');
  }
  if (nodeEnv === 'production' && (logLevel === 'debug' || logLevel === 'trace')) {
    throw new Error('LOG_LEVEL must not be debug or trace in production.');
  }

  const databaseUrl = env.DATABASE_URL?.trim() || null;
  if (databaseUrl) {
    let parsedDatabaseUrl: URL;
    try {
      parsedDatabaseUrl = new URL(databaseUrl);
    } catch {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
    }
    if (parsedDatabaseUrl.protocol !== 'postgres:' && parsedDatabaseUrl.protocol !== 'postgresql:') {
      throw new Error('DATABASE_URL must use the postgres or postgresql protocol.');
    }
  }
  if (nodeEnv === 'production' && !databaseUrl) {
    throw new Error('DATABASE_URL is required when NODE_ENV is production.');
  }

  const webOrigin = env.WEB_ORIGIN?.trim() || 'http://localhost:5173';
  let parsedWebOrigin: URL;
  try {
    parsedWebOrigin = new URL(webOrigin);
  } catch {
    throw new Error('WEB_ORIGIN must be a valid origin URL.');
  }
  if (parsedWebOrigin.origin !== webOrigin.replace(/\/$/, '')) {
    throw new Error('WEB_ORIGIN must not include a path, query, or fragment.');
  }
  if (nodeEnv === 'production' && parsedWebOrigin.protocol !== 'https:') {
    throw new Error('WEB_ORIGIN must use HTTPS in production.');
  }

  const allowSignupsValue = env.ALLOW_SIGNUPS?.trim().toLowerCase();
  if (allowSignupsValue && !['true', 'false'].includes(allowSignupsValue)) {
    throw new Error('ALLOW_SIGNUPS must be true or false.');
  }

  return {
    host: env.HOST || (nodeEnv === 'production' ? '0.0.0.0' : DEFAULT_HOST),
    port,
    logLevel: logLevel as AppConfig['logLevel'],
    nodeEnv,
    databaseUrl,
    webOrigin: parsedWebOrigin.origin,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || null,
    allowSignups: allowSignupsValue === undefined ? nodeEnv !== 'production' : allowSignupsValue === 'true',
  };
}
