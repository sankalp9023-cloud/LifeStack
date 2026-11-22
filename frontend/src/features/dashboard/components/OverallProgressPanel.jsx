import React from 'react';
import { Link } from 'react-router-dom';
import CornerPanel from '@/components/panels/CornerPanel';
import useStudyData from '@/features/study/hooks/useStudyData';
import useTaskData from '@/hooks/useTaskData';
import useProjectData from '@/features/projects/hooks/useProjectData';
import { getStudyDashboard } from '@/features/study/data/studyMetrics';
import { calculateProjectMetrics } from '@/features/projects/data/projectMetrics';

export default function OverallProgressPanel({ className = '' }) {
  const { data: studyData } = useStudyData();
  const { tasks } = useTaskData();
  const { projects, milestones } = useProjectData();
  const study = getStudyDashboard(studyData);
  const activeProjects = projects.filter((project) => project.status !== 'archived');
  const projectProgress = activeProjects.length
    ? Math.round(activeProjects.reduce((sum, project) => sum + calculateProjectMetrics(project, milestones, tasks).overallProgress, 0) / activeProjects.length)
    : 0;
  const taskProgress = tasks.length ? Math.round((tasks.filter((task) => task.status === 'completed').length / tasks.length) * 100) : 0;
  const domains = [
    { label: 'Study', value: study.progress, count: study.topicCount, href: '/study' },
    { label: 'Tasks', value: taskProgress, count: tasks.length, href: '/tasks' },
    { label: 'Projects', value: projectProgress, count: activeProjects.length, href: '/projects' },
  ].filter((domain) => domain.count > 0);
  const overall = domains.length ? Math.round(domains.reduce((sum, domain) => sum + domain.value, 0) / domains.length) : 0;

  return (
    <CornerPanel title="Overall progress" subtitle="Across your workspace" showAction={false}
      className={`w-full min-w-0 ${className}`} bodyClassName="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-slate-100">{overall}<span className="text-red-300">%</span></p>
          <p className="text-[10px] text-slate-400">Average across sections with tracked progress</p>
        </div>
        <span className="text-[10px] text-slate-500">{domains.length} sections</span>
      </div>
      {domains.length ? (
        <div aria-label={`Progress graph: ${domains.map((domain) => `${domain.label} ${domain.value}%`).join(', ')}`} className="space-y-2.5">
          {domains.map((domain) => (
            <Link to={domain.href} key={domain.label} className="group block rounded-md px-1 py-0.5">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 group-hover:text-white">{domain.label}</span>
                <span className="text-slate-400">{domain.value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-navy-950/70" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-navy-400 to-red-300 transition-[width] duration-500" style={{ width: `${domain.value}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : <p className="text-xs text-slate-400">Add study topics, tasks, or projects to start tracking overall progress.</p>}
    </CornerPanel>
  );
}
