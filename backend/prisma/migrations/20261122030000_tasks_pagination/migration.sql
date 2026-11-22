-- Support stable owner-scoped task pagination ordered by recent updates.
CREATE INDEX IF NOT EXISTS tasks_owner_updated_id_idx
  ON tasks(owner_id, updated_at DESC, id ASC);
