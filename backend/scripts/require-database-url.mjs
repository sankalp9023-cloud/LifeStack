import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is required for database migration commands.');
  process.exitCode = 1;
}
