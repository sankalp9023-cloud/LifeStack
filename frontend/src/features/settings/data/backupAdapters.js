import { getProjectRepository } from '@/features/projects/hooks/useProjectData';
import { validateProjectData } from '@/features/projects/data/projectRepository';
import { getTaskRepository } from '@/services/taskService';
import { validateTaskData } from '@/services/taskRepository';
import { registerBackupModule } from './backupService';

registerBackupModule('projects', {
  read() {
    const repository = getProjectRepository();
    if (!repository) throw new Error('Project data storage could not be initialized.');
    if (repository.getLoadError()) throw new Error(`Project data could not be loaded: ${repository.getLoadError().message}`);
    return repository.getSnapshot();
  },
  validate(data) {
    return validateProjectData(data);
  },
  replace(data) {
    const repository = getProjectRepository();
    if (!repository) throw new Error('Project data storage could not be initialized.');
    repository.replaceData(data);
  },
});

registerBackupModule('tasks', {
  read() {
    const repository = getTaskRepository();
    if (!repository) throw new Error('Task data storage could not be initialized.');
    if (repository.getLoadError()) throw new Error(`Task data could not be loaded: ${repository.getLoadError().message}`);
    return repository.getSnapshot();
  },
  validate(data, allModules) {
    validateTaskData(data);
    const projects = allModules.projects;
    if (!projects || !Array.isArray(projects.projects) || !Array.isArray(projects.milestones)) {
      throw new Error('A project record set is required to validate task relationships.');
    }
    const projectIds = new Set(projects.projects.map((project) => project.id));
    const milestones = new Map(projects.milestones.map((milestone) => [milestone.id, milestone]));
    for (const task of data.tasks) {
      if (task.projectId && !projectIds.has(task.projectId)) {
        throw new Error('Task backup contains a task linked to a missing project.');
      }
      if (task.milestoneId) {
        const milestone = milestones.get(task.milestoneId);
        if (!milestone || !task.projectId || milestone.projectId !== task.projectId) {
          throw new Error('Task backup contains a broken milestone relationship.');
        }
      }
    }
    return data;
  },
  replace(data) {
    const repository = getTaskRepository();
    if (!repository) throw new Error('Task data storage could not be initialized.');
    repository.replaceData(data);
  },
});
