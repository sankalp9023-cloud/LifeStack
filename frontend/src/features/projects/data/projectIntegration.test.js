import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectRepository, PROJECT_STORAGE_KEY } from './projectRepository.js';
import { createTaskRepository, TASK_STORAGE_KEY } from '../../../services/taskRepository.js';
import { calculateProjectMetrics, calculateDashboardMetrics } from './projectMetrics.js';

function createStorage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}

test('complete project management workflow integration test', () => {
  const storage = createStorage();
  const projectRepo = createProjectRepository(storage);
  const taskRepo = createTaskRepository(storage);

  // 1. Create a software project
  const project = projectRepo.createProject({
    name: 'LifeStack Engine 2.0',
    description: 'Next-gen life OS architecture',
    category: 'Software Development',
    priority: 'urgent',
    status: 'active',
    startDate: '2026-02-01',
    deadline: '2026-08-01',
  });

  assert.ok(project.id);
  assert.equal(project.status, 'active');

  // 2. Create milestones
  const m1 = projectRepo.createMilestone(project.id, {
    name: 'M1: Storage Core',
    description: 'Data layer and validation',
    dueDate: '2026-03-15',
  });

  const m2 = projectRepo.createMilestone(project.id, {
    name: 'M2: UI Integration',
    description: 'Views and routing',
    dueDate: '2026-05-01',
  });

  assert.equal(projectRepo.getSnapshot().milestones.length, 2);

  // 3. Create and assign tasks via Task Engine
  const t1 = taskRepo.createTask({
    title: 'Write project schema & repository',
    priority: 'urgent',
    dueDate: '2026-03-01',
    projectId: project.id,
    milestoneId: m1.id,
  });

  const t2 = taskRepo.createTask({
    title: 'Implement reactive hook',
    priority: 'high',
    dueDate: '2026-03-10',
    projectId: project.id,
    milestoneId: m1.id,
  });

  // Also create an unassigned global task and assign it
  const t3 = taskRepo.createTask({
    title: 'Benchmarking performance',
    priority: 'medium',
  });
  taskRepo.assignToProject(t3.id, project.id, m2.id);

  assert.equal(taskRepo.getTasksByProject(project.id).length, 3);

  // 4. Create Notes
  const note1 = projectRepo.createNote(project.id, {
    title: 'Schema decisions',
    content: 'All dates in ISO YYYY-MM-DD format for consistency.',
  });
  assert.equal(projectRepo.getSnapshot().notes.length, 1);

  // 5. Create Resources
  const res1 = projectRepo.createResource(project.id, {
    name: 'Vite documentation',
    description: 'Build tool config',
    type: 'link',
    url: 'https://vitejs.dev',
  });
  assert.equal(projectRepo.getSnapshot().resources.length, 1);

  // 6. Create Important Date Checkpoint
  const date1 = projectRepo.createImportantDate(project.id, {
    label: 'Stakeholder Demo',
    date: '2026-04-15',
    description: 'Mid-term walkthrough',
  });
  assert.equal(projectRepo.getSnapshot().importantDates.length, 1);

  // 7. Verify progress calculations
  let metrics = calculateProjectMetrics(
    projectRepo.getProject(project.id),
    projectRepo.getSnapshot().milestones,
    taskRepo.getSnapshot().tasks
  );

  assert.equal(metrics.totalTasks, 3);
  assert.equal(metrics.completedTasks, 0);
  assert.equal(metrics.overallProgress, 0);

  // Complete tasks
  taskRepo.toggleTaskCompletion(t1.id);
  taskRepo.toggleTaskCompletion(t2.id);

  metrics = calculateProjectMetrics(
    projectRepo.getProject(project.id),
    projectRepo.getSnapshot().milestones,
    taskRepo.getSnapshot().tasks
  );
  assert.equal(metrics.completedTasks, 2);
  assert.ok(metrics.overallProgress > 0);

  // Complete Milestone 1
  projectRepo.toggleMilestoneCompletion(m1.id);
  assert.equal(projectRepo.getSnapshot().milestones.find((m) => m.id === m1.id).completed, true);

  // Complete t3
  taskRepo.toggleTaskCompletion(t3.id);
  projectRepo.toggleMilestoneCompletion(m2.id);

  metrics = calculateProjectMetrics(
    projectRepo.getProject(project.id),
    projectRepo.getSnapshot().milestones,
    taskRepo.getSnapshot().tasks
  );
  assert.equal(metrics.completedTasks, 3);
  assert.equal(metrics.overallProgress, 100);

  // Note: Project status remains active until explicitly changed by user!
  assert.equal(projectRepo.getProject(project.id).status, 'active');

  // User manually marks project completed
  projectRepo.updateProject(project.id, { status: 'completed' });
  assert.equal(projectRepo.getProject(project.id).status, 'completed');

  // Verify activity history was recorded
  const activities = projectRepo.getActivities(project.id);
  assert.ok(activities.length >= 4);

  // 8. Verify Dashboard Metrics
  const dashMetrics = calculateDashboardMetrics(
    projectRepo.getSnapshot().projects,
    projectRepo.getSnapshot().milestones,
    taskRepo.getSnapshot().tasks
  );
  assert.equal(dashMetrics.totalProjects, 1);
  assert.equal(dashMetrics.completedProjects, 1);
  assert.equal(dashMetrics.activeProjects, 0);

  // 9. Re-open and delete project
  projectRepo.deleteProject(project.id, taskRepo);
  assert.equal(projectRepo.getSnapshot().projects.length, 0);
  assert.equal(projectRepo.getSnapshot().milestones.length, 0);
  assert.equal(projectRepo.getSnapshot().notes.length, 0);
  assert.equal(projectRepo.getSnapshot().resources.length, 0);
  assert.equal(projectRepo.getSnapshot().importantDates.length, 0);

  // Tasks still exist in global engine, unlinked
  assert.equal(taskRepo.getSnapshot().tasks.length, 3);
  assert.equal(taskRepo.getSnapshot().tasks.every((t) => !t.projectId), true);
});
