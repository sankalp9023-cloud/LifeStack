import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { addSessionAuthentication, authenticatedUserId } from '../auth/session.js';

type ProjectOptions = { database: PrismaClient | null };
type Queryable = { $queryRawUnsafe: PrismaClient['$queryRawUnsafe'] };
type ProjectStatus = 'not_started' | 'active' | 'on_hold' | 'completed' | 'archived';
type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
type ProjectInput = {
  name?: string;
  description?: string;
  category?: string;
  priority?: ProjectPriority;
  status?: ProjectStatus;
  startDate?: string;
  deadline?: string;
};
type ProjectFilters = {
  limit?: number;
  cursor?: string;
  q?: string;
  status?: ProjectStatus;
  category?: string;
};
type ProjectRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  is_archived: boolean;
  start_date: string | null;
  deadline: string | null;
  created_at: Date;
  updated_at: Date;
  cursor_updated_at: string;
};
type MilestoneInput = { name?: string; description?: string; dueDate?: string; completed?: boolean };
type MilestoneRow = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  due_date: string | null;
  completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_VALUES = ['not_started', 'active', 'on_hold', 'completed', 'archived'];
const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'];
const PROJECT_SELECT = `SELECT id::text, name, description, category, priority, status, is_archived,
  to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(deadline, 'YYYY-MM-DD') AS deadline,
  created_at, updated_at,
  to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at
  FROM projects`;
const MILESTONE_SELECT = `SELECT id::text, project_id::text, name, description,
  to_char(due_date, 'YYYY-MM-DD') AS due_date, completed, completed_at, created_at, updated_at
  FROM project_milestones`;
const ERROR_SCHEMA = {
  type: 'object', required: ['error'], properties: {
    error: { type: 'object', required: ['code', 'message', 'requestId'], properties: {
      code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' },
    } },
  },
} as const;
const PROJECT_PROPERTIES = {
  name: { type: 'string', minLength: 1, maxLength: 200 },
  description: { type: 'string', maxLength: 20_000 },
  category: { type: 'string', maxLength: 100 },
  priority: { type: 'string', enum: PRIORITY_VALUES },
  status: { type: 'string', enum: STATUS_VALUES },
  startDate: { anyOf: [{ type: 'string', format: 'date' }, { type: 'string', maxLength: 0 }] },
  deadline: { anyOf: [{ type: 'string', format: 'date' }, { type: 'string', maxLength: 0 }] },
} as const;
const MILESTONE_PROPERTIES = {
  name: { type: 'string', minLength: 1, maxLength: 200 },
  description: { type: 'string', maxLength: 20_000 },
  dueDate: { anyOf: [{ type: 'string', format: 'date' }, { type: 'string', maxLength: 0 }] },
  completed: { type: 'boolean' },
} as const;

function sendError(request: FastifyRequest, reply: FastifyReply, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message, requestId: request.id } });
}

function ownerId(request: FastifyRequest): string {
  return authenticatedUserId(request);
}

function mapProject(row: ProjectRow) {
  return {
    id: row.id, name: row.name, description: row.description, category: row.category,
    priority: row.priority, status: row.status, isArchived: row.is_archived,
    startDate: row.start_date ?? '', deadline: row.deadline ?? '',
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
  };
}

function mapMilestone(row: MilestoneRow) {
  return {
    id: row.id, projectId: row.project_id, name: row.name, description: row.description,
    dueDate: row.due_date ?? '', completed: row.completed,
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
  };
}

async function readProject(database: Queryable, userId: string, id: string): Promise<ProjectRow | null> {
  const rows = await database.$queryRawUnsafe<ProjectRow[]>(
    `${PROJECT_SELECT} WHERE owner_id = $1::uuid AND id = $2::uuid LIMIT 1`, userId, id,
  );
  return rows[0] ?? null;
}

async function logActivity(
  database: PrismaClient,
  userId: string,
  projectId: string,
  type: string,
  description: string,
): Promise<void> {
  await database.$executeRawUnsafe(
    `INSERT INTO project_activities (owner_id, project_id, type, description)
     VALUES ($1::uuid, $2::uuid, $3, $4)`, userId, projectId, type, description,
  );
}

function decodeCursor(cursor: string): { updatedAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = decoded.lastIndexOf('|');
    if (separator < 0) return null;
    const updatedAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(updatedAt)
      || Number.isNaN(Date.parse(updatedAt)) || !UUID_PATTERN.test(id)) return null;
    return { updatedAt, id };
  } catch {
    return null;
  }
}

