-- LifeStack core PostgreSQL data model
-- owner_id is supplied by the application; it deliberately has no foreign key
-- until the selected authentication implementation defines the users table.

-- gen_random_uuid() is built into PostgreSQL 13+, so no extension privilege is required.

CREATE TABLE IF NOT EXISTS import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_payload_hash TEXT NOT NULL,
  format_version INTEGER,
  status TEXT NOT NULL DEFAULT 'started',
  source_record_count INTEGER,
  target_record_count INTEGER,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT import_runs_status_check
    CHECK (status IN ('started', 'completed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS import_runs_owner_payload_idx
  ON import_runs(owner_id, source_payload_hash);

CREATE TABLE IF NOT EXISTS import_entity_map (
  owner_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id UUID NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, entity_type, source_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Software Development',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (owner_id, source_id),
  CONSTRAINT projects_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT projects_status_check
    CHECK (status IN ('not_started', 'active', 'on_hold', 'completed', 'archived')),
  CONSTRAINT projects_archive_consistency_check
    CHECK ((status = 'archived') = is_archived)
);

CREATE INDEX IF NOT EXISTS projects_owner_status_idx
  ON projects(owner_id, status);
CREATE INDEX IF NOT EXISTS projects_owner_deadline_idx
  ON projects(owner_id, deadline);
CREATE INDEX IF NOT EXISTS projects_owner_updated_idx
  ON projects(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (id, project_id, owner_id),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (project_id, owner_id)
    REFERENCES projects(id, owner_id) ON DELETE CASCADE,
  CONSTRAINT milestone_completion_check
    CHECK ((completed AND completed_at IS NOT NULL)
      OR (NOT completed AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS project_milestones_owner_project_idx
  ON project_milestones(owner_id, project_id);

CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (project_id, owner_id)
    REFERENCES projects(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_notes_owner_project_idx
  ON project_notes(owner_id, project_id);

CREATE TABLE IF NOT EXISTS project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (project_id, owner_id)
    REFERENCES projects(id, owner_id) ON DELETE CASCADE,
  CONSTRAINT project_resource_type_check
    CHECK (type IN ('link', 'document', 'reference', 'file', 'other'))
);

CREATE INDEX IF NOT EXISTS project_resources_owner_project_idx
  ON project_resources(owner_id, project_id);

CREATE TABLE IF NOT EXISTS project_important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  project_id UUID NOT NULL,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (project_id, owner_id)
    REFERENCES projects(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_dates_owner_project_idx
  ON project_important_dates(owner_id, project_id, date);

CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  project_id UUID NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (project_id, owner_id)
    REFERENCES projects(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_activities_owner_project_time_idx
  ON project_activities(owner_id, project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS project_activities_metadata_idx
  ON project_activities USING GIN(metadata);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  category TEXT NOT NULL DEFAULT '',
  related_module TEXT NOT NULL DEFAULT '',
  project_id UUID,
  milestone_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (milestone_id)
    REFERENCES project_milestones(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id, owner_id)
    REFERENCES projects(id, owner_id) ON DELETE NO ACTION,
  FOREIGN KEY (milestone_id, owner_id)
    REFERENCES project_milestones(id, owner_id) ON DELETE NO ACTION,
  FOREIGN KEY (milestone_id, project_id, owner_id)
    REFERENCES project_milestones(id, project_id, owner_id) ON DELETE NO ACTION,
  CONSTRAINT tasks_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT tasks_status_check
    CHECK (status IN ('todo', 'in_progress', 'completed')),
  CONSTRAINT tasks_milestone_requires_project_check
    CHECK (milestone_id IS NULL OR project_id IS NOT NULL),
  CONSTRAINT tasks_completion_check
    CHECK (
      (status = 'completed' AND completed AND completed_at IS NOT NULL)
      OR (status <> 'completed' AND NOT completed AND completed_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS tasks_owner_status_idx
  ON tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS tasks_owner_project_idx
  ON tasks(owner_id, project_id);
CREATE INDEX IF NOT EXISTS tasks_owner_milestone_idx
  ON tasks(owner_id, milestone_id);
CREATE INDEX IF NOT EXISTS tasks_owner_due_idx
  ON tasks(owner_id, due_date);

CREATE TABLE IF NOT EXISTS task_tags (
  owner_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (task_id, tag),
  FOREIGN KEY (task_id, owner_id)
    REFERENCES tasks(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS task_tags_owner_tag_idx
  ON task_tags(owner_id, tag);

CREATE TABLE IF NOT EXISTS task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  source_id TEXT,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (task_id, owner_id)
    REFERENCES tasks(id, owner_id) ON DELETE CASCADE,
  CONSTRAINT task_subtasks_position_check
    CHECK (position >= 0)
);

CREATE INDEX IF NOT EXISTS task_subtasks_owner_task_idx
  ON task_subtasks(owner_id, task_id, position);

CREATE TABLE IF NOT EXISTS study_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  name TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (owner_id, source_id)
);

CREATE TABLE IF NOT EXISTS study_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  subject_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (id, subject_id, owner_id),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (subject_id, owner_id)
    REFERENCES study_subjects(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS study_chapters_owner_subject_idx
  ON study_chapters(owner_id, subject_id);

CREATE TABLE IF NOT EXISTS study_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  subject_id UUID NOT NULL,
  chapter_id UUID NOT NULL,
  name TEXT NOT NULL,
  requirements TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (id, subject_id, owner_id),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (chapter_id, subject_id, owner_id)
    REFERENCES study_chapters(id, subject_id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, owner_id)
    REFERENCES study_subjects(id, owner_id) ON DELETE CASCADE,
  CONSTRAINT topic_requirements_not_empty_check
    CHECK (cardinality(requirements) > 0),
  CONSTRAINT topic_requirements_valid_check
    CHECK (requirements <@ ARRAY['lecture','reading','practice']::text[])
);

CREATE INDEX IF NOT EXISTS study_topics_owner_chapter_idx
  ON study_topics(owner_id, chapter_id);

CREATE TABLE IF NOT EXISTS study_learning_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  topic_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (topic_id, subject_id, owner_id)
    REFERENCES study_topics(id, subject_id, owner_id) ON DELETE CASCADE,
  CONSTRAINT learning_activity_type_check
    CHECK (type IN ('lecture', 'reading', 'practice')),
  CONSTRAINT learning_activity_completion_check
    CHECK ((completed AND completed_at IS NOT NULL)
      OR (NOT completed AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS study_activities_owner_topic_idx
  ON study_learning_activities(owner_id, topic_id);

CREATE TABLE IF NOT EXISTS study_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  topic_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (topic_id, subject_id, owner_id)
    REFERENCES study_topics(id, subject_id, owner_id) ON DELETE CASCADE,
  CONSTRAINT revision_status_check
    CHECK (status IN ('pending', 'completed')),
  CONSTRAINT revision_completion_check
    CHECK ((status = 'completed' AND completed_at IS NOT NULL)
      OR (status = 'pending' AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS study_revisions_owner_due_idx
  ON study_revisions(owner_id, due_date, status);

CREATE TABLE IF NOT EXISTS study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  subject_id UUID,
  chapter_id UUID,
  topic_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (subject_id, owner_id)
    REFERENCES study_subjects(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id, subject_id, owner_id)
    REFERENCES study_chapters(id, subject_id, owner_id) ON DELETE SET NULL (chapter_id),
  FOREIGN KEY (topic_id, subject_id, owner_id)
    REFERENCES study_topics(id, subject_id, owner_id) ON DELETE SET NULL (topic_id),
  CONSTRAINT study_notes_links_require_subject_check
    CHECK ((chapter_id IS NULL AND topic_id IS NULL) OR subject_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS study_notes_owner_subject_idx
  ON study_notes(owner_id, subject_id);

CREATE TABLE IF NOT EXISTS study_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  subject_id UUID,
  topic_id UUID,
  questions_attempted INTEGER NOT NULL,
  questions_completed INTEGER NOT NULL,
  questions_correct INTEGER,
  duration_minutes NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (subject_id, owner_id)
    REFERENCES study_subjects(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, subject_id, owner_id)
    REFERENCES study_topics(id, subject_id, owner_id) ON DELETE SET NULL (topic_id),
  CONSTRAINT practice_counts_check
    CHECK (questions_attempted >= 0
      AND questions_completed >= 0
      AND questions_completed <= questions_attempted
      AND (questions_correct IS NULL OR questions_correct >= 0
        AND questions_correct <= questions_completed)),
  CONSTRAINT practice_duration_check
    CHECK (duration_minutes >= 0),
  CONSTRAINT practice_topic_requires_subject_check
    CHECK (topic_id IS NULL OR subject_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS study_practice_owner_date_idx
  ON study_practice_sessions(owner_id, session_date DESC);

CREATE TABLE IF NOT EXISTS study_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  subject_id UUID NOT NULL,
  title TEXT NOT NULL,
  assessment_date DATE,
  coverage TEXT NOT NULL DEFAULT '',
  preparation_progress NUMERIC NOT NULL DEFAULT 0,
  marks_obtained NUMERIC,
  marks_total NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, subject_id, owner_id),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (subject_id, owner_id)
    REFERENCES study_subjects(id, owner_id) ON DELETE CASCADE,
  CONSTRAINT assessment_progress_check
    CHECK (preparation_progress >= 0 AND preparation_progress <= 100),
  CONSTRAINT assessment_marks_check
    CHECK ((marks_total IS NULL AND marks_obtained IS NULL)
      OR (marks_total IS NOT NULL
        AND marks_obtained IS NOT NULL
        AND marks_obtained >= 0
        AND marks_obtained <= marks_total))
);

CREATE TABLE IF NOT EXISTS study_assessment_topics (
  owner_id UUID NOT NULL,
  assessment_id UUID NOT NULL REFERENCES study_assessments(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  PRIMARY KEY (assessment_id, topic_id),
  FOREIGN KEY (assessment_id, subject_id, owner_id)
    REFERENCES study_assessments(id, subject_id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, subject_id, owner_id)
    REFERENCES study_topics(id, subject_id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS study_assessment_topics_topic_idx
  ON study_assessment_topics(topic_id);

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  subject_id UUID,
  topic_id UUID,
  duration_minutes NUMERIC NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source_id),
  FOREIGN KEY (subject_id, owner_id)
    REFERENCES study_subjects(id, owner_id) ON DELETE SET NULL (subject_id),
  FOREIGN KEY (topic_id, subject_id, owner_id)
    REFERENCES study_topics(id, subject_id, owner_id) ON DELETE SET NULL (topic_id),
  CONSTRAINT study_session_topic_requires_subject_check
    CHECK (topic_id IS NULL OR subject_id IS NOT NULL),
  CONSTRAINT study_session_duration_check
    CHECK (duration_minutes > 0)
);

CREATE INDEX IF NOT EXISTS study_sessions_owner_date_idx
  ON study_sessions(owner_id, session_date DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  owner_id UUID PRIMARY KEY,
  general JSONB NOT NULL,
  appearance JSONB NOT NULL,
  notifications JSONB NOT NULL,
  application_mode TEXT NOT NULL,
  module_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT application_mode_check
    CHECK (application_mode IN ('simple', 'gamified'))
);

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (owner_id, source_id)
);

CREATE INDEX IF NOT EXISTS notification_history_owner_time_idx
  ON notification_history(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_history_payload_idx
  ON notification_history USING GIN(payload);

CREATE TABLE IF NOT EXISTS manual_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE (owner_id, source_id)
);

CREATE INDEX IF NOT EXISTS manual_backups_owner_created_idx
  ON manual_backups(owner_id, created_at DESC);
