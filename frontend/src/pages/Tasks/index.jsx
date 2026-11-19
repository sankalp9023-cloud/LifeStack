import React, { useMemo, useState } from 'react';
import useTaskData from '@/hooks/useTaskData';
import TaskViews from '@/features/tasks/components/TaskViews';
import TaskToolbar from '@/features/tasks/components/TaskToolbar';
import TaskList from '@/features/tasks/components/TaskList';
import TaskForm from '@/features/tasks/components/TaskForm';
import TaskDetail from '@/features/tasks/components/TaskDetail';
import Modal from '@/components/ui/Modal';
import '@/features/tasks/tasks.css';

const VIEWS = ['All Tasks', "Today's Schedule", 'Completed'];
const blank = { title: '', description: '', dueDate: '', status: 'todo', category: '', tags: [], subtasks: [], relatedModule: '' };
const day = (date) => date && new Date(date).toDateString() === new Date().toDateString();

export default function TasksPage() {
  const { tasks, repository, error } = useTaskData();
  const [view, setView] = useState(VIEWS[0]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState('');
  const run = (fn) => { try { fn(); setActionError(''); return true; } catch (e) { setActionError(e.message || 'Could not save task.'); return false; } };
  const views = useMemo(() => ({
    'All Tasks': tasks,
    "Today's Schedule": tasks.filter((t) => t.status !== 'completed' && day(t.dueDate)),
    Completed: tasks.filter((t) => t.status === 'completed' || t.completed),
  }), [tasks]);
  const visible = views[view].filter((t) => !query || `${t.title} ${t.description} ${(t.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const save = (form) => run(() => { if (editing) repository.updateTask(editing.id, form); else repository.createTask(form); setShowForm(false); setEditing(null); });
  const startEdit = (task) => { setEditing(task); setShowForm(true); setSelected(null); };
  return <div className="tasks-page select-text flex-1 overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-400">LifeStack / Workspace</p><h1 className="mt-2 text-3xl font-semibold text-white">Tasks</h1><p className="mt-1 text-sm text-slate-400">One clear place for everything you need to get done.</p></div><button className="task-primary" onClick={() => { setEditing(null); setShowForm(true); }}>＋ New task</button></header>
    {error && <p role="alert" className="task-alert">Storage unavailable: {error.message}</p>}{actionError && <p role="alert" className="task-alert">{actionError}</p>}
    <TaskViews views={VIEWS.map((name) => ({ name, count: views[name].length }))} active={view} onChange={setView} />
    {selected ? <TaskDetail task={tasks.find((t) => t.id === selected.id) || selected} onBack={() => setSelected(null)} onEdit={startEdit} onUpdate={(patch) => run(() => repository.updateTask(selected.id, patch))} /> : <><TaskToolbar query={query} onQuery={setQuery} /><TaskList tasks={visible} onSelect={setSelected} onEdit={startEdit} onDelete={(id) => run(() => repository.deleteTask(id))} onUpdate={(id, patch) => run(() => repository.updateTask(id, patch))} onCreate={() => { setEditing(null); setShowForm(true); }} /></>}
    <Modal open={showForm} title={editing ? 'Edit task' : 'Add task'} onClose={() => { setShowForm(false); setEditing(null); }}>
      <TaskForm initial={editing || blank} onCancel={() => { setShowForm(false); setEditing(null); }} onSave={save} />
    </Modal>
  </div></div>;
}


