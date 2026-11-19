import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyRepository, STORAGE_KEY } from './studyRepository.js';
import { getTopicCompletion } from './studyMetrics.js';

function createMemoryStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set(STORAGE_KEY, initialValue);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('persists linked learning data and completes a topic only after required activities', () => {
  const storage = createMemoryStorage();
  const repository = createStudyRepository(storage);
  const subject = repository.createSubject({ name: 'Biology' });
  const chapter = repository.createChapter(subject.id, { name: 'Cells' });
  const topic = repository.createTopic(chapter.id, { name: 'Cell structure', requirements: ['lecture', 'reading'] });
  const lecture = repository.addLearningActivity(topic.id, { type: 'lecture', title: 'Lecture 1' });
  const reading = repository.addLearningActivity(topic.id, { type: 'reading', title: 'Textbook chapter' });

  assert.equal(getTopicCompletion(repository.getSnapshot(), topic.id), false);
  repository.updateLearningActivity(lecture.id, { ...lecture, completed: true });
  assert.equal(getTopicCompletion(repository.getSnapshot(), topic.id), false);
  repository.updateLearningActivity(reading.id, { ...reading, completed: true });
  assert.equal(getTopicCompletion(repository.getSnapshot(), topic.id), true);

  const restored = createStudyRepository(storage);
  assert.equal(restored.getSnapshot().topics[0].id, topic.id);
  assert.equal(getTopicCompletion(restored.getSnapshot(), topic.id), true);
});

test('rejects cross-subject practice links and safely preserves topic-linked history on deletion', () => {
  const repository = createStudyRepository(createMemoryStorage());
  const firstSubject = repository.createSubject({ name: 'Physics' });
  const secondSubject = repository.createSubject({ name: 'Chemistry' });
  const chapter = repository.createChapter(firstSubject.id, { name: 'Motion' });
  const topic = repository.createTopic(chapter.id, { name: 'Velocity', requirements: ['practice'] });
  assert.throws(() => repository.createPracticeSession({
    subjectId: secondSubject.id, topicId: topic.id, questionsAttempted: 1,
    questionsCompleted: 1, date: '2026-01-01',
  }), /does not belong/);

  const note = repository.createNote({
    subjectId: firstSubject.id, topicId: topic.id, title: 'Formula', content: 'v = d/t',
  });
  const practice = repository.createPracticeSession({
    subjectId: firstSubject.id, topicId: topic.id, questionsAttempted: 2,
    questionsCompleted: 1, date: '2026-01-01',
  });
  const revision = repository.createRevision(topic.id);
  repository.deleteTopic(topic.id);

  const snapshot = repository.getSnapshot();
  assert.equal(snapshot.notes.find((item) => item.id === note.id).topicId, '');
  assert.equal(snapshot.practiceSessions.find((item) => item.id === practice.id).topicId, '');
  assert.equal(snapshot.revisions.some((item) => item.id === revision.id), false);
  assert.equal(snapshot.topics.length, 0);
});

test('assessment edits preserve identity and validate marks', () => {
  const repository = createStudyRepository(createMemoryStorage());
  const subject = repository.createSubject({ name: 'History' });
  const assessment = repository.createAssessment({
    subjectId: subject.id, title: 'Midterm', date: '2026-12-01',
    coverage: 'Chapters 1-3', preparationProgress: 20,
  });

  repository.updateAssessment(assessment.id, { ...assessment, preparationProgress: 75, marksObtained: '8', marksTotal: '10' });
  const edited = repository.getSnapshot().assessments[0];
  assert.equal(edited.id, assessment.id);
  assert.equal(edited.preparationProgress, 75);
  assert.equal(edited.marksObtained, 8);
  assert.throws(() => repository.updateAssessment(assessment.id, { ...edited, marksObtained: 11 }), /cannot exceed/);
  assert.equal(repository.getSnapshot().assessments[0].marksObtained, 8);
});

test('subject deletion removes dependent records but keeps general study session history', () => {
  const repository = createStudyRepository(createMemoryStorage());
  const subject = repository.createSubject({ name: 'Geography' });
  const chapter = repository.createChapter(subject.id, { name: 'Climate' });
  const topic = repository.createTopic(chapter.id, { name: 'Rainfall', requirements: ['reading'] });
  repository.createNote({ subjectId: subject.id, title: 'Notes', content: 'Rainfall patterns' });
  repository.createRevision(topic.id);
  repository.createPracticeSession({
    subjectId: subject.id, topicId: topic.id, questionsAttempted: 1,
    questionsCompleted: 1, date: '2026-01-01',
  });
  repository.createAssessment({ subjectId: subject.id, title: 'Quiz' });
  const session = repository.createStudySession({
    subjectId: subject.id, topicId: topic.id, durationMinutes: 30, date: '2026-01-01',
  });

  repository.deleteSubject(subject.id);
  const snapshot = repository.getSnapshot();
  assert.equal(snapshot.subjects.length, 0);
  assert.equal(snapshot.chapters.length, 0);
  assert.equal(snapshot.topics.length, 0);
  assert.equal(snapshot.notes.length, 0);
  assert.equal(snapshot.revisions.length, 0);
  assert.equal(snapshot.practiceSessions.length, 0);
  assert.equal(snapshot.assessments.length, 0);
  assert.equal(snapshot.studySessions[0].id, session.id);
  assert.equal(snapshot.studySessions[0].subjectId, '');
  assert.equal(snapshot.studySessions[0].topicId, '');
});

test('does not overwrite storage when existing data cannot be loaded', () => {
  const storage = createMemoryStorage('not valid JSON');
  const repository = createStudyRepository(storage);
  assert.ok(repository.getLoadError());
  assert.throws(() => repository.createSubject({ name: 'Do not replace saved data' }), /Saved study data is unavailable/);
  assert.equal(storage.getItem(STORAGE_KEY), 'not valid JSON');
});
