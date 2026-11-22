import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { addSessionAuthentication, authenticatedUserId } from '../auth/session.js';

type TaskOptions = { database: PrismaClient | null };
type Queryable = { $queryRawUnsafe: PrismaClient['$queryRawUnsafe'] };
type TaskRow = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  completed: boolean;
  completed_at: Date | null;
  due_date: string | null;
  category: string;
  related_module: string;
  project_id: string | null;
  milestone_id: string | null;
  created_at: Date;
  updated_at: Date;
  cursor_updated_at: string;
  tags: string[];
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
};
type TaskInput = {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in_progress' | 'completed';
  dueDate?: string;
  category?: string;
  relatedModule?: '' | 'study' | 'projects' | 'personal';
  projectId?: string;
  milestoneId?: string;
  tags?: string[];
  subtasks?: Array<{ id?: string; title: string; completed?: boolean }>;
};
type TaskFilters = {
  limit?: number;
  cursor?: string;
  q?: string;
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  projectId?: string;
  milestoneId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  unassigned?: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ERROR_SCHEMA = {
  type: 'object', required: ['error'], properties: {
    error: { type: 'object', required: ['code', 'message', 'requestId'], properties: {
      code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' },
    } },
  },
} as const;
const taskProperties = {
  title: { type: 'string', minLength: 1, maxLength: 300 },
  description: { type: 'string', maxLength: 20_000 },
  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
  status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
  dueDate: { anyOf: [{ type: 'string', format: 'date' }, { type: 'string', maxLength: 0 }] },
  category: { type: 'string', maxLength: 100 },
  relatedModule: { type: 'string', enum: ['', 'study', 'projects', 'personal'] },
  projectId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'string', maxLength: 0 }] },
  milestoneId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'string', maxLength: 0 }] },
  tags: { type: 'array', maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 100 } },
  subtasks: { type: 'array', maxItems: 100, items: {
    type: 'object', additionalProperties: false, required: ['title'],
    properties: {
      id: { type: 'string', maxLength: 100 },
      title: { type: 'string', minLength: 1, maxLength: 500 },
      completed: { type: 'boolean' },
    },
  } },
} as const;
const taskRowSelect = `
  SELECT t.id::text, t.title, t.description, t.priority, t.status, t.completed,
    t.completed_at, to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
    t.category, t.related_module, t.project_id::text, t.milestone_id::text,
    t.created_at, t.updated_at,
    to_char(t.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at,
    COALESCE((SELECT json_agg(tag.tag ORDER BY tag.tag) FROM task_tags tag
      WHERE tag.task_id = t.id AND tag.owner_id = t.owner_id), '[]'::json) AS tags,
    COALESCE((SELECT json_agg(json_build_object(
      'id', subtask.id::text, 'title', subtask.title, 'completed', subtask.completed
    ) ORDER BY subtask.position) FROM task_subtasks subtask
      WHERE subtask.task_id = t.id AND subtask.owner_id = t.owner_id), '[]'::json) AS subtasks
  FROM tasks t`;

function sendError(request: FastifyRequest, reply: FastifyReply, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message, requestId: request.id } });
}

function mapTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    completed: row.completed,
    completedAt: row.completed_at?.toISOString() ?? null,
    dueDate: row.due_date ?? '',
    category: row.category,
    relatedModule: row.related_module,
    projectId: row.project_id ?? '',
    milestoneId: row.milestone_id ?? '',
    tags: row.tags,
    subtasks: row.subtasks,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function readTask(database: Queryable, ownerId: string, taskId: string): Promise<TaskRow | null> {
  const rows = await database.$queryRawUnsafe<TaskRow[]>(
    `${taskRowSelect} WHERE t.owner_id = $1::uuid AND t.id = $2::uuid LIMIT 1`, ownerId, taskId,
  );
  return rows[0] ?? null;
}

function decodeCursor(cursor: string): { updatedAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = decoded.lastIndexOf('|');
    if (separator < 0) return null;
    const updatedAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(updatedAt)
      || Number.isNaN(Date.parse(updatedAt))
      || !UUID_PATTERN.test(id)) return null;
    return { updatedAt, id };
  } catch {
    return null;
  }
}

function encodeCursor(row: Pick<TaskRow, 'cursor_updated_at' | 'id'>): string {
  return Buffer.from(`${row.cursor_updated_at}|${row.id}`).toString('base64url');
}

function hasInvalidTaskChildren(input: Pick<TaskInput, 'tags' | 'subtasks'>): boolean {
  if (input.tags?.some((tag) => !tag.trim())) return true;
  const subtasks = input.subtasks ?? [];
  if (subtasks.some((subtask) => !subtask.title.trim())) return true;
  const ids = subtasks.flatMap((subtask) => subtask.id ? [subtask.id] : []);
  return new Set(ids).size !== ids.length;
}

