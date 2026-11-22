import React from 'react';
import { getStudyDashboard } from '../data/studyMetrics';
import { formatSettingsDate } from '@/features/settings/data/settingsFormatters';
import StudyAnalytics from './StudyAnalytics';

function formatDate(value, settings) {
  if (!value) return 'No date';
  return formatSettingsDate(value, settings);
}

export default function StudyDashboard({ data, settings, onNavigate }) {
  const dashboard = getStudyDashboard(data);
  const subjectName = (id) => data.subjects.find((item) => item.id === id)?.name || 'Study';
  const topicName = (id) => data.topics.find((item) => item.id === id)?.name || '';
  const topicSubjectName = (topicId) => {
    const topic = data.topics.find((item) => item.id === topicId);
    const chapter = data.chapters.find((item) => item.id === topic?.chapterId);
    return subjectName(chapter?.subjectId);
  };

  return (
    <div className="study-dashboard space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Study summary">
        <Summary label="Subjects" value={dashboard.subjectCount} />
        <Summary label="Overall progress" value={`${dashboard.progress}%`} detail={`${dashboard.completedTopics} of ${dashboard.topicCount} topics`} />
        <Summary label="Completed chapters" value={dashboard.completedChapters} detail={`${dashboard.pendingChapters} pending`} />
        <Summary label="Pending revisions" value={dashboard.pendingRevisions.length} />
      </section>

      <StudyAnalytics data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="hud-surface rounded border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Upcoming tests and exams</h2>
            <button type="button" className="text-sm underline" onClick={() => onNavigate('assessments')}>Manage</button>
          </div>
          {dashboard.upcomingTests.length === 0 ? <p className="text-sm text-slate-400">No upcoming assessments.</p> : (
            <ul className="space-y-2">
              {dashboard.upcomingTests.slice(0, 5).map((test) => (
                <li key={test.id} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span>{test.title} <span className="text-slate-400">· {subjectName(test.subjectId)}</span></span>
                  <span>{formatDate(test.date, settings)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hud-surface rounded border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Topics needing revision</h2>
            <button type="button" className="text-sm underline" onClick={() => onNavigate('revisions')}>View history</button>
          </div>
          {dashboard.pendingRevisions.length === 0 ? <p className="text-sm text-slate-400">No pending revisions.</p> : (
            <ul className="space-y-2">
              {dashboard.pendingRevisions.slice(0, 5).map((revision) => (
                <li key={revision.id} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span>{topicName(revision.topicId)} <span className="text-slate-400">· {topicSubjectName(revision.topicId)}</span></span>
                  <span>{revision.dueDate ? `Due ${formatDate(revision.dueDate, settings)}` : 'No date'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hud-surface rounded border border-slate-800 bg-slate-900/50 p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Recent study activity</h2>
          {dashboard.activities.length === 0 ? <p className="text-sm text-slate-400">No study activity yet. Record a session or complete a learning activity to get started.</p> : (
            <ul className="space-y-1">
              {dashboard.activities.map((activity) => (
                <li key={`${activity.type}-${activity.id}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>{activity.type}: {activity.title || topicName(activity.topicId) || subjectName(activity.subjectId)}</span>
                  <time dateTime={activity.at}>{formatDate(activity.at, settings)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Summary({ label, value, detail }) {
  return (
    <div className="hud-surface space-y-1 rounded border border-slate-800 bg-slate-900/60 p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {detail && <p className="text-[10px] text-slate-500">{detail}</p>}
    </div>
  );
}

