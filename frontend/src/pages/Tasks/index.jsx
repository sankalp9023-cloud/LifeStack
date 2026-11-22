import React, { useMemo, useState } from 'react';
import useTaskData from '@/hooks/useTaskData';
import TaskViews from '@/features/tasks/components/TaskViews';
import TaskToolbar from '@/features/tasks/components/TaskToolbar';
import TaskList from '@/features/tasks/components/TaskList';
import TaskForm from '@/features/tasks/components/TaskForm';
import TaskDetail from '@/features/tasks/components/TaskDetail';
import TaskAnalytics from '@/features/tasks/components/TaskAnalytics';
import Modal from '@/components/ui/Modal';
import '@/features/tasks/tasks.css';

const VIEWS = ['All Tasks', "Today's Schedule", 'Completed'];
const blank = {
  title: '', description: '', dueDate: '', status: 'todo',
  category: '', priority: '', tags: [], subtasks: [], relatedModule: '',
};
const isToday = (date) => date && new Date(date).toDateString() === new Date().toDateString();

export default function TasksPage() {
  const { tasks, repository, error } = useTaskData();
  const [view, setView] = useState(VIEWS[0]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState('');

  const run = (fn) => {
    try { fn(); setActionError(''); return true; }
    catch (e) { setActionError(e.message || 'Could not save task.'); return false; }
  };

  const views = useMemo(() => ({
    'All Tasks': tasks,
    "Today's Schedule": tasks.filter((t) => t.status !== 'completed' && isToday(t.dueDate)),
    Completed: tasks.filter((t) => t.status === 'completed' || t.completed),
  }), [tasks]);

  const visible = views[view].filter((t) =>
    !query || `${t.title} ${t.description} ${(t.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  const save = (form) => run(() => {
    if (editing) repository.updateTask(editing.id, form);
    else repository.createTask(form);
    setShowForm(false); setEditing(null);
  });

  const startEdit = (task) => { setEditing(task); setShowForm(true); setSelected(null); };
  const openCreate = () => { setEditing(null); setShowForm(true); };
  const focusTaskList = () => document.getElementById('task-list-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Dashboard quick stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed' || t.completed).length;
    const today = tasks.filter((t) => t.status !== 'completed' && isToday(t.dueDate)).length;
    const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d < now;
    }).length;
    return { total, completed, today, urgent, overdue };
  }, [tasks]);

  return (
    <div className="tasks-page select-text min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-none space-y-5">

        {/* Alerts */}
        {error && <p role="alert" className="task-alert">Storage unavailable: {error.message}</p>}
        {actionError && <p role="alert" className="task-alert">{actionError}</p>}

        {/* â”€â”€ Dashboard â”€â”€ */}
        <section id="task-overview-panel" className="workspace-section-panel scroll-mt-6">
          <h2 className="mb-4 text-lg font-semibold">Task overview</h2>
          <div className="space-y-6">
            {/* Summary stat cards */}
            <div className="task-stat-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Total" value={stats.total} sub="All tasks" accent="default" />
              <StatCard label="Completed" value={stats.completed} sub="Finished" accent="blue" />
              <StatCard label="Due Today" value={stats.today} sub="Open items" accent="cyan" />
              <StatCard label="Urgent" value={stats.urgent} sub="High priority" accent="red" />
              <StatCard label="Overdue" value={stats.overdue} sub="Past due date" accent={stats.overdue > 0 ? 'red' : 'default'} />
            </div>

            {/* Charts */}
            <TaskAnalytics tasks={tasks} />

            {/* Overdue alert banner */}
            {stats.overdue > 0 && (() => {
              const now = new Date(); now.setHours(0, 0, 0, 0);
              const overdueList = tasks.filter((t) => {
                if (!t.dueDate || t.status === 'completed') return false;
                const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
                return d < now;
              });
              return (
                <div className="task-overdue-alert rounded border border-red-800/80 bg-red-950/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
                    <span>âš  Overdue Tasks ({overdueList.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {overdueList.slice(0, 5).map((t) => {
                      const daysOverdue = Math.floor((now - new Date(t.dueDate)) / 86400000);
                      return (
                        <div
                          key={t.id}
                          onClick={() => { setSelected(t); focusTaskList(); }}
                          className="flex items-center justify-between text-xs text-red-200 hover:text-white cursor-pointer py-1"
                        >
                          <div className="flex items-center gap-2">
                            {t.priority && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-900/50">
                                {t.priority}
                              </span>
                            )}
                            <span className="font-medium">{t.title}</span>
                            {t.category && <span className="text-red-400/80">({t.category})</span>}
                          </div>
                          <span className="font-mono font-bold text-red-300">
                            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue Â· {t.dueDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Recent + Today grid */}
            <div className="task-activity-grid grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Today's schedule */}
              <div className="rounded border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-semibold text-slate-100">â—· Today's Schedule</h3>
                  <span className="text-xs text-slate-400 font-mono">{stats.today} items</span>
                </div>
                {views["Today's Schedule"].length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">Nothing due today.</p>
                ) : (
                  <div className="space-y-2">
                    {views["Today's Schedule"].slice(0, 6).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { setSelected(t); focusTaskList(); }}
                        className="flex items-center gap-3 rounded border border-slate-800/80 bg-slate-900/60 p-2.5 hover:bg-slate-800/50 cursor-pointer text-xs transition-colors"
                      >
                        <button
                          className={`task-check shrink-0 ${t.status === 'completed' ? 'checked' : ''}`}
                          onClick={(e) => { e.stopPropagation(); run(() => repository.updateTask(t.id, { status: t.status === 'completed' ? 'todo' : 'completed' })); }}
                          aria-label="Toggle completion"
                        >
                          {t.status === 'completed' ? 'âœ“' : ''}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-slate-200 truncate ${t.status === 'completed' ? 'line-through text-slate-500' : ''}`}>{t.title}</p>
                          {t.category && <p className="text-[11px] text-slate-400">{t.category}</p>}
                        </div>
                        {t.priority && (
                          <span className={`priority shrink-0 ${t.priority}`}>{t.priority}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recently added */}
              <div className="rounded border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-semibold text-slate-100">Recent Tasks</h3>
                  <button
                    onClick={focusTaskList}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    View All ({stats.total}) â†’
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">No tasks yet. Create one to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {[...tasks]
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .slice(0, 6)
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={() => { setSelected(t); focusTaskList(); }}
                          className="rounded border border-slate-800/80 bg-slate-900/60 p-3 hover:bg-slate-800/50 cursor-pointer space-y-1 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium text-slate-100 truncate ${t.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                              {t.title}
                            </p>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                              t.status === 'completed'
                                ? 'bg-slate-800 text-slate-300 border-slate-600'
                                : t.status === 'in_progress'
                                ? 'bg-blue-950 text-blue-300 border-blue-800'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {(t.status || 'todo').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-0.5">
                            <span>{t.category || 'Inbox'}</span>
                            {t.dueDate && <span>Due: {t.dueDate}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ Task List â”€â”€ */}
        <section id="task-list-panel" className="workspace-section-panel scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">All tasks</h2>
              <p className="text-sm text-slate-400">Browse, filter, and update your tasks.</p>
            </div>
            <button type="button" className="workspace-primary-button" onClick={openCreate}>+ Add task</button>
          </div>
          <div className="space-y-5">
            <TaskViews
              views={VIEWS.map((name) => ({ name, count: views[name].length }))}
              active={view}
              onChange={setView}
            />
            {selected ? (
              <TaskDetail
                task={tasks.find((t) => t.id === selected.id) || selected}
                onBack={() => setSelected(null)}
                onEdit={startEdit}
                onUpdate={(patch) => run(() => repository.updateTask(selected.id, patch))}
              />
            ) : (
              <>
                <TaskToolbar query={query} onQuery={setQuery} />
                <TaskList
                  tasks={visible}
                  onSelect={setSelected}
                  onEdit={startEdit}
                  onDelete={(id) => run(() => repository.deleteTask(id))}
                  onUpdate={(id, patch) => run(() => repository.updateTask(id, patch))}
                  onCreate={openCreate}
                />
              </>
            )}
          </div>
        </section>

        {/* Create / Edit Modal */}
        <Modal
          open={showForm}
          title={editing ? 'Edit task' : 'Add task'}
          onClose={() => { setShowForm(false); setEditing(null); }}
        >
          <TaskForm
            initial={editing || blank}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            onSave={save}
          />
        </Modal>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = 'default' }) {
  const palette = {
    default: 'border-slate-800 bg-slate-900/60 text-slate-100 label-slate-400 sub-slate-500',
    blue: 'border-blue-900/40 bg-blue-950/20 text-blue-200 label-blue-300 sub-blue-400',
    cyan: 'border-cyan-900/40 bg-cyan-950/20 text-cyan-200 label-cyan-300 sub-cyan-400',
    red: 'border-red-900/40 bg-red-950/20 text-red-200 label-red-300 sub-red-400',
  };
  const cls = {
    default: { border: 'border-slate-800', bg: 'bg-slate-900/60', value: 'text-slate-100', label: 'text-slate-400', sub: 'text-slate-500' },
    blue: { border: 'border-blue-900/40', bg: 'bg-blue-950/20', value: 'text-blue-200', label: 'text-blue-300', sub: 'text-blue-400' },
    cyan: { border: 'border-cyan-900/40', bg: 'bg-cyan-950/20', value: 'text-cyan-200', label: 'text-cyan-300', sub: 'text-cyan-400' },
    red: { border: 'border-red-900/40', bg: 'bg-red-950/20', value: 'text-red-200', label: 'text-red-300', sub: 'text-red-400' },
  }[accent] || {};

  return (
    <div className={`task-stat-card hud-surface rounded border p-3.5 space-y-1 ${cls.border} ${cls.bg}`}>
      <span className={`text-[11px] font-medium uppercase tracking-wider ${cls.label}`}>{label}</span>
      <div className={`text-2xl font-bold ${cls.value}`}>{value}</div>
      <span className={`text-[10px] ${cls.sub}`}>{sub}</span>
    </div>
  );
}
