export function getTopicCompletion(data, topicId) {
  const topic = data.topics.find((item) => item.id === topicId);
  if (!topic) return false;
  return topic.requirements.every((type) => data.learningActivities.some(
    (activity) => activity.topicId === topicId && activity.type === type && activity.completed,
  ));
}

export function getChapterProgress(data, chapterId) {
  const topics = data.topics.filter((topic) => topic.chapterId === chapterId);
  const completed = topics.filter((topic) => getTopicCompletion(data, topic.id)).length;
  return { completed, total: topics.length, percentage: topics.length ? Math.round((completed / topics.length) * 100) : 0 };
}

export function getSubjectProgress(data, subjectId) {
  const chapterIds = new Set(data.chapters.filter((chapter) => chapter.subjectId === subjectId).map((chapter) => chapter.id));
  const topics = data.topics.filter((topic) => chapterIds.has(topic.chapterId));
  const completed = topics.filter((topic) => getTopicCompletion(data, topic.id)).length;
  return { completed, total: topics.length, percentage: topics.length ? Math.round((completed / topics.length) * 100) : 0 };
}

export function getStudyDashboard(data, now = new Date()) {
  const completedChapters = data.chapters.filter((chapter) => {
    const progress = getChapterProgress(data, chapter.id);
    return progress.total > 0 && progress.completed === progress.total;
  }).length;
  const upcomingTests = data.assessments
    .filter((assessment) => assessment.date && new Date(`${assessment.date}T23:59:59`) >= now)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pendingRevisions = data.revisions.filter((revision) => revision.status === 'pending');
  const activities = [
    ...data.studySessions.map((item) => ({ ...item, type: 'Study session', at: item.date })),
    ...data.practiceSessions.map((item) => ({ ...item, type: 'Practice', at: item.date })),
    ...data.revisions.map((item) => ({ ...item, type: item.status === 'completed' ? 'Revision completed' : 'Revision scheduled', at: item.completedAt || item.createdAt })),
    ...data.learningActivities.filter((item) => item.completed).map((item) => ({ ...item, type: 'Learning activity completed', at: item.completedAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  const topicCount = data.topics.length;
  const completedTopics = data.topics.filter((topic) => getTopicCompletion(data, topic.id)).length;

  return {
    subjectCount: data.subjects.length,
    completedTopics,
    topicCount,
    progress: topicCount ? Math.round((completedTopics / topicCount) * 100) : 0,
    completedChapters,
    pendingChapters: Math.max(data.chapters.length - completedChapters, 0),
    upcomingTests,
    pendingRevisions,
    activities,
  };
}
