import React from 'react';
import { Link } from 'react-router-dom';
import CornerPanel from '@/components/panels/CornerPanel';
import useTaskData from '@/hooks/useTaskData';
import useProjectData from '@/features/projects/hooks/useProjectData';
import useStudyData from '@/features/study/hooks/useStudyData';
import useSettings from '@/features/settings/hooks/useSettings';
import { getStudyDashboard } from '@/features/study/data/studyMetrics';

export default function CurrentVitalsPanel({ className = '' }) {
  const { tasks } = useTaskData();
  const { projects, milestones } = useProjectData();
  const { data: studyData } = useStudyData();
  const { settings } = useSettings();
  const study = getStudyDashboard(studyData);
  const openTasks = tasks.filter((task) => task.status !== 'completed').length;
  const activeProjects = projects.filter((project) => !['completed', 'archived'].includes(project.status)).length;
  const remindersEnabled = settings.notifications?.enabled && settings.notifications?.reminders?.enabled;
  return (
    <CornerPanel
      title="Current Vitals"
      subtitle="Contextual overview"
      showAction={false}
      className={`panel-top-left w-full min-w-0 h-[245px] ${className}`}
      bodyClassName="justify-between space-y-1"
    >
      <div className="grid w-full grid-cols-2 gap-x-5 gap-y-3 py-2">
        <Vital label="Open tasks" value={openTasks} href="/tasks" />
        <Vital label="Active projects" value={activeProjects} href="/projects" />
        <Vital label="Study topics" value={`${study.completedTopics}/${study.topicCount}`} href="/study" />
        <Vital label="Milestones" value={milestones.filter((item) => item.completed).length + `/${milestones.length}`} href="/projects" />
      </div>
      <div className="flex items-center justify-between pt-2 pb-0.5">
        <span className="text-[10px] text-slate-400 font-medium">Workspace reminders</span>
        <Link to="/settings" className="text-[10.5px] text-navy-200 underline underline-offset-2">{remindersEnabled ? 'On' : 'Off'} · Settings</Link>
      </div>
    </CornerPanel>
  );
}

function Vital({ label, value, href }) {
  return <Link to={href} className="block rounded-lg px-2 py-1 transition-colors hover:bg-white/[0.04]">
    <span className="block text-[10px] text-slate-400">{label}</span>
    <span className="text-lg font-semibold text-slate-100">{value}</span>
  </Link>;
}

