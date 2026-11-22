# LifeStack — Development Roadmap

This roadmap describes current implementation status and the remaining backend sequence. The API stack and first-party auth direction are implemented; hosting and account recovery decisions remain open.

## Current application

### Frontend foundation — implemented

- [x] React, Vite, Tailwind CSS, routing, shared UI primitives, and feature boundaries.
- [x] Responsive app shell using the available browser viewport and page-level scrolling.
- [x] Navy/red tokens, frosted surfaces, and shared navigation and panel primitives.

### Dashboard — implemented, iterative

- [x] Summary panels connected to Study, Projects, Tasks, and reminder settings.
- [x] Cross-module present-state progress graph and links to source sections.
- [ ] Add more dense, actionable dashboard information such as due-soon tasks and recent module activity.
- [ ] Review desktop, tablet, and mobile layouts in a browser and fix any clipping or cramped controls.

### Study — implemented

- [x] Subject, chapter, topic, and learning activity management.
- [x] Notes, revisions, practice sessions, assessments, and study session history.
- [x] Derived subject/topic progress, topic completion pie chart, assessment and activity summaries.
- [x] Versioned browser storage, relationship checks, safe deletion, and focused repository tests.

### Projects and Tasks — implemented, iterative

- [x] Project and milestone management, notes, resources, important dates, and activity history.
- [x] Project-linked and personal task management.
- [x] Project status pie chart, project progress chart, deadline summaries, and task analytics.
- [ ] Review project workflows and responsive project detail layouts.

### Settings — implemented

- [x] General, appearance, notifications, privacy, module settings, system information, and backup/import/export.
- [x] Browser-local reminders for Study assessments and revisions.

## Backend — foundation started

- [x] Select the initial API stack: Node.js, TypeScript, and Fastify; PostgreSQL and Prisma are the persistence direction.
- [ ] Confirm hosting, recovery/email verification, account deletion, and privacy choices before exposing private user data.
- [ ] Document the API contract and final relational schema.
- [x] Initialize the backend skeleton, environment configuration, and liveness health route.
- [x] Add PostgreSQL connectivity and a reviewed SQL migration pipeline; map the full schema into Prisma before domain repositories.
- [x] Implement initial email/password and Google authentication with opaque server-side sessions, plus owner-scoped Tasks APIs and core Projects/milestone operations.
- [x] Add foundation, configuration, rate-limit, import-preview, migration-constraint, and build checks; other domain permission and transaction tests remain pending.
- [ ] Import existing local data through a validated, idempotent migration flow.
- [ ] Move the frontend behind API-backed repositories one feature at a time.
- [ ] Add dashboard aggregates and decide later whether real-time synchronization is needed.

See [Backend Plan](BACKEND_PLAN.md) and [Backend Data Model](BACKEND_DATA_MODEL.md) for the current proposal.

## Future modules

- [ ] Fitness tracking.
- [ ] Calendar and event management.
