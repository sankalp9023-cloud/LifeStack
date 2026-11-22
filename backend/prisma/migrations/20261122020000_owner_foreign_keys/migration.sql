-- Bind every private data row to an account. Existing orphan owner IDs make
-- this migration fail safely and must be reconciled before deployment.

ALTER TABLE import_runs
  ADD CONSTRAINT import_runs_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE import_entity_map
  ADD CONSTRAINT import_entity_map_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE projects
  ADD CONSTRAINT projects_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE project_milestones
  ADD CONSTRAINT project_milestones_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE project_notes
  ADD CONSTRAINT project_notes_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE project_resources
  ADD CONSTRAINT project_resources_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE project_important_dates
  ADD CONSTRAINT project_important_dates_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE project_activities
  ADD CONSTRAINT project_activities_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE task_tags
  ADD CONSTRAINT task_tags_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE task_subtasks
  ADD CONSTRAINT task_subtasks_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_subjects
  ADD CONSTRAINT study_subjects_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_chapters
  ADD CONSTRAINT study_chapters_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_topics
  ADD CONSTRAINT study_topics_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_learning_activities
  ADD CONSTRAINT study_learning_activities_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_revisions
  ADD CONSTRAINT study_revisions_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_notes
  ADD CONSTRAINT study_notes_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_practice_sessions
  ADD CONSTRAINT study_practice_sessions_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_assessments
  ADD CONSTRAINT study_assessments_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_assessment_topics
  ADD CONSTRAINT study_assessment_topics_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_history
  ADD CONSTRAINT notification_history_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE manual_backups
  ADD CONSTRAINT manual_backups_owner_user_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