function encodeCursor(row: Pick<ProjectRow, 'cursor_updated_at' | 'id'>): string {
  return Buffer.from(`${row.cursor_updated_at}|${row.id}`).toString('base64url');
}

export const registerProjectRoutes: FastifyPluginAsync<ProjectOptions> = async (app, { database }) => {
  addSessionAuthentication(app, database, 'Project');

  app.get<{ Querystring: ProjectFilters }>('/api/v1/projects', {
    schema: {
      querystring: {
        type: 'object', additionalProperties: false,
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          cursor: { type: 'string', maxLength: 256 },
          q: { type: 'string', maxLength: 200 },
          status: { type: 'string', enum: STATUS_VALUES },
          category: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const filters = request.query;
    const limit = filters.limit ?? 25;
    const values: unknown[] = [ownerId(request)];
    const conditions = ['owner_id = $1::uuid'];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    if (filters.q) {
      const search = add(`%${filters.q}%`);
      conditions.push(`(name ILIKE ${search} OR description ILIKE ${search})`);
    }
    if (filters.status) conditions.push(`status = ${add(filters.status)}`);
    if (filters.category !== undefined) conditions.push(`category = ${add(filters.category)}`);
    if (filters.cursor) {
      const cursor = decodeCursor(filters.cursor);
      if (!cursor) return sendError(request, reply, 400, 'validation_error', 'Project cursor is invalid.');
      const updatedAt = add(cursor.updatedAt);
      const id = add(cursor.id);
      conditions.push(`(updated_at < ${updatedAt}::timestamptz OR (updated_at = ${updatedAt}::timestamptz AND id > ${id}::uuid))`);
    }
    values.push(limit + 1);
    const rows = await database!.$queryRawUnsafe<ProjectRow[]>(
      `${PROJECT_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC, id ASC LIMIT $${values.length}`,
      ...values,
    );
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map(mapProject),
      page: { limit, nextCursor: hasMore && last ? encodeCursor(last) : null, hasMore },
    };
  });

  app.post<{ Body: ProjectInput }>('/api/v1/projects', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['name'], properties: PROJECT_PROPERTIES } },
  }, async (request, reply) => {
    const name = request.body.name?.trim();
    if (!name) return sendError(request, reply, 400, 'validation_error', 'Project name cannot be blank.');
    const status = request.body.status ?? 'active';
    const id = randomUUID();
    const created = await database!.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<ProjectRow[]>(
        `INSERT INTO projects (id, owner_id, name, description, category, priority, status, is_archived, start_date, deadline)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::date, NULLIF($10, '')::date)
         RETURNING id::text, name, description, category, priority, status, is_archived,
           to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(deadline, 'YYYY-MM-DD') AS deadline,
           created_at, updated_at,
           to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at`,
        id, ownerId(request), name, request.body.description ?? '', request.body.category?.trim() || 'Software Development',
        request.body.priority ?? 'medium', status, status === 'archived', request.body.startDate ?? '', request.body.deadline ?? '',
      );
      await logActivity(transaction as PrismaClient, ownerId(request), id, 'project_created', `Project "${name}" created.`);
      return rows[0];
    });
    if (!created) return sendError(request, reply, 500, 'internal_error', 'Project could not be created.');
    return reply.code(201).send({ data: mapProject(created) });
  });

  app.get<{ Params: { projectId: string } }>('/api/v1/projects/:projectId', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const project = await readProject(database!, ownerId(request), request.params.projectId);
    if (!project) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
    return { data: mapProject(project) };
  });

  app.patch<{ Params: { projectId: string }; Body: ProjectInput }>('/api/v1/projects/:projectId', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', additionalProperties: false, minProperties: 1, properties: PROJECT_PROPERTIES },
    },
  }, async (request, reply) => {
    const userId = ownerId(request);
    const id = request.params.projectId;
    const current = await readProject(database!, userId, id);
    if (!current) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
    const name = request.body.name?.trim();
    if (request.body.name !== undefined && !name) return sendError(request, reply, 400, 'validation_error', 'Project name cannot be blank.');
    const status = request.body.status ?? current.status;
    const updated = await database!.$transaction(async (transaction) => {
      const values: unknown[] = [id, userId];
      const assignments: string[] = [];
      const set = (column: string, value: unknown, cast = '') => {
        values.push(value);
        assignments.push(`${column} = $${values.length}${cast}`);
      };
      if (request.body.name !== undefined) set('name', name);
      if (request.body.description !== undefined) set('description', request.body.description.trim());
      if (request.body.category !== undefined) set('category', request.body.category.trim() || 'Software Development');
      if (request.body.priority !== undefined) set('priority', request.body.priority);
      if (request.body.status !== undefined) {
        set('status', status);
        set('is_archived', status === 'archived');
      }
      if (request.body.startDate !== undefined) set('start_date', request.body.startDate || null, '::date');
      if (request.body.deadline !== undefined) set('deadline', request.body.deadline || null, '::date');
      assignments.push('updated_at = now()');
      const rows = await transaction.$queryRawUnsafe<ProjectRow[]>(
        `UPDATE projects SET ${assignments.join(', ')} WHERE id = $1::uuid AND owner_id = $2::uuid
         RETURNING id::text, name, description, category, priority, status, is_archived,
           to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(deadline, 'YYYY-MM-DD') AS deadline,
           created_at, updated_at,
           to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at`,
        ...values,
      );
      const changedStatus = current.status !== status;
      await logActivity(
        transaction as PrismaClient, userId, id,
        changedStatus ? 'status_changed' : 'project_updated',
        changedStatus ? `Status changed from ${current.status} to ${status}.` : `Project "${name ?? current.name}" details updated.`,
      );
      return rows[0];
    });
    if (!updated) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
    return { data: mapProject(updated) };
  });

  app.post<{ Params: { projectId: string } }>('/api/v1/projects/:projectId/archive', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    return updateProjectStatus(database!, request, reply, request.params.projectId, 'archived');
  });

  app.post<{ Params: { projectId: string }; Body: { status?: Exclude<ProjectStatus, 'archived'> } }>('/api/v1/projects/:projectId/restore', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', additionalProperties: false, properties: { status: { type: 'string', enum: ['not_started', 'active', 'on_hold', 'completed'] } } },
    },
  }, async (request, reply) => updateProjectStatus(database!, request, reply, request.params.projectId, request.body?.status ?? 'active'));

  app.delete<{ Params: { projectId: string } }>('/api/v1/projects/:projectId', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const deleted = await database!.$queryRawUnsafe<{ id: string }[]>(
      'DELETE FROM projects WHERE id = $1::uuid AND owner_id = $2::uuid RETURNING id::text', request.params.projectId, ownerId(request),
    );
    if (!deleted.length) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
    return reply.code(204).send();
  });

  app.get<{ Params: { projectId: string } }>('/api/v1/projects/:projectId/milestones', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const project = await readProject(database!, ownerId(request), request.params.projectId);
    if (!project) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
    const rows = await database!.$queryRawUnsafe<MilestoneRow[]>(
      `${MILESTONE_SELECT} WHERE owner_id = $1::uuid AND project_id = $2::uuid ORDER BY due_date NULLS LAST, created_at ASC, id ASC`,
      ownerId(request), request.params.projectId,
    );
    return { data: rows.map(mapMilestone) };
  });

  app.post<{ Params: { projectId: string }; Body: MilestoneInput }>('/api/v1/projects/:projectId/milestones', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['projectId'], properties: { projectId: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', additionalProperties: false, required: ['name'], properties: MILESTONE_PROPERTIES },
    },
  }, async (request, reply) => {
    const userId = ownerId(request);
    const project = await readProject(database!, userId, request.params.projectId);
    if (!project) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
    const name = request.body.name?.trim();
    if (!name) return sendError(request, reply, 400, 'validation_error', 'Milestone name cannot be blank.');
    const id = randomUUID();
    const created = await database!.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<MilestoneRow[]>(
        `INSERT INTO project_milestones (id, owner_id, project_id, name, description, due_date, completed, completed_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NULLIF($6, '')::date, $7,
           CASE WHEN $7 THEN now() ELSE NULL END)
         RETURNING id::text, project_id::text, name, description, to_char(due_date, 'YYYY-MM-DD') AS due_date,
           completed, completed_at, created_at, updated_at`,
        id, userId, request.params.projectId, name, request.body.description ?? '', request.body.dueDate ?? '', Boolean(request.body.completed),
      );
      await logActivity(transaction as PrismaClient, userId, request.params.projectId, 'milestone_created', `Milestone "${name}" added.`);
      return rows[0];
    });
    if (!created) return sendError(request, reply, 500, 'internal_error', 'Milestone could not be created.');
    return reply.code(201).send({ data: mapMilestone(created) });
  });

  app.patch<{ Params: { milestoneId: string }; Body: MilestoneInput }>('/api/v1/projects/milestones/:milestoneId', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['milestoneId'], properties: { milestoneId: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', additionalProperties: false, minProperties: 1, properties: MILESTONE_PROPERTIES },
    },
  }, async (request, reply) => {
    const userId = ownerId(request);
    const id = request.params.milestoneId;
    const currentRows = await database!.$queryRawUnsafe<MilestoneRow[]>(
      `${MILESTONE_SELECT} WHERE owner_id = $1::uuid AND id = $2::uuid LIMIT 1`, userId, id,
    );
    const current = currentRows[0];
    if (!current) return sendError(request, reply, 404, 'not_found', 'Milestone was not found.');
    const name = request.body.name?.trim();
    if (request.body.name !== undefined && !name) return sendError(request, reply, 400, 'validation_error', 'Milestone name cannot be blank.');
    const completed = request.body.completed ?? current.completed;
    const updated = await database!.$transaction(async (transaction) => {
      const values: unknown[] = [id, userId];
      const assignments: string[] = [];
      const set = (column: string, value: unknown, cast = '') => {
        values.push(value);
        assignments.push(`${column} = $${values.length}${cast}`);
      };
      if (request.body.name !== undefined) set('name', name);
      if (request.body.description !== undefined) set('description', request.body.description.trim());
      if (request.body.dueDate !== undefined) set('due_date', request.body.dueDate || null, '::date');
      if (request.body.completed !== undefined) {
        set('completed', completed);
        values.push(completed);
        assignments.push(`completed_at = CASE WHEN $${values.length} THEN COALESCE(completed_at, now()) ELSE NULL END`);
      }
      assignments.push('updated_at = now()');
      const rows = await transaction.$queryRawUnsafe<MilestoneRow[]>(
        `UPDATE project_milestones SET ${assignments.join(', ')} WHERE id = $1::uuid AND owner_id = $2::uuid
         RETURNING id::text, project_id::text, name, description, to_char(due_date, 'YYYY-MM-DD') AS due_date,
           completed, completed_at, created_at, updated_at`, ...values,
      );
      const type = !current.completed && completed ? 'milestone_completed' : 'milestone_updated';
      await logActivity(transaction as PrismaClient, userId, current.project_id, type, `Milestone "${name ?? current.name}" updated.`);
      return rows[0];
    });
    if (!updated) return sendError(request, reply, 404, 'not_found', 'Milestone was not found.');
    return { data: mapMilestone(updated) };
  });

  app.delete<{ Params: { milestoneId: string } }>('/api/v1/projects/milestones/:milestoneId', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['milestoneId'], properties: { milestoneId: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const userId = ownerId(request);
    const deleted = await database!.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<Array<{ id: string; project_id: string; name: string }>>(
        'DELETE FROM project_milestones WHERE id = $1::uuid AND owner_id = $2::uuid RETURNING id::text, project_id::text, name',
        request.params.milestoneId, userId,
      );
      if (rows[0]) {
        await logActivity(transaction as PrismaClient, userId, rows[0].project_id, 'milestone_deleted', `Milestone "${rows[0].name}" deleted.`);
      }
      return rows[0];
    });
    if (!deleted) return sendError(request, reply, 404, 'not_found', 'Milestone was not found.');
    return reply.code(204).send();
  });
};

async function updateProjectStatus(
  database: PrismaClient,
  request: FastifyRequest & { params: { projectId: string } },
  reply: FastifyReply,
  id: string,
  status: ProjectStatus,
) {
  const userId = ownerId(request);
  const current = await readProject(database, userId, id);
  if (!current) return sendError(request, reply, 404, 'not_found', 'Project was not found.');
  const updated = await database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<ProjectRow[]>(
      `UPDATE projects SET status = $3, is_archived = $4, updated_at = now()
       WHERE id = $1::uuid AND owner_id = $2::uuid
       RETURNING id::text, name, description, category, priority, status, is_archived,
         to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(deadline, 'YYYY-MM-DD') AS deadline,
         created_at, updated_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at`,
      id, userId, status, status === 'archived',
    );
    await logActivity(
      transaction as PrismaClient, userId, id,
      current.status === status ? 'project_updated' : 'status_changed',
      `Status changed from ${current.status} to ${status}.`,
    );
    return rows[0];
  });
  return updated ? { data: mapProject(updated) } : sendError(request, reply, 404, 'not_found', 'Project was not found.');
}