async function validateLinks(
  database: Queryable,
  ownerId: string,
  projectId: string | null,
  milestoneId: string | null,
): Promise<'project' | 'milestone' | 'mismatch' | null> {
  if (projectId) {
    const projects = await database.$queryRawUnsafe<{ id: string }[]>(
      'SELECT id::text FROM projects WHERE id = $1::uuid AND owner_id = $2::uuid LIMIT 1', projectId, ownerId,
    );
    if (!projects[0]) return 'project';
  }
  if (milestoneId) {
    const milestones = await database.$queryRawUnsafe<{ id: string; project_id: string }[]>(
      'SELECT id::text, project_id::text FROM project_milestones WHERE id = $1::uuid AND owner_id = $2::uuid LIMIT 1',
      milestoneId,
      ownerId,
    );
    if (!milestones[0]) return 'milestone';
    if (!projectId || milestones[0].project_id !== projectId) return 'mismatch';
  }
  return null;
}

async function replaceTaskChildren(
  database: PrismaClient,
  ownerId: string,
  taskId: string,
  input: Pick<TaskInput, 'tags' | 'subtasks'>,
): Promise<void> {
  if (input.tags !== undefined) {
    const tags = [...new Set(input.tags.map((tag) => tag.trim()))];
    await database.$executeRawUnsafe('DELETE FROM task_tags WHERE owner_id = $1::uuid AND task_id = $2::uuid', ownerId, taskId);
    for (const tag of tags) {
      await database.$executeRawUnsafe(
        'INSERT INTO task_tags (owner_id, task_id, tag) VALUES ($1::uuid, $2::uuid, $3)', ownerId, taskId, tag,
      );
    }
  }
  if (input.subtasks !== undefined) {
    const titles = input.subtasks.map((subtask) => subtask.title.trim());
    const existingRows = await database.$queryRawUnsafe<{ id: string }[]>(
      'SELECT id::text FROM task_subtasks WHERE owner_id = $1::uuid AND task_id = $2::uuid', ownerId, taskId,
    );
    const existingIds = new Set(existingRows.map((row) => row.id));
    await database.$executeRawUnsafe('DELETE FROM task_subtasks WHERE owner_id = $1::uuid AND task_id = $2::uuid', ownerId, taskId);
    for (const [position, subtask] of input.subtasks.entries()) {
      const id = subtask.id && existingIds.has(subtask.id) ? subtask.id : randomUUID();
      await database.$executeRawUnsafe(
        `INSERT INTO task_subtasks (id, owner_id, task_id, title, completed, position)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)`,
        id, ownerId, taskId, titles[position], Boolean(subtask.completed), position,
      );
    }
  }
}

function getOwnerId(request: FastifyRequest): string {
  return authenticatedUserId(request);
}

