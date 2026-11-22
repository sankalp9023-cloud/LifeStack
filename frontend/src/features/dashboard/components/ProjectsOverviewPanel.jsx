import React from 'react';
import { Link } from 'react-router-dom';
import CornerPanel from '@/components/panels/CornerPanel';
import useProjectData from '@/features/projects/hooks/useProjectData';
import { calculateDashboardMetrics } from '@/features/projects/data/projectMetrics';

export default function ProjectsOverviewPanel({ className = '' }) {
  const { projects, milestones, tasks } = useProjectData();
  const metrics = calculateDashboardMetrics(projects, milestones, tasks);
  const statuses = [
    { label: 'Active', count: metrics.activeProjects, color: '#91a9ce' },
    { label: 'Not started', count: metrics.notStartedProjects, color: '#73839d' },
    { label: 'On hold', count: metrics.onHoldProjects, color: '#d8a85f' },
    { label: 'Completed', count: metrics.completedProjects, color: '#65c998' },
  ];
  const total = statuses.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;
  const pieStops = statuses.map((item) => {
    const nextAngle = total ? currentAngle + (item.count / total) * 360 : 0;
    const stop = `${item.color} ${currentAngle}deg ${nextAngle}deg`;
    currentAngle = nextAngle;
    return stop;
  });
  const pieStyle = {
    background: total
      ? `conic-gradient(${pieStops.join(', ')})`
      : 'conic-gradient(rgba(148, 163, 184, .22) 0deg 360deg)',
  };

  return (
    <CornerPanel
      title="Project status"
      subtitle="Projects"
      showAction={true}
      className={`panel-top-right w-full min-w-0 h-[230px] ${className}`}
      bodyClassName="justify-center"
    >
      <div className="flex w-full items-center justify-center gap-5">
        <Link
          to="/projects"
          className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full p-2 transition-transform duration-200 hover:scale-[1.03]"
          style={pieStyle}
          aria-label={`Project status pie chart: ${statuses.map((item) => `${item.label} ${item.count}`).join(', ')}`}
        >
          <span className="flex h-full w-full flex-col items-center justify-center rounded-full border border-navy-300/15 bg-slate-950/90 text-center">
            <span className="text-2xl font-semibold tracking-tight text-slate-100">{metrics.totalProjects}</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">Projects</span>
          </span>
        </Link>
        <ul className="min-w-0 space-y-2">
          {statuses.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-[10px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-slate-300">{item.label}</span>
              <span className="tabular-nums text-slate-400">{item.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </CornerPanel>
  );
}
