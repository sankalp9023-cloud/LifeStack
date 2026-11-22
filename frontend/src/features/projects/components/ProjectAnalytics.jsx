import React from 'react';
import { calculateProjectMetrics } from '../data/projectMetrics.js';

const COLORS = { active: '#9aacc9', completed: '#c66f7c', on_hold: '#5b7197', not_started: '#344663' };
const LABELS = { active: 'Active', completed: 'Completed', on_hold: 'On hold', not_started: 'Not started' };

export default function ProjectAnalytics({ projects, milestones, tasks, onSelectProject }) {
  const visibleProjects = projects.filter((project) => project.status !== 'archived');
  const statusOrder = ['active', 'completed', 'on_hold', 'not_started'];
  const segments = statusOrder.map((status) => ({
    status,
    label: LABELS[status],
    value: visibleProjects.filter((project) => project.status === status).length,
    color: COLORS[status],
  }));
  const total = visibleProjects.length;
  const circumference = 2 * Math.PI * 38;
  let offset = 0;
  const progressProjects = visibleProjects.map((project) => ({
    ...project,
    progress: calculateProjectMetrics(project, milestones, tasks).overallProgress,
  })).sort((a, b) => b.progress - a.progress);

  return (
    <section className="project-analytics grid gap-4 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]" aria-label="Project charts">
      <article className="hud-surface project-chart-card p-5">
        <div className="mb-3"><h2 className="font-semibold text-slate-100">Project status</h2><p className="mt-1 text-xs text-slate-400">Portfolio breakdown</p></div>
        {total ? <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-between">
          <div className="relative h-36 w-36 shrink-0" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#16243a" strokeWidth="14" />
              {segments.filter((segment) => segment.value > 0).map((segment) => {
                const length = (segment.value / total) * circumference;
                const circle = <circle key={segment.status} cx="50" cy="50" r="38" fill="none" stroke={segment.color} strokeWidth="14" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
                offset += length;
                return circle;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold text-slate-100">{total}</span><span className="text-[10px] text-slate-400">projects</span></div>
          </div>
          <ul className="min-w-32 space-y-2.5">
            {segments.map((segment) => <li key={segment.status} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-2 text-slate-300"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span><span className="font-medium text-slate-100">{segment.value}</span></li>)}
          </ul>
        </div> : <EmptyChart>No projects to chart yet.</EmptyChart>}
      </article>

      <article className="hud-surface project-chart-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-100">Project progress</h2><p className="mt-1 text-xs text-slate-400">Completion across active and completed projects</p></div><span className="text-xs text-slate-400">{progressProjects.length} projects</span></div>
        {progressProjects.length ? <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
          {progressProjects.map((project) => <button key={project.id} type="button" onClick={() => onSelectProject(project.id)} className="project-progress-row block w-full rounded-md px-1 py-0.5 text-left">
            <span className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-slate-200">{project.name}</span><span className="shrink-0 text-slate-400">{project.progress}%</span></span>
            <span className="block h-2 overflow-hidden rounded-full bg-navy-950/80"><span className="block h-full rounded-full bg-gradient-to-r from-navy-400 to-red-300 transition-[width] duration-500" style={{ width: `${project.progress}%` }} /></span>
          </button>)}
        </div> : <EmptyChart>No project progress to chart yet.</EmptyChart>}
      </article>
    </section>
  );
}

function EmptyChart({ children }) {
  return <div className="flex min-h-32 items-center justify-center text-center text-sm text-slate-400">{children}</div>;
}