export const registerTaskRoutes: FastifyPluginAsync<TaskOptions> = async (app, { database }) => {
  addSessionAuthentication(app, database, 'Task');

  app.get('/api/v1/tasks/overview', async (request) => {
    const ownerId = getOwnerId(request);
    const today = new Date().toISOString().slice(0, 10);
    const [summaryRows, priorities, categories] = await Promise.all([
      database!.$queryRawUnsafe<Array<{
        total: number;
        completed: number;
        today: number;
        urgent: number;
        overdue: number;
        todo: number;
        in_progress: number;
      }>>(
        `SELECT count(*)::integer AS total,
          (count(*) FILTER (WHERE status = 'completed'))::integer AS completed,
          (count(*) FILTER (WHERE due_date = $2::date))::integer AS today,
          (count(*) FILTER (WHERE priority = 'urgent' AND status <> 'completed'))::integer AS urgent,
          (count(*) FILTER (WHERE due_date < $2::date AND status <> 'completed'))::integer AS overdue,
          (count(*) FILTER (WHERE status = 'todo'))::integer AS todo,
          (count(*) FILTER (WHERE status = 'in_progress'))::integer AS in_progress
         FROM tasks WHERE owner_id = $1::uuid`, ownerId, today,
      ),
      database!.$queryRawUnsafe<Array<{ priority: string; count: number }>>(
        `SELECT priority, count(*)::integer AS count FROM tasks
         WHERE owner_id = $1::uuid GROUP BY priority`, ownerId,
      ),
      database!.$queryRawUnsafe<Array<{ category: string; count: number }>>(
        `SELECT COALESCE(NULLIF(category, ''), 'Inbox') AS category, count(*)::integer AS count
         FROM tasks WHERE owner_id = $1::uuid GROUP BY COALESCE(NULLIF(category, ''), 'Inbox')
         ORDER BY count(*) DESC, category ASC`, ownerId,
      ),
    ]);
    const summary = summaryRows[0];
    const total = summary?.total ?? 0;
    const completed = summary?.completed ?? 0;
    return {
      data: {
        total,
        completed,
        today: summary?.today ?? 0,
        urgent: summary?.urgent ?? 0,
        overdue: summary?.overdue ?? 0,
        statusCounts: {
          todo: summary?.todo ?? 0,
          in_progress: summary?.in_progress ?? 0,
          completed,
        },
        priorityCounts: Object.fromEntries(priorities.map((item) => [item.priority, item.count])),
        categoryCounts: categories,
        completionRate: total ? Math.round((completed / total) * 100) : 0,
      },
    };
  });

  app.get<{ Querystring: TaskFilters }>('/api/v1/tasks', {
    schema: {
      querystring: {
        type: 'object', additionalProperties: false,
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          cursor: { type: 'string', maxLength: 256 },
          q: { type: 'string', maxLength: 200 },
          status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          category: { type: 'string', maxLength: 100 },
          projectId: { type: 'string', format: 'uuid' },
          milestoneId: { type: 'string', format: 'uuid' },
          dueDateFrom: { type: 'string', format: 'date' },
          dueDateTo: { type: 'string', format: 'date' },
          unassigned: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const filters = request.query;
    const limit = filters.limit ?? 25;
    const values: unknown[] = [getOwnerId(request)];
    const conditions = ['t.owner_id = $1::uuid'];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    if (filters.q) conditions.push(`(t.title ILIKE ${add(`%${filters.q}%`)} OR t.description ILIKE $${values.length})`);
    if (filters.status) conditions.push(`t.status = ${add(filters.status)}`);
    if (filters.priority) conditions.push(`t.priority = ${add(filters.priority)}`);
    if (filters.category !== undefined) conditions.push(`t.category = ${add(filters.category)}`);
    if (filters.projectId) conditions.push(`t.project_id = ${add(filters.projectId)}::uuid`);
    if (filters.milestoneId) conditions.push(`t.milestone_id = ${add(filters.milestoneId)}::uuid`);
    if (filters.dueDateFrom) conditions.push(`t.due_date >= ${add(filters.dueDateFrom)}::date`);
    if (filters.dueDateTo) conditions.push(`t.due_date <= ${add(filters.dueDateTo)}::date`);
    if (filters.unassigned) conditions.push('t.project_id IS NULL');
    if (filters.cursor) {
      const cursor = decodeCursor(filters.cursor);
      if (!cursor) return sendError(request, reply, 400, 'validation_error', 'Task cursor is invalid.');
      const updatedAt = add(cursor.updatedAt);
      const id = add(cursor.id);
      conditions.push(`(t.updated_at < ${updatedAt}::timestamptz OR (t.updated_at = ${updatedAt}::timestamptz AND t.id > ${id}::uuid))`);
    }
    values.push(limit + 1);
    const rows = await database!.$queryRawUnsafe<TaskRow[]>(
      `${taskRowSelect} WHERE ${conditions.join(' AND ')} ORDER BY t.updated_at DESC, t.id ASC LIMIT $${values.length}`,
      ...values,
    );
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map(mapTask),
      page: {
        limit,
        nextCursor: hasMore && last ? encodeCursor(last) : null,
        hasMore,
      },
    };
  });

  app.post<{ Body: TaskInput }>('/api/v1/tasks', {
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['title'], properties: taskProperties,
      },
    },
  }, async (request, reply) => {
    const body = request.body;
    const title = body.title?.trim();
    if (!title) return sendError(request, reply, 400, 'validation_error', 'Task title cannot be blank.');
    if (hasInvalidTaskChildren(body)) return sendError(request, reply, 400, 'validation_error', 'Task tags and subtask titles must not be blank, and subtask IDs must be unique.');
    const ownerId = getOwnerId(request);
    const projectId = body.projectId || null;
    const milestoneId = body.milestoneId || null;
    const invalidLink = await validateLinks(database!, ownerId, projectId, milestoneId);
    if (invalidLink) return sendError(request, reply, 404, 'not_found', 'Linked project or milestone was not found.');
    const status = body.status ?? 'todo';
    const taskId = randomUUID();
    const result = await database!.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO tasks
           (id, owner_id, title, description, priority, status, completed, completed_at,
            due_date, category, related_module, project_id, milestone_id)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7,
            CASE WHEN $7 THEN now() ELSE NULL END, NULLIF($8, '')::date, $9, $10, $11::uuid, $12::uuid)`,
        taskId, ownerId, title, body.description ?? '', body.priority ?? 'medium', status,
        status === 'completed', body.dueDate ?? '', body.category ?? '', body.relatedModule ?? '', projectId, milestoneId,
      );
      await replaceTaskChildren(transaction as PrismaClient, ownerId, taskId, body);
      return readTask(transaction, ownerId, taskId);
    });
    if (!result) return sendError(request, reply, 500, 'internal_error', 'Task could not be created.');
    return reply.code(201).send({ data: mapTask(result) });
  });

  app.get<{ Params: { taskId: string } }>('/api/v1/tasks/:taskId', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['taskId'], properties: { taskId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const task = await readTask(database!, getOwnerId(request), request.params.taskId);
    if (!task) return sendError(request, reply, 404, 'not_found', 'Task was not found.');
    return { data: mapTask(task) };
  });

  app.patch<{ Params: { taskId: string }; Body: TaskInput }>('/api/v1/tasks/:taskId', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['taskId'], properties: { taskId: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', additionalProperties: false, minProperties: 1, properties: taskProperties },
    },
  }, async (request, reply) => {
    const ownerId = getOwnerId(request);
    const taskId = request.params.taskId;
    const body = request.body;
    const currentRows = await database!.$queryRawUnsafe<Array<{ id: string; project_id: string | null; milestone_id: string | null }>>(
      'SELECT id::text, project_id::text, milestone_id::text FROM tasks WHERE id = $1::uuid AND owner_id = $2::uuid LIMIT 1',
      taskId, ownerId,
    );
    const current = currentRows[0];
    if (!current) return sendError(request, reply, 404, 'not_found', 'Task was not found.');
    if (hasInvalidTaskChildren(body)) return sendError(request, reply, 400, 'validation_error', 'Task tags and subtask titles must not be blank, and subtask IDs must be unique.');
    const projectId = body.projectId !== undefined ? (body.projectId || null) : current.project_id;
    const milestoneId = body.milestoneId !== undefined
      ? (body.milestoneId || null)
      : (body.projectId === '' ? null : current.milestone_id);
    const invalidLink = await validateLinks(database!, ownerId, projectId, milestoneId);
    if (invalidLink) return sendError(request, reply, 404, 'not_found', 'Linked project or milestone was not found.');
    const title = body.title?.trim();
    if (body.title !== undefined && !title) return sendError(request, reply, 400, 'validation_error', 'Task title cannot be blank.');

    const result = await database!.$transaction(async (transaction) => {
      const values: unknown[] = [taskId, ownerId];
      const assignments: string[] = [];
      const update = (column: string, value: unknown, cast = '') => {
        values.push(value);
        assignments.push(`${column} = $${values.length}${cast}`);
      };
      if (body.title !== undefined) update('title', title);
      if (body.description !== undefined) update('description', body.description);
      if (body.priority !== undefined) update('priority', body.priority);
      if (body.status !== undefined) {
        update('status', body.status);
        update('completed', body.status === 'completed');
        values.push(body.status === 'completed');
        assignments.push(`completed_at = CASE WHEN $${values.length} THEN COALESCE(completed_at, now()) ELSE NULL END`);
      }
      if (body.dueDate !== undefined) update('due_date', body.dueDate || null, '::date');
      if (body.category !== undefined) update('category', body.category);
      if (body.relatedModule !== undefined) update('related_module', body.relatedModule);
      if (body.projectId !== undefined) update('project_id', projectId, '::uuid');
      if (body.milestoneId !== undefined || (body.projectId === '' && current.milestone_id)) {
        update('milestone_id', milestoneId, '::uuid');
      }
      assignments.push('updated_at = now()');
      await transaction.$executeRawUnsafe(
        `UPDATE tasks SET ${assignments.join(', ')} WHERE id = $1::uuid AND owner_id = $2::uuid`, ...values,
      );
      await replaceTaskChildren(transaction as PrismaClient, ownerId, taskId, body);
      return readTask(transaction, ownerId, taskId);
    });
    if (!result) return sendError(request, reply, 404, 'not_found', 'Task was not found.');
    return { data: mapTask(result) };
  });

  app.delete<{ Params: { taskId: string } }>('/api/v1/tasks/:taskId', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['taskId'], properties: { taskId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const deleted = await database!.$queryRawUnsafe<{ id: string }[]>(
      'DELETE FROM tasks WHERE id = $1::uuid AND owner_id = $2::uuid RETURNING id::text', request.params.taskId, getOwnerId(request),
    );
    if (!deleted.length) return sendError(request, reply, 404, 'not_found', 'Task was not found.');
    return reply.code(204).send();
  });
};
