import React, { useState } from 'react';
import { calculateProjectMetrics, getDaysDiff } from '../data/projectMetrics.js';
import { PROJECT_STATUSES } from '../data/projectRepository.js';
import MilestonesManager from './MilestonesManager';
import ProjectTasksManager from './ProjectTasksManager';
import NotesManager from './NotesManager';
import ResourcesManager from './ResourcesManager';
import TimelineManager from './TimelineManager';
import ActivityLog from './ActivityLog';
import ProjectForm from './ProjectForm';

const TABS = [
  ['overview', 'Overview'],
  ['milestones', 'Milestones'],
  ['tasks', 'Tasks'],
  ['notes', 'Notes'],
  ['resources', 'Resources'],
  ['timeline', 'Timeline'],
  ['activity', 'Activity Log'],
];

export default function ProjectDetail({
  project,
  milestones = [],
  tasks = [],
  notes = [],
  resources = [],
  importantDates = [],
  activities = [],
  repository,
  taskRepository,
  run,
  onBack,
  onSelectProject,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  const metrics = calculateProjectMetrics(project, milestones, tasks);
  const daysDiff = getDaysDiff(project.deadline);

  const handleStatusChange = (newStatus) => {
    run(() => repository.updateProject(project.id, { status: newStatus }));
  };

  const handleToggleArchive = () => {
    if (project.status === 'archived') {
      run(() => repository.restoreProject(project.id, 'active'));
    } else {
      if (window.confirm(`Archive project "${project.name}"?`)) {
        run(() => repository.archiveProject(project.id));
      }
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${project.name}"? All milestones, notes, and resources will be removed. Associated tasks will remain in the global Task Engine but will be unlinked.`
      )
    ) {
      const ok = run(() => repository.deleteProject(project.id, taskRepository));
      if (ok && onBack) onBack();
    }
  };

  const handleUpdateSubmit = (patch) => {
    const ok = run(() => repository.updateProject(project.id, patch));
    if (ok) setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          ← Back to Project Overview
        </button>
        <ProjectForm
          project={project}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectMilestones = milestones.filter((m) => m.projectId === project.id);
  const projectNotes = notes.filter((n) => n.projectId === project.id);
  const projectResources = resources.filter((r) => r.projectId === project.id);

  return (
    <div className="space-y-5">
      {/* Back button & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium"
        >
          ← All Projects
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick status selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Edit Details
          </button>

          <button
            type="button"
            onClick={handleToggleArchive}
            className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            {project.status === 'archived' ? 'Restore' : 'Archive'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs text-red-300 hover:bg-red-900/60"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Project Header Banner */}
      <div className="rounded border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {project.category}
              </span>
              <span
                className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
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

            <h2 className="text-xl font-bold text-slate-100">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-slate-300 max-w-3xl whitespace-pre-wrap leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Dates column */}
          <div className="text-xs text-slate-400 space-y-1 text-right">
            {project.startDate && <div>Start: <span className="font-mono text-slate-200">{project.startDate}</span></div>}
            {project.deadline ? (
              <div className={metrics.isOverdue ? 'text-red-400 font-semibold' : ''}>
                Deadline: <span className="font-mono">{project.deadline}</span>
                {metrics.isOverdue && ` (${metrics.daysOverdue}d overdue)`}
                {!metrics.isOverdue && daysDiff !== null && daysDiff <= 7 && project.status !== 'completed' && (
                  <span className="text-red-400 ml-1">({daysDiff}d left)</span>
                )}
              </div>
            ) : (
              <div>No deadline set</div>
            )}
            <div className="text-[11px] text-slate-500 font-mono">
              Created: {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Progress Bar & Summary Stats */}
        <div className="border-t border-slate-800 pt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium">Project Completion:</span>
            <span className="font-mono font-bold text-cyan-300">{metrics.overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                project.status === 'completed' ? 'bg-blue-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${metrics.overallProgress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <span>
              Tasks: <strong className="text-slate-200">{metrics.completedTasks}</strong>/{metrics.totalTasks} completed
            </span>
            <span>
              Milestones: <strong className="text-slate-200">{metrics.completedMilestones}</strong>/{metrics.totalMilestones} completed
            </span>
            <span>
              Notes: <strong className="text-slate-200">{projectNotes.length}</strong>
            </span>
            <span>
              Resources: <strong className="text-slate-200">{projectResources.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Internal Structure Navigation Tabs */}
      <nav className="flex flex-wrap gap-1.5 border-b border-slate-700 pb-2" aria-label="Project Structure Tabs">
        {TABS.map(([id, label]) => {
          let badge = null;
          if (id === 'milestones') badge = projectMilestones.length;
          if (id === 'tasks') badge = projectTasks.length;
          if (id === 'notes') badge = projectNotes.length;
          if (id === 'resources') badge = projectResources.length;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {label} {badge !== null && `(${badge})`}
            </button>
          );
        })}
      </nav>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left overview column: Objectives and Next Milestones */}
            <div className="space-y-4">
              <div className="rounded border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-200">Stage Progress</h4>
                {projectMilestones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No milestones defined yet.</p>
                ) : (
                  <div className="space-y-2">
                    {projectMilestones.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className={m.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                          {m.name}
                        </span>
                        <span className={m.completed ? 'text-blue-400' : 'text-slate-400'}>
                          {m.completed ? 'Done' : m.dueDate || 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-200">Active Tasks Snapshot</h4>
                {projectTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No tasks created yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {projectTasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="text-xs">
                        <span className={t.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                          {t.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right overview column: Recent Activity & Quick Resources */}
            <div className="space-y-4">
              <div className="rounded border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-200">Key Resources</h4>
                {projectResources.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No resources attached.</p>
                ) : (
                  <div className="space-y-1.5">
                    {projectResources.slice(0, 4).map((r) => (
                      <div key={r.id} className="text-xs flex items-center justify-between">
                        <span className="text-slate-200 font-medium">{r.name}</span>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline font-mono text-[11px]"
                          >
                            Open ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-200">Recent Activity</h4>
                {activities.filter((a) => a.projectId === project.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No activity logged.</p>
                ) : (
                  <div className="space-y-2">
                    {activities
                      .filter((a) => a.projectId === project.id)
                      .slice(0, 4)
                      .map((act) => (
                        <div key={act.id} className="text-xs space-y-0.5 border-b border-slate-800/60 pb-1.5">
                          <p className="text-slate-200">{act.description}</p>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <MilestonesManager
            project={project}
            milestones={milestones}
            tasks={tasks}
            repository={repository}
            taskRepository={taskRepository}
            run={run}
          />
        )}

        {activeTab === 'tasks' && (
          <ProjectTasksManager
            project={project}
            milestones={milestones}
            tasks={tasks}
            taskRepository={taskRepository}
            repository={repository}
            run={run}
          />
        )}

        {activeTab === 'notes' && (
          <NotesManager
            project={project}
            notes={notes}
            repository={repository}
            run={run}
          />
        )}

        {activeTab === 'resources' && (
          <ResourcesManager
            project={project}
            resources={resources}
            repository={repository}
            run={run}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineManager
            project={project}
            milestones={milestones}
            importantDates={importantDates}
            repository={repository}
            run={run}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityLog
            project={project}
            activities={activities}
          />
        )}
      </div>
    </div>
  );
}

