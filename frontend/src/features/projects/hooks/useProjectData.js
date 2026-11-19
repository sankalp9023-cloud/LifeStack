import { useEffect, useSyncExternalStore } from 'react';
import { createProjectRepository } from '../data/projectRepository.js';
import useTaskData from '@/hooks/useTaskData';

let repositoryInstance = null;
let initializationError = null;

export function getProjectRepository() {
  if (!repositoryInstance && !initializationError) {
    try {
      repositoryInstance = createProjectRepository();
    } catch (err) {
      initializationError = err instanceof Error ? err : new Error('Project storage is unavailable.');
    }
  }
  return repositoryInstance;
}

export function resetProjectRepository() {
  repositoryInstance = null;
  initializationError = null;
}

const EMPTY_SNAPSHOT = {
  projects: [],
  milestones: [],
  notes: [],
  resources: [],
  importantDates: [],
  activities: [],
};

export default function useProjectData() {
  const repository = getProjectRepository();
  const { data: tasksData, tasks, repository: taskRepository, error: taskError } = useTaskData();

  const data = useSyncExternalStore(
    repository ? repository.subscribe : () => () => {},
    repository ? repository.getSnapshot : () => EMPTY_SNAPSHOT,
    () => EMPTY_SNAPSHOT,
  );

  useEffect(() => {
    if (!repository) return undefined;
    return repository.addStorageListener();
  }, [repository]);

  return {
    data,
    projects: data.projects,
    milestones: data.milestones,
    notes: data.notes,
    resources: data.resources,
    importantDates: data.importantDates,
    activities: data.activities,
    repository,
    tasksData,
    tasks,
    taskRepository,
    error: initializationError || (repository && repository.getLoadError()) || taskError,
  };
}
