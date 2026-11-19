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
      className={`panel-bottom-right w-full sm:w-[280px] md:w-[310px] min-h-[180px] ${className}`}
    >
      <div className="space-y-3">
        {error ? <p className="text-xs text-red-300">Study data is unavailable.</p> : (
          <>
            <p className="text-3xl font-semibold">{study.progress}%</p>
            <p className="text-xs text-slate-300">{study.completedTopics} of {study.topicCount} topics complete</p>
            <p className="text-xs text-slate-400">{study.subjectCount} subjects · {study.pendingRevisions.length} pending revisions</p>
          </>
        )}
        <Link to="/study" className="text-xs text-cyan-300 underline">Open Study</Link>
      </div>
    </CornerPanel>
  );
}

