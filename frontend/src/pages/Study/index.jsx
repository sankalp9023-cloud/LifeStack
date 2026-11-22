import React, { useState } from 'react';
import StudyDashboard from '@/features/study/components/StudyDashboard';
import SubjectsWorkspace from '@/features/study/components/SubjectsWorkspace';
import { StudySessionsWorkspace } from '@/features/study/components/RecordWorkspaces';
import useStudyData from '@/features/study/hooks/useStudyData';
import useSettings from '@/features/settings/hooks/useSettings';
import '@/features/study/study.css';

export default function StudyPage() {
  const { data, repository, error: storageError } = useStudyData();
  const { settings } = useSettings();
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
  return (
    <div className="study-page select-text min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-none space-y-5">
        {(storageError || error) && (
          <div role="alert" className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {storageError ? `Study data could not be loaded or saved: ${storageError.message}` : error}
          </div>
        )}
        {notice && !error && !storageError && <p role="status" className="text-sm text-blue-300">{notice}</p>}

        {!repository ? <p className="text-sm text-slate-400">Study features are unavailable because browser storage could not be initialized.</p> : (
          <>
            <StudyDashboard
              data={data}
              settings={settings}
              onNavigate={(target) => {
                const panelId = target === 'revisions' ? 'study-sessions-panel' : 'study-subjects-panel';
                document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
            <div className="grid min-w-0 gap-5 xl:grid-cols-2">
              <section id="study-subjects-panel" className="study-workspace-panel hud-surface min-w-0 scroll-mt-6 rounded-2xl border border-slate-700/70 p-4 sm:p-5">
                <h2 className="mb-4 text-lg font-semibold">Subjects</h2>
                <SubjectsWorkspace data={data} repository={repository} run={run} />
              </section>
              <section id="study-sessions-panel" className="study-workspace-panel hud-surface min-w-0 scroll-mt-6 rounded-2xl border border-slate-700/70 p-4 sm:p-5">
                <h2 className="mb-4 text-lg font-semibold">Study sessions</h2>
                <StudySessionsWorkspace data={data} repository={repository} run={run} />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

