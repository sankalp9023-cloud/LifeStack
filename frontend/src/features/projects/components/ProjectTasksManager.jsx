import React, { useState } from 'react';
import { getDaysDiff } from '../data/projectMetrics.js';
import Modal from '@/components/ui/Modal';

export default function ProjectTasksManager({
  project,
  milestones = [],
  tasks = [],
  taskRepository,
  repository,
  run,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, completed
  const [milestoneFilter, setMilestoneFilter] = useState('all');

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [milestoneId, setMilestoneId] = useState('');

  // Assign existing task state
  const [selectedUnassignedId, setSelectedUnassignedId] = useState('');

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectMilestones = milestones.filter((m) => m.projectId === project.id);
  const unassignedTasks = tasks.filter((t) => !t.projectId);

  // Filtered view
  const filteredTasks = projectTasks.filter((t) => {
    if (statusFilter === 'pending' && t.completed) return false;
    if (statusFilter === 'completed' && !t.completed) return false;
    if (milestoneFilter !== 'all') {
      if (milestoneFilter === 'none' && t.milestoneId) return false;
      if (milestoneFilter !== 'none' && t.milestoneId !== milestoneFilter) return false;
    }
    return true;
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setMilestoneId('');
    setShowAddForm(false);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    const ok = run(() => {
      const created = taskRepository.createTask({
        title,
        description,
        dueDate,
        projectId: project.id,
        milestoneId,
      });
      repository.logActivity(project.id, 'task_created', `Task "${created.title}" created.`, { taskId: created.id });
    });
    if (ok) resetForm();
  };

  const handleAssignTask = (e) => {
    e.preventDefault();
    if (!selectedUnassignedId) return;
    const ok = run(() => {
      const updated = taskRepository.assignToProject(selectedUnassignedId, project.id, '');
      repository.logActivity(project.id, 'task_assigned', `Existing task "${updated.title}" assigned to project.`, { taskId: updated.id });
    });
    if (ok) {
      setSelectedUnassignedId('');
      setShowAssignModal(false);
    }
  };

  const handleToggle = (task) => {
    run(() => {
      const updated = taskRepository.toggleTaskCompletion(task.id);
      repository.logActivity(
        project.id,
        updated.completed ? 'task_completed' : 'task_reopened',
        `Task "${updated.title}" marked as ${updated.completed ? 'completed' : 'pending'}.`,
        { taskId: updated.id }
      );
    });
  };

  const handleUnassign = (task) => {
    if (window.confirm(`Unassign "${task.title}" from this project? The task will remain in the global task pool.`)) {
      run(() => {
        taskRepository.unassignFromProject(task.id);
        repository.logActivity(project.id, 'task_unassigned', `Task "${task.title}" unassigned from project.`);
      });
    }
  };

  const handleDeleteTask = (task) => {
    if (window.confirm(`Permanently delete task "${task.title}"?`)) {
      run(() => {
        taskRepository.deleteTask(task.id);
        repository.logActivity(project.id, 'task_deleted', `Task "${task.title}" deleted.`);
      });
    }
  };

  const handleChangeTaskMilestone = (taskId, newMilestoneId) => {
    run(() => {
      taskRepository.updateTask(taskId, { milestoneId: newMilestoneId });
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Tasks ({projectTasks.filter((t) => t.completed).length}/{projectTasks.length} completed)
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {unassignedTasks.length > 0 && !showAssignModal && (
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Assign Existing Task ({unassignedTasks.length})
            </button>
          )}

          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* Assign Existing Task Modal / Inline form */}
      <Modal open={showAssignModal} title="Assign existing task" onClose={() => setShowAssignModal(false)}>
        <form onSubmit={handleAssignTask} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUnassignedId}
              onChange={(e) => setSelectedUnassignedId(e.target.value)}
              required
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-100"
            >
              <option value="">-- Select an unassigned task --</option>
              {unassignedTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.dueDate ? `[Due: ${t.dueDate}]` : ''}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
            >
              Assign
            </button>
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* New Task Form */}
      <Modal open={showAddForm} title="Create task for this project" onClose={resetForm}>
        <form onSubmit={handleCreateTask} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication endpoints"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details and acceptance criteria..."
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Milestone</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
              >
                <option value="">-- No Milestone --</option>
                {projectMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Add Task
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

      {/* Filter Row */}
      {projectTasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-2.5 rounded border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {projectMilestones.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-400">Milestone:</span>
              <select
                value={milestoneFilter}
                onChange={(e) => setMilestoneFilter(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
              >
                <option value="all">All Milestones</option>
                <option value="none">Unassigned to Milestone</option>
                {projectMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto text-slate-400 font-mono">
            Showing {filteredTasks.length} of {projectTasks.length}
          </div>
        </div>
      )}

      {/* Tasks Table / List */}
      {projectTasks.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No tasks associated with this project. Create new tasks or assign existing ones from the global Task Engine.
        </p>
      ) : filteredTasks.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No tasks match the active filters.
        </p>
      ) : (
        <div className="divide-y divide-slate-800 border border-slate-800 rounded bg-slate-900/40">
          {filteredTasks.map((t) => {
            const daysDiff = getDaysDiff(t.dueDate);
            const isOverdue = !t.completed && daysDiff !== null && daysDiff < 0;
            const milestone = projectMilestones.find((m) => m.id === t.milestoneId);

            return (
              <div key={t.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-800/40">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => handleToggle(t)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600"
                    title={t.completed ? 'Mark incomplete' : 'Mark completed'}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          t.completed ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {t.title}
                      </span>

                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      {t.dueDate && (
                        <span className={isOverdue ? 'text-red-400 font-semibold' : ''}>
                          Due: {t.dueDate}
                          {isOverdue && ` (${Math.abs(daysDiff)}d overdue)`}
                        </span>
                      )}

                      {/* Milestone Assignment */}
                      <div className="flex items-center gap-1">
                        <span>Milestone:</span>
                        <select
                          value={t.milestoneId || ''}
                          onChange={(e) => handleChangeTaskMilestone(t.id, e.target.value)}
                          className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
                        >
                          <option value="">None</option>
                          {projectMilestones.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleUnassign(t)}
                    className="text-slate-400 hover:text-slate-200 underline"
                    title="Remove from project (keeps task in global pool)"
                  >
                    Unassign
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t)}
                    className="text-red-400 hover:text-red-300 underline"
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

