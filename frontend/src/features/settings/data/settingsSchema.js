export const SETTINGS_STORAGE_KEY = 'lifestack.settings.v1';

const moduleSchemas = new Map();
let defaultsInitialized = false;

export function registerModuleSettings(moduleId, schema) {
  if (!/^[a-z][a-z0-9-]*$/.test(moduleId)) {
    throw new Error('Module settings IDs must be lowercase and use letters, numbers, or hyphens.');
  }
  if (!schema || typeof schema.defaults !== 'object' || !schema.defaults || typeof schema.validate !== 'function') {
    throw new Error(`Module "${moduleId}" must register defaults and a validation function.`);
  }
  moduleSchemas.set(moduleId, schema);
  if (defaultsInitialized) DEFAULT_SETTINGS.moduleSettings[moduleId] = { ...schema.defaults };
}

export function getRegisteredModuleSettings() {
  return Array.from(moduleSchemas, ([id, schema]) => ({ id, defaults: { ...schema.defaults } }));
}

export const DEFAULT_SETTINGS = {
  general: {
    defaultLandingPage: '/dashboard',
    dateFormat: 'locale',
    timeFormat: '24h',
  },
  appearance: {
    theme: 'dark',
    accentColor: 'blue',
    density: 'medium',
  },
  profile: {
    displayName: 'Sam',
  },
  notifications: {
    enabled: false,
    soundEnabled: false,
    reminders: {
      enabled: true,
      leadHours: 24,
      reminderTime: '09:00',
    },
    history: [],
  },
  applicationMode: 'simple',
  moduleSettings: {},
};

defaultsInitialized = true;
registerModuleSettings('study', {
  defaults: { remindersEnabled: true },
  validate(value) {
    return value && typeof value.remindersEnabled === 'boolean';
  },
});

export function mergeSettingsDefaults(saved) {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    ...source,
    profile: { ...DEFAULT_SETTINGS.profile, ...(source.profile || {}) },
    general: { ...DEFAULT_SETTINGS.general, ...(source.general || {}) },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(source.appearance || {}),
      theme: source.appearance?.theme === 'light' ? 'light' : 'dark',
      accentColor: ['blue', 'red', 'violet', 'green'].includes(source.appearance?.accentColor)
        ? source.appearance.accentColor
        : DEFAULT_SETTINGS.appearance.accentColor,
      density: ({
        comfortable: 'medium',
        compact: 'small',
      })[source.appearance?.density] || (
        ['small', 'medium', 'large'].includes(source.appearance?.density)
          ? source.appearance.density
          : DEFAULT_SETTINGS.appearance.density
      ),
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(source.notifications || {}),
      reminders: { ...DEFAULT_SETTINGS.notifications.reminders, ...(source.notifications?.reminders || {}) },
      history: source.notifications?.history || [],
    },
    moduleSettings: { ...DEFAULT_SETTINGS.moduleSettings, ...(source.moduleSettings || {}) },
  };
}

const LANDING_PAGES = ['/dashboard', '/study', '/projects', '/settings'];
const DATE_FORMATS = ['locale', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const ACCENT_COLORS = ['blue', 'red', 'violet', 'green'];
const LEAD_HOURS = [0, 1, 6, 12, 24, 48];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateSettings(settings) {
  if (!isRecord(settings)
    || !isRecord(settings.general)
    || !isRecord(settings.appearance)
    || !isRecord(settings.notifications)
    || !isRecord(settings.notifications.reminders)
    || !Array.isArray(settings.notifications.history)
    || !isRecord(settings.moduleSettings)
    || !isRecord(settings.profile)) {
    throw new Error('Settings data has an invalid structure.');
  }
  const { general, appearance, notifications } = settings;
  if (!LANDING_PAGES.includes(general.defaultLandingPage)
    || !DATE_FORMATS.includes(general.dateFormat)
    || !['12h', '24h'].includes(general.timeFormat)) {
    throw new Error('General settings contain an unsupported value.');
  }
  if (!['dark', 'light'].includes(appearance.theme)
    || !ACCENT_COLORS.includes(appearance.accentColor)
    || !['small', 'medium', 'large'].includes(appearance.density)) {
    throw new Error('Appearance settings contain an unsupported value.');
  }
  if (typeof settings.profile.displayName !== 'string'
    || !settings.profile.displayName.trim()
    || settings.profile.displayName.trim().length > 40) {
    throw new Error('Profile name must be between 1 and 40 characters.');
  }
  if (typeof notifications.enabled !== 'boolean'
    || typeof notifications.soundEnabled !== 'boolean'
    || typeof notifications.reminders.enabled !== 'boolean'
    || !LEAD_HOURS.includes(notifications.reminders.leadHours)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(notifications.reminders.reminderTime)) {
    throw new Error('Notification settings contain an unsupported value.');
  }
  if (!['simple', 'gamified'].includes(settings.applicationMode)) {
    throw new Error('Application mode is not supported.');
  }
  for (const [moduleId, schema] of moduleSchemas) {
    const moduleSettings = settings.moduleSettings[moduleId];
    if (!isRecord(moduleSettings) || !schema.validate(moduleSettings)) {
      throw new Error(`Settings for the "${moduleId}" module are invalid.`);
    }
  }
  for (const item of notifications.history) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string'
      || typeof item.createdAt !== 'string') {
      throw new Error('Notification history contains an invalid entry.');
    }
  }
  return settings;
}

export function mergeSettings(current, category, patch) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, category) || category === 'moduleSettings') {
    throw new Error(`Unknown settings category "${category}".`);
  }
  return {
    ...current,
    [category]: { ...current[category], ...patch },
  };
}

export function getLeadHourOptions() {
  return [...LEAD_HOURS];
}
