import { useEffect, useSyncExternalStore } from 'react';
import { createStudyRepository } from '../data/studyRepository';

let repository;
let initializationError = null;

function getRepository() {
  if (!repository && !initializationError) {
    try {
      repository = createStudyRepository();
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error('Study storage is unavailable.');
    }
  }
  return repository;
}

const EMPTY_SNAPSHOT = {
  subjects: [],
  chapters: [],
  topics: [],
  learningActivities: [],
  notes: [],
  revisions: [],
  practiceSessions: [],
  assessments: [],
  studySessions: [],
};

export default function useStudyData() {
  const store = getRepository();
  const data = useSyncExternalStore(
    store ? store.subscribe : () => () => {},
    store ? store.getSnapshot : () => EMPTY_SNAPSHOT,
    () => EMPTY_SNAPSHOT,
  );

  useEffect(() => {
    if (!store) return undefined;
    return store.addStorageListener();
  }, [store]);

  return {
    data,
    repository: store,
    error: initializationError || (store && store.getLoadError()),
  };
}
