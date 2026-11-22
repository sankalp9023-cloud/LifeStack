# LifeStack — Backend Plan

**Status:** the TypeScript/Fastify API foundation, PostgreSQL connectivity, account authentication, owner-scoped Tasks APIs, and core Projects/milestone operations are implemented. Other feature data APIs, hosting, and frontend API integration remain open.

## Goals

- Give each user private, durable data that can sync between devices.
- Preserve current Study, Projects, Tasks, Settings, and backup behavior.
- Keep feature boundaries and let the Dashboard read summarized data across modules.
- Import existing browser records safely; never silently replace or discard them.
- Start with a maintainable API. Add realtime updates only if normal refetching proves insufficient.

## Recommended starting architecture

- **Runtime:** Node.js with TypeScript.
- **HTTP:** Fastify with JSON Schema validation and route-level response schemas. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- **Database:** PostgreSQL.
- **Data access/migrations:** Prisma ORM and reviewed, versioned SQL migrations. [Prisma migration workflow](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
- **Authentication:** the current backend implements first-party email/password accounts and Google ID-token sign-in, with opaque server-side sessions. The API must derive identity from the verified session and never trust a client-supplied user ID.
- **Hosting:** choose an API host and managed Postgres provider based on region, backup, restore, and cost requirements. Do not bind the architecture to a provider-specific database API before that decision.

The API remains the application boundary even if managed authentication and database services are used. Avoid exposing privileged database credentials to the browser.

## Proposed service layout

See [backend/README.md](../backend/README.md) for the proposed directory tree. Each domain module should keep a consistent flow:

```text
HTTP route → request/response schema → service/business rules → repository → PostgreSQL
```

Routes handle transport concerns. Services enforce ownership, relationships, and transactions. Repositories contain persistence queries. Shared code should stay small: configuration, typed errors, logging, validation helpers, and pagination.

## API conventions

Use `/api/v1` from the first endpoint. A draft OpenAPI contract is available at [lifestack-api-v1.openapi.yaml](lifestack-api-v1.openapi.yaml); it is a proposed interface only, not a running API or a confirmed stack decision. Keep that contract aligned with current frontend shapes and review it before implementation.

The current draft groups routes under:

```text
/api/v1/health                         # liveness (implemented)
/api/v1/ready                          # database and PostgreSQL-version readiness (implemented)
/api/v1/dashboard                      # cross-module dashboard aggregates
/api/v1/study/{workspace,overview,...} # study records and summaries
/api/v1/projects/{workspace,overview,...}
/api/v1/tasks                          # task records and overview
/api/v1/settings                       # preferences and module settings
/api/v1/backups                        # backup export, import, and restore
```

Use JSON, ISO-8601 timestamps, explicit validation, consistent error objects, and pagination for growing activity/history collections. The draft contract uses a `{data}` success envelope, a structured `{error}` envelope, and date-only values in `YYYY-MM-DD` format. Return only fields the client needs. Use transactions for multi-record writes and relationship changes. Progress remains derived from source records; historical progress requires a separately designed event/snapshot model.

## Security and reliability baseline

- Authenticate all private endpoints. Derive `userId` from the verified token/session, never the request body.
- Scope every read, update, and delete to the authenticated owner; check ownership of related project, topic, and milestone IDs too.
- Validate parameters, query strings, and bodies at the API boundary. Apply sensible request size limits and rate limits.
- Store secrets in the deployment environment/secret manager; commit only `.env.example`.
- Configure explicit CORS origins, HTTPS, structured redacted logs, health/readiness checks, graceful shutdown, and database connection limits.
- Define automated backup retention and test restore before cloud cutover.
- If the selected provider exposes Postgres directly, enable and test Row Level Security on exposed tables. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Delivery stages

1. **Decisions and contracts:** confirm users/accounts, privacy expectations, hosting, auth, backup retention, and API errors/pagination. Review [data model and migration plan](BACKEND_DATA_MODEL.md).
2. **Foundation:** initialize TypeScript/Fastify, configuration validation, logging, health routes, database connection, Prisma schema, migration pipeline, and CI checks.
3. **Identity and isolation:** add token verification, owner-scoped service patterns, authorization tests, and production secret management before exposing user data.
4. **Feature APIs:** implement Tasks and Projects, then Study and Settings, preserving current validation, relationships, and delete semantics. Add integration tests per module.
5. **Data import:** build a validated preview/import flow for local records and backups. Make imports idempotent and report rejected records without deleting source data.
6. **Frontend cutover:** introduce API-backed adapters behind existing hooks/repository contracts. Migrate one feature at a time; retain export and a documented rollback route until cloud data is verified.
7. **Dashboard and operations:** add aggregated dashboard response, monitoring and restore drills. Add realtime only if observed usage needs it.

## Decisions still open

- Which email delivery service should provide verification and password recovery?
- Which API and Postgres hosting providers, region, and environments?
- Is offline editing required, or is local export/backup sufficient during initial sync?
- Should import merge records by ID, ask user to choose, or create a separate imported workspace?
- What are backup retention, deletion/export, and account deletion requirements?

## Public testing readiness checklist

Track this checklist through the active Codex goal **“Prepare the LifeStack backend for safe internet-accessible testing.”** Keep the goal active until the launch gate below is satisfied. Do not invite external testers or point the public frontend at the service before then.

### 1. Decide the test environment

- [ ] Confirm the test audience, whether sign-up is invite-only, and what personal data testers may enter.
- [ ] Choose the API host, managed PostgreSQL provider, deployment region, and staging/production separation.
- [x] Implement email/password and Google sign-in with hashed server-side sessions. Choose email verification/recovery delivery, and define account deletion and data retention before collecting tester data.
- [ ] Confirm hosting cost limits, database backup retention, and who can access provider dashboards and secrets.
- [ ] Decide the supported browser origin(s), public API URL, and whether the frontend and API share a domain.

**Gate:** document the decisions and set up separate local/staging/production configuration without committing credentials.

### 2. Finish and verify the backend foundation

- [x] Add the Prisma 7 PostgreSQL adapter, checked-in SQL migration, and separate readiness endpoint.
- [ ] Map the complete SQL schema into Prisma models before introducing domain repositories or generating new migrations.
- [x] Validate database URLs and production configuration, block debug/trace logging in production, and keep `.env.example` placeholders only.
- [x] Add separate liveness and database readiness checks; readiness returns unavailable when no database is configured/reachable or PostgreSQL is below version 15.
- [x] Apply the schema to an embedded PostgreSQL 17 test database; verify every `owner_id` table references an account, cross-owner relationships reject, and task-preserving delete behavior holds.
- [ ] Apply migrations to the selected staging PostgreSQL provider and confirm repeatable deployment and backup/restore recovery.
- [x] Implement a shared error envelope, generated request IDs, redacted structured logs, and response validation for health routes.
- [x] Set conservative request-body limits, request/connection timeouts, and database connection-pool limits; add global and auth-route IP rate limits. They use in-memory storage and require a shared store for multiple replicas.
- [x] Add a production signup switch that defaults off; keep new account creation closed until the staging test cohort is approved.
- [x] Add automated API, configuration, PostgreSQL-version readiness, CORS/session-cookie, forged/revoked-session, rate-limit, import-preview, migration-constraint, and build checks. Email auth and Tasks workflows pass against embedded PostgreSQL; staging deployment checks remain pending. Current suite passes 15/15 tests.
- [x] Run the online npm security audit after dependency installation and resolve the high-severity transitive Effect advisory with a patched version override.
- [x] Make localStorage import preview-only by default, require explicit `--apply`, and keep database credentials out of command-line arguments.

**Gate:** a clean staging deployment starts, reports health correctly, and does not expose stack traces, secrets, or private data in responses/logs.

The migration is verified against embedded PostgreSQL 17.5 (PGlite); this does not replace a staging run against the selected managed PostgreSQL provider. The local `.env` database URL was not reachable during `prisma migrate status`, so no migration was applied to that database.
The owner foreign-key migration uses PostgreSQL 15+ column-list `ON DELETE SET NULL` behavior; the selected staging database must meet this minimum.

### 3. Enforce identity and data isolation

- [ ] Verify access tokens or sessions on every private route; never accept an owner ID from request data as authority.
- [ ] Scope every database read, write, update, and delete to the verified account; validate ownership of every referenced parent/related record.
- [x] Implement owner-scoped Tasks APIs and core Projects/milestone operations, preserving task unlink behavior when deleting projects or milestones.
- [x] Cover task and project/milestone CRUD, session-derived ownership, cross-account not-found behavior, and delete semantics in embedded PostgreSQL integration tests.
- [ ] Extend cross-account integration tests to Projects, Study, Settings, and import before launch.
- [x] Verify two-account isolation for Tasks list/read/update/delete/overview, reject cross-account project links, and ignore a client-supplied owner ID. Extend equivalent tests to Projects, Study, Settings, and import before launch.
- [ ] If direct database access is exposed through the chosen provider, enable and test row-level security; otherwise keep database credentials server-side only.
- [x] Rate-limit registration, login, and Google sign-in; disable new registrations by default in production. [ ] Add recovery and deletion protections; review signup conflict responses for account enumeration before enabling a wider cohort.
- [ ] Define data export, account deletion, retention, and backup-expiry behavior before collecting tester data.

**Gate:** automated isolation checks pass against a real test database using at least two distinct test accounts.

### 4. Preserve and migrate browser data safely

- [ ] Validate the import contract against the actual Study, Projects, Tasks, Settings, and backup repositories.
- [x] Provide an export/backup step and a local preview of import counts and validation errors before database writes.
- [ ] Make import owner-scoped, transactional where practical, and idempotent; reject broken relationships without partial writes.
- [ ] Preserve local data after import; require explicit verification before switching reads/writes to the API.
- [ ] Test retry, conflicting IDs, malformed backups, interrupted imports, and rollback using copied sample data.
- [ ] Keep a documented fallback to browser-local data/export until the cloud copy is verified.

**Gate:** migration rehearsals reconcile record counts and relationships, and a failed import leaves both the original browser data and server data intact.

### 5. Harden and operate the public test deployment

- [ ] Deploy behind HTTPS and configure the production frontend origin. The API rejects other browser origins, enables credentialed requests only for the configured origin, and requires HTTPS for the production frontend origin; verify these settings through the selected host.
- [ ] Store secrets only in the deployment secret manager; use least-privilege database credentials and rotate any exposed credentials.
- [ ] Ensure public responses and logs do not contain tokens, passwords, connection strings, note contents, or unnecessary personal data.
- [ ] Configure database backups and complete a restore rehearsal; document recovery time and recovery point expectations.
- [ ] Configure a shared rate-limit store if the API runs multiple replicas; set trusted proxy hops explicitly for the selected host.
- [ ] Add error and availability monitoring, database capacity alerts, and a way to disable sign-ups or the API quickly.
- [ ] Add a privacy notice and clear tester guidance for experimental features, data handling, and how to report issues.
- [ ] Check the deployed API and frontend together in staging, including CORS, login/recovery, account isolation, import/export, and mobile/browser flows.
- [ ] Confirm hosting spend limits and abuse protections before enabling sign-up beyond the invited test cohort.

**Gate:** staging restore, monitoring, incident contact, and rollback procedures have been exercised and documented.

### Public tester launch gate

- [ ] All gates above are satisfied in staging; no known critical/high-severity issue remains open.
- [ ] Production uses isolated accounts/database, HTTPS, verified authentication, tested account isolation, backups, and monitoring.
- [ ] A final smoke check verifies sign-up policy, login, one write/read flow, export, deletion behavior, and health/readiness endpoints.
- [ ] Invite a small test cohort first, review errors and resource use, then expand access deliberately.

Codex should update this checklist as work is completed and keep the goal active while any prerequisite or launch-gate item remains open. If a step requires a provider/account choice or external approval, complete independent work first and ask for that specific input at the point it blocks progress.
