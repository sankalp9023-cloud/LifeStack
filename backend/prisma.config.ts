import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL;
const needsDatabase = process.argv.slice(2).some((argument) => ['migrate', 'db', 'studio'].includes(argument));
if (!databaseUrl && needsDatabase) {
  throw new Error('DATABASE_URL is required for Prisma database commands.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Client generation does not need a database URL. The database is validated
    // by the deploy command and service config before any connection is opened.
    url: databaseUrl ?? 'postgresql://localhost:5432/lifestack',
  },
});
