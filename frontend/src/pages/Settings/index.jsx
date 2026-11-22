import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, LogOut, Pencil, User, X } from 'lucide-react';
import packageInfo from '../../../package.json';
import useSettings from '@/features/settings/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants/routes';
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
import SystemInformation from '@/features/settings/components/SystemInformation';
import FeaturePageHeader from '@/components/ui/FeaturePageHeader';

const SECTIONS = [
  ['appearance', 'Appearance'],
  ['notifications', 'Notifications'],
  ['modules', 'Modules'],
  ['system', 'System information'],
];
const PROFILE_MENU_LINKS = [
  ...SECTIONS,
  ['terms', 'Terms & Conditions'],
  ['about', 'About LifeStack'],
  ['logout', 'Log out'],
  ['deleteAccount', 'Delete account'],
];

const FIELD_CLASS = 'mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm';

export default function SettingsPage({ dialogMode = false, dialogSection, onClose, onNavigateSection }) {
  const { settings, settingsStore, error: storageError } = useSettings();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = dialogSection || (requestedSection === 'profile'
    ? 'profile'
    : SECTIONS.some(([id]) => id === requestedSection) ? requestedSection : 'menu');
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState(settings.profile.displayName);
  const [loggedOutNotice, setLoggedOutNotice] = useState(false);

  const updateCategory = (category, patch) => {
    try {
      settingsStore.updateCategory(category, patch);
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Settings could not be saved.');
    }
  };
  const updateModule = (moduleId, patch) => {
    try {
      settingsStore.updateModule(moduleId, patch);
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Module settings could not be saved.');
    }
  };
  const saveProfileName = (event) => {
    event.preventDefault();
    try {
      if (!settingsStore) throw new Error('Profile settings are unavailable.');
      settingsStore.updateCategory('profile', { displayName: profileNameDraft.trim() });
      setEditingName(false);
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Profile name could not be saved.');
    }
  };
  const report = (message, isError = false) => {
    setError(isError ? message : '');
  };
  const backToMenu = () => {
    if (dialogMode && onNavigateSection) {
      onNavigateSection('profile');
    } else {
      navigate('/settings');
    }
  };

  return (
    <div className={`select-text min-w-0 ${dialogMode ? 'h-full w-full overflow-y-auto p-4' : 'min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8'}`}>
      <div className={`${dialogMode ? 'space-y-4' : 'mx-auto w-full max-w-none space-y-5'}`}>
        {dialogMode ? (
          <header className="flex items-start justify-between gap-3 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              {onNavigateSection && section !== 'profile' && (
                <button
                  type="button"
                  onClick={backToMenu}
                  className="settings-back-button"
                  aria-label="Back to settings menu"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Menu</span>
                </button>
              )}
              <h2 className="mt-1 inline-block text-lg font-semibold text-slate-100 align-middle">
                {section === 'profile' ? 'Profile' : PROFILE_MENU_LINKS.find(([id]) => id === section)?.[1] || 'Settings'}
              </h2>
            </div>
            <button type="button" aria-label="Close profile and settings panel" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </header>
        ) : (
          <div className="settings-page-heading">
            {section !== 'menu' && (
              <button type="button" onClick={backToMenu} className="settings-back-button" aria-label="Back to settings menu">
                <ArrowLeft className="h-4 w-4" />
                <span>Settings menu</span>
              </button>
            )}
            <FeaturePageHeader
              title="Settings"
              description="Application preferences and local data controls."
            />
          </div>
        )}

        {(storageError || error) && <div role="alert" className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{storageError ? `Saved settings are unavailable: ${storageError.message}` : error}</div>}

        {section === 'menu' ? (
          <SettingsMenu
            sections={SECTIONS}
            onNavigate={(id) => navigate(`/settings?section=${encodeURIComponent(id)}`)}
          />
        ) : section === 'profile' ? (
          <section className="profile-settings-card space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-lg font-semibold text-white">
                {settings.profile.displayName.trim().charAt(0).toUpperCase()}
              </span>
              {editingName ? (
                <form onSubmit={saveProfileName} className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    autoFocus
                    aria-label="Profile name"
                    maxLength={40}
                    value={profileNameDraft}
                    onChange={(event) => setProfileNameDraft(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  />
                  <button type="submit" className="settings-icon-button" aria-label="Save profile name">
                    <Check className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">{user?.name || settings.profile.displayName}</p>
                    {user?.email ? (
                      <p className="truncate text-xs text-cyan-400">{user.email} · Cloud Account</p>
                    ) : (
                      <p className="text-xs text-slate-400">Guest Mode (Local Storage)</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="settings-icon-button"
                    aria-label="Edit profile name"
                    disabled={!settingsStore}
                    onClick={() => {
                      setProfileNameDraft(user?.name || settings.profile.displayName);
                      setEditingName(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {onNavigateSection && (
              <nav aria-label="Profile menu" className="border-t border-slate-700/70 pt-4">
                <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Settings</h3>
                <div className="flex flex-col">
                  {PROFILE_MENU_LINKS.map(([id, label]) => (
                    <React.Fragment key={id}>
                      {id === 'terms' && (
                        <>
                          <div role="separator" className="my-2 border-t border-slate-700/70" />
                          <h3 className="mb-2 mt-1 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Account &amp; information</h3>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateSection(id)}
                        className={`rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800 ${id === 'deleteAccount' ? 'text-red-300 hover:text-red-200' : 'text-slate-300 hover:text-white'}`}
                      >
                        {label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </nav>
            )}
          </section>
        ) : section === 'logout' ? (
          <section className="space-y-4 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-semibold text-slate-100">Account Session</h3>
            {isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-300">
                  Signed in as <strong className="text-cyan-400">{user?.name || 'User'}</strong> ({user?.email})
                </p>
                <p className="text-xs text-slate-400">
                  Logging out will end your session on this browser. Your cloud-synced records will remain safe.
                </p>
                {loggedOutNotice ? (
                  <p className="text-xs text-emerald-400 font-medium">Successfully logged out.</p>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setLoggedOutNotice(true);
                    }}
                    className="flex items-center gap-2 rounded bg-red-600/80 hover:bg-red-500 px-3.5 py-1.5 text-xs font-medium text-white transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out of LifeStack</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  You are currently using LifeStack in local guest mode. No cloud account is signed in on this device.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    navigate(ROUTES.LOGIN);
                  }}
                  className="flex items-center gap-2 rounded bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 text-xs font-medium text-white transition"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Sign in / Create Account</span>
                </button>
              </div>
            )}
          </section>
        ) : section === 'deleteAccount' ? (
          <section className="space-y-3 rounded border border-red-900/70 bg-red-950/20 p-4">
            <h3 className="font-medium text-red-200">Account deletion is unavailable</h3>
            <p className="text-sm text-slate-400">This local-only app does not have user accounts.</p>
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
            {section === 'appearance' && (
              <section className="settings-options space-y-4">
                <h2 className="font-semibold">Appearance</h2>
                <div className="settings-option-list">
                  <label className="settings-option-row settings-toggle-row text-sm" htmlFor="dark-mode-toggle">
                    <span>
                      <span className="block font-medium">Dark mode</span>
                      <span className="mt-0.5 block text-xs text-slate-400">Use the dark LifeStack interface</span>
                    </span>
                    <input
                      id="dark-mode-toggle"
                      type="checkbox"
                      role="switch"
                      checked={settings.appearance.theme === 'dark'}
                      onChange={(event) => updateCategory('appearance', { theme: event.target.checked ? 'dark' : 'light' })}
                      className="settings-toggle"
                    />
                  </label>
                  <div className="settings-option-row settings-picker-row text-sm">
                    <span>
                      <span className="block font-medium">Accent colour</span>
                      <span className="mt-0.5 block text-xs text-slate-400">Choose your interface highlight</span>
                    </span>
                    <div className="flex items-center gap-2" role="group" aria-label="Accent colour">
                      {[
                        ['blue', '#7893bd', 'Blue'],
                        ['red', '#d06b79', 'Red'],
                        ['violet', '#a78bfa', 'Violet'],
                        ['green', '#4ade80', 'Green'],
                      ].map(([value, color, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-label={`${label} accent`}
                          aria-pressed={settings.appearance.accentColor === value}
                          className="settings-color-swatch"
                          style={{ '--swatch-color': color }}
                          onClick={() => updateCategory('appearance', { accentColor: value })}
                        />
                      ))}
                    </div>
                  </div>
                  <label className="settings-option-row settings-size-row text-sm" htmlFor="display-size">
                    <span>
                      <span className="block font-medium">Display size</span>
                      <span className="mt-0.5 block text-xs text-slate-400">Small, medium, or large</span>
                    </span>
                    <span className="settings-size-control">
                      <input
                        id="display-size"
                        type="range"
                        min="0"
                        max="2"
                        step="1"
                        value={['small', 'medium', 'large'].indexOf(settings.appearance.density)}
                        onChange={(event) => updateCategory('appearance', {
                          density: ['small', 'medium', 'large'][Number(event.target.value)],
                        })}
                        aria-valuetext={settings.appearance.density}
                      />
                      <span aria-hidden="true"><span>Small</span><span>Medium</span><span>Large</span></span>
                    </span>
                  </label>
                </div>
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

            {section === 'system' && <SystemInformation version={packageInfo.version} />}
          </>
        )}
      </div>
    </div>
  );
}

function SettingsMenu({ sections, onNavigate }) {
  return (
    <nav aria-label="Settings menu" className="settings-menu-grid">
      {sections.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onNavigate(id)}
          className="settings-menu-card"
        >
          <span className="settings-menu-card-title">{label}</span>
          <span className="settings-menu-card-action" aria-hidden="true">Open</span>
        </button>
      ))}
    </nav>
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
      <label className="settings-option-row settings-toggle-row text-sm" htmlFor="notifications-toggle">
        <span>
          <span className="block font-medium">Notifications</span>
          <span className="mt-0.5 block text-xs text-slate-400">Allow LifeStack to send reminders</span>
        </span>
        <input
          id="notifications-toggle"
          type="checkbox"
          role="switch"
          checked={notificationOptions.enabled}
          onChange={(event) => updateCategory('notifications', { enabled: event.target.checked })}
          className="settings-toggle"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Browser permission: {permission}</span>
        <button type="button" className="rounded border border-slate-500 px-3 py-2" onClick={requestPermission}>Request permission</button>
      </div>

      {notificationOptions.enabled && (
        <div className="space-y-4 pt-4">
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

      <div className="pt-4">
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

