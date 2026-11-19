import {
  DEFAULT_SETTINGS,
  mergeSettingsDefaults,
  mergeSettings,
  SETTINGS_STORAGE_KEY,
  validateSettings,
} from './settingsSchema.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSettingsStore(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable in this browser.');

  let settings;
  let loadError = null;
  let storageListenerCount = 0;
  let removeStorageListener = null;
  const listeners = new Set();
  try {
    const serialized = storage.getItem(SETTINGS_STORAGE_KEY);
    if (serialized === null) {
      settings = clone(DEFAULT_SETTINGS);
    } else {
      const saved = JSON.parse(serialized);
      if (![undefined, 0, 1].includes(saved.version)) throw new Error('This settings data version is not supported.');
      if (saved.version === 1 && (!saved.settings || typeof saved.settings !== 'object')) {
        throw new Error('Saved settings data is invalid.');
      }
      settings = validateSettings(mergeSettingsDefaults(saved.settings || saved));
    }
  } catch (error) {
    loadError = error instanceof Error ? error : new Error('Could not read saved settings.');
    settings = clone(DEFAULT_SETTINGS);
  }

  const notify = () => listeners.forEach((listener) => listener());
  const save = (nextSettings, repair = false) => {
    if (loadError && !repair) throw new Error(`Saved settings are unavailable: ${loadError.message}`);
    validateSettings(nextSettings);
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, settings: nextSettings }));
    settings = nextSettings;
    loadError = null;
    notify();
  };

  return {
    getSnapshot: () => settings,
    getLoadError: () => loadError,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateCategory(category, patch) {
      save(mergeSettings(settings, category, patch));
    },
    updateModule(moduleId, patch) {
      const moduleSettings = settings.moduleSettings[moduleId];
      if (!moduleSettings) throw new Error(`Settings for module "${moduleId}" are not registered.`);
      save({
        ...settings,
        moduleSettings: {
          ...settings.moduleSettings,
          [moduleId]: { ...moduleSettings, ...patch },
        },
      });
    },
    updateValue(key, value) {
      if (key !== 'applicationMode') throw new Error(`Unknown application setting "${key}".`);
      save({ ...settings, [key]: value });
    },
    replaceSettings(nextSettings) {
      save(clone(nextSettings), true);
    },
    addNotification(entry) {
      const history = [...settings.notifications.history, entry].slice(-100);
      save(mergeSettings(settings, 'notifications', { history }));
    },
    clearNotificationHistory() {
      save(mergeSettings(settings, 'notifications', { history: [] }));
    },
    reload() {
      try {
        const serialized = storage.getItem(SETTINGS_STORAGE_KEY);
        if (serialized === null) {
          settings = clone(DEFAULT_SETTINGS);
        } else {
          const saved = JSON.parse(serialized);
          if (![undefined, 0, 1].includes(saved.version)) throw new Error('This settings data version is not supported.');
          if (saved.version === 1 && (!saved.settings || typeof saved.settings !== 'object')) {
            throw new Error('Saved settings data is invalid.');
          }
          settings = validateSettings(mergeSettingsDefaults(saved.settings || saved));
        }
        loadError = null;
      } catch (error) {
        loadError = error instanceof Error ? error : new Error('Could not read saved settings.');
      }
      notify();
    },
    addStorageListener() {
      if (typeof window === 'undefined') return () => {};
      storageListenerCount += 1;
      if (!removeStorageListener) {
        const reload = this.reload.bind(this);
        const handleStorage = (event) => {
          if (event.key !== SETTINGS_STORAGE_KEY && event.key !== null) return;
          reload();
        };
        window.addEventListener('storage', handleStorage);
        removeStorageListener = () => window.removeEventListener('storage', handleStorage);
      }
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        storageListenerCount -= 1;
        if (storageListenerCount === 0 && removeStorageListener) {
          removeStorageListener();
          removeStorageListener = null;
        }
      };
    },
  };
}

export { SETTINGS_STORAGE_KEY };
