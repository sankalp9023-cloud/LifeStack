import { useEffect, useSyncExternalStore } from 'react';
import { createSettingsStore } from '../data/settingsStore';

let store;
let initializationError = null;

function getStore() {
  if (!store && !initializationError) {
    try {
      store = createSettingsStore();
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error('Settings storage is unavailable.');
    }
  }
  return store;
}

const EMPTY_SETTINGS = {
  general: { defaultLandingPage: '/dashboard', dateFormat: 'locale', timeFormat: '24h' },
  appearance: { theme: 'dark', accentColor: 'blue', density: 'medium' },
  profile: { displayName: 'Sam' },
  notifications: { enabled: false, soundEnabled: false, reminders: { enabled: false, leadHours: 24, reminderTime: '09:00' }, history: [] },
  applicationMode: 'simple',
  moduleSettings: {},
};

export default function useSettings() {
  const settingsStore = getStore();
  const settings = useSyncExternalStore(
    settingsStore ? settingsStore.subscribe : () => () => {},
    settingsStore ? settingsStore.getSnapshot : () => EMPTY_SETTINGS,
    () => EMPTY_SETTINGS,
  );

  useEffect(() => settingsStore ? settingsStore.addStorageListener() : undefined, [settingsStore]);

  return {
    settings,
    settingsStore,
    error: initializationError || (settingsStore && settingsStore.getLoadError()),
  };
}
