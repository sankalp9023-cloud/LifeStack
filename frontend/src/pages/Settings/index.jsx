import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import packageInfo from '../../../package.json';
import useSettings from '@/features/settings/hooks/useSettings';
import {
  getRegisteredModuleSettings,
  getLeadHourOptions,
} from '@/features/settings/data/settingsSchema';
import {
  deliverNotification,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/features/settings/data/notificationService';
import { formatSettingsDateTime } from '@/features/settings/data/settingsFormatters';
import SettingsDataManagement from '@/features/settings/components/SettingsDataManagement';
import SystemInformation from '@/features/settings/components/SystemInformation';
import FeaturePageHeader from '@/components/ui/FeaturePageHeader';

const SECTIONS = [
  ['general', 'General'],
  ['appearance', 'Appearance'],
  ['notifications', 'Notifications'],
  ['modules', 'Modules'],
  ['privacy', 'Privacy'],
  ['data', 'Data management'],
  ['system', 'System information'],
];

const SECTION_TITLES = {
  profile: 'Profile',
  general: 'General',
  appearance: 'Appearance',
  notifications: 'Notifications',
  modules: 'Modules',
  privacy: 'Privacy',
  data: 'Data management',
  system: 'System information',
  logout: 'Log out',
  deleteAccount: 'Delete account',
  terms: 'Terms & Conditions',
  about: 'About LifeStack',
};

const FIELD_CLASS = 'mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm';

export default function SettingsPage({ dialogMode = false, dialogSection, onClose }) {
  const { settings, settingsStore, error: storageError } = useSettings();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = dialogSection || (requestedSection === 'profile'
    ? 'profile'
    : SECTIONS.some(([id]) => id === requestedSection) ? requestedSection : 'general');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const updateCategory = (category, patch) => {
    try {
      settingsStore.updateCategory(category, patch);
      setError('');
      setNotice('Settings saved.');
    } catch (saveError) {
      setNotice('');
      setError(saveError instanceof Error ? saveError.message : 'Settings could not be saved.');
    }
  };
  const updateModule = (moduleId, patch) => {
    try {
      settingsStore.updateModule(moduleId, patch);
      setError('');
      setNotice('Settings saved.');
    } catch (saveError) {
      setNotice('');
      setError(saveError instanceof Error ? saveError.message : 'Module settings could not be saved.');
    }
  };
  const updateApplicationMode = (mode) => {
    try {
      settingsStore.updateValue('applicationMode', mode);
      setError('');
      setNotice('Settings saved.');
    } catch (saveError) {
      setNotice('');
      setError(saveError instanceof Error ? saveError.message : 'Application mode could not be saved.');
    }
  };
  const report = (message, isError = false) => {
    setError(isError ? message : '');
    setNotice(isError ? '' : message);
  };

  return (
    <div className={`select-text ${dialogMode ? 'h-full overflow-y-auto p-4' : 'flex-1 overflow-y-auto p-4 sm:p-6'}`}>
      <div className={`${dialogMode ? 'space-y-4' : 'mx-auto max-w-6xl space-y-5'}`}>
        {dialogMode ? (
          <header className="flex items-start justify-between gap-3 border-b border-slate-700 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-400">LifeStack / Profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-100">{SECTION_TITLES[section] || 'Settings'}</h2>
            </div>
            <button type="button" aria-label="Close profile panel" onClick={onClose} className="rounded px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-800 hover:text-white">×</button>
          </header>
        ) : (
          <FeaturePageHeader
            title="Settings"
            description="Application preferences and local data controls."
          />
        )}

        {(storageError || error) && <div role="alert" className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{storageError ? `Saved settings are unavailable: ${storageError.message}` : error}</div>}
        {notice && !error && !storageError && <p role="status" className="text-sm text-blue-300">{notice}</p>}

        {section === 'profile' ? (
          <section className="space-y-4 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="font-semibold">Profile</h2>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-lg font-semibold text-white">S</span>
              <div>
                <p className="font-medium text-slate-100">Sam</p>
                <p className="text-sm text-slate-400">LifeStack profile</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">Profile accounts are not connected in this local-only version.</p>
          </section>
        ) : section === 'logout' ? (
          <section className="space-y-3 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-medium">No account is signed in</h3>
            <p className="text-sm text-slate-400">LifeStack is running locally and has no account or sign-in service, so there is nothing to log out of.</p>
          </section>
        ) : section === 'deleteAccount' ? (
          <section className="space-y-3 rounded border border-red-900/70 bg-red-950/20 p-4">
            <h3 className="font-medium text-red-200">Account deletion is unavailable</h3>
            <p className="text-sm text-slate-400">This local-only app does not have user accounts. You can manage locally stored records in Data management.</p>
          </section>
        ) : section === 'terms' ? (
          <section className="space-y-3 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-medium">Terms &amp; Conditions</h3>
            <p className="text-sm text-slate-400">Terms and conditions have not been published yet.</p>
          </section>
        ) : section === 'about' ? (
          <section className="space-y-3 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-medium">LifeStack</h3>
            <p className="text-sm text-slate-400">A local-first personal productivity and life-management app, made for Sam.</p>
          </section>
        ) : !settingsStore ? <p className="text-sm text-slate-400">Settings are read-only because browser storage could not be initialized.</p> : (
          <>
            {section === 'general' && (
              <section className="settings-options space-y-4">
                <h2 className="font-semibold">General preferences</h2>
                <div className="settings-option-list">
                  <label className="settings-option-row text-sm">Default landing page
                    <select className={FIELD_CLASS} value={settings.general.defaultLandingPage} onChange={(event) => updateCategory('general', { defaultLandingPage: event.target.value })}>
                      <option value="/dashboard">Dashboard</option>
                      <option value="/study">Study</option>
                      <option value="/projects">Projects</option>
                      <option value="/settings">Settings</option>
                    </select>
                  </label>
                  <label className="settings-option-row text-sm">Date format
                    <select className={FIELD_CLASS} value={settings.general.dateFormat} onChange={(event) => updateCategory('general', { dateFormat: event.target.value })}>
                      <option value="locale">Use browser locale</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </label>
                  <label className="settings-option-row text-sm">Time format
                    <select className={FIELD_CLASS} value={settings.general.timeFormat} onChange={(event) => updateCategory('general', { timeFormat: event.target.value })}>
                      <option value="12h">12-hour</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </label>
                  <label className="settings-option-row text-sm">Application mode
                    <select className={FIELD_CLASS} value={settings.applicationMode} onChange={(event) => updateApplicationMode(event.target.value)}>
                      <option value="simple">Simple tracker</option>
                      <option value="gamified">Gamified</option>
                    </select>
                  </label>
                </div>
                <p className="text-xs text-slate-400">Preferences save automatically and apply to supported module dates and the application landing route.</p>
              </section>
            )}

            {section === 'appearance' && (
              <section className="settings-options space-y-4">
                <h2 className="font-semibold">Appearance preferences</h2>
                <div className="settings-option-list">
                  <label className="settings-option-row text-sm">Theme
                    <select className={FIELD_CLASS} value={settings.appearance.theme} onChange={(event) => updateCategory('appearance', { theme: event.target.value })}>
                      <option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option>
                    </select>
                  </label>
                  <label className="settings-option-row text-sm">Accent colour
                    <select className={FIELD_CLASS} value={settings.appearance.accentColor} onChange={(event) => updateCategory('appearance', { accentColor: event.target.value })}>
                      <option value="blue">Blue</option><option value="red">Red</option>
                    </select>
                  </label>
                  <label className="settings-option-row text-sm">Interface density
                    <select className={FIELD_CLASS} value={settings.appearance.density} onChange={(event) => updateCategory('appearance', { density: event.target.value })}>
                      <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
                    </select>
                  </label>
                </div>
                <p className="text-xs text-slate-400">Selections are persisted and exposed as root appearance settings for the forthcoming visual redesign.</p>
              </section>
            )}

            {section === 'notifications' && (
              <NotificationSettings
                settings={settings}
                settingsStore={settingsStore}
                updateCategory={updateCategory}
                report={report}
              />
            )}

            {section === 'modules' && (
              <section className="settings-options space-y-4">
                <h2 className="font-semibold">Module preferences</h2>
                <p className="text-sm text-slate-400">Modules register validated preferences with the shared settings store. Reminder delivery also requires global notifications and reminders to be enabled.</p>
                {getRegisteredModuleSettings().map((module) => (
                  <div key={module.id} className="settings-option-row">
                    <h3 className="font-medium capitalize">{module.id}</h3>
                    {module.id === 'study' && settings.notifications.enabled && (
                      <label className="mt-2 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={settings.moduleSettings.study.remindersEnabled} onChange={(event) => updateModule('study', { remindersEnabled: event.target.checked })} />
                        Allow Study assessment and revision reminders
                      </label>
                    )}
                    {module.id === 'study' && !settings.notifications.enabled && <p className="mt-1 text-sm text-slate-400">Enable notifications to configure Study reminders.</p>}
                  </div>
                ))}
                <p className="text-xs text-slate-400">Projects currently has no persisted preferences or scheduled records to configure.</p>
              </section>
            )}

            {section === 'privacy' && (
              <section className="settings-options space-y-3">
                <h2 className="font-semibold">Privacy and data handling</h2>
                <p className="text-sm">LifeStack stores settings and study records in this browser profile using local storage. The current app does not send personal data to a LifeStack server or third-party analytics service.</p>
                <p className="text-sm text-slate-400">Local storage is not encrypted. Anyone with access to this browser profile may be able to access its records. Exported backup files contain your data and should be stored securely.</p>
                <p className="text-sm text-slate-400">Clearing browser site data removes application records unless you first export or create a manual backup.</p>
              </section>
            )}

            {section === 'data' && <SettingsDataManagement settings={settings} settingsStore={settingsStore} settingsError={storageError} report={report} />}
            {section === 'system' && <SystemInformation version={packageInfo.version} />}
          </>
        )}
      </div>
    </div>
  );
}

function NotificationSettings({ settings, settingsStore, updateCategory, report }) {
  const [permission, setPermission] = useState(getNotificationPermission());
  const notificationOptions = settings.notifications;
  const reminders = notificationOptions.reminders;

  const requestPermission = async () => {
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      report(result === 'granted'
        ? 'Browser notification permission granted.'
        : result === 'unsupported'
          ? 'This browser does not support desktop notifications.'
          : `Browser notification permission: ${result}.`, result !== 'granted');
    } catch (permissionError) {
      report(permissionError instanceof Error ? permissionError.message : 'Notification permission could not be requested.', true);
    }
  };

  const sendTest = () => {
    try {
      const sourceId = `settings:test:${Date.now()}`;
      const result = deliverNotification(settings, {
        sourceId,
        title: 'LifeStack notification test',
        body: 'Notification settings are connected.',
      });
      if (result.delivered) {
        settingsStore.addNotification({
          id: sourceId, sourceId, module: 'settings',
          title: 'LifeStack notification test',
          body: 'Notification settings are connected.', createdAt: new Date().toISOString(),
        });
        setPermission(getNotificationPermission());
        report('Test notification sent.');
      } else {
        report(result.reason === 'disabled'
          ? 'Enable notifications before sending a test.'
          : result.reason === 'unsupported'
            ? 'This browser does not support desktop notifications.'
            : 'Grant browser notification permission before sending a test.', true);
      }
    } catch (sendError) {
      report(sendError instanceof Error ? sendError.message : 'Test notification failed.', true);
    }
  };

  return (
    <section className="settings-options space-y-4">
      <h2 className="font-semibold">Notifications and reminders</h2>
      <label className="settings-option-row flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notificationOptions.enabled} onChange={(event) => updateCategory('notifications', { enabled: event.target.checked })} />
        Enable notifications
      </label>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Browser permission: {permission}</span>
        <button type="button" className="rounded border border-slate-500 px-3 py-2" onClick={requestPermission}>Request permission</button>
      </div>

      {notificationOptions.enabled && (
        <div className="space-y-4 border-t border-slate-700 pt-4">
          <label className="settings-option-row flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notificationOptions.soundEnabled} onChange={(event) => updateCategory('notifications', { soundEnabled: event.target.checked })} />
            Allow browser notification sounds
          </label>
          <label className="settings-option-row flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reminders.enabled} onChange={(event) => updateCategory('notifications', { reminders: { ...reminders, enabled: event.target.checked } })} />
            Enable scheduled reminders
          </label>
          {reminders.enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">Reminder lead time
                <select className={FIELD_CLASS} value={reminders.leadHours} onChange={(event) => updateCategory('notifications', { reminders: { ...reminders, leadHours: Number(event.target.value) } })}>
                  {getLeadHourOptions().map((hours) => <option key={hours} value={hours}>{hours === 0 ? 'At reminder time' : `${hours} hours before`}</option>)}
                </select>
              </label>
              <label className="text-sm">Reminder time
                <input type="time" className={FIELD_CLASS} value={reminders.reminderTime} onChange={(event) => updateCategory('notifications', { reminders: { ...reminders, reminderTime: event.target.value } })} />
              </label>
            </div>
          )}
          <p className="text-xs text-slate-400">Study reminders are scheduled for assessment dates and pending revision dates. The app must be open and browser permission granted for desktop delivery.</p>
          <button type="button" className="rounded border border-slate-500 px-3 py-2 text-sm" onClick={sendTest}>Send test notification</button>
        </div>
      )}

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Notification history ({notificationOptions.history.length})</h3>
          {notificationOptions.history.length > 0 && <button type="button" className="text-sm underline" onClick={() => {
            try {
              settingsStore.clearNotificationHistory();
              report('Notification history cleared.');
            } catch (historyError) {
              report(historyError instanceof Error ? historyError.message : 'Notification history could not be cleared.', true);
            }
          }}>Clear history</button>}
        </div>
        {notificationOptions.history.length === 0 ? <p className="mt-2 text-sm text-slate-400">No notifications have been delivered.</p> : (
          <ul className="mt-2 space-y-2">
            {[...notificationOptions.history].reverse().map((entry) => (
              <li key={entry.id} className="settings-history-row text-sm">
                <p className="font-medium">{entry.title}</p>
                <p className="text-slate-400">{entry.body}</p>
                <time className="text-xs text-slate-500">{formatSettingsDateTime(entry.createdAt, settings)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

