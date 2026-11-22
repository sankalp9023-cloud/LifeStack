import React from 'react';
import { Link } from 'react-router-dom';
import CornerPanel from '@/components/panels/CornerPanel';
import useProjectData from '@/features/projects/hooks/useProjectData';
import { calculateDashboardMetrics } from '@/features/projects/data/projectMetrics';

export default function ProjectsOverviewPanel({ className = '' }) {
  const { projects, milestones, tasks } = useProjectData();
  const metrics = calculateDashboardMetrics(projects, milestones, tasks);
  return (
    <CornerPanel
      title="Venture Flux"
      subtitle="Projects"
      showAction={true}
      className={`panel-top-right w-full min-w-0 h-[230px] ${className}`}
      bodyClassName="items-center justify-center"
    >
      <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-navy-300/20 bg-navy-800/20 shadow-[inset_0_1px_18px_rgba(154,172,201,0.08)]">
        <div className="absolute inset-3 rounded-full border border-navy-200/10" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(154,172,201,0.14),transparent_62%)]" />
        <Link to="/projects" className="relative text-center">
          <span className="block text-3xl font-semibold tracking-tight text-slate-100">{metrics.totalProjects}</span>
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Projects</span>
          <span className="mx-auto mt-2 block h-0.5 w-6 rounded-full bg-red-400/70" />
          <span className="mt-2 block text-[10px] text-slate-400">{metrics.activeProjects} active · {metrics.completedProjects} complete</span>
        </Link>
      </div>
    </CornerPanel>
  );
}
