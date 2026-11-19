export const PROJECT_STORAGE_KEY = 'lifestack.projects.v1';

const EMPTY_DATA = {
  projects: [],
  milestones: [],
  notes: [],
  resources: [],
  importantDates: [],
  activities: [],
};

const COLLECTIONS = Object.keys(EMPTY_DATA);

export const PROJECT_STATUSES = [
  { id: 'not_started', label: 'Not Started' },
  { id: 'active', label: 'Active' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
];

export const PROJECT_PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

export const RESOURCE_TYPES = [
  { id: 'link', label: 'Website Link' },
  { id: 'document', label: 'Documentation' },
  { id: 'reference', label: 'Reference Material' },
  { id: 'file', label: 'File Reference' },
  { id: 'other', label: 'Other' },
];

export const PROJECT_CATEGORIES = [
  'Software Development',
  'Personal Initiative',
  'Research',
  'Writing & Content',
  'Work & Career',
  'Health & Fitness',
  'Other',
];

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

function sanitizeStatus(value) {
  const norm = typeof value === 'string' ? value.toLowerCase().trim() : 'active';
  const found = PROJECT_STATUSES.find((s) => s.id === norm);
  return found ? found.id : 'active';
}

function sanitizePriority(value) {
  const norm = typeof value === 'string' ? value.toLowerCase().trim() : 'medium';
  const found = PROJECT_PRIORITIES.find((p) => p.id === norm);
  return found ? found.id : 'medium';
}

function sanitizeResourceType(value) {
  const norm = typeof value === 'string' ? value.toLowerCase().trim() : 'link';
  const found = RESOURCE_TYPES.find((t) => t.id === norm);
  return found ? found.id : 'link';
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

function validateSnapshot(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Project data format is invalid.');
  }
  for (const key of COLLECTIONS) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Collection ${key} must be an array.`);
    }
    const ids = data[key].map((item) => item && item.id);
    if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
      throw new Error(`Collection ${key} contains invalid or duplicate IDs.`);
    }
  }
  const projectIds = new Set(data.projects.map((project) => project.id));
  const milestoneIds = new Set(data.milestones.map((milestone) => milestone.id));
  if (data.milestones.some((milestone) => !projectIds.has(milestone.projectId))
    || ['notes', 'resources', 'importantDates', 'activities'].some((key) => (
      data[key].some((item) => !projectIds.has(item.projectId))
    ))) {
    throw new Error('Project data contains broken project or milestone relationships.');
  }
}

export function validateProjectData(data) {
  validateSnapshot(data);
  return data;
}

export function createProjectRepository(customStorage = null) {
  const storage = resolveStorage(customStorage);
  let subscribers = new Set();
  let loadError = null;

  function read() {
    try {
      const raw = storage.getItem(PROJECT_STORAGE_KEY);
      if (raw === null) return clone(EMPTY_DATA);
      const parsed = JSON.parse(raw);
      validateSnapshot(parsed);
      return parsed;
    } catch (err) {
      loadError = err instanceof Error ? err : new Error('Unable to read project records.');
      return clone(EMPTY_DATA);
    }
  }

  let memoryData = read();

  function write(nextData) {
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(nextData));
    memoryData = clone(nextData);
    loadError = null;
    notify();
  }

  function notify() {
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Project subscriber error:', e);
      }
    });
  }

  function logActivityInternal(next, projectId, type, description, metadata = {}) {
    const activity = {
      id: createId(),
      projectId,
      type,
      description,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };
    next.activities.unshift(activity);
    if (next.activities.length > 200) {
      next.activities = next.activities.slice(0, 200);
    }
    return activity;
  }

  return {
    getSnapshot() {
      return memoryData;
    },

    getLoadError() {
      return loadError;
    },

    replaceData(nextData) {
      validateSnapshot(nextData);
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
        if (event.key === PROJECT_STORAGE_KEY) {
          memoryData = read();
          notify();
        }
      };
      window.addEventListener('storage', listener);
      return () => {
        window.removeEventListener('storage', listener);
      };
    },

    // ==========================================
    // PROJECT CRUD
    // ==========================================
    createProject(input) {
      const now = new Date().toISOString();
      const name = requiredText(input.name, 'Project name');
      const status = sanitizeStatus(input.status);

      const project = {
        id: createId(),
        name,
        description: sanitizeText(input.description),
        category: sanitizeText(input.category) || 'Software Development',
        priority: sanitizePriority(input.priority),
        status,
        isArchived: status === 'archived',
        startDate: validDateOrEmpty(input.startDate, 'Start date'),
        deadline: validDateOrEmpty(input.deadline, 'Deadline'),
        createdAt: now,
        updatedAt: now,
      };

      const next = clone(memoryData);
      next.projects.push(project);
      logActivityInternal(next, project.id, 'project_created', `Project "${project.name}" created.`);
      write(next);
      return clone(project);
    },

    updateProject(id, patch) {
      const next = clone(memoryData);
      const index = next.projects.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Project with ID "${id}" was not found.`);
      }

      const existing = next.projects[index];
      const now = new Date().toISOString();

      let nextStatus = existing.status;
      if (patch.status !== undefined) {
        nextStatus = sanitizeStatus(patch.status);
      }

      const isArchived = nextStatus === 'archived';

      const updated = {
        ...existing,
        name: patch.name !== undefined ? requiredText(patch.name, 'Project name') : existing.name,
        description: patch.description !== undefined ? sanitizeText(patch.description) : existing.description,
        category: patch.category !== undefined ? (sanitizeText(patch.category) || 'Software Development') : existing.category,
        priority: patch.priority !== undefined ? sanitizePriority(patch.priority) : existing.priority,
        status: nextStatus,
        isArchived,
        startDate: patch.startDate !== undefined ? validDateOrEmpty(patch.startDate, 'Start date') : existing.startDate,
        deadline: patch.deadline !== undefined ? validDateOrEmpty(patch.deadline, 'Deadline') : existing.deadline,
        updatedAt: now,
      };

      next.projects[index] = updated;

      if (existing.status !== nextStatus) {
        logActivityInternal(next, id, 'status_changed', `Status changed from ${existing.status} to ${nextStatus}.`);
      } else {
        logActivityInternal(next, id, 'project_updated', `Project "${updated.name}" details updated.`);
      }

      write(next);
      return clone(updated);
    },

    archiveProject(id) {
      return this.updateProject(id, { status: 'archived' });
    },

    restoreProject(id, targetStatus = 'active') {
      const status = targetStatus === 'archived' ? 'active' : sanitizeStatus(targetStatus);
      return this.updateProject(id, { status });
    },

    deleteProject(id, taskRepository = null) {
      const next = clone(memoryData);
      const project = next.projects.find((p) => p.id === id);
      if (!project) {
        throw new Error(`Project with ID "${id}" was not found.`);
      }

      // Safely delete associated milestones, notes, resources, dates, activities
      next.projects = next.projects.filter((p) => p.id !== id);
      next.milestones = next.milestones.filter((m) => m.projectId !== id);
      next.notes = next.notes.filter((n) => n.projectId !== id);
      next.resources = next.resources.filter((r) => r.projectId !== id);
      next.importantDates = next.importantDates.filter((d) => d.projectId !== id);
      next.activities = next.activities.filter((a) => a.projectId !== id);

      write(next);

      // Referential integrity with global Task Engine
      if (taskRepository && typeof taskRepository.unassignAllForProject === 'function') {
        taskRepository.unassignAllForProject(id);
      }

      return true;
    },

    getProject(id) {
      const project = memoryData.projects.find((p) => p.id === id);
      return project ? clone(project) : null;
    },

    // ==========================================
    // MILESTONES
    // ==========================================
    createMilestone(projectId, input) {
      const project = this.getProject(projectId);
      if (!project) throw new Error(`Project "${projectId}" does not exist.`);

      const now = new Date().toISOString();
      const name = requiredText(input.name, 'Milestone name');

      const milestone = {
        id: createId(),
        projectId,
        name,
        description: sanitizeText(input.description),
        dueDate: validDateOrEmpty(input.dueDate, 'Due date'),
        completed: Boolean(input.completed),
        completedAt: input.completed ? now : null,
        createdAt: now,
        updatedAt: now,
      };

      const next = clone(memoryData);
      next.milestones.push(milestone);
      logActivityInternal(next, projectId, 'milestone_created', `Milestone "${milestone.name}" added.`);
      write(next);
      return clone(milestone);
    },

    updateMilestone(id, patch) {
      const next = clone(memoryData);
      const index = next.milestones.findIndex((m) => m.id === id);
      if (index === -1) throw new Error(`Milestone "${id}" was not found.`);

      const existing = next.milestones[index];
      const now = new Date().toISOString();

      let isCompleted = existing.completed;
      let completedAt = existing.completedAt;

      if (typeof patch.completed === 'boolean') {
        isCompleted = patch.completed;
        completedAt = isCompleted ? (existing.completedAt || now) : null;
      }

      const updated = {
        ...existing,
        name: patch.name !== undefined ? requiredText(patch.name, 'Milestone name') : existing.name,
        description: patch.description !== undefined ? sanitizeText(patch.description) : existing.description,
        dueDate: patch.dueDate !== undefined ? validDateOrEmpty(patch.dueDate, 'Due date') : existing.dueDate,
        completed: isCompleted,
        completedAt,
        updatedAt: now,
      };

      next.milestones[index] = updated;

      if (!existing.completed && isCompleted) {
        logActivityInternal(next, existing.projectId, 'milestone_completed', `Milestone "${updated.name}" completed.`);
      } else {
        logActivityInternal(next, existing.projectId, 'milestone_updated', `Milestone "${updated.name}" updated.`);
      }

      write(next);
      return clone(updated);
    },

    toggleMilestoneCompletion(id) {
      const m = memoryData.milestones.find((item) => item.id === id);
      if (!m) throw new Error(`Milestone "${id}" was not found.`);
      return this.updateMilestone(id, { completed: !m.completed });
    },

    deleteMilestone(id, taskRepository = null) {
      const next = clone(memoryData);
      const milestone = next.milestones.find((m) => m.id === id);
      if (!milestone) throw new Error(`Milestone "${id}" was not found.`);

      next.milestones = next.milestones.filter((m) => m.id !== id);
      logActivityInternal(next, milestone.projectId, 'milestone_deleted', `Milestone "${milestone.name}" deleted.`);
      write(next);

      if (taskRepository && typeof taskRepository.unassignAllForMilestone === 'function') {
        taskRepository.unassignAllForMilestone(id);
      }

      return true;
    },

    // ==========================================
    // NOTES
    // ==========================================
    createNote(projectId, input) {
      const project = this.getProject(projectId);
      if (!project) throw new Error(`Project "${projectId}" does not exist.`);

      const now = new Date().toISOString();
      const title = requiredText(input.title, 'Note title');

      const note = {
        id: createId(),
        projectId,
        title,
        content: sanitizeText(input.content),
        createdAt: now,
        updatedAt: now,
      };

      const next = clone(memoryData);
      next.notes.push(note);
      logActivityInternal(next, projectId, 'note_created', `Note "${note.title}" created.`);
      write(next);
      return clone(note);
    },

    updateNote(id, patch) {
      const next = clone(memoryData);
      const index = next.notes.findIndex((n) => n.id === id);
      if (index === -1) throw new Error(`Note "${id}" was not found.`);

      const existing = next.notes[index];
      const now = new Date().toISOString();

      const updated = {
        ...existing,
        title: patch.title !== undefined ? requiredText(patch.title, 'Note title') : existing.title,
        content: patch.content !== undefined ? sanitizeText(patch.content) : existing.content,
        updatedAt: now,
      };

      next.notes[index] = updated;
      logActivityInternal(next, existing.projectId, 'note_updated', `Note "${updated.title}" updated.`);
      write(next);
      return clone(updated);
    },

    deleteNote(id) {
      const next = clone(memoryData);
      const note = next.notes.find((n) => n.id === id);
      if (!note) throw new Error(`Note "${id}" was not found.`);

      next.notes = next.notes.filter((n) => n.id !== id);
      logActivityInternal(next, note.projectId, 'note_deleted', `Note "${note.title}" deleted.`);
      write(next);
      return true;
    },

    // ==========================================
    // RESOURCES
    // ==========================================
    createResource(projectId, input) {
      const project = this.getProject(projectId);
      if (!project) throw new Error(`Project "${projectId}" does not exist.`);

      const now = new Date().toISOString();
      const name = requiredText(input.name, 'Resource name');

      const resource = {
        id: createId(),
        projectId,
        name,
        description: sanitizeText(input.description),
        type: sanitizeResourceType(input.type),
        url: sanitizeText(input.url),
        createdAt: now,
        updatedAt: now,
      };

      const next = clone(memoryData);
      next.resources.push(resource);
      logActivityInternal(next, projectId, 'resource_created', `Resource "${resource.name}" added.`);
      write(next);
      return clone(resource);
    },

    updateResource(id, patch) {
      const next = clone(memoryData);
      const index = next.resources.findIndex((r) => r.id === id);
      if (index === -1) throw new Error(`Resource "${id}" was not found.`);

      const existing = next.resources[index];
      const now = new Date().toISOString();

      const updated = {
        ...existing,
        name: patch.name !== undefined ? requiredText(patch.name, 'Resource name') : existing.name,
        description: patch.description !== undefined ? sanitizeText(patch.description) : existing.description,
        type: patch.type !== undefined ? sanitizeResourceType(patch.type) : existing.type,
        url: patch.url !== undefined ? sanitizeText(patch.url) : existing.url,
        updatedAt: now,
      };

      next.resources[index] = updated;
      logActivityInternal(next, existing.projectId, 'resource_updated', `Resource "${updated.name}" updated.`);
      write(next);
      return clone(updated);
    },

    deleteResource(id) {
      const next = clone(memoryData);
      const resource = next.resources.find((r) => r.id === id);
      if (!resource) throw new Error(`Resource "${id}" was not found.`);

      next.resources = next.resources.filter((r) => r.id !== id);
      logActivityInternal(next, resource.projectId, 'resource_deleted', `Resource "${resource.name}" deleted.`);
      write(next);
      return true;
    },

    // ==========================================
    // IMPORTANT DATES
    // ==========================================
    createImportantDate(projectId, input) {
      const project = this.getProject(projectId);
      if (!project) throw new Error(`Project "${projectId}" does not exist.`);

      const label = requiredText(input.label, 'Date label');
      const date = requiredText(input.date, 'Date');
      validDateOrEmpty(date, 'Date');

      const importantDate = {
        id: createId(),
        projectId,
        label,
        date,
        description: sanitizeText(input.description),
        createdAt: new Date().toISOString(),
      };

      const next = clone(memoryData);
      next.importantDates.push(importantDate);
      logActivityInternal(next, projectId, 'date_added', `Important date "${label}" (${date}) added.`);
      write(next);
      return clone(importantDate);
    },

    deleteImportantDate(id) {
      const next = clone(memoryData);
      const item = next.importantDates.find((d) => d.id === id);
      if (!item) throw new Error(`Important date "${id}" was not found.`);

      next.importantDates = next.importantDates.filter((d) => d.id !== id);
      logActivityInternal(next, item.projectId, 'date_deleted', `Important date "${item.label}" removed.`);
      write(next);
      return true;
    },

    // ==========================================
    // ACTIVITIES & GENERAL
    // ==========================================
    logActivity(projectId, type, description, metadata = {}) {
      const next = clone(memoryData);
      const act = logActivityInternal(next, projectId, type, description, metadata);
      write(next);
      return clone(act);
    },

    getActivities(projectId) {
      return memoryData.activities.filter((a) => a.projectId === projectId);
    },
  };
}
