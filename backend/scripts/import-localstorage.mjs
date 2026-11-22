import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;

class AlreadyImportedError extends Error {}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    if (key === 'apply') {
      options.apply = true;
      continue;
    }
    if (!['owner', 'file'].includes(key)) {
      throw new Error(`Unknown option --${key}`);
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    i += 1;
  }
  return options;
}

function usageError(message) {
  console.error(`Error: ${message}`);
  console.error('Usage: npm run import:localstorage -- --owner <uuid> --file <backup.json> [--apply]');
  process.exit(1);
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function unwrapData(value) {
  if (!value) return null;
  if (value.data !== undefined) return value.data;
  if (value.settings !== undefined) return value.settings;
  return value;
}

function normalizeInput(raw) {
  let modules = raw.modules;
  if (!modules) {
    modules = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof key === 'string' && key.startsWith('lifestack.')) modules[key] = value;
    }
  }

  const study = unwrapData(modules.study ?? modules['lifestack.study.v1']);
  const projects = unwrapData(modules.projects ?? modules['lifestack.projects.v1']);
  const tasks = unwrapData(modules.tasks ?? modules['lifestack.tasks.v1']);
  const settings = unwrapData(modules.settings ?? modules['lifestack.settings.v1']);
  const backups = unwrapData(modules.backups ?? modules['lifestack.backups.v1']);

  return {
    formatVersion: typeof raw.formatVersion === 'number' ? raw.formatVersion : null,
    study,
    projects,
    tasks,
    settings,
    backups: Array.isArray(backups) ? backups : [],
  };
}

function requireCollections(record, collections) {
  for (const name of collections) {
    if (!record || !Array.isArray(record[name])) {
      throw new Error(`Snapshot collection "${name}" must be an array.`);
    }
  }
}

function validateIds(name, records) {
  const ids = records.map((record) => record?.id);
  if (ids.some((id) => typeof id !== 'string' || !id)) {
    throw new Error(`${name} contains a record without an ID.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${name} contains duplicate IDs.`);
  }
}

function validate(snapshot) {
  requireCollections(snapshot.study, [
    'subjects', 'chapters', 'topics', 'learningActivities', 'notes', 'revisions',
    'practiceSessions', 'assessments', 'studySessions',
  ]);
  requireCollections(snapshot.projects, [
    'projects', 'milestones', 'notes', 'resources', 'importantDates', 'activities',
  ]);
  requireCollections(snapshot.tasks, ['tasks']);
  if (!snapshot.settings || typeof snapshot.settings !== 'object') {
    throw new Error('Settings data is missing or invalid.');
  }

  const studyGroups = [
    ['study subjects', snapshot.study.subjects],
    ['study chapters', snapshot.study.chapters],
    ['study topics', snapshot.study.topics],
    ['study activities', snapshot.study.learningActivities],
    ['study notes', snapshot.study.notes],
    ['study revisions', snapshot.study.revisions],
    ['study practice sessions', snapshot.study.practiceSessions],
    ['study assessments', snapshot.study.assessments],
    ['study sessions', snapshot.study.studySessions],
  ];
  const projectGroups = [
    ['projects', snapshot.projects.projects],
    ['project milestones', snapshot.projects.milestones],
    ['project notes', snapshot.projects.notes],
    ['project resources', snapshot.projects.resources],
    ['important dates', snapshot.projects.importantDates],
    ['project activities', snapshot.projects.activities],
  ];
  for (const [name, records] of [...studyGroups, ...projectGroups, ['tasks', snapshot.tasks.tasks]]) {
    validateIds(name, records);
  }

  const subjectIds = new Set(snapshot.study.subjects.map((item) => item.id));
  const chapterIds = new Set(snapshot.study.chapters.map((item) => item.id));
  const topicIds = new Set(snapshot.study.topics.map((item) => item.id));
  const projectIds = new Set(snapshot.projects.projects.map((item) => item.id));

  if (snapshot.study.chapters.some((item) => !subjectIds.has(item.subjectId))) {
    throw new Error('Study snapshot contains a chapter linked to a missing subject.');
  }
  if (snapshot.study.topics.some((item) => !chapterIds.has(item.chapterId))) {
    throw new Error('Study snapshot contains a topic linked to a missing chapter.');
  }
  if (snapshot.study.learningActivities.some((item) => !topicIds.has(item.topicId)
    || !['lecture', 'reading', 'practice'].includes(item.type))) {
    throw new Error('Study snapshot contains an invalid learning activity relationship.');
  }
  if (snapshot.study.revisions.some((item) => !topicIds.has(item.topicId))) {
    throw new Error('Study snapshot contains a revision linked to a missing topic.');
  }
  if (snapshot.projects.milestones.some((item) => !projectIds.has(item.projectId))) {
    throw new Error('Project snapshot contains a milestone linked to a missing project.');
  }
  for (const item of [...snapshot.projects.notes, ...snapshot.projects.resources,
    ...snapshot.projects.importantDates, ...snapshot.projects.activities]) {
    if (!projectIds.has(item.projectId)) {
      throw new Error('Project snapshot contains a child linked to a missing project.');
    }
  }
  for (const task of snapshot.tasks.tasks) {
    if (task.projectId && !projectIds.has(task.projectId)) {
      throw new Error(`Task "${task.id}" references a missing project.`);
    }
    if (task.milestoneId) {
      const milestone = snapshot.projects.milestones.find((item) => item.id === task.milestoneId);
      if (!milestone || milestone.projectId !== task.projectId) {
        throw new Error(`Task "${task.id}" references a broken milestone relationship.`);
      }
    }
  }
}

