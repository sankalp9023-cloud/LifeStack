# LifeStack Backend

**Status:** API foundation, PostgreSQL connectivity, account authentication, owner-scoped Tasks APIs, and core Projects/milestone operations are implemented. Full Projects workspace data, Study, Settings, import API, and cloud sync remain unimplemented.

## Stack

- Node.js 20.19 or newer
- TypeScript
- Fastify 5
- PostgreSQL 15+ and Prisma 7 are the persistence stack. The adapter, SQL migrations, and readiness probe are wired; the complete Prisma domain model and authenticated data routes remain to be implemented.

The API is a modular monolith. Feature routes should delegate to application services, which use repositories for persistence. Keep the frontend's existing browser repositories as the current source of data until an API-backed migration is designed and verified.

## Run

```bash
npm install
npm run dev
```

The server listens on `127.0.0.1:3000` by default in development and `0.0.0.0` in production. Set `HOST`, `PORT`, `LOG_LEVEL`, and `NODE_ENV` to override the defaults. Copy `.env.example` to `.env` and set `DATABASE_URL` to connect PostgreSQL 15 or newer. Set `WEB_ORIGIN` to the exact frontend origin; production requires HTTPS. Set `GOOGLE_CLIENT_ID` to enable Google ID-token sign-in. `ALLOW_SIGNUPS` controls new account creation; it defaults on in development and off in production. Enable it only when the test cohort and abuse controls are ready. Without a local database or with PostgreSQL below version 15, `GET /api/v1/health` reports liveness and `GET /api/v1/ready` returns `503`.

## Account authentication

The auth module provides:

- `POST /api/v1/auth/signup` with `{ name, email, password }`
- `POST /api/v1/auth/login` with `{ email, password }`
- `POST /api/v1/auth/google` with a Google Identity Services ID token in `{ idToken }`
- `GET /api/v1/auth/me` to read the current session
- `POST /api/v1/auth/logout` to revoke the current session

Successful signup and login set an opaque, HTTP-only, same-site cookie. Only a SHA-256 hash of the random session token is stored. Passwords use Node.js scrypt with per-account random salts. Google ID tokens are checked server-side against Google's token-info endpoint and the configured audience. Browser requests are restricted to the exact `WEB_ORIGIN`; production cookies are Secure. Apply all checked-in migrations, including account tables and owner foreign keys, before using these routes. The database must be configured for account creation and login. Email verification, password recovery, account deletion, and data export are not implemented. The API’s in-process IP rate limits suit a single test instance; multiple replicas require a shared rate-limit store and correct trusted-proxy configuration.

## Tasks API

The Tasks routes require a valid session cookie and derive the owner from that session. The API supports filtered, cursor-paginated list, create, read, update, delete, and overview routes. Tags and subtasks are written in the same database transaction as the task. Project and milestone links are checked against the same account and are also protected by PostgreSQL owner-consistency constraints. The Tasks routes have database-backed tests for two-account isolation. The frontend still uses browser-local task storage; API cutover has not been done.

The Projects routes currently support owner-scoped project list/create/read/update/delete, archive/restore, and milestone list/create/update/delete. Project and milestone deletions preserve linked tasks and clear the relevant foreign keys, matching the browser repository behavior. Project notes, resources, important dates, activity/workspace snapshots, and project overview routes remain pending.

Build and database commands:

```bash
npm run build
npm run db:status
npm run db:deploy
```

Database commands require `DATABASE_URL`. The SQL migration is applied by Prisma Migrate. Do not run `migrate dev` or create migrations from the intentionally incomplete Prisma model until the full SQL schema is mapped into Prisma.

## Layout

```text
backend/
├── src/
│   ├── app.ts                 # Fastify app construction
│   ├── server.ts              # Runtime entry point and graceful shutdown
│   ├── config/                # Validated runtime configuration
│   ├── infrastructure/
│   │   └── database/          # Prisma PostgreSQL adapter and readiness probe
│   └── modules/
│       ├── auth/              # Signup, login, Google sign-in, shared session lookup, logout
│       ├── health/            # Liveness and readiness routes
│       ├── projects/          # Owner-scoped project and milestone operations
│       └── tasks/             # Owner-scoped task CRUD, overview, and cursor pagination
├── scripts/
│   ├── import-localstorage.mjs # Preview-first transactional importer
│   └── require-database-url.mjs
├── prisma/
│   ├── migrations/            # Versioned PostgreSQL SQL migrations
│   └── schema.prisma          # Prisma client generation config
├── scripts/                   # Database command guards
├── test/                      # API, import, and PostgreSQL migration checks
├── .env.example
├── package.json
└── tsconfig.json
```

## Next implementation boundary

Before expanding private data routes, map the reviewed SQL schema into Prisma models and follow the Tasks module's session-derived owner scoping. Before deploying publicly, finish the remaining modules and select the staging provider. Review the proposed [data model](../docs/BACKEND_DATA_MODEL.md). Use the [backend plan](../docs/BACKEND_PLAN.md) and [OpenAPI draft](../docs/lifestack-api-v1.openapi.yaml) as proposals to reconcile against actual service behavior, not as implemented contracts.

The first PostgreSQL migration and import runbook are documented in
[the initial migration](prisma/migrations/20261122000000_initial/migration.sql)
and [Data Model and Migration](../docs/DATA_MODEL_AND_MIGRATION.md).

## localStorage import

Create a LifeStack app backup JSON and run a validation-only preview:

```powershell
npm run import:localstorage -- --owner <owner-uuid> --file <backup.json>
```

Review the printed owner ID and record counts. The preview performs no database
connection or write. Only after confirming the destination owner, apply it with:

```powershell
npm run import:localstorage -- --owner <owner-uuid> --file <backup.json> --apply
```

Set `DATABASE_URL` in `backend/.env` or the process environment. Do not pass
database credentials as command-line arguments. The importer
validates relationships, applies the complete snapshot in one transaction,
stores source-ID mappings, and returns `already_imported` for an identical retry.
