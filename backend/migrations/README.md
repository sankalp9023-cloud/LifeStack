# PostgreSQL migrations

The initial schema is tracked as a Prisma deployment migration at
[`../prisma/migrations/20261122000000_initial/migration.sql`](../prisma/migrations/20261122000000_initial/migration.sql).
Use `npm run db:deploy` to apply checked-in migrations. This compatibility
directory remains only so older plan links continue to resolve; add future
migrations under `prisma/migrations/` and never edit an applied migration.
