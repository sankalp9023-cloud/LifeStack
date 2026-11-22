import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

const MIN_POSTGRESQL_VERSION_NUM = 150_000;

export function createDatabaseClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  return new PrismaClient({ adapter });
}

export async function checkDatabase(client: PrismaClient | null): Promise<boolean> {
  if (!client) return false;

  try {
    const versions = await client.$queryRaw<{ server_version_num: number }[]>`
      SELECT current_setting('server_version_num')::integer AS server_version_num
    `;
    return Number(versions[0]?.server_version_num) >= MIN_POSTGRESQL_VERSION_NUM;
  } catch {
    return false;
  }
}
