import React, { useState } from 'react';
import confirmAction from '@/utils/confirmAction';
import { calculateMilestoneMetrics, getDaysDiff } from '../data/projectMetrics.js';
import Modal from '@/components/ui/Modal';

export default function MilestonesManager({
  project,
  milestones = [],
  tasks = [],
  repository,
  taskRepository,
  run,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const projectMilestones = milestones.filter((m) => m.projectId === project.id);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDueDate('');
    setShowAddForm(false);
    setEditingMilestone(null);
  };

  const handleStartEdit = (m) => {
    setEditingMilestone(m);
    setName(m.name);
    setDescription(m.description || '');
    setDueDate(m.dueDate || '');
    setShowAddForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMilestone) {
      const ok = run(() =>
        repository.updateMilestone(editingMilestone.id, {
          name,
          description,
          dueDate,
        })
      );
      if (ok) resetForm();
    } else {
      const ok = run(() =>
        repository.createMilestone(project.id, {
          name,
          description,
          dueDate,
        })
      );
      if (ok) resetForm();
    }
  };

  const handleToggle = (milestoneId) => {
    run(() => repository.toggleMilestoneCompletion(milestoneId));
  };

  const handleDelete = async (milestoneId) => {
    if (await confirmAction('Delete this milestone? Associated tasks will remain in the project but unassigned from this milestone.')) {
      run(() => repository.deleteMilestone(milestoneId, taskRepository));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Milestones ({projectMilestones.length})
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
          >
            + Add Milestone
          </button>
        )}
      </div>

      <Modal open={showAddForm} title={editingMilestone ? 'Edit milestone' : 'Add milestone'} onClose={resetForm}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">Milestone Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core Engine Complete"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What must be achieved in this stage..."
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              {editingMilestone ? 'Save Changes' : 'Create Milestone'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {projectMilestones.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No milestones defined for this project yet. Divide your project into key stages.
        </p>
      ) : (
        <div className="space-y-3">
          {projectMilestones.map((m) => {
            const metrics = calculateMilestoneMetrics(m, tasks);
            const daysDiff = getDaysDiff(m.dueDate);

            return (
              <div
                key={m.id}
                className={`rounded border p-3.5 transition-colors ${
                  m.completed
                    ? 'border-blue-800/60 bg-blue-950/20'
                    : metrics.isOverdue
                    ? 'border-red-800/60 bg-red-950/20'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={m.completed}
                      onChange={() => handleToggle(m.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600"
                      title={m.completed ? 'Mark incomplete' : 'Mark completed'}
                    />
                    <div>
                      <h4
                        className={`text-sm font-medium ${
                          m.completed ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {m.name}
                      </h4>
                      {m.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(m)}
                      className="text-xs text-slate-300 hover:text-white underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    {m.dueDate ? (
                      <span className={metrics.isOverdue ? 'text-red-400 font-semibold' : ''}>
                        Due: {m.dueDate}
                        {metrics.isOverdue && ` (${Math.abs(daysDiff)}d overdue)`}
                        {!metrics.isOverdue && daysDiff !== null && daysDiff <= 7 && !m.completed && (
                          <span className="text-red-400 ml-1">({daysDiff}d left)</span>
                        )}
                      </span>
                    ) : (
                      <span>No due date</span>
                    )}
                    <span>
                      Tasks: {metrics.completedTasks}/{metrics.totalTasks}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${m.completed ? 'bg-blue-300' : 'bg-blue-500'}`}
                        style={{ width: `${metrics.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px]">{metrics.progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

