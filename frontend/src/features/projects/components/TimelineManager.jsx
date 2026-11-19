import React, { useState } from 'react';
import { getDaysDiff } from '../data/projectMetrics.js';
import Modal from '@/components/ui/Modal';

export default function TimelineManager({
  project,
  milestones = [],
  importantDates = [],
  repository,
  run,
}) {
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const projectMilestones = milestones.filter((m) => m.projectId === project.id);
  const projectImportantDates = importantDates.filter((d) => d.projectId === project.id);

  // Compile timeline events
  const timelineEvents = [];

  if (project.startDate) {
    timelineEvents.push({
      id: 'proj-start',
      label: 'Project Kickoff / Start Date',
      date: project.startDate,
      type: 'start',
      description: 'Scheduled start date of project.',
    });
  }

  projectMilestones.forEach((m) => {
    if (m.dueDate) {
      timelineEvents.push({
        id: `ms-${m.id}`,
        label: `Milestone: ${m.name}`,
        date: m.dueDate,
        type: 'milestone',
        completed: m.completed,
        description: m.description,
      });
    }
  });

  projectImportantDates.forEach((d) => {
    timelineEvents.push({
      id: `custom-${d.id}`,
      rawId: d.id,
      label: d.label,
      date: d.date,
      type: 'custom',
      description: d.description,
      isCustom: true,
    });
  });

  if (project.deadline) {
    timelineEvents.push({
      id: 'proj-deadline',
      label: 'Final Project Deadline',
      date: project.deadline,
      type: 'deadline',
      completed: project.status === 'completed',
      description: 'Final completion target for this project.',
    });
  }

  // Sort events chronologically
  timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleAddDate = (e) => {
    e.preventDefault();
    const ok = run(() =>
      repository.createImportantDate(project.id, {
        label,
        date,
        description,
      })
    );
    if (ok) {
      setLabel('');
      setDate('');
      setDescription('');
      setShowAddDateForm(false);
    }
  };

  const handleDeleteCustomDate = (dateId) => {
    if (window.confirm('Remove this important date?')) {
      run(() => repository.deleteImportantDate(dateId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Project Timeline & Deadlines</h3>
          <p className="text-xs text-slate-400">
            Chronological sequence of start dates, milestone milestones, checkpoints, and final deadlines.
          </p>
        </div>
        {!showAddDateForm && (
          <button
            type="button"
            onClick={() => setShowAddDateForm(true)}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
          >
            + Add Important Date
          </button>
        )}
      </div>

      <Modal open={showAddDateForm} title="Add important date" onClose={() => setShowAddDateForm(false)}>
        <form onSubmit={handleAddDate} className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">Add Checkpoint / Important Date</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">Label / Event Name *</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Beta Demo to Stakeholders"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or notes about this date..."
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Add Date
            </button>
            <button
              type="button"
              onClick={() => setShowAddDateForm(false)}
              className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {timelineEvents.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No dates set for this project. Set a project start date, deadline, milestone due dates, or custom checkpoints.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {timelineEvents.map((event) => {
            const daysDiff = getDaysDiff(event.date);
            const isPast = daysDiff !== null && daysDiff < 0;
            const isToday = daysDiff === 0;
            const isOverdue = isPast && !event.completed && event.type !== 'start';

            return (
              <div key={event.id} className="relative group">
                {/* Timeline node */}
                <span
                  className={`absolute -left-[19px] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                    event.completed
                      ? 'border-blue-500 bg-blue-950'
                      : isOverdue
                      ? 'border-red-500 bg-red-950'
                      : event.type === 'deadline'
                      ? 'border-red-400 bg-red-950'
                      : 'border-blue-400 bg-blue-950'
                  }`}
                />

                <div className="rounded border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900/70 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          event.type === 'start'
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : event.type === 'deadline'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : event.type === 'milestone'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-blue-950 text-blue-300 border-blue-800'
                        }`}
                      >
                        {event.type}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-100">{event.label}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-slate-300">{event.date}</span>

                      {/* Urgency Badge */}
                      {event.completed ? (
                        <span className="text-blue-400 font-medium">Completed</span>
                      ) : isOverdue ? (
                        <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800">
                          {Math.abs(daysDiff)}d overdue
                        </span>
                      ) : isToday ? (
                        <span className="text-red-300 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800">
                          Due today
                        </span>
                      ) : daysDiff !== null && daysDiff <= 7 ? (
                        <span className="text-red-400 font-medium">
                          {daysDiff} days remaining
                        </span>
                      ) : daysDiff !== null ? (
                        <span className="text-slate-400">
                          {daysDiff} days remaining
                        </span>
                      ) : null}

                      {event.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomDate(event.rawId)}
                          className="text-red-400 hover:text-red-300 text-xs underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="mt-1 text-xs text-slate-400">{event.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

