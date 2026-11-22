import React from 'react';
import { Link } from 'react-router-dom';
import CornerPanel from '@/components/panels/CornerPanel';
import useStudyData from '@/features/study/hooks/useStudyData';
import { getStudyDashboard } from '@/features/study/data/studyMetrics';

export default function StudyProgressPanel({ className = '' }) {
  const { data, error } = useStudyData();
  const study = getStudyDashboard(data);
  return (
    <CornerPanel
      title="Study progress"
      subtitle="Study"
      showAction={false}
      className={`panel-bottom-right w-full min-w-0 min-h-[180px] ${className}`}
    >
      <div className="space-y-3">
        {error ? <p className="text-xs text-red-300">Study data is unavailable.</p> : (
          <>
            <p className="text-3xl font-semibold tracking-tight text-slate-100">{study.progress}<span className="text-red-300">%</span></p>
            <p className="text-xs text-slate-300">{study.completedTopics} of {study.topicCount} topics complete</p>
            <p className="text-xs text-slate-400">{study.subjectCount} subjects · {study.pendingRevisions.length} pending revisions</p>
          </>
        )}
        <Link to="/study" className="w-fit text-xs text-navy-200 underline decoration-navy-300/50 underline-offset-4 hover:text-white">Open Study</Link>
      </div>
    </CornerPanel>
  );
}

