import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskRepository, TASK_STORAGE_KEY } from './taskRepository.js';

function createMemoryStorage(initial = null) {
  const store = new Map();
  if (initial !== null) store.set(TASK_STORAGE_KEY, initial);
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };
}

test('creates, updates, and deletes tasks with local persistence', () => {
  const storage = createMemoryStorage();
  const repo = createTaskRepository(storage);

  const t1 = repo.createTask({
    title: 'Setup Database Schema',
    description: 'Postgres migrations',
    priority: 'high',
    dueDate: '2026-12-01',
  });

  assert.equal(t1.title, 'Setup Database Schema');
  assert.equal(t1.priority, 'high');
  assert.equal(t1.completed, false);
  assert.equal(repo.getSnapshot().tasks.length, 1);

  // Toggle completion
  repo.toggleTaskCompletion(t1.id);
  assert.equal(repo.getSnapshot().tasks[0].completed, true);
  assert.ok(repo.getSnapshot().tasks[0].completedAt);

  // Re-open
  repo.toggleTaskCompletion(t1.id);
  assert.equal(repo.getSnapshot().tasks[0].completed, false);
  assert.equal(repo.getSnapshot().tasks[0].completedAt, null);

  // Delete
  repo.deleteTask(t1.id);
  assert.equal(repo.getSnapshot().tasks.length, 0);
});

test('assigns and unassigns tasks for projects and milestones', () => {
  const repo = createTaskRepository(createMemoryStorage());
  const t1 = repo.createTask({ title: 'Task 1' });
  const t2 = repo.createTask({ title: 'Task 2', projectId: 'proj-1', milestoneId: 'm-1' });

  assert.equal(repo.getTasksByProject('proj-1').length, 1);
  assert.equal(repo.getUnassignedTasks().length, 1);

  repo.assignToProject(t1.id, 'proj-1', 'm-1');
  assert.equal(repo.getTasksByProject('proj-1').length, 2);

  // Unassign from milestone
  repo.unassignAllForMilestone('m-1');
  const projTasks = repo.getTasksByProject('proj-1');
  assert.equal(projTasks.length, 2);
  assert.equal(projTasks[0].milestoneId, '');
  assert.equal(projTasks[1].milestoneId, '');

  // Unassign all for project
  repo.unassignAllForProject('proj-1');
  assert.equal(repo.getTasksByProject('proj-1').length, 0);
  assert.equal(repo.getUnassignedTasks().length, 2);
});

test('supports shared task fields, statuses, categories, and subtasks', () => {
  const repo = createTaskRepository(createMemoryStorage());
  const task = repo.createTask({
    title: 'Plan revision', priority: 'urgent', status: 'in_progress', category: 'Study',
    relatedModule: 'study', tags: ['exam'], subtasks: [{ title: 'Review notes' }],
  });
  assert.equal(task.status, 'in_progress');
  assert.equal(task.category, 'Study');
  assert.equal(task.subtasks[0].title, 'Review notes');
  const updated = repo.updateTask(task.id, { status: 'completed', subtasks: [{ ...task.subtasks[0], completed: true }] });
  assert.equal(updated.completed, true);
  assert.equal(updated.subtasks[0].completed, true);
});