function timestamp(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function dateOnly(value) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function ensureMapped(client, ownerId, entityType, sourceId, insert) {
  const source = sourceId || randomUUID();
  const found = await client.query(
    `SELECT target_id FROM import_entity_map
     WHERE owner_id=$1 AND entity_type=$2 AND source_id=$3`,
    [ownerId, entityType, source],
  );
  if (found.rowCount) return found.rows[0].target_id;

  const targetId = await insert(uuid(source) ? source : randomUUID());
  await client.query(
    `INSERT INTO import_entity_map (owner_id, entity_type, source_id, target_id)
     VALUES ($1,$2,$3,$4)`,
    [ownerId, entityType, source, targetId],
  );
  return targetId;
}

async function importSnapshot(client, ownerId, snapshot, fallback) {
  let count = 0;

  await client.query(
    `INSERT INTO user_settings
       (owner_id, general, appearance, notifications, application_mode, module_settings, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (owner_id) DO NOTHING`,
    [ownerId, snapshot.settings.general ?? {}, snapshot.settings.appearance ?? {},
      snapshot.settings.notifications ?? {}, snapshot.settings.applicationMode ?? 'simple',
      snapshot.settings.moduleSettings ?? {}, fallback],
  );

  const subjects = new Map();
  for (const item of snapshot.study.subjects) {
    const id = await ensureMapped(client, ownerId, 'study_subject', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_subjects
           (id,owner_id,source_id,name,goal,description,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [target, ownerId, item.id, item.name, item.goal ?? '', item.description ?? '',
          timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
    subjects.set(item.id, id);
  }

  const chapters = new Map();
  for (const item of snapshot.study.chapters) {
    const subjectId = subjects.get(item.subjectId);
    const id = await ensureMapped(client, ownerId, 'study_chapter', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_chapters
           (id,owner_id,source_id,subject_id,name,description,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [target, ownerId, item.id, subjectId, item.name, item.description ?? '',
          timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
    chapters.set(item.id, id);
  }

  const topics = new Map();
  for (const item of snapshot.study.topics) {
    const chapter = snapshot.study.chapters.find((value) => value.id === item.chapterId);
    const chapterId = chapters.get(item.chapterId);
    const subjectId = subjects.get(chapter?.subjectId);
    const id = await ensureMapped(client, ownerId, 'study_topic', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_topics
           (id,owner_id,source_id,subject_id,chapter_id,name,requirements,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [target, ownerId, item.id, subjectId, chapterId, item.name,
          item.requirements ?? [], timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
    topics.set(item.id, id);
  }

  for (const item of snapshot.study.learningActivities) {
    const topicId = topics.get(item.topicId);
    const topic = snapshot.study.topics.find((value) => value.id === item.topicId);
    const chapter = snapshot.study.chapters.find((value) => value.id === topic?.chapterId);
    const subjectId = subjects.get(chapter?.subjectId);
    await ensureMapped(client, ownerId, 'study_learning_activity', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_learning_activities
           (id,owner_id,source_id,topic_id,subject_id,type,title,details,completed,created_at,completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [target, ownerId, item.id, topicId, subjectId, item.type, item.title, item.details ?? '',
          Boolean(item.completed), timestamp(item.createdAt, fallback),
          item.completed ? timestamp(item.completedAt, fallback) : null],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.study.revisions) {
    const topicId = topics.get(item.topicId);
    const topic = snapshot.study.topics.find((value) => value.id === item.topicId);
    const chapter = snapshot.study.chapters.find((value) => value.id === topic?.chapterId);
    const subjectId = subjects.get(chapter?.subjectId);
    await ensureMapped(client, ownerId, 'study_revision', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_revisions
           (id,owner_id,source_id,topic_id,subject_id,status,due_date,notes,created_at,completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [target, ownerId, item.id, topicId, subjectId,
          item.status === 'completed' ? 'completed' : 'pending', dateOnly(item.dueDate),
          item.notes ?? '', timestamp(item.createdAt, fallback),
          item.status === 'completed' ? timestamp(item.completedAt, fallback) : null],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.study.notes) {
    await ensureMapped(client, ownerId, 'study_note', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_notes
           (id,owner_id,source_id,subject_id,chapter_id,topic_id,title,content,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [target, ownerId, item.id, subjects.get(item.subjectId),
          item.chapterId ? chapters.get(item.chapterId) : null,
          item.topicId ? topics.get(item.topicId) : null,
          item.title, item.content ?? '', timestamp(item.createdAt, fallback),
          timestamp(item.updatedAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.study.practiceSessions) {
    await ensureMapped(client, ownerId, 'study_practice_session', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_practice_sessions
           (id,owner_id,source_id,subject_id,topic_id,questions_attempted,questions_completed,
            questions_correct,duration_minutes,notes,session_date,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [target, ownerId, item.id, subjects.get(item.subjectId),
          item.topicId ? topics.get(item.topicId) : null,
          Number(item.questionsAttempted ?? 0), Number(item.questionsCompleted ?? 0),
          item.questionsCorrect == null ? null : Number(item.questionsCorrect),
          Number(item.durationMinutes ?? 0), item.notes ?? '',
          dateOnly(item.date) ?? fallback.slice(0, 10), timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  const assessments = new Map();
  for (const item of snapshot.study.assessments) {
    const id = await ensureMapped(client, ownerId, 'study_assessment', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_assessments
           (id,owner_id,source_id,subject_id,title,assessment_date,coverage,
            preparation_progress,marks_obtained,marks_total,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [target, ownerId, item.id, subjects.get(item.subjectId), item.title,
          dateOnly(item.date), item.coverage ?? '', Number(item.preparationProgress ?? 0),
          item.marksObtained == null ? null : Number(item.marksObtained),
          item.marksTotal == null ? null : Number(item.marksTotal),
          timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
    assessments.set(item.id, id);
  }

  for (const item of snapshot.study.assessments) {
    for (const topicSourceId of item.topicIds ?? []) {
      const topicId = topics.get(topicSourceId);
      const topic = snapshot.study.topics.find((value) => value.id === topicSourceId);
      const chapter = snapshot.study.chapters.find((value) => value.id === topic?.chapterId);
      await client.query(
        `INSERT INTO study_assessment_topics
           (owner_id,assessment_id,topic_id,subject_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (assessment_id,topic_id) DO NOTHING`,
        [ownerId, assessments.get(item.id), topicId, subjects.get(chapter?.subjectId)],
      );
    }
  }

  for (const item of snapshot.study.studySessions) {
    await ensureMapped(client, ownerId, 'study_session', item.id, async (target) => {
      await client.query(
        `INSERT INTO study_sessions
           (id,owner_id,source_id,subject_id,topic_id,duration_minutes,notes,session_date,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [target, ownerId, item.id, item.subjectId ? subjects.get(item.subjectId) : null,
          item.topicId ? topics.get(item.topicId) : null, Number(item.durationMinutes),
          item.notes ?? '', dateOnly(item.date) ?? fallback.slice(0, 10),
          timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  const projects = new Map();
  for (const item of snapshot.projects.projects) {
    const id = await ensureMapped(client, ownerId, 'project', item.id, async (target) => {
      const status = ['not_started', 'active', 'on_hold', 'completed', 'archived'].includes(item.status)
        ? item.status : 'active';
      await client.query(
        `INSERT INTO projects
           (id,owner_id,source_id,name,description,category,priority,status,is_archived,
            start_date,deadline,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [target, ownerId, item.id, item.name, item.description ?? '',
          item.category ?? 'Software Development',
          ['low', 'medium', 'high', 'urgent'].includes(item.priority) ? item.priority : 'medium',
          status, status === 'archived', dateOnly(item.startDate), dateOnly(item.deadline),
          timestamp(item.createdAt, fallback), timestamp(item.updatedAt, fallback)],
      );
      count += 1;
      return target;
    });
    projects.set(item.id, id);
  }

  const milestones = new Map();
  for (const item of snapshot.projects.milestones) {
    const id = await ensureMapped(client, ownerId, 'project_milestone', item.id, async (target) => {
      await client.query(
        `INSERT INTO project_milestones
           (id,owner_id,source_id,project_id,name,description,due_date,completed,
            completed_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [target, ownerId, item.id, projects.get(item.projectId), item.name,
          item.description ?? '', dateOnly(item.dueDate), Boolean(item.completed),
          item.completed ? timestamp(item.completedAt, fallback) : null,
          timestamp(item.createdAt, fallback), timestamp(item.updatedAt, fallback)],
      );
      count += 1;
      return target;
    });
    milestones.set(item.id, id);
  }

  for (const item of snapshot.projects.notes) {
    await ensureMapped(client, ownerId, 'project_note', item.id, async (target) => {
      await client.query(
        `INSERT INTO project_notes
           (id,owner_id,source_id,project_id,title,content,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [target, ownerId, item.id, projects.get(item.projectId), item.title, item.content ?? '',
          timestamp(item.createdAt, fallback), timestamp(item.updatedAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.projects.resources) {
    await ensureMapped(client, ownerId, 'project_resource', item.id, async (target) => {
      await client.query(
        `INSERT INTO project_resources
           (id,owner_id,source_id,project_id,name,description,type,url,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [target, ownerId, item.id, projects.get(item.projectId), item.name,
          item.description ?? '',
          ['link', 'document', 'reference', 'file', 'other'].includes(item.type) ? item.type : 'link',
          item.url ?? '', timestamp(item.createdAt, fallback), timestamp(item.updatedAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.projects.importantDates) {
    await ensureMapped(client, ownerId, 'project_important_date', item.id, async (target) => {
      await client.query(
        `INSERT INTO project_important_dates
           (id,owner_id,source_id,project_id,label,date,description,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [target, ownerId, item.id, projects.get(item.projectId), item.label,
          dateOnly(item.date), item.description ?? '', timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.projects.activities) {
    await ensureMapped(client, ownerId, 'project_activity', item.id, async (target) => {
      await client.query(
        `INSERT INTO project_activities
           (id,owner_id,source_id,project_id,type,description,metadata,occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [target, ownerId, item.id, projects.get(item.projectId), item.type,
          item.description ?? '', item.metadata ?? {}, timestamp(item.timestamp, fallback)],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.tasks.tasks) {
    await ensureMapped(client, ownerId, 'task', item.id, async (target) => {
      const status = item.completed || item.status === 'completed'
        ? 'completed' : item.status === 'in_progress' ? 'in_progress' : 'todo';
      await client.query(
        `INSERT INTO tasks
           (id,owner_id,source_id,title,description,priority,status,completed,completed_at,
            due_date,category,related_module,project_id,milestone_id,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [target, ownerId, item.id, item.title, item.description ?? '',
          ['low', 'medium', 'high', 'urgent'].includes(item.priority) ? item.priority : 'medium',
          status, status === 'completed',
          status === 'completed' ? timestamp(item.completedAt, fallback) : null,
          dateOnly(item.dueDate), item.category ?? '', item.relatedModule ?? '',
          item.projectId ? projects.get(item.projectId) : null,
          item.milestoneId ? milestones.get(item.milestoneId) : null,
          timestamp(item.createdAt, fallback), timestamp(item.updatedAt, fallback)],
      );
      for (const tag of Array.isArray(item.tags) ? item.tags : []) {
        if (!tag) continue;
        await client.query(
          `INSERT INTO task_tags (owner_id,task_id,tag)
           VALUES ($1,$2,$3) ON CONFLICT (task_id,tag) DO NOTHING`,
          [ownerId, target, String(tag)],
        );
      }
      for (const [position, subtask] of (Array.isArray(item.subtasks) ? item.subtasks : []).entries()) {
        const sourceId = `${item.id}:${subtask.id ?? `subtask:${position}`}`;
        await ensureMapped(client, ownerId, 'task_subtask', sourceId, async (subtaskTarget) => {
          await client.query(
            `INSERT INTO task_subtasks
               (id,owner_id,task_id,source_id,title,completed,position)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [subtaskTarget, ownerId, target, sourceId, subtask.title ?? '',
              Boolean(subtask.completed), position],
        );
          return subtaskTarget;
        });
      }
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.settings.notifications?.history?.slice(-100) ?? []) {
    await ensureMapped(client, ownerId, 'notification', item.id, async (target) => {
      await client.query(
        `INSERT INTO notification_history
           (id,owner_id,source_id,title,payload,created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [target, ownerId, item.id, item.title, item,
          timestamp(item.createdAt, fallback)],
      );
      count += 1;
      return target;
    });
  }

  for (const item of snapshot.backups.slice(0, 5)) {
    await ensureMapped(client, ownerId, 'manual_backup', item.id, async (target) => {
      await client.query(
        `INSERT INTO manual_backups (id,owner_id,source_id,created_at,payload)
         VALUES ($1,$2,$3,$4,$5)`,
        [target, ownerId, item.id, timestamp(item.createdAt, fallback), item.data ?? item],
      );
      count += 1;
      return target;
    });
  }

  return count;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
  if (!options.owner) usageError('Missing required --owner');
  if (!uuid(options.owner)) usageError('--owner must be a UUID');
  if (!options.file) usageError('Missing required --file');
} catch (error) {
  usageError(error instanceof Error ? error.message : String(error));
}

const databaseUrl = process.env.DATABASE_URL;

const sourceBytes = await readFile(options.file);
let raw;
try {
  raw = JSON.parse(sourceBytes.toString('utf8'));
} catch {
  usageError('--file must contain valid JSON');
}
const snapshot = normalizeInput(raw);
validate(snapshot);
const hash = createHash('sha256').update(sourceBytes).digest('hex');
const counts = {
  subjects: snapshot.study.subjects.length,
  chapters: snapshot.study.chapters.length,
  topics: snapshot.study.topics.length,
  learningActivities: snapshot.study.learningActivities.length,
  studyNotes: snapshot.study.notes.length,
  revisions: snapshot.study.revisions.length,
  practiceSessions: snapshot.study.practiceSessions.length,
  assessments: snapshot.study.assessments.length,
  studySessions: snapshot.study.studySessions.length,
  projects: snapshot.projects.projects.length,
  milestones: snapshot.projects.milestones.length,
  projectNotes: snapshot.projects.notes.length,
  resources: snapshot.projects.resources.length,
  importantDates: snapshot.projects.importantDates.length,
  projectActivities: snapshot.projects.activities.length,
  tasks: snapshot.tasks.tasks.length,
  backups: snapshot.backups.length,
};

if (!options.apply) {
  console.log(JSON.stringify({
    status: 'preview_only',
    ownerId: options.owner,
    sourcePayloadHash: hash,
    counts,
    writesPerformed: false,
    nextStep: 'Review the owner ID and counts, then rerun with --apply to import.',
  }));
} else {
  await applyImport();
}

async function applyImport() {
  if (!databaseUrl) usageError('DATABASE_URL is required when --apply is used');
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5_000 });
  const fallback = new Date().toISOString();

  try {
    const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const previous = await client.query(
      `SELECT status FROM import_runs
       WHERE owner_id=$1 AND source_payload_hash=$2
       ORDER BY started_at DESC LIMIT 1`,
      [options.owner, hash],
    );
    if (previous.rowCount && previous.rows[0].status === 'completed') {
      await client.query('ROLLBACK');
      throw new AlreadyImportedError(JSON.stringify({
        status: 'already_imported',
        ownerId: options.owner,
        sourcePayloadHash: hash,
      }));
    }

    const existingMapping = await client.query(
      'SELECT entity_type, source_id FROM import_entity_map WHERE owner_id=$1 LIMIT 1',
      [options.owner],
    );
    if (existingMapping.rowCount) {
      throw new Error(
        'This owner already has source mappings for a different payload. '
        + 'Conflict resolution is required; existing server data was not overwritten.',
      );
    }

    await client.query(
      `INSERT INTO import_runs
         (owner_id,source_payload_hash,format_version,status,source_record_count,started_at)
       VALUES ($1,$2,$3,'started',$4,$5)`,
      [options.owner, hash, snapshot.formatVersion,
        snapshot.study.subjects.length + snapshot.study.chapters.length
          + snapshot.study.topics.length + snapshot.projects.projects.length
          + snapshot.tasks.tasks.length,
        fallback],
    );

    const targetRecordCount = await importSnapshot(client, options.owner, snapshot, fallback);
    await client.query(
      `UPDATE import_runs
       SET status='completed',target_record_count=$3,completed_at=$4
       WHERE owner_id=$1 AND source_payload_hash=$2`,
      [options.owner, hash, targetRecordCount, new Date().toISOString()],
    );
    await client.query('COMMIT');
    console.log(JSON.stringify({
      status: 'completed',
      ownerId: options.owner,
      sourcePayloadHash: hash,
      targetRecordCount,
    }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  } catch (error) {
    if (error instanceof AlreadyImportedError) {
      console.log(error.message);
    } else {
    console.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}
