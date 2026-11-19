import React, { useEffect, useState } from 'react';
import useStudyData from '@/features/study/hooks/useStudyData';
import useProjectData from '@/features/projects/hooks/useProjectData';
import {
  createAppBackup,
  deleteManualBackup,
  listManualBackups,
  restoreAppBackup,
  saveManualBackup,
  validateAppBackup,
} from '../data/backupService';
import { formatSettingsDateTime } from '../data/settingsFormatters';

export default function SettingsDataManagement({
  settings,
  settingsStore,
  settingsError,
  report,
}) {
  const { data: study, repository: studyRepository, error: studyError } = useStudyData();
  const { repository: projectRepository, taskRepository, error: projectsError } = useProjectData();
  const [backups, setBackups] = useState([]);
  const [backupError, setBackupError] = useState('');
  const [busy, setBusy] = useState(false);
  const dataAvailable = settingsStore && studyRepository && projectRepository && taskRepository
    && !settingsError && !studyError && !projectsError;

  const refreshBackups = () => {
    try {
      setBackups(listManualBackups());
      setBackupError('');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Manual backups could not be read.');
    }
  };
  useEffect(() => {
    refreshBackups();
  }, []);

  const downloadBackup = () => {
    try {
      if (!dataAvailable) throw new Error('Current app data could not be loaded safely.');
      const backup = createAppBackup(settings, study);
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `lifestack-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      report('Backup exported.');
    } catch (error) {
      report(error instanceof Error ? error.message : 'Backup export failed.', true);
    }
  };

  const createBackup = () => {
    try {
      if (!dataAvailable) throw new Error('Current app data could not be loaded safely.');
      saveManualBackup(globalThis.localStorage, createAppBackup(settings, study));
      refreshBackups();
      report('Manual backup created in this browser.');
    } catch (error) {
      report(error instanceof Error ? error.message : 'Manual backup could not be created.', true);
    }
  };

  const restore = (backup) => {
    if (!window.confirm('Restore this backup? Current settings and module data will be replaced.')) return;
    setBusy(true);
    try {
      restoreAppBackup(backup, settingsStore, studyRepository);
      report('Backup restored.');
      refreshBackups();
    } catch (error) {
      report(error instanceof Error ? error.message : 'Backup restore failed.', true);
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const backup = JSON.parse(await file.text());
      validateAppBackup(backup);
      if (!window.confirm('Import this backup and replace current settings and module data?')) return;
      restoreAppBackup(backup, settingsStore, studyRepository);
      report('Backup imported and restored.');
      refreshBackups();
    } catch (error) {
      report(error instanceof Error ? error.message : 'The selected backup could not be imported.', true);
    } finally {
      event.target.value = '';
      setBusy(false);
    }
  };

  const removeBackup = (backupId) => {
    if (!window.confirm('Delete this manual backup?')) return;
    try {
      deleteManualBackup(globalThis.localStorage, backupId);
      refreshBackups();
      report('Manual backup deleted.');
    } catch (error) {
      report(error instanceof Error ? error.message : 'Manual backup could not be deleted.', true);
    }
  };

  return (
    <section className="settings-options space-y-5">
      <div>
        <h2 className="font-semibold">Data management</h2>
        <p className="mt-1 text-sm text-slate-400">Backups include settings, Study, Projects, and Tasks data. Other modules can register backup adapters through the shared backup service.</p>
        {studyError && <p role="alert" className="mt-2 text-sm text-red-300">Study data is unavailable: {studyError.message}</p>}
        {projectsError && <p role="alert" className="mt-2 text-sm text-red-300">Project or task data is unavailable: {projectsError.message}</p>}
        {settingsError && <p role="alert" className="mt-2 text-sm text-red-300">Settings are unavailable: {settingsError.message}</p>}
        {backupError && <p role="alert" className="mt-2 text-sm text-red-300">Manual backup storage: {backupError}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!dataAvailable} className="rounded border border-slate-500 px-3 py-2 text-sm disabled:opacity-50" onClick={downloadBackup}>Export app data</button>
        <button type="button" disabled={!dataAvailable} className="rounded border border-slate-500 px-3 py-2 text-sm disabled:opacity-50" onClick={createBackup}>Create manual backup</button>
        <label className={`rounded border border-slate-500 px-3 py-2 text-sm ${busy || !settingsStore || !studyRepository ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          Import backup
          <input type="file" accept="application/json,.json" disabled={busy || !settingsStore || !studyRepository} onChange={importFile} className="sr-only" />
        </label>
      </div>
      <p className="text-xs text-slate-400">Imports are validated before replacing data and always require confirmation. Invalid files do not change saved data. The browser keeps the five most recent manual backups.</p>

      <div>
        <h3 className="mb-2 font-medium">Manual backups in this browser ({backups.length})</h3>
        {backups.length === 0 ? <p className="text-sm text-slate-400">No manual backups saved.</p> : (
          <ul className="space-y-2">
            {backups.map((backup) => (
              <li key={backup.id} className="settings-history-row flex flex-wrap items-center justify-between gap-3">
                <time className="text-sm">{formatSettingsDateTime(backup.createdAt, settings)}</time>
                <div className="flex gap-3 text-sm">
                  <button type="button" disabled={busy || !settingsStore || !studyRepository} className="underline disabled:opacity-50" onClick={() => restore(backup.data)}>Restore</button>
                  <button type="button" className="text-red-300 underline" onClick={() => removeBackup(backup.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

