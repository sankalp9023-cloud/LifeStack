export const TASK_STORAGE_KEY = 'lifestack.tasks.v1';

const EMPTY_DATA = {
  tasks: [],
};

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validDateOrEmpty(value, label) {
  if (!value) return '';
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['todo', 'in_progress', 'completed'];
function sanitizePriority(value) {
  const normalized = typeof value === 'string' ? value.toLowerCase().trim() : 'medium';
  return VALID_PRIORITIES.includes(normalized) ? normalized : 'medium';
}

function sanitizeStatus(value, completed = false) {
  if (completed) return 'completed';
  const normalized = typeof value === 'string' ? value.toLowerCase().trim().replace(/\s+/g, '_') : '';
  return VALID_STATUSES.includes(normalized) ? normalized : 'todo';
}

function normalizeTask(input, existing = null, now = new Date().toISOString()) {
  const status = sanitizeStatus(input.status, typeof input.completed === 'boolean' ? input.completed : existing?.completed);
  return {
    ...existing,
    ...input,
    title: input.title !== undefined ? requiredText(input.title, 'Task title') : existing.title,
    description: input.description !== undefined ? sanitizeText(input.description) : (existing?.description || ''),
    priority: input.priority !== undefined ? sanitizePriority(input.priority) : (existing?.priority || 'medium'),
    status,
    completed: status === 'completed',
    completedAt: status === 'completed' ? (existing?.completedAt || now) : null,
    dueDate: input.dueDate !== undefined ? validDateOrEmpty(input.dueDate, 'Due date') : (existing?.dueDate || ''),
    category: input.category !== undefined ? sanitizeText(input.category) : (existing?.category || ''),
    relatedModule: input.relatedModule !== undefined ? sanitizeText(input.relatedModule) : (existing?.relatedModule || ''),
    projectId: input.projectId !== undefined ? sanitizeText(input.projectId) : (existing?.projectId || ''),
    milestoneId: input.milestoneId !== undefined ? sanitizeText(input.milestoneId) : (existing?.milestoneId || ''),
    tags: Array.isArray(input.tags) ? input.tags.map(sanitizeText).filter(Boolean) : (existing?.tags || []),
    subtasks: Array.isArray(input.subtasks) ? input.subtasks.map((item) => typeof item === 'string' ? { id: createId(), title: sanitizeText(item), completed: false } : ({ id: item.id || createId(), title: sanitizeText(item.title), completed: Boolean(item.completed) })).filter((item) => item.title) : (existing?.subtasks || []),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  throw new Error('Local storage is not available in the current environment.');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function validateTaskData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) {
    throw new Error('Task data format is invalid.');
  }
  const ids = data.tasks.map((task) => task && task.id);
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
    throw new Error('Task data contains invalid or duplicate IDs.');
  }
  return data;
}

export function createTaskRepository(customStorage = null) {
  const storage = resolveStorage(customStorage);
  let subscribers = new Set();
  let loadError = null;

  function read() {
    try {
      const raw = storage.getItem(TASK_STORAGE_KEY);
      if (raw === null) return clone(EMPTY_DATA);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
        throw new Error('Stored tasks data is corrupted or invalid.');
      }
      parsed.tasks = parsed.tasks.map((task) => ({
        ...task,
        status: task.status === 'completed' || task.completed ? 'completed' : (task.status === 'in_progress' ? 'in_progress' : 'todo'),
        category: task.category || '',
        relatedModule: task.relatedModule || '',
        tags: Array.isArray(task.tags) ? task.tags : [],
        subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      }));
      return parsed;
    } catch (err) {
      loadError = err instanceof Error ? err : new Error('Unable to read tasks.');
      return clone(EMPTY_DATA);
    }
  }

  let memoryData = read();

  function write(nextData) {
    storage.setItem(TASK_STORAGE_KEY, JSON.stringify(nextData));
    memoryData = clone(nextData);
    loadError = null;
    notify();
  }

  function notify() {
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Task subscriber error:', e);
      }
    });
  }

  return {
    getSnapshot() {
      return memoryData;
    },

    getLoadError() {
      return loadError;
    },

    replaceData(nextData) {
      validateTaskData(nextData);
      write(clone(nextData));
    },

    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    addStorageListener() {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return () => {};
      }
      const listener = (event) => {
        if (event.key === TASK_STORAGE_KEY) {
          memoryData = read();
          notify();
        }
      };
      window.addEventListener('storage', listener);
      return () => {
        window.removeEventListener('storage', listener);
      };
    },

    // CRUD operations
    createTask(input) {
      const now = new Date().toISOString();
      const task = normalizeTask(input, null, now);
      task.id = createId();

      const next = clone(memoryData);
      next.tasks.push(task);
      write(next);
      return clone(task);
    },

    updateTask(id, patch) {
      const next = clone(memoryData);
      const index = next.tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error(`Task with ID "${id}" was not found.`);
      }

      const existing = next.tasks[index];
      const now = new Date().toISOString();

      const updated = normalizeTask(patch, existing, now);

      next.tasks[index] = updated;
      write(next);
      return clone(updated);
    },

    toggleTaskCompletion(id) {
      const task = memoryData.tasks.find((t) => t.id === id);
      if (!task) throw new Error(`Task with ID "${id}" was not found.`);
      return this.updateTask(id, { completed: !task.completed });
    },

    deleteTask(id) {
      const next = clone(memoryData);
      const initialCount = next.tasks.length;
      next.tasks = next.tasks.filter((t) => t.id !== id);
      if (next.tasks.length === initialCount) {
        throw new Error(`Task with ID "${id}" was not found.`);
      }
      write(next);
      return true;
    },

    assignToProject(taskId, projectId, milestoneId = '') {
      return this.updateTask(taskId, {
        projectId: sanitizeText(projectId),
        milestoneId: sanitizeText(milestoneId),
      });
    },

    unassignFromProject(taskId) {
      return this.updateTask(taskId, {
        projectId: '',
        milestoneId: '',
      });
    },

    unassignAllForProject(projectId) {
      const targetId = sanitizeText(projectId);
      if (!targetId) return 0;
      const next = clone(memoryData);
      let count = 0;
      next.tasks.forEach((t) => {
        if (t.projectId === targetId) {
          t.projectId = '';
          t.milestoneId = '';
          t.updatedAt = new Date().toISOString();
          count++;
        }
      });
      if (count > 0) write(next);
      return count;
    },

    unassignAllForMilestone(milestoneId) {
      const targetId = sanitizeText(milestoneId);
      if (!targetId) return 0;
      const next = clone(memoryData);
      let count = 0;
      next.tasks.forEach((t) => {
        if (t.milestoneId === targetId) {
          t.milestoneId = '';
          t.updatedAt = new Date().toISOString();
          count++;
        }
      });
      if (count > 0) write(next);
      return count;
    },

    getTasksByProject(projectId) {
      const targetId = sanitizeText(projectId);
      return memoryData.tasks.filter((t) => t.projectId === targetId);
    },

    getUnassignedTasks() {
      return memoryData.tasks.filter((t) => !t.projectId);
    },
  };
}
