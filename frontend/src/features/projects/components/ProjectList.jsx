import React, { useState } from 'react';
import { calculateProjectMetrics, getDaysDiff } from '../data/projectMetrics.js';
import {
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
} from '../data/projectRepository.js';

export default function ProjectList({
  projects = [],
  milestones = [],
  tasks = [],
  onSelectProject,
  onNewProject,
  repository,
  taskRepository,
  run,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProjects = projects.filter((p) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchCat = p.category && p.category.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'archived') {
        if (p.status !== 'archived') return false;
      } else {
        if (p.status !== statusFilter) return false;
      }
    } else {
      // By default "all" shows non-archived projects
      if (p.status === 'archived') return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && p.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  const handleToggleArchive = (project, e) => {
    e.stopPropagation();
    if (project.status === 'archived') {
      run(() => repository.restoreProject(project.id, 'active'));
    } else {
      if (window.confirm(`Archive project "${project.name}"?`)) {
        run(() => repository.archiveProject(project.id));
      }
    }
  };

  const handleDelete = (project, e) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${project.name}"? This removes all milestones, notes, resources and unlinks associated tasks.`
      )
    ) {
      run(() => repository.deleteProject(project.id, taskRepository));
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-3 rounded border border-slate-800">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, description, or category..."
            className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="all">Active & Non-Archived</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All Categories</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onNewProject}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 whitespace-nowrap"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Projects List Table / Cards */}
      {filteredProjects.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-900/30 p-8 text-center space-y-2">
          <p className="text-sm text-slate-300 font-medium">No projects found.</p>
          <p className="text-xs text-slate-500">
            {search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search criteria or filter selections.'
              : 'Create your first project to start tracking initiatives, milestones, and deliverables.'}
          </p>
          <button
            type="button"
            onClick={onNewProject}
            className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            + Create New Project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const metrics = calculateProjectMetrics(project, milestones, tasks);
            const daysDiff = getDaysDiff(project.deadline);

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="rounded border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 hover:bg-slate-900/70 transition-all cursor-pointer space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {project.category}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                          project.status === 'completed'
                            ? 'bg-slate-800 text-slate-300 border-slate-600'
                            : project.status === 'archived'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : project.status === 'on_hold'
                            ? 'bg-slate-900 text-slate-300 border-slate-700'
                            : project.status === 'not_started'
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                        }`}
                      >
                        {project.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-100 hover:text-cyan-200 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Dates */}
                  <div className="flex flex-col items-end gap-1.5 text-xs text-slate-400">
                    {project.deadline ? (
                      <div className={metrics.isOverdue ? 'text-red-400 font-semibold' : ''}>
                        Deadline: <span className="font-mono">{project.deadline}</span>
                        {metrics.isOverdue && ` (${metrics.daysOverdue}d overdue)`}
                        {!metrics.isOverdue && daysDiff !== null && daysDiff <= 7 && project.status !== 'completed' && (
                          <span className="text-red-400 ml-1">({daysDiff}d left)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">No deadline</span>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleArchive(project, e)}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        {project.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(project, e)}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Progress: <strong className="text-slate-200">{metrics.completedTasks}</strong>/{metrics.totalTasks} tasks, <strong className="text-slate-200">{metrics.completedMilestones}</strong>/{metrics.totalMilestones} milestones
                    </span>
                    <span className="font-mono font-bold text-cyan-300">{metrics.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${
                        project.status === 'completed' ? 'bg-blue-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${metrics.overallProgress}%` }}
                    />
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

