import React, { useMemo } from 'react';

const STATUS_COLORS = {
  todo: '#344663',
  in_progress: '#5b7197',
  completed: '#9aacc9',
};
const PRIORITY_COLORS = {
  urgent: '#c66f7c',
  high: '#d4856e',
  medium: '#5b7197',
  low: '#344663',
  none: '#28384e',
};
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed' };
const PRIORITY_LABELS = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'No Priority' };

function DonutChart({ segments, total, centerLabel, centerValue, size = 144 }) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img"
      aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#16243a" strokeWidth="14" />
        {segments.filter((s) => s.value > 0).map((s) => {
          const length = (s.value / total) * circumference;
          const circle = (
            <circle
              key={s.key}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-100">{centerValue}</span>
        <span className="text-[10px] text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
}

function EmptyChart({ children }) {
  return (
    <div className="flex min-h-32 items-center justify-center text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

function BarChart({ items, maxValue }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;
        return (
          <div key={item.key} className="task-progress-row">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-200">{item.label}</span>
              <span className="shrink-0 text-slate-400">{item.value} tasks</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy-950/80"
              role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TaskAnalytics({ tasks }) {
  const stats = useMemo(() => {
    const statusCounts = { todo: 0, in_progress: 0, completed: 0 };
    const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0, none: 0 };
    const categoryCounts = {};
    const overdueTasks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach((t) => {
      const status = t.status === 'completed' || t.completed ? 'completed' : (t.status || 'todo');
      if (status in statusCounts) statusCounts[status] += 1;
      else statusCounts.todo += 1;

      const prio = t.priority || 'none';
      if (prio in priorityCounts) priorityCounts[prio] += 1;
      else priorityCounts.none += 1;

      const cat = t.category || 'Inbox';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (t.dueDate && status !== 'completed') {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < today) overdueTasks.push(t);
      }
    });

    const total = tasks.length;
    const completedCount = statusCounts.completed;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const statusSegments = Object.entries(statusCounts).map(([k, v]) => ({
      key: k, label: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#344663',
    }));

    const prioritySegments = Object.entries(priorityCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        key: k, label: PRIORITY_LABELS[k] || k, value: v, color: PRIORITY_COLORS[k] || '#344663',
      }));

    const categoryItems = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([k, v], i) => ({
        key: k, label: k, value: v,
        color: ['#9aacc9', '#c66f7c', '#5b7197', '#7893bd', '#344663', '#d4856e', '#4a6080'][i % 7],
      }));

    const maxCatValue = categoryItems.length > 0 ? categoryItems[0].value : 1;

    return { total, statusSegments, prioritySegments, categoryItems, maxCatValue, completionRate, overdueTasks };
  }, [tasks]);

  return (
    <section className="task-analytics grid gap-4 lg:grid-cols-[minmax(220px,.75fr)_minmax(220px,.75fr)_minmax(0,1.5fr)]"
      aria-label="Task analytics charts">

      {/* Status Donut */}
      <article className="hud-surface task-chart-card p-5">
        <div className="mb-3">
          <h2 className="font-semibold text-slate-100">Task status</h2>
          <p className="mt-1 text-xs text-slate-400">Breakdown by completion state</p>
        </div>
        {stats.total ? (
          <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-between">
            <DonutChart
              segments={stats.statusSegments}
              total={stats.total}
              centerValue={`${stats.completionRate}%`}
              centerLabel="done"
            />
            <ul className="min-w-28 space-y-2.5">
              {stats.statusSegments.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-4 text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-medium text-slate-100">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : <EmptyChart>No tasks to chart yet.</EmptyChart>}
      </article>

      {/* Priority Donut */}
      <article className="hud-surface task-chart-card p-5">
        <div className="mb-3">
          <h2 className="font-semibold text-slate-100">Priority split</h2>
          <p className="mt-1 text-xs text-slate-400">Distribution by urgency level</p>
        </div>
        {stats.total ? (
          <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-between">
            <DonutChart
              segments={stats.prioritySegments}
              total={stats.total}
              centerValue={stats.total}
              centerLabel="tasks"
            />
            <ul className="min-w-28 space-y-2.5">
              {stats.prioritySegments.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-4 text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-medium text-slate-100">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : <EmptyChart>No tasks to chart yet.</EmptyChart>}
      </article>

      {/* Category Bar Chart */}
      <article className="hud-surface task-chart-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-100">Tasks by category</h2>
            <p className="mt-1 text-xs text-slate-400">Volume across your workspaces</p>
          </div>
          <span className="text-xs text-slate-400">{stats.categoryItems.length} categories</span>
        </div>
        {stats.categoryItems.length ? (
          <BarChart items={stats.categoryItems} maxValue={stats.maxCatValue} />
        ) : <EmptyChart>No categories assigned yet.</EmptyChart>}
      </article>
    </section>
  );
}
