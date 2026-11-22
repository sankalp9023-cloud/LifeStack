# LifeStack Data Model and localStorage Migration

## Purpose

This document describes how browser-local LifeStack data maps to PostgreSQL. It preserves existing relationships and deletion behavior across the account, domain, and query-performance migrations.

The executable schema is in [the initial SQL migration](../backend/prisma/migrations/20261122000000_initial/migration.sql) and later migrations under `backend/prisma/migrations/`.

## Data ownership and identities

- Every domain row requires `owner_id`, which references `users.id` with `ON DELETE CASCADE` in the owner-foreign-key migration.
- Every row has a generated UUID.
- Local IDs remain available in `source_id`.
- `import_entity_map` preserves the mapping from local record IDs to database IDs.
- Composite foreign keys are used where ownership and project/subject consistency must be enforced together.

The initial domain migration predates account tables. The account migration creates `users`, identities, and sessions; the following migration binds every `owner_id` table to `users`. Deploy all migrations in order before importing or serving private data. PostgreSQL 15+ is required for the column-targeted `ON DELETE SET NULL` constraints.

## Domain relationships

### Study

```text
study_subjects
  1 -> * study_chapters
          1 -> * study_topics
                    1 -> * study_learning_activities
                    1 -> * study_revisions

study_notes -> subject, optional chapter, optional topic
study_practice_sessions -> subject, optional topic
study_assessments -> subject, topics through study_assessment_topics
study_sessions -> optional subject, optional topic
```

The importer sets `study_topics.subject_id` from the chapter relationship. This denormalized subject ID is validated against the chapter and makes cross-subject topic links enforceable.

Deletion behavior:

- Subject delete: cascades chapters, topics, learning activities, revisions, practice sessions, assessments, and notes.
- Chapter delete: cascades topics and their topic-specific records; chapter links on retained notes are detached.
- Topic delete: cascades its learning activities and revisions; topic links on notes, practice sessions, assessments, and study sessions are detached.
- Study session subject delete: detaches both subject and topic.

### Projects

```text
projects
  1 -> * project_milestones
  1 -> * project_notes
  1 -> * project_resources
  1 -> * project_important_dates
  1 -> * project_activities
```

Project deletion cascades all of these collections. Project activity metadata is stored in JSONB.

### Tasks

Tasks may belong to a project and, within that project, a milestone. Tags are normalized into `task_tags`. Subtasks are normalized into `task_subtasks` and preserve the local subtask IDs where possible.

Project deletion detaches tasks from the project and therefore also detaches milestones.
Milestone deletion detaches only milestone-linked tasks.
The owner/update index supports stable keyset pagination for the Tasks API.

## Settings

Settings remain one JSONB record per owner. Notification history is normalized into `notification_history` for ordering and cleanup.

Manual backups retain their original JSON payload in `manual_backups`; existing application logic still controls the five-record limit.

## Existing backups

The existing app backup format is a versioned envelope containing `settings`, `study`, `projects`, and `tasks`. The database migration does not convert this payload before it is stored. Domain rows are migrated separately, and original backup payloads remain restorable without losing unknown future fields.

## Timestamps

The importer uses existing values in this priority:

1. Record `createdAt`, `updatedAt`, `completedAt`, `timestamp`, or `date`.
2. Existing app backup `exportedAt`.
3. Import transaction time.

Date-only fields map to PostgreSQL `DATE`; empty strings map to `NULL`.
ISO timestamps map to `TIMESTAMPTZ`.

## Import order

Run the complete import in one transaction:

1. Validate the complete snapshot and every backup module.
2. Merge settings defaults and normalize settings.
3. Create subjects, chapters, topics, and study records.
4. Create projects and project children.
5. Create milestones before tasks.
6. Create tasks, tags, subtasks, and project/milestone links.
7. Create assessment/topic joins.
8. Create notification history and manual backups.
9. Record every source-to-target mapping.
10. Mark the import run complete.

If validation or any database constraint fails, roll back the entire transaction.

## Idempotent import rules

- Scope all mappings and data by `owner_id`.
- Use an import payload SHA-256 hash to detect retries.
- Upsert entities by `(owner_id, source_id, entity_type)`.
- Use database UUIDs from `import_entity_map` for every relationship.
- Recreate join rows with conflict-safe inserts.
- Replace or upsert nested tags/subtasks according to the source snapshot.
- Do not create a second settings or backup row for an existing source ID.
- Do not delete existing server data during retry or migration.

Different payloads with the same local source IDs should report a conflict. The migration UI or service must require explicit resolution before changing existing server records.

## Validation policy

Reject the complete snapshot when:

- A collection contains duplicate or missing IDs.
- A project child references a missing project.
- A task references a missing project or a milestone outside that project.
- A chapter references a missing subject.
- A topic references a missing chapter or subject.
- A topic has no valid learning requirement.
- A study record references records outside the stated subject relationship.
- Settings contain unsupported values.
- A backup is unsupported or contains broken module relationships.

The import may safely default missing settings values, but it must not silently alter invalid domain relationships or numeric constraints.
