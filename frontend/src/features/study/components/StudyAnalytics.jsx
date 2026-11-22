import React from 'react';
import { getTopicCompletion, getSubjectProgress } from '../data/studyMetrics';

const PIE_COLORS = ['#9aacc9', '#c66f7c', '#344663'];

export default function StudyAnalytics({ data }) {
  const counts = { completed: 0, inProgress: 0, notStarted: 0 };
  data.topics.forEach((topic) => {
    if (getTopicCompletion(data, topic.id)) {
      counts.completed += 1;
      return;
    }
    const requirements = topic.requirements || [];
    const completeCount = requirements.filter((type) => data.learningActivities.some(
      (activity) => activity.topicId === topic.id && activity.type === type && activity.completed,
    )).length;
    if (completeCount > 0) counts.inProgress += 1;
    else counts.notStarted += 1;
  });
  const segments = [
    { label: 'Completed', value: counts.completed, color: PIE_COLORS[0] },
    { label: 'In progress', value: counts.inProgress, color: PIE_COLORS[1] },
    { label: 'Not started', value: counts.notStarted, color: PIE_COLORS[2] },
  ];
  const subjects = data.subjects.map((subject) => ({ ...subject, ...getSubjectProgress(data, subject.id) }));
  const circumference = 2 * Math.PI * 38;
  let offset = 0;

  return (
    <section className="study-analytics grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,.85fr)]" aria-label="Study progress charts">
      <article className="hud-surface study-chart-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><h2 className="font-semibold text-slate-100">Subject progress</h2><p className="mt-1 text-xs text-slate-400">Topic completion by subject</p></div>
          <span className="text-xs text-slate-400">{subjects.length} subjects</span>
        </div>
        {subjects.length ? <div className="space-y-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="study-progress-row">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-slate-200">{subject.name}</span>
                <span className="shrink-0 text-slate-400">{subject.completed}/{subject.total} · {subject.percentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-950/80" role="progressbar" aria-label={`${subject.name} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={subject.percentage}>
                <div className="h-full rounded-full bg-gradient-to-r from-navy-400 to-red-300 transition-[width] duration-500" style={{ width: `${subject.percentage}%` }} />
              </div>
            </div>
          ))}
        </div> : <EmptyChart>No subjects to chart yet.</EmptyChart>}
      </article>

      <article className="hud-surface study-chart-card p-5">
        <div className="mb-3"><h2 className="font-semibold text-slate-100">Topic completion</h2><p className="mt-1 text-xs text-slate-400">Breakdown across all topics</p></div>
        {data.topics.length ? <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-between">
          <div className="relative h-36 w-36 shrink-0" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#16243a" strokeWidth="14" />
              {segments.filter((segment) => segment.value > 0).map((segment) => {
                const length = (segment.value / data.topics.length) * circumference;
                const circle = <circle key={segment.label} cx="50" cy="50" r="38" fill="none" stroke={segment.color} strokeWidth="14" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
                offset += length;
                return circle;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold text-slate-100">{data.topics.length}</span><span className="text-[10px] text-slate-400">topics</span></div>
          </div>
          <ul className="min-w-32 space-y-2.5">
            {segments.map((segment) => <li key={segment.label} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-2 text-slate-300"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span><span className="font-medium text-slate-100">{segment.value}</span></li>)}
          </ul>
        </div> : <EmptyChart>No topics to chart yet.</EmptyChart>}
      </article>
    </section>
  );
}

function EmptyChart({ children }) {
  return <div className="flex min-h-32 items-center justify-center text-center text-sm text-slate-400">{children}</div>;
}
