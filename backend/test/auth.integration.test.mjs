import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { buildApp } from '../dist/app.js';

const migrationsDirectory = new URL('../prisma/migrations/', import.meta.url);

test('email auth persists accounts and validates/revokes sessions in PostgreSQL', async () => {
  const pg = new PGlite();
  const migrations = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const migration of migrations) {
    await pg.exec(await readFile(new URL(`${migration.name}/migration.sql`, migrationsDirectory), 'utf8'));
  }

  const database = {
    $queryRaw: async (strings, ...values) => (await pg.query(strings.join(''), values)).rows,
    $queryRawUnsafe: async (sql, ...values) => (await pg.query(sql, values)).rows,
    $executeRawUnsafe: async (sql, ...values) => (await pg.query(sql, values)).rowCount,
    $transaction: async (callback) => {
      await pg.exec('BEGIN');
      try {
        const result = await callback(database);
        await pg.exec('COMMIT');
        return result;
      } catch (error) {
        await pg.exec('ROLLBACK');
        throw error;
      }
    },
    $disconnect: async () => pg.close(),
  };
  const app = buildApp({ logger: false, database });

  try {
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { name: 'Integration Tester', email: 'Tester@Example.test', password: 'test-password-1234' },
    });
    assert.equal(signup.statusCode, 201, signup.body);
    const userRows = await pg.query('SELECT id::text, email, password_hash FROM users');
    assert.equal(userRows.rows.length, 1);
    assert.equal(userRows.rows[0].email, 'tester@example.test');
    assert.match(userRows.rows[0].password_hash, /^scrypt\$/);

    const signupCookie = signup.headers['set-cookie'].split(';')[0];
    const sessionRows = await pg.query('SELECT token_hash, revoked_at FROM auth_sessions');
    const rawToken = signupCookie.slice('lifestack_session='.length);
    assert.equal(sessionRows.rows.length, 1);
    assert.notEqual(sessionRows.rows[0].token_hash, rawToken);
    assert.match(sessionRows.rows[0].token_hash, /^[a-f0-9]{64}$/);

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'tester@example.test', password: 'wrong-password' },
    });
    assert.equal(wrongPassword.statusCode, 401);
    assert.equal(wrongPassword.body.includes('wrong-password'), false);

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'tester@example.test', password: 'test-password-1234' },
    });
    assert.equal(login.statusCode, 200, login.body);
    const loginCookie = login.headers['set-cookie'].split(';')[0];
    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: loginCookie } });
    assert.equal(me.statusCode, 200, me.body);
    assert.equal(me.json().data.user.email, 'tester@example.test');

    const anonymousTasks = await app.inject({ method: 'GET', url: '/api/v1/tasks' });
    assert.equal(anonymousTasks.statusCode, 401);
    const createTask = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { cookie: loginCookie },
      payload: {
        title: 'Plan the study session',
        dueDate: '2026-12-01',
        tags: ['study', 'weekly'],
        subtasks: [{ title: 'Review notes' }, { title: 'Choose a topic', completed: true }],
      },
    });
    assert.equal(createTask.statusCode, 201, createTask.body);
    const task = createTask.json().data;
    assert.equal(task.title, 'Plan the study session');
    assert.deepEqual(task.tags, ['study', 'weekly']);
    assert.equal(task.subtasks.length, 2);
    assert.equal(task.dueDate, '2026-12-01');

    const updateTask = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${task.id}`,
      headers: { cookie: loginCookie },
      payload: { status: 'completed', tags: ['done'], subtasks: [{ ...task.subtasks[0], completed: true }] },
    });
    assert.equal(updateTask.statusCode, 200, updateTask.body);
    assert.equal(updateTask.json().data.completed, true);
    assert.ok(updateTask.json().data.completedAt);
    assert.deepEqual(updateTask.json().data.tags, ['done']);
    assert.equal(updateTask.json().data.subtasks[0].id, task.subtasks[0].id);
    const blankTag = await app.inject({
      method: 'PATCH', url: `/api/v1/tasks/${task.id}`, headers: { cookie: loginCookie }, payload: { tags: [' '] },
    });
    assert.equal(blankTag.statusCode, 400);
    const createProject = await app.inject({
      method: 'POST', url: '/api/v1/projects', headers: { cookie: loginCookie },
      payload: { name: 'Private project A', priority: 'high', deadline: '2026-12-20' },
    });
    assert.equal(createProject.statusCode, 201, createProject.body);
    const projectA = createProject.json().data;
    const projectUpdate = await app.inject({
      method: 'PATCH', url: `/api/v1/projects/${projectA.id}`, headers: { cookie: loginCookie },
      payload: { description: 'An isolated project record.' },
    });
    assert.equal(projectUpdate.statusCode, 200, projectUpdate.body);
    assert.equal(projectUpdate.json().data.description, 'An isolated project record.');
    const projectRead = await app.inject({ method: 'GET', url: `/api/v1/projects/${projectA.id}`, headers: { cookie: loginCookie } });
    assert.equal(projectRead.json().data.id, projectA.id);
    const milestoneResponse = await app.inject({
      method: 'POST', url: `/api/v1/projects/${projectA.id}/milestones`, headers: { cookie: loginCookie },
      payload: { name: 'First milestone', dueDate: '2026-12-10' },
    });
    assert.equal(milestoneResponse.statusCode, 201, milestoneResponse.body);
    const milestoneA = milestoneResponse.json().data;
    const completeMilestone = await app.inject({
      method: 'PATCH', url: `/api/v1/projects/milestones/${milestoneA.id}`, headers: { cookie: loginCookie },
      payload: { completed: true },
    });
    assert.equal(completeMilestone.statusCode, 200, completeMilestone.body);
    assert.equal(completeMilestone.json().data.completed, true);
    assert.ok(completeMilestone.json().data.completedAt);
    const linkTask = await app.inject({
      method: 'POST', url: '/api/v1/tasks', headers: { cookie: loginCookie },
      payload: { title: 'Project-owned task', projectId: projectA.id, milestoneId: milestoneA.id },
    });
    assert.equal(linkTask.statusCode, 201, linkTask.body);
    const archiveProject = await app.inject({
      method: 'POST', url: `/api/v1/projects/${projectA.id}/archive`, headers: { cookie: loginCookie },
    });
    assert.equal(archiveProject.json().data.status, 'archived');
    assert.equal(archiveProject.json().data.isArchived, true);
    const restoreProject = await app.inject({
      method: 'POST', url: `/api/v1/projects/${projectA.id}/restore`, headers: { cookie: loginCookie },
      payload: { status: 'on_hold' },
    });
    assert.equal(restoreProject.json().data.status, 'on_hold');
    const secondProjectResponse = await app.inject({
      method: 'POST', url: '/api/v1/projects', headers: { cookie: loginCookie },
      payload: { name: 'Private project A2' },
    });
    assert.equal(secondProjectResponse.statusCode, 201, secondProjectResponse.body);
    const secondProjectId = secondProjectResponse.json().data.id;
    await pg.query("UPDATE projects SET updated_at = '2026-11-21 11:00:00.000001+00' WHERE id = $1::uuid", [projectA.id]);
    await pg.query("UPDATE projects SET updated_at = '2026-11-21 11:00:00.000002+00' WHERE id = $1::uuid", [secondProjectId]);
    const projectsPage1 = await app.inject({
      method: 'GET', url: '/api/v1/projects?limit=1&q=Private%20project', headers: { cookie: loginCookie },
    });
    assert.equal(projectsPage1.json().page.hasMore, true);
    const projectsPage2 = await app.inject({
      method: 'GET',
      url: `/api/v1/projects?limit=1&q=Private%20project&cursor=${projectsPage1.json().page.nextCursor}`,
      headers: { cookie: loginCookie },
    });
    assert.equal(projectsPage2.statusCode, 200, projectsPage2.body);
    assert.deepEqual(
      [projectsPage1.json().data[0].id, projectsPage2.json().data[0].id].sort(),
      [projectA.id, secondProjectId].sort(),
    );
    const overviewA = await app.inject({ method: 'GET', url: '/api/v1/tasks/overview', headers: { cookie: loginCookie } });
    assert.equal(overviewA.statusCode, 200, overviewA.body);
    assert.equal(overviewA.json().data.total, 2);
    assert.equal(overviewA.json().data.completed, 1);
    assert.equal(overviewA.json().data.completionRate, 50);
    const secondTaskResponse = await app.inject({
      method: 'POST', url: '/api/v1/tasks', headers: { cookie: loginCookie }, payload: { title: 'Plan a second study session' },
    });
    assert.equal(secondTaskResponse.statusCode, 201, secondTaskResponse.body);
    const secondTaskId = secondTaskResponse.json().data.id;
    await pg.query("UPDATE tasks SET updated_at = '2026-11-21 10:00:00.000001+00' WHERE id = $1::uuid", [task.id]);
    await pg.query("UPDATE tasks SET updated_at = '2026-11-21 10:00:00.000002+00' WHERE id = $1::uuid", [secondTaskId]);
    const firstPage = await app.inject({
      method: 'GET', url: '/api/v1/tasks?limit=1&q=study', headers: { cookie: loginCookie },
    });
    assert.equal(firstPage.json().page.hasMore, true);
    assert.ok(firstPage.json().page.nextCursor);
    const nextPage = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks?limit=1&q=study&cursor=${firstPage.json().page.nextCursor}`,
      headers: { cookie: loginCookie },
    });
    assert.equal(nextPage.statusCode, 200, nextPage.body);
    assert.deepEqual(
      [firstPage.json().data[0].id, nextPage.json().data[0].id].sort(),
      [task.id, secondTaskId].sort(),
    );

    const userB = '22222222-2222-4222-8222-222222222222';
    const tokenB = 'second-user-session-token';
    const tokenBHash = createHash('sha256').update(tokenB).digest('hex');
    await pg.query('INSERT INTO users (id, email, name) VALUES ($1, $2, $3)', [userB, 'second@example.test', 'Second User']);
    await pg.query(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '14 days')`, [userB, tokenBHash],
    );
    const taskForB = await app.inject({
      method: 'POST', url: '/api/v1/tasks', headers: { cookie: `lifestack_session=${tokenB}` },
      payload: { title: 'Private task for account B' },
    });
    assert.equal(taskForB.statusCode, 201, taskForB.body);
    const projectB = await pg.query('INSERT INTO projects (owner_id, name) VALUES ($1, $2) RETURNING id', [userB, 'Private project B']);
    const projectBId = projectB.rows[0].id;
    const otherUserList = await app.inject({ method: 'GET', url: '/api/v1/tasks', headers: { cookie: `lifestack_session=${tokenB}` } });
    assert.deepEqual(otherUserList.json().data.map((item) => item.id), [taskForB.json().data.id]);
    const projectListB = await app.inject({ method: 'GET', url: '/api/v1/projects', headers: { cookie: `lifestack_session=${tokenB}` } });
    assert.deepEqual(projectListB.json().data.map((item) => item.id), [projectBId]);
    const projectReadAAsB = await app.inject({ method: 'GET', url: `/api/v1/projects/${projectA.id}`, headers: { cookie: `lifestack_session=${tokenB}` } });
    const projectUpdateAAsB = await app.inject({
      method: 'PATCH', url: `/api/v1/projects/${projectA.id}`, headers: { cookie: `lifestack_session=${tokenB}` },
      payload: { name: 'Unauthorized rename' },
    });
    const projectDeleteAAsB = await app.inject({ method: 'DELETE', url: `/api/v1/projects/${projectA.id}`, headers: { cookie: `lifestack_session=${tokenB}` } });
    const milestoneCreateAAsB = await app.inject({
      method: 'POST', url: `/api/v1/projects/${projectA.id}/milestones`, headers: { cookie: `lifestack_session=${tokenB}` },
      payload: { name: 'Unauthorized milestone' },
    });
    assert.equal(projectReadAAsB.statusCode, 404);
    assert.equal(projectUpdateAAsB.statusCode, 404);
    assert.equal(projectDeleteAAsB.statusCode, 404);
    assert.equal(milestoneCreateAAsB.statusCode, 404);
    const overviewB = await app.inject({
      method: 'GET', url: '/api/v1/tasks/overview', headers: { cookie: `lifestack_session=${tokenB}` },
    });
    assert.equal(overviewB.json().data.total, 1);
    assert.equal(overviewB.json().data.completed, 0);
    const otherUserRead = await app.inject({
      method: 'GET', url: `/api/v1/tasks/${task.id}`, headers: { cookie: `lifestack_session=${tokenB}` },
    });
    const otherUserUpdate = await app.inject({
      method: 'PATCH', url: `/api/v1/tasks/${task.id}`, headers: { cookie: `lifestack_session=${tokenB}` },
      payload: { title: 'Attempted cross-account edit' },
    });
    const otherUserDelete = await app.inject({
      method: 'DELETE', url: `/api/v1/tasks/${task.id}`, headers: { cookie: `lifestack_session=${tokenB}` },
    });
    assert.equal(otherUserRead.statusCode, 404);
    assert.equal(otherUserUpdate.statusCode, 404);
    assert.equal(otherUserDelete.statusCode, 404);
    const crossAccountLink = await app.inject({
      method: 'POST', url: '/api/v1/tasks', headers: { cookie: loginCookie },
      payload: { title: 'Invalid cross-account link', projectId: projectBId },
    });
    const ownerOverride = await app.inject({
      method: 'POST', url: '/api/v1/tasks', headers: { cookie: loginCookie },
      payload: { title: 'Attempted owner override', ownerId: userB },
    });
    assert.equal(crossAccountLink.statusCode, 404);
    assert.equal(ownerOverride.statusCode, 201, ownerOverride.body);
    const overrideOwner = await pg.query('SELECT owner_id::text FROM tasks WHERE id = $1::uuid', [ownerOverride.json().data.id]);
    assert.equal(overrideOwner.rows[0].owner_id, userRows.rows[0].id);
    const deleteMilestone = await app.inject({
      method: 'DELETE', url: `/api/v1/projects/milestones/${milestoneA.id}`, headers: { cookie: loginCookie },
    });
    assert.equal(deleteMilestone.statusCode, 204);
    const taskAfterMilestoneDelete = await pg.query('SELECT project_id::text, milestone_id::text FROM tasks WHERE id = $1::uuid', [linkTask.json().data.id]);
    assert.equal(taskAfterMilestoneDelete.rows[0].project_id, projectA.id);
    assert.equal(taskAfterMilestoneDelete.rows[0].milestone_id, null);
    const deleteProject = await app.inject({ method: 'DELETE', url: `/api/v1/projects/${projectA.id}`, headers: { cookie: loginCookie } });
    assert.equal(deleteProject.statusCode, 204);
    const taskAfterProjectDelete = await pg.query('SELECT project_id::text, milestone_id::text FROM tasks WHERE id = $1::uuid', [linkTask.json().data.id]);
    assert.equal(taskAfterProjectDelete.rows[0].project_id, null);
    assert.equal(taskAfterProjectDelete.rows[0].milestone_id, null);
    const ownerList = await app.inject({ method: 'GET', url: '/api/v1/tasks?q=study', headers: { cookie: loginCookie } });
    assert.equal(ownerList.statusCode, 200, ownerList.body);
    assert.deepEqual(ownerList.json().data.map((item) => item.id).sort(), [task.id, secondTaskId].sort());
    assert.deepEqual(ownerList.json().page, { limit: 25, nextCursor: null, hasMore: false });

    const deleteTask = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${task.id}`, headers: { cookie: loginCookie } });
    assert.equal(deleteTask.statusCode, 204);

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: loginCookie } });
    const afterLogout = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: loginCookie } });
    assert.equal(logout.statusCode, 200);
    assert.equal(afterLogout.statusCode, 401);
  } finally {
    await app.close();
  }
});
