import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrationsDirectory = new URL('../prisma/migrations/', import.meta.url);

test('migration applies, enforces owner-scoped relationships, and preserves local delete behavior', async () => {
  const database = new PGlite();
  try {
    const migrations = (await readdir(migrationsDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const migration of migrations) {
      await database.exec(await readFile(new URL(`${migration.name}/migration.sql`, migrationsDirectory), 'utf8'));
    }
    const ownerA = '11111111-1111-4111-8111-111111111111';
    const ownerB = '22222222-2222-4222-8222-222222222222';
    await database.query(
      'INSERT INTO users (id, email, name) VALUES ($1, $2, $3), ($4, $5, $6)',
      [ownerA, 'owner-a@example.test', 'Owner A', ownerB, 'owner-b@example.test', 'Owner B'],
    );
    const ownedTables = await database.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'owner_id' ORDER BY table_name`,
    );
    const ownerForeignKeys = await database.query(
      `SELECT DISTINCT key_usage.table_name
       FROM information_schema.table_constraints AS constraints
       JOIN information_schema.key_column_usage AS key_usage
         ON key_usage.constraint_catalog = constraints.constraint_catalog
         AND key_usage.constraint_schema = constraints.constraint_schema
         AND key_usage.constraint_name = constraints.constraint_name
       JOIN information_schema.constraint_column_usage AS referenced_usage
         ON referenced_usage.constraint_catalog = constraints.constraint_catalog
         AND referenced_usage.constraint_schema = constraints.constraint_schema
         AND referenced_usage.constraint_name = constraints.constraint_name
       WHERE constraints.constraint_schema = 'public'
         AND constraints.constraint_type = 'FOREIGN KEY'
         AND key_usage.column_name = 'owner_id'
         AND referenced_usage.table_name = 'users'
         AND referenced_usage.column_name = 'id'
       ORDER BY key_usage.table_name`,
    );
    assert.deepEqual(
      ownerForeignKeys.rows.map((row) => row.table_name),
      ownedTables.rows.map((row) => row.table_name),
    );
    const project = await database.query(
      'INSERT INTO projects (owner_id, name) VALUES ($1, $2) RETURNING id',
      [ownerA, 'Owner A project'],
    );
    const otherProject = await database.query(
      'INSERT INTO projects (owner_id, name) VALUES ($1, $2) RETURNING id',
      [ownerB, 'Owner B project'],
    );
    const milestone = await database.query(
      'INSERT INTO project_milestones (owner_id, project_id, name) VALUES ($1, $2, $3) RETURNING id',
      [ownerA, project.rows[0].id, 'Owner A milestone'],
    );

    await assert.rejects(database.query(
      'INSERT INTO tasks (owner_id, title, project_id) VALUES ($1, $2, $3)',
      [ownerB, 'Cross-owner link', project.rows[0].id],
    ));
    await assert.rejects(database.query(
      'INSERT INTO tasks (owner_id, title, project_id, milestone_id) VALUES ($1, $2, $3, $4)',
      [ownerB, 'Cross-owner milestone link', otherProject.rows[0].id, milestone.rows[0].id],
    ));

    const task = await database.query(
      'INSERT INTO tasks (owner_id, title, project_id, milestone_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [ownerA, 'Valid linked task', project.rows[0].id, milestone.rows[0].id],
    );
    await assert.rejects(database.query(
      'INSERT INTO task_tags (owner_id, task_id, tag) VALUES ($1, $2, $3)',
      [ownerB, task.rows[0].id, 'cross-owner'],
    ));

    await database.query('DELETE FROM project_milestones WHERE id = $1', [milestone.rows[0].id]);
    const afterMilestoneDelete = await database.query(
      'SELECT owner_id, project_id, milestone_id FROM tasks WHERE id = $1',
      [task.rows[0].id],
    );
    assert.equal(afterMilestoneDelete.rows[0].milestone_id, null);
    assert.equal(afterMilestoneDelete.rows[0].project_id, project.rows[0].id);
    assert.equal(afterMilestoneDelete.rows[0].owner_id, ownerA);

    await database.query('DELETE FROM projects WHERE id = $1', [project.rows[0].id]);
    const afterProjectDelete = await database.query(
      'SELECT owner_id, project_id, milestone_id FROM tasks WHERE id = $1',
      [task.rows[0].id],
    );
    assert.equal(afterProjectDelete.rows[0].project_id, null);
    assert.equal(afterProjectDelete.rows[0].milestone_id, null);
    assert.equal(afterProjectDelete.rows[0].owner_id, ownerA);

    const subjectA = await database.query(
      'INSERT INTO study_subjects (owner_id, name) VALUES ($1, $2) RETURNING id',
      [ownerA, 'Owner A subject'],
    );
    const subjectB = await database.query(
      'INSERT INTO study_subjects (owner_id, name) VALUES ($1, $2) RETURNING id',
      [ownerB, 'Owner B subject'],
    );
    const chapterA = await database.query(
      'INSERT INTO study_chapters (owner_id, subject_id, name) VALUES ($1, $2, $3) RETURNING id',
      [ownerA, subjectA.rows[0].id, 'Owner A chapter'],
    );
    const topicA = await database.query(
      'INSERT INTO study_topics (owner_id, subject_id, chapter_id, name, requirements) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ownerA, subjectA.rows[0].id, chapterA.rows[0].id, 'Owner A topic', ['lecture']],
    );
    const noteA = await database.query(
      'INSERT INTO study_notes (owner_id, subject_id, topic_id, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ownerA, subjectA.rows[0].id, topicA.rows[0].id, 'Retained note', 'Keep this note after topic deletion'],
    );
    const practiceA = await database.query(
      'INSERT INTO study_practice_sessions (owner_id, subject_id, topic_id, questions_attempted, questions_completed, session_date) VALUES ($1, $2, $3, 1, 1, CURRENT_DATE) RETURNING id',
      [ownerA, subjectA.rows[0].id, topicA.rows[0].id],
    );
    const studySessionA = await database.query(
      'INSERT INTO study_sessions (owner_id, subject_id, topic_id, duration_minutes, session_date) VALUES ($1, $2, $3, 1, CURRENT_DATE) RETURNING id',
      [ownerA, subjectA.rows[0].id, topicA.rows[0].id],
    );

    await assert.rejects(database.query(
      'INSERT INTO study_notes (owner_id, subject_id, topic_id, title, content) VALUES ($1, $2, $3, $4, $5)',
      [ownerB, subjectB.rows[0].id, topicA.rows[0].id, 'Invalid note', 'Cross-owner topic'],
    ));
    await assert.rejects(database.query(
      'INSERT INTO study_practice_sessions (owner_id, subject_id, topic_id, questions_attempted, questions_completed, session_date) VALUES ($1, $2, $3, 1, 1, CURRENT_DATE)',
      [ownerB, subjectB.rows[0].id, topicA.rows[0].id],
    ));
    await assert.rejects(database.query(
      'INSERT INTO study_sessions (owner_id, subject_id, topic_id, duration_minutes, session_date) VALUES ($1, $2, $3, 1, CURRENT_DATE)',
      [ownerB, subjectB.rows[0].id, topicA.rows[0].id],
    ));

    await database.query('DELETE FROM study_topics WHERE id = $1', [topicA.rows[0].id]);
    const retainedNote = await database.query('SELECT subject_id, topic_id FROM study_notes WHERE id = $1', [noteA.rows[0].id]);
    const retainedPractice = await database.query('SELECT subject_id, topic_id FROM study_practice_sessions WHERE id = $1', [practiceA.rows[0].id]);
    const retainedStudySession = await database.query('SELECT subject_id, topic_id FROM study_sessions WHERE id = $1', [studySessionA.rows[0].id]);
    for (const retained of [retainedNote, retainedPractice, retainedStudySession]) {
      assert.equal(retained.rows[0].subject_id, subjectA.rows[0].id);
      assert.equal(retained.rows[0].topic_id, null);
    }

    await assert.rejects(database.query(
      'INSERT INTO projects (owner_id, name) VALUES ($1, $2)',
      ['33333333-3333-4333-8333-333333333333', 'Orphan owner project'],
    ));

    await database.query('DELETE FROM users WHERE id = $1', [ownerA]);
    const privateRows = await database.query(
      `SELECT
         (SELECT count(*) FROM projects WHERE owner_id = $1) AS projects,
         (SELECT count(*) FROM tasks WHERE owner_id = $1) AS tasks,
         (SELECT count(*) FROM study_subjects WHERE owner_id = $1) AS subjects`,
      [ownerA],
    );
    assert.deepEqual(privateRows.rows[0], { projects: 0, tasks: 0, subjects: 0 });
  } finally {
    await database.close();
  }
});
