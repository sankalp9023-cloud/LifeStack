import React, { useState } from 'react';
import {
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
} from '../data/projectRepository.js';

export default function ProjectForm({ project, onSubmit, onCancel }) {
  const isEditing = Boolean(project);

  const [name, setName] = useState(project ? project.name : '');
  const [description, setDescription] = useState(project ? project.description || '' : '');
  const [category, setCategory] = useState(project ? project.category || 'Software Development' : 'Software Development');
  const [status, setStatus] = useState(project ? project.status || 'active' : 'active');
  const [startDate, setStartDate] = useState(project ? project.startDate || '' : '');
  const [deadline, setDeadline] = useState(project ? project.deadline || '' : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      category,
      status,
      startDate,
      deadline,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded border border-slate-700 bg-slate-900/70 p-5 space-y-4">
      <div className="pb-2">
        <h3 className="text-base font-semibold text-slate-100">
          {isEditing ? `Edit Project: ${project.name}` : 'Create New Project'}
        </h3>
        <p className="text-xs text-slate-400">
          {isEditing ? 'Update project parameters, status, and deadlines.' : 'Set up a high-level initiative with stages and deliverables.'}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-300">Project Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LifeStack Frontend 2.0"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the objective, scope, and expected outcome of this project..."
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
            >
              {PROJECT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Target Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3">
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          {isEditing ? 'Save Changes' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-600 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

