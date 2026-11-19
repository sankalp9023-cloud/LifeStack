import React, { useState } from 'react';
import StudyDashboard from '@/features/study/components/StudyDashboard';
import SubjectsWorkspace from '@/features/study/components/SubjectsWorkspace';
import { StudySessionsWorkspace } from '@/features/study/components/RecordWorkspaces';
import useStudyData from '@/features/study/hooks/useStudyData';
import useSettings from '@/features/settings/hooks/useSettings';
import FeaturePageHeader from '@/components/ui/FeaturePageHeader';
import FeatureSectionNav from '@/components/ui/FeatureSectionNav';

const SECTIONS = [
  ['subjects', 'Subjects'],
  ['sessions', 'Study sessions'],
];

export default function StudyPage() {
  const { data, repository, error: storageError } = useStudyData();
  const { settings } = useSettings();
  const [section, setSection] = useState('overview');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const run = (action) => {
    try {
      action();
      setError(null);
      setNotice('Saved.');
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The study record could not be saved.');
      setNotice('');
      return false;
    }
  };
  const navigate = (nextSection) => {
    setSection(nextSection);
    setNotice('');
  };

  return (
    <div className="select-text flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <FeaturePageHeader
          title="Study"
          description="Organize subjects and study sessions."
        />

        {(storageError || error) && (
          <div role="alert" className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {storageError ? `Study data could not be loaded or saved: ${storageError.message}` : error}
          </div>
        )}
        {notice && !error && !storageError && <p role="status" className="text-sm text-blue-300">{notice}</p>}

        <FeatureSectionNav
          label="Study sections"
          activeId={section}
          onChange={navigate}
          items={SECTIONS.map(([id, label]) => ({ id, label }))}
        />

        {!repository ? <p className="text-sm text-slate-400">Study features are unavailable because browser storage could not be initialized.</p> : (
          <>
            {section === 'overview' && <StudyDashboard data={data} settings={settings} onNavigate={navigate} />}
            {section === 'subjects' && <SubjectsWorkspace data={data} repository={repository} run={run} />}
            {section === 'sessions' && <StudySessionsWorkspace data={data} repository={repository} run={run} />}
          </>
        )}
      </div>
    </div>
  );
}

