import { useEffect, useSyncExternalStore } from 'react';
import { getTaskRepository, getTaskRepositoryError } from '@/services/taskService';

const EMPTY_SNAPSHOT = { tasks: [] };

export default function useTaskData() {
  const repository = getTaskRepository();

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
    tasks: data.tasks,
    repository,
    error: repository ? repository.getLoadError() : getTaskRepositoryError(),
  };
}
