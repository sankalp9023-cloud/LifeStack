const STORAGE_KEY = 'lifestack.study.v1';

const EMPTY_DATA = {
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

const COLLECTIONS = Object.keys(EMPTY_DATA);

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function validDate(value, label) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

function nonNegativeNumber(value, label, { integer = false } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${label} must be a non-negative${integer ? ' whole' : ''} number.`);
  }
  return parsed;
}

function findById(collection, id, label) {
  const record = collection.find((item) => item.id === id);
  if (!record) throw new Error(`${label} was not found.`);
  return record;
}

function assertUniqueIds(data) {
  for (const collectionName of COLLECTIONS) {
    const ids = data[collectionName].map((item) => item.id);
    if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
      throw new Error(`Study data contains invalid or duplicate IDs in ${collectionName}.`);
    }
  }
}

function validateData(data) {
  if (!data || typeof data !== 'object' || COLLECTIONS.some((key) => !Array.isArray(data[key]))) {
    throw new Error('Stored study data is invalid. The data was not changed.');
  }
  assertUniqueIds(data);

  const subjectIds = new Set(data.subjects.map((item) => item.id));
  const chapterIds = new Set(data.chapters.map((item) => item.id));
  const topicIds = new Set(data.topics.map((item) => item.id));
  const topicById = new Map(data.topics.map((item) => [item.id, item]));
  const topicSubjectId = (id) => {
    const topic = topicById.get(id);
    const chapter = data.chapters.find((item) => item.id === topic.chapterId);
    return chapter && chapter.subjectId;
  };

  if (data.chapters.some((item) => !subjectIds.has(item.subjectId))
    || data.topics.some((item) => !chapterIds.has(item.chapterId)
      || !Array.isArray(item.requirements) || item.requirements.length === 0
      || item.requirements.some((type) => !['lecture', 'reading', 'practice'].includes(type)))) {
    throw new Error('Study data contains broken subject, chapter, or topic relationships.');
  }
  if (data.learningActivities.some((item) => !topicIds.has(item.topicId)
      || !['lecture', 'reading', 'practice'].includes(item.type)
      || typeof item.completed !== 'boolean')
    || data.revisions.some((item) => !topicIds.has(item.topicId)
      || !['pending', 'completed'].includes(item.status))
    || data.practiceSessions.some((item) => !subjectIds.has(item.subjectId)
      || (item.topicId && (!topicIds.has(item.topicId)
        || topicSubjectId(item.topicId) !== item.subjectId)))
    || data.studySessions.some((item) => (item.subjectId && !subjectIds.has(item.subjectId))
      || (item.topicId && (!topicIds.has(item.topicId)
        || topicSubjectId(item.topicId) !== item.subjectId)))
    || data.notes.some((item) => !subjectIds.has(item.subjectId)
      || (item.chapterId && (!chapterIds.has(item.chapterId)
        || data.chapters.find((chapter) => chapter.id === item.chapterId).subjectId !== item.subjectId))
      || (item.topicId && (!topicIds.has(item.topicId)
        || topicSubjectId(item.topicId) !== item.subjectId
        || (item.chapterId && topicById.get(item.topicId).chapterId !== item.chapterId))))
    || data.assessments.some((item) => !subjectIds.has(item.subjectId)
      || item.topicIds.some((id) => !topicIds.has(id)
        || topicSubjectId(id) !== item.subjectId))) {
    throw new Error('Study data contains broken learning record relationships.');
  }
  return data;
}

function deleteTopics(data, topicIds) {
  const ids = new Set(topicIds);
  data.topics = data.topics.filter((item) => !ids.has(item.id));
  data.learningActivities = data.learningActivities.filter((item) => !ids.has(item.topicId));
  data.revisions = data.revisions.filter((item) => !ids.has(item.topicId));
  data.notes = data.notes.map((item) => ids.has(item.topicId) ? { ...item, topicId: '' } : item);
  data.practiceSessions = data.practiceSessions.map((item) => ids.has(item.topicId)
    ? { ...item, topicId: '' }
    : item);
  data.studySessions = data.studySessions.map((item) => ids.has(item.topicId)
    ? { ...item, topicId: '' }
    : item);
  data.assessments = data.assessments.map((item) => ({
    ...item,
    topicIds: item.topicIds.filter((id) => !ids.has(id)),
  }));
}

export function createStudyRepository(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable in this browser.');

  let data;
  const listeners = new Set();
  let loadError = null;
  try {
    const serialized = storage.getItem(STORAGE_KEY);
    if (serialized === null) {
      data = structuredClone(EMPTY_DATA);
    } else {
      const saved = JSON.parse(serialized);
      if (saved.version !== 1) throw new Error('This study data version is not supported.');
      data = validateData(saved.data);
    }
  } catch (error) {
    loadError = error instanceof Error ? error : new Error('Could not read saved study data.');
    data = structuredClone(EMPTY_DATA);
  }

  const notify = () => listeners.forEach((listener) => listener());
  const save = (nextData, repair = false) => {
    if (loadError && !repair) {
      throw new Error(`Saved study data is unavailable: ${loadError.message}`);
    }
    validateData(nextData);
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: nextData }));
    data = nextData;
    loadError = null;
    notify();
  };
  const update = (collection, id, patch) => {
    const record = findById(data[collection], id, collection);
    const next = structuredClone(data);
    next[collection] = next[collection].map((item) => item.id === id ? { ...record, ...patch } : item);
    save(next);
  };

  const repository = {
    getSnapshot: () => data,
    getLoadError: () => loadError,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    createSubject(input) {
      const name = requiredText(input.name, 'Subject name');
      const record = {
        id: createId(), name, goal: (input.goal || '').trim(),
        description: (input.description || '').trim(), createdAt: new Date().toISOString(),
      };
      save({ ...data, subjects: [...data.subjects, record] });
      return record;
    },
    updateSubject(id, input) {
      const patch = {
        name: requiredText(input.name, 'Subject name'),
        goal: (input.goal || '').trim(),
        description: (input.description || '').trim(),
      };
      update('subjects', id, patch);
    },
    deleteSubject(id) {
      findById(data.subjects, id, 'Subject');
      const subject = data.subjects.find((item) => item.id === id);
      const chapterIds = new Set(data.chapters.filter((item) => item.subjectId === id).map((item) => item.id));
      const topicIds = data.topics.filter((item) => chapterIds.has(item.chapterId)).map((item) => item.id);
      const next = structuredClone(data);
      next.subjects = next.subjects.filter((item) => item.id !== id);
      next.chapters = next.chapters.filter((item) => item.subjectId !== id);
      deleteTopics(next, topicIds);
      next.notes = next.notes.filter((item) => item.subjectId !== id);
      next.practiceSessions = next.practiceSessions.filter((item) => item.subjectId !== id);
      next.assessments = next.assessments.filter((item) => item.subjectId !== id);
      next.studySessions = next.studySessions.map((item) => item.subjectId === id
        ? { ...item, subjectId: '', topicId: '' }
        : item);
      save(next);
      return subject;
    },
    createChapter(subjectId, input) {
      findById(data.subjects, subjectId, 'Subject');
      const record = {
        id: createId(), subjectId, name: requiredText(input.name, 'Chapter name'),
        description: (input.description || '').trim(), createdAt: new Date().toISOString(),
      };
      save({ ...data, chapters: [...data.chapters, record] });
      return record;
    },
    updateChapter(id, input) {
      update('chapters', id, {
        name: requiredText(input.name, 'Chapter name'),
        description: (input.description || '').trim(),
      });
    },
    deleteChapter(id) {
      const chapter = findById(data.chapters, id, 'Chapter');
      const topicIds = data.topics.filter((item) => item.chapterId === id).map((item) => item.id);
      const next = structuredClone(data);
      next.chapters = next.chapters.filter((item) => item.id !== id);
      deleteTopics(next, topicIds);
      next.notes = next.notes.map((item) => item.chapterId === id
        ? { ...item, chapterId: '', topicId: '' }
        : item);
      save(next);
      return chapter;
    },
    createTopic(chapterId, input) {
      findById(data.chapters, chapterId, 'Chapter');
      if (!Array.isArray(input.requirements) || input.requirements.length === 0
        || input.requirements.some((type) => !['lecture', 'reading', 'practice'].includes(type))) {
        throw new Error('Choose at least one valid learning requirement for this topic.');
      }
      const record = {
        id: createId(), chapterId, name: requiredText(input.name, 'Topic name'),
        requirements: [...new Set(input.requirements)], createdAt: new Date().toISOString(),
      };
      save({ ...data, topics: [...data.topics, record] });
      return record;
    },
    updateTopic(id, input) {
      if (!Array.isArray(input.requirements) || input.requirements.length === 0
        || input.requirements.some((type) => !['lecture', 'reading', 'practice'].includes(type))) {
        throw new Error('Choose at least one valid learning requirement for this topic.');
      }
      update('topics', id, {
        name: requiredText(input.name, 'Topic name'),
        requirements: [...new Set(input.requirements)],
      });
    },
    deleteTopic(id) {
      findById(data.topics, id, 'Topic');
      const next = structuredClone(data);
      deleteTopics(next, [id]);
      save(next);
    },
    addLearningActivity(topicId, input) {
      const topic = findById(data.topics, topicId, 'Topic');
      if (!topic.requirements.includes(input.type)) {
        throw new Error('This activity type is not required by the topic.');
      }
      const record = {
        id: createId(), topicId, type: input.type,
        title: requiredText(input.title, 'Activity title'),
        details: (input.details || '').trim(), completed: false,
        createdAt: new Date().toISOString(), completedAt: '',
      };
      save({ ...data, learningActivities: [...data.learningActivities, record] });
      return record;
    },
    updateLearningActivity(id, input) {
      const record = findById(data.learningActivities, id, 'Learning activity');
      update('learningActivities', id, {
        title: requiredText(input.title, 'Activity title'),
        details: (input.details || '').trim(),
        completed: Boolean(input.completed),
        completedAt: input.completed ? (record.completedAt || new Date().toISOString()) : '',
      });
    },
    deleteLearningActivity(id) {
      findById(data.learningActivities, id, 'Learning activity');
      save({ ...data, learningActivities: data.learningActivities.filter((item) => item.id !== id) });
    },
    createNote(input) {
      const subject = findById(data.subjects, input.subjectId, 'Subject');
      if (input.chapterId) {
        const chapter = findById(data.chapters, input.chapterId, 'Chapter');
        if (chapter.subjectId !== subject.id) throw new Error('The chapter does not belong to this subject.');
      }
      if (input.topicId) {
        const topic = findById(data.topics, input.topicId, 'Topic');
        const chapter = data.chapters.find((item) => item.id === topic.chapterId);
        if (chapter.subjectId !== subject.id || (input.chapterId && topic.chapterId !== input.chapterId)) {
          throw new Error('The topic does not match the selected subject and chapter.');
        }
      }
      const topic = input.topicId ? data.topics.find((item) => item.id === input.topicId) : null;
      const record = {
        id: createId(), subjectId: subject.id, chapterId: input.chapterId || (topic ? topic.chapterId : ''),
        topicId: input.topicId || '', title: requiredText(input.title, 'Note title'),
        content: requiredText(input.content, 'Note content'),
        updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      };
      save({ ...data, notes: [...data.notes, record] });
      return record;
    },
    updateNote(id, input) {
      const note = findById(data.notes, id, 'Note');
      const subjectId = input.subjectId || note.subjectId;
      const topicId = input.topicId === undefined ? note.topicId : input.topicId;
      let chapterId = input.chapterId === undefined ? note.chapterId : input.chapterId;
      const subject = findById(data.subjects, subjectId, 'Subject');
      if (chapterId && findById(data.chapters, chapterId, 'Chapter').subjectId !== subject.id) {
        throw new Error('The chapter does not belong to this subject.');
      }
      if (topicId) {
        const topic = findById(data.topics, topicId, 'Topic');
        const chapter = data.chapters.find((item) => item.id === topic.chapterId);
        if (chapter.subjectId !== subject.id || (chapterId && topic.chapterId !== chapterId)) {
          throw new Error('The topic does not match the selected subject and chapter.');
        }
        chapterId = topic.chapterId;
      }
      update('notes', id, {
        subjectId, chapterId: chapterId || '', topicId: topicId || '',
        title: requiredText(input.title, 'Note title'),
        content: requiredText(input.content, 'Note content'),
        updatedAt: new Date().toISOString(),
      });
    },
    deleteNote(id) {
      findById(data.notes, id, 'Note');
      save({ ...data, notes: data.notes.filter((item) => item.id !== id) });
    },
    createRevision(topicId, input = {}) {
      findById(data.topics, topicId, 'Topic');
      const record = {
        id: createId(), topicId, status: 'pending', dueDate: input.dueDate || '',
        notes: (input.notes || '').trim(), createdAt: new Date().toISOString(), completedAt: '',
      };
      if (record.dueDate) validDate(record.dueDate, 'Revision date');
      save({ ...data, revisions: [...data.revisions, record] });
      return record;
    },
    updateRevision(id, input) {
      const revision = findById(data.revisions, id, 'Revision');
      const completed = Boolean(input.completed);
      const dueDate = input.dueDate === undefined ? revision.dueDate : input.dueDate;
      if (dueDate) validDate(dueDate, 'Revision date');
      update('revisions', id, {
        status: completed ? 'completed' : 'pending',
        dueDate,
        notes: input.notes === undefined ? revision.notes : input.notes.trim(),
        completedAt: completed ? (revision.completedAt || new Date().toISOString()) : '',
      });
    },
    deleteRevision(id) {
      findById(data.revisions, id, 'Revision');
      save({ ...data, revisions: data.revisions.filter((item) => item.id !== id) });
    },
    createPracticeSession(input) {
      const subject = findById(data.subjects, input.subjectId, 'Subject');
      if (input.topicId) {
        const topic = findById(data.topics, input.topicId, 'Topic');
        const chapter = data.chapters.find((item) => item.id === topic.chapterId);
        if (chapter.subjectId !== subject.id) throw new Error('The topic does not belong to this subject.');
      }
      const attempted = nonNegativeNumber(input.questionsAttempted, 'Questions attempted', { integer: true });
      const completed = nonNegativeNumber(input.questionsCompleted, 'Questions completed', { integer: true });
      const correct = input.questionsCorrect === '' || input.questionsCorrect === undefined
        ? null
        : nonNegativeNumber(input.questionsCorrect, 'Questions correct', { integer: true });
      if (completed > attempted || (correct !== null && correct > completed)) {
        throw new Error('Questions completed cannot exceed attempted, and correct cannot exceed completed.');
      }
      const record = {
        id: createId(), subjectId: subject.id, topicId: input.topicId || '',
        questionsAttempted: attempted, questionsCompleted: completed, questionsCorrect: correct,
        durationMinutes: nonNegativeNumber(input.durationMinutes || 0, 'Duration'),
        notes: (input.notes || '').trim(), date: validDate(input.date, 'Practice date'),
        createdAt: new Date().toISOString(),
      };
      save({ ...data, practiceSessions: [...data.practiceSessions, record] });
      return record;
    },
    deletePracticeSession(id) {
      findById(data.practiceSessions, id, 'Practice session');
      save({ ...data, practiceSessions: data.practiceSessions.filter((item) => item.id !== id) });
    },
    createAssessment(input) {
      const subject = findById(data.subjects, input.subjectId, 'Subject');
      const topicIds = [...new Set(input.topicIds || [])];
      topicIds.forEach((id) => {
        const topic = findById(data.topics, id, 'Topic');
        if (data.chapters.find((item) => item.id === topic.chapterId).subjectId !== subject.id) {
          throw new Error('All assessment topics must belong to the selected subject.');
        }
      });
      const preparationProgress = nonNegativeNumber(input.preparationProgress || 0, 'Preparation progress');
      if (preparationProgress > 100) throw new Error('Preparation progress cannot exceed 100%.');
      const marksObtained = input.marksObtained === '' || input.marksObtained === undefined
        ? null : nonNegativeNumber(input.marksObtained, 'Marks obtained');
      const marksTotal = input.marksTotal === '' || input.marksTotal === undefined
        ? null : nonNegativeNumber(input.marksTotal, 'Total marks');
      if (marksObtained !== null && marksTotal === null) throw new Error('Enter total marks to record a result.');
      if (marksObtained !== null && marksObtained > marksTotal) throw new Error('Marks obtained cannot exceed total marks.');
      const record = {
        id: createId(), subjectId: subject.id, topicIds,
        title: requiredText(input.title, 'Assessment title'),
        date: input.date ? validDate(input.date, 'Assessment date') : '',
        coverage: (input.coverage || '').trim(), preparationProgress,
        marksObtained, marksTotal, createdAt: new Date().toISOString(),
      };
      save({ ...data, assessments: [...data.assessments, record] });
      return record;
    },
    updateAssessment(id, input) {
      const assessment = findById(data.assessments, id, 'Assessment');
      const subject = findById(data.subjects, input.subjectId || assessment.subjectId, 'Subject');
      const topicIds = [...new Set(input.topicIds === undefined ? assessment.topicIds : input.topicIds)];
      topicIds.forEach((topicId) => {
        const topic = findById(data.topics, topicId, 'Topic');
        if (data.chapters.find((item) => item.id === topic.chapterId).subjectId !== subject.id) {
          throw new Error('All assessment topics must belong to the selected subject.');
        }
      });
      const preparationProgress = nonNegativeNumber(
        input.preparationProgress === undefined ? assessment.preparationProgress : input.preparationProgress,
        'Preparation progress',
      );
      if (preparationProgress > 100) throw new Error('Preparation progress cannot exceed 100%.');
      const marksObtainedInput = input.marksObtained === undefined ? assessment.marksObtained : input.marksObtained;
      const marksTotalInput = input.marksTotal === undefined ? assessment.marksTotal : input.marksTotal;
      const marksObtained = marksObtainedInput === '' || marksObtainedInput === null
        ? null : nonNegativeNumber(marksObtainedInput, 'Marks obtained');
      const marksTotal = marksTotalInput === '' || marksTotalInput === null
        ? null : nonNegativeNumber(marksTotalInput, 'Total marks');
      if (marksObtained !== null && marksTotal === null) throw new Error('Enter total marks to record a result.');
      if (marksObtained !== null && marksObtained > marksTotal) throw new Error('Marks obtained cannot exceed total marks.');
      const date = input.date === undefined ? assessment.date : input.date;
      update('assessments', id, {
        subjectId: subject.id, topicIds,
        title: requiredText(input.title === undefined ? assessment.title : input.title, 'Assessment title'),
        date: date ? validDate(date, 'Assessment date') : '',
        coverage: (input.coverage === undefined ? assessment.coverage : input.coverage).trim(),
        preparationProgress, marksObtained, marksTotal,
      });
    },
    deleteAssessment(id) {
      findById(data.assessments, id, 'Assessment');
      save({ ...data, assessments: data.assessments.filter((item) => item.id !== id) });
    },
    createStudySession(input) {
      const subjectId = input.subjectId || '';
      if (subjectId) findById(data.subjects, subjectId, 'Subject');
      if (input.topicId) {
        const topic = findById(data.topics, input.topicId, 'Topic');
        const chapter = data.chapters.find((item) => item.id === topic.chapterId);
        if (!subjectId || chapter.subjectId !== subjectId) {
          throw new Error('A study topic must belong to the selected subject.');
        }
      }
      const record = {
        id: createId(), subjectId, topicId: input.topicId || '',
        durationMinutes: nonNegativeNumber(input.durationMinutes, 'Duration'),
        notes: (input.notes || '').trim(), date: validDate(input.date, 'Study session date'),
        createdAt: new Date().toISOString(),
      };
      if (record.durationMinutes <= 0) throw new Error('Study duration must be greater than zero.');
      save({ ...data, studySessions: [...data.studySessions, record] });
      return record;
    },
    deleteStudySession(id) {
      findById(data.studySessions, id, 'Study session');
      save({ ...data, studySessions: data.studySessions.filter((item) => item.id !== id) });
    },
    replaceData(nextData) {
      save(structuredClone(nextData), true);
    },
    getSubjectIdForTopic(topicId) {
      const topic = findById(data.topics, topicId, 'Topic');
      return data.chapters.find((item) => item.id === topic.chapterId).subjectId;
    },
    addStorageListener() {
      if (typeof window === 'undefined') return () => {};
      const handleStorage = (event) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        try {
          if (event.key === null || event.newValue === null) {
            data = structuredClone(EMPTY_DATA);
          } else {
            const saved = JSON.parse(event.newValue);
            if (saved.version !== 1) throw new Error('This study data version is not supported.');
            data = validateData(saved.data);
          }
          loadError = null;
          notify();
        } catch (error) {
          loadError = error instanceof Error ? error : new Error('Could not read saved study data.');
          notify();
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    },
  };

  return repository;
}

export { STORAGE_KEY };
export function validateStudyData(data) {
  return validateData(data);
}
