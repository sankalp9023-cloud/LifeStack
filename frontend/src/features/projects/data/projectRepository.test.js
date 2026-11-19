import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectRepository, PROJECT_STORAGE_KEY } from './projectRepository.js';
import { createTaskRepository, TASK_STORAGE_KEY } from '../../../services/taskRepository.js';
import { calculateProjectMetrics, calculateDashboardMetrics } from './projectMetrics.js';

function createMemoryStorage(initialProject = null, initialTask = null) {
  const store = new Map();
  if (initialProject !== null) store.set(PROJECT_STORAGE_KEY, initialProject);
  if (initialTask !== null) store.set(TASK_STORAGE_KEY, initialTask);
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };
}

test('project lifecycle: create, update, archive, restore, delete with referential integrity', () => {
  const storage = createMemoryStorage();
  const projectRepo = createProjectRepository(storage);
  const taskRepo = createTaskRepository(storage);

  // 1. Create project
  const project = projectRepo.createProject({
    name: 'LifeStack Mobile App',
    description: 'React Native companion app',
    category: 'Software Development',
    priority: 'high',
    status: 'active',
    startDate: '2026-01-01',
    deadline: '2026-06-01',
  });

  assert.equal(project.name, 'LifeStack Mobile App');
  assert.equal(project.priority, 'high');
  assert.equal(project.status, 'active');
  assert.equal(project.isArchived, false);
  assert.equal(projectRepo.getSnapshot().projects.length, 1);

  // Activity logged
  const activities = projectRepo.getActivities(project.id);
  assert.ok(activities.length >= 1);
  assert.equal(activities[0].type, 'project_created');

  // 2. Add Milestone
  const milestone = projectRepo.createMilestone(project.id, {
    name: 'Alpha Release',
    dueDate: '2026-03-01',
  });
  assert.equal(milestone.name, 'Alpha Release');
  assert.equal(projectRepo.getSnapshot().milestones.length, 1);

  // 3. Add Notes and Resources
  const note = projectRepo.createNote(project.id, { title: 'Architecture decisions', content: 'Use Redux or zustand' });
  const resource = projectRepo.createResource(project.id, { name: 'Figma Designs', type: 'link', url: 'https://figma.com/lifestack' });
  const impDate = projectRepo.createImportantDate(project.id, { label: 'Code Freeze', date: '2026-05-15' });

  assert.equal(projectRepo.getSnapshot().notes.length, 1);
  assert.equal(projectRepo.getSnapshot().resources.length, 1);
  assert.equal(projectRepo.getSnapshot().importantDates.length, 1);

  // 4. Attach tasks in Task Engine
  const task1 = taskRepo.createTask({
    title: 'Initialize React Native project',
    projectId: project.id,
    milestoneId: milestone.id,
  });
  const task2 = taskRepo.createTask({
    title: 'Setup Navigation and state',
    projectId: project.id,
    milestoneId: milestone.id,
  });

  assert.equal(taskRepo.getTasksByProject(project.id).length, 2);

  // 5. Test metrics calculation
  let metrics = calculateProjectMetrics(project, projectRepo.getSnapshot().milestones, taskRepo.getSnapshot().tasks);
  assert.equal(metrics.totalTasks, 2);
  assert.equal(metrics.completedTasks, 0);
  assert.equal(metrics.overallProgress, 0);

  // Complete one task
  taskRepo.toggleTaskCompletion(task1.id);
  metrics = calculateProjectMetrics(project, projectRepo.getSnapshot().milestones, taskRepo.getSnapshot().tasks);
  assert.equal(metrics.completedTasks, 1);
  assert.ok(metrics.overallProgress > 0);

  // Complete milestone
  projectRepo.toggleMilestoneCompletion(milestone.id);
  assert.equal(projectRepo.getSnapshot().milestones[0].completed, true);

  // 6. Archive & Restore
  projectRepo.archiveProject(project.id);
  assert.equal(projectRepo.getSnapshot().projects[0].status, 'archived');
  assert.equal(projectRepo.getSnapshot().projects[0].isArchived, true);

  projectRepo.restoreProject(project.id, 'active');
  assert.equal(projectRepo.getSnapshot().projects[0].status, 'active');
  assert.equal(projectRepo.getSnapshot().projects[0].isArchived, false);

  // 7. Delete milestone safely (unlinks tasks from milestone, retains in project)
  projectRepo.deleteMilestone(milestone.id, taskRepo);
  assert.equal(projectRepo.getSnapshot().milestones.length, 0);
  const remainingProjectTasks = taskRepo.getTasksByProject(project.id);
  assert.equal(remainingProjectTasks.length, 2);
  assert.equal(remainingProjectTasks[0].milestoneId, '');

  // 8. Delete project safely (cleans child entities and clears task references)
  projectRepo.deleteProject(project.id, taskRepo);
  assert.equal(projectRepo.getSnapshot().projects.length, 0);
  assert.equal(projectRepo.getSnapshot().notes.length, 0);
  assert.equal(projectRepo.getSnapshot().resources.length, 0);
  assert.equal(projectRepo.getSnapshot().importantDates.length, 0);
  assert.equal(projectRepo.getSnapshot().activities.length, 0);

  // Global tasks remain alive in Task Engine but unassigned
  assert.equal(taskRepo.getTasksByProject(project.id).length, 0);
  assert.equal(taskRepo.getSnapshot().tasks.length, 2);
  assert.equal(taskRepo.getSnapshot().tasks[0].projectId, '');
});

test('dashboard metrics calculate accurately from live data', () => {
  const projectRepo = createProjectRepository(createMemoryStorage());
  const taskRepo = createTaskRepository(createMemoryStorage());

  const p1 = projectRepo.createProject({ name: 'Active Alpha', status: 'active', deadline: '2026-12-31' });
  const p2 = projectRepo.createProject({ name: 'On Hold Beta', status: 'on_hold' });
  const p3 = projectRepo.createProject({ name: 'Done Gamma', status: 'completed' });

  taskRepo.createTask({ title: 'Task 1', projectId: p1.id, completed: true });
  taskRepo.createTask({ title: 'Task 2', projectId: p1.id, completed: false });

  const metrics = calculateDashboardMetrics(
    projectRepo.getSnapshot().projects,
    projectRepo.getSnapshot().milestones,
    taskRepo.getSnapshot().tasks
  );

  assert.equal(metrics.totalProjects, 3);
  assert.equal(metrics.activeProjects, 1);
  assert.equal(metrics.onHoldProjects, 1);
  assert.equal(metrics.completedProjects, 1);
  assert.equal(metrics.averageActiveProgress, 50); // 1 completed out of 2 tasks = 50%
  assert.ok(metrics.recentlyUpdated.length >= 3);
});
