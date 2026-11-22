# LifeStack — Backend Data Model and Migration Plan

**Status:** reviewed migration available. The initial executable PostgreSQL schema is
[`backend/prisma/migrations/20261122000000_initial/migration.sql`](../backend/prisma/migrations/20261122000000_initial/migration.sql).
The implementation runbook is
[Data Model and Migration](DATA_MODEL_AND_MIGRATION.md).

## Modeling rules

- Give every owner-owned row an immutable UUID primary key, `owner_id`, and creation/update timestamps.
- Preserve localStorage IDs in `source_id` and resolve retries through `import_entity_map`.
- Use foreign keys for relationships and indexes for owner-scoped queries and common date/status filters.
- Enforce owner consistency across relationships: a task cannot reference another user's project, and a topic cannot belong to a subject owned by someone else.
- Keep module data normalized. Store JSON only for genuinely flexible preferences or small structured values, not as a substitute for related records.
- Derive progress from source records. Do not persist a second, potentially stale progress percentage.
- Store timestamps in UTC; retain date-only values (deadlines, revision dates, assessment dates) as SQL `DATE` values to avoid timezone shifts.

## Proposed entities

### Identity and settings

- **users/profiles:** Prefer the selected authentication provider's stable user UUID; keep only app-specific profile fields in LifeStack. Avoid duplicating passwords or auth credentials.
- **settings:** One row per user for general, appearance, notification, and module preferences; version the payload or normalize later if individual settings need querying.

### Study

- **subjects** → **chapters** → **topics**.
- **learning_activities** belong to a topic and record type, title/details, completion state, and completion/update time.
- **study_notes** belong to a subject and optionally a chapter/topic; deleting a topic should detach retained notes where the local app currently preserves them.
- **revisions** belong to a topic; preserve scheduled/completed status, due date, notes, and timestamps.
- **practice_sessions** and **study_sessions** belong to a subject and may reference a topic; preserve date, duration, results, and notes.
- **assessments** belong to a subject and retain title, date, coverage, progress, and marks. If assessments can cover many topics, use a join table rather than an array of topic IDs.

### Projects and tasks

- **projects** own **milestones**, **project_notes**, **resources**, **important_dates**, and **project_activities**.
- **tasks** can be personal or linked to a project and optionally a milestone. Keep task status, `completed_at`, due date, category, tags, and subtasks. Normalize subtasks if they need independent querying or ordering; otherwise use a JSON array initially.
- A milestone deletion should detach its tasks while preserving the tasks. Project deletion should follow current repository semantics: delete project-owned records and unlink surviving tasks.

### Keys and example constraints

```text
subjects(id, user_id, name, goal, description, created_at, updated_at)
chapters(id, user_id, subject_id, name, description, position, created_at, updated_at)
topics(id, user_id, chapter_id, name, requirements, position, created_at, updated_at)
tasks(id, user_id, project_id?, milestone_id?, title, status, due_date?, completed_at?, ...)
projects(id, user_id, name, status, priority, deadline?, created_at, updated_at)
```

Use composite uniqueness where ordering or identity requires it. Index at least `(user_id, updated_at)`, common parent foreign keys, and `(user_id, status, due_date)` for tasks and deadlines. Decide whether tags and topic requirements should be join tables based on expected filtering/reporting needs.

## Existing browser data to preserve

| Current key | Current content |
|---|---|
| `lifestack.study.v1` | Versioned Study data: subjects, chapters, topics, learning activities, notes, revisions, practice sessions, assessments, and study sessions. |
| `lifestack.projects.v1` | Projects, milestones, notes, resources, important dates, and activities. |
| `lifestack.tasks.v1` | Tasks, including project/milestone links and subtasks. |
| `lifestack.settings.v1` | Versioned preferences and module settings. |
| `lifestack.backups.v1` | Browser-local manual backup records. |

The app's export/import format is also a migration input. Inspect and validate the actual current schema in the corresponding repositories and backup adapters during implementation; this document is not a replacement for those contracts.

## Import and cutover flow

1. Export or read the existing versioned browser records; preserve an untouched copy and offer a downloadable backup before upload.
2. Authenticate the user and show a preview of record counts, relationships, and validation errors before import.
3. Import inside a database transaction where practical. Map record IDs consistently, attach all records to the authenticated owner, and validate every foreign-key relationship.
4. Make retries idempotent using stable source IDs plus the authenticated owner, or an explicit import batch/source mapping table. Never trust a client-provided owner ID.
5. Return imported, skipped, and rejected counts with actionable errors. Do not clear local storage automatically after success.
6. Verify counts and representative relationships in the cloud copy. Keep local export/backup and the prior data available through the rollback window.
7. Only after explicit verification should the app switch its default reads/writes to the API. Plan conflict resolution for any local edits made during migration.

## Delete behavior to confirm

Before migrations are written, cover these cases with tests and database constraints:

- Subject deletion removes its chapters, topics, topic learning/revision records, and related subject records as the current repository specifies.
- Chapter/topic deletion removes dependent learning/revision data and detaches retained historical notes/sessions where that is current behavior.
- Project deletion removes project-owned content but unlinks, rather than deletes, associated tasks.
- Milestone deletion unlinks tasks and preserves the tasks.
- User deletion exports or permanently removes that user's records according to a documented retention policy.
