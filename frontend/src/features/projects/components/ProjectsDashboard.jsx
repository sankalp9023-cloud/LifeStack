import React from 'react';
import { calculateDashboardMetrics } from '../data/projectMetrics.js';

export default function ProjectsDashboard({
  projects = [],
  milestones = [],
  tasks = [],
  onSelectProject,
  onViewAllProjects,
}) {
  const metrics = calculateDashboardMetrics(projects, milestones, tasks);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="hud-surface rounded border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</span>
          <div className="text-2xl font-bold text-slate-100">{metrics.totalProjects}</div>
          <span className="text-[10px] text-slate-500">Non-archived</span>
        </div>

        <div className="hud-surface rounded border border-blue-900/40 bg-blue-950/20 p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">Active</span>
          <div className="text-2xl font-bold text-blue-200">{metrics.activeProjects}</div>
          <span className="text-[10px] text-blue-400">In progress</span>
        </div>

        <div className="hud-surface rounded border border-blue-900/40 bg-blue-950/20 p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-bold text-blue-200">{metrics.completedProjects}</div>
          <span className="text-[10px] text-blue-400">Finished</span>
        </div>

        <div className="hud-surface rounded border border-blue-900/40 bg-blue-950/20 p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">On Hold</span>
          <div className="text-2xl font-bold text-blue-200">{metrics.onHoldProjects}</div>
          <span className="text-[10px] text-blue-400">Paused</span>
        </div>

        <div className="hud-surface rounded border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Not Started</span>
          <div className="text-2xl font-bold text-slate-200">{metrics.notStartedProjects}</div>
          <span className="text-[10px] text-slate-500">Planned</span>
        </div>

        <div className="hud-surface rounded border border-cyan-900/40 bg-cyan-950/20 p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-cyan-300 uppercase tracking-wider">Avg Progress</span>
          <div className="text-2xl font-bold text-cyan-200">{metrics.averageActiveProgress}%</div>
          <span className="text-[10px] text-cyan-400">Active initiatives</span>
        </div>
      </div>

      {/* Overdue Items Alert (if any) */}
      {metrics.overdueItems.length > 0 && (
        <div className="rounded border border-red-800/80 bg-red-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
            <span>⚠ Overdue Items ({metrics.overdueItems.length})</span>
          </div>
          <div className="space-y-1.5">
            {metrics.overdueItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => onSelectProject(item.projectId)}
                className="flex items-center justify-between text-xs text-red-200 hover:text-white cursor-pointer py-1 border-b border-red-900/40 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-900/50">
                    {item.type}
                  </span>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-red-400/80">({item.projectName})</span>
                </div>
                <span className="font-mono font-bold text-red-300">
                  {Math.abs(item.daysDiff)} days overdue ({item.date})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Recently Updated & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recently Updated Projects */}
        <div className="rounded border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-100">Recently Updated Projects</h3>
            <button
              type="button"
              onClick={onViewAllProjects}
              className="text-xs text-cyan-400 hover:underline"
            >
              View All ({metrics.totalProjects}) →
            </button>
          </div>

          {metrics.recentlyUpdated.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3 text-center">
              No projects created yet. Start by creating a project.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.recentlyUpdated.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="rounded border border-slate-800/80 bg-slate-900/60 p-3 hover:bg-slate-800/50 cursor-pointer space-y-1.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium text-slate-100 hover:text-cyan-200">
                        {p.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">{p.category}</span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        p.status === 'completed'
                          ? 'bg-slate-800 text-slate-300 border-slate-600'
                          : p.status === 'on_hold'
                          ? 'bg-slate-900 text-slate-300 border-slate-700'
                          : 'bg-blue-950 text-blue-300 border-blue-800'
                      }`}
                    >
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                    <span>Deadline: {p.deadline || 'None'}</span>
                    <span>Updated: {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines (30 Days) */}
        <div className="rounded border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-100">Upcoming Deadlines (Next 30 Days)</h3>
            <span className="text-xs text-slate-400 font-mono">
              {metrics.upcomingDeadlines.length} items
            </span>
          </div>

          {metrics.upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3 text-center">
              No upcoming deadlines in the next 30 days.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.upcomingDeadlines.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => onSelectProject(item.projectId)}
                  className="rounded border border-slate-800/80 bg-slate-900/60 p-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/50 cursor-pointer text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.type}
                      </span>
                      <span className="font-medium text-slate-200">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{item.projectName}</p>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-slate-300">{item.date}</div>
                    <span
                      className={`text-[10px] font-semibold ${
                        item.daysDiff <= 3
                          ? 'text-red-400'
                          : item.daysDiff <= 7
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.daysDiff === 0 ? 'Today' : `${item.daysDiff} days left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

