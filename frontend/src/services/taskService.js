import { createTaskRepository } from './taskRepository.js';

let instance = null;
let error = null;

export function getTaskRepository() {
  if (!instance && !error) {
    try {
      instance = createTaskRepository();
    } catch (e) {
      error = e instanceof Error ? e : new Error('Failed to initialize task repository');
    }
  }
  return instance;
}

export function getTaskRepositoryError() {
  return error;
}
