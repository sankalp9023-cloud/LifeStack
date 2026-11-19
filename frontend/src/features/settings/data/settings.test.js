import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyRepository, STORAGE_KEY as STUDY_KEY } from '../../study/data/studyRepository.js';
import {
  createAppBackup,
  restoreAppBackup,
  validateAppBackup,
} from './backupService.js';
import { createSettingsStore } from './settingsStore.js';
import { SETTINGS_STORAGE_KEY } from './settingsSchema.js';
import { deliverNotification } from './notificationService.js';
import { formatSettingsDate, formatSettingsTime } from './settingsFormatters.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('settings persist validated preferences and safely merge missing fields from older data', () => {
  const storage = createMemoryStorage();
  const settings = createSettingsStore(storage);
  settings.updateCategory('general', { dateFormat: 'DD/MM/YYYY' });
  settings.updateValue('applicationMode', 'gamified');

  const restored = createSettingsStore(storage);
  assert.equal(restored.getSnapshot().general.dateFormat, 'DD/MM/YYYY');
  assert.equal(restored.getSnapshot().applicationMode, 'gamified');
  assert.equal(restored.getSnapshot().appearance.accentColor, 'blue');
  restored.updateCategory('appearance', { accentColor: 'red' });
  assert.equal(restored.getSnapshot().appearance.accentColor, 'red');
  assert.throws(() => restored.updateCategory('appearance', { theme: 'unknown' }), /unsupported value/);
  assert.equal(restored.getSnapshot().appearance.theme, 'system');

  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
    version: 0,
    settings: { general: { dateFormat: 'YYYY-MM-DD' } },
  }));
  const migrated = createSettingsStore(storage);
  assert.equal(migrated.getSnapshot().general.dateFormat, 'YYYY-MM-DD');
  assert.equal(migrated.getSnapshot().appearance.theme, 'system');
  assert.equal(migrated.getSnapshot().appearance.accentColor, 'blue');
});

test('backup restore covers settings and Study data; invalid relationships cannot be restored', () => {
  const storage = createMemoryStorage();
  const settings = createSettingsStore(storage);
  const study = createStudyRepository(storage);
  const subject = study.createSubject({ name: 'Chemistry' });
  settings.updateCategory('general', { dateFormat: 'DD/MM/YYYY' });
  const backup = createAppBackup(settings.getSnapshot(), study.getSnapshot(), '2026-11-16T00:00:00.000Z');

  settings.updateCategory('general', { dateFormat: 'MM/DD/YYYY' });
  study.createSubject({ name: 'Physics' });
  restoreAppBackup(backup, settings, study);
  assert.equal(settings.getSnapshot().general.dateFormat, 'DD/MM/YYYY');
  assert.deepEqual(study.getSnapshot().subjects.map((item) => item.name), ['Chemistry']);

  const invalid = structuredClone(backup);
  invalid.modules.study.chapters.push({
    id: 'broken-chapter', subjectId: 'missing-subject', name: 'Broken',
  });
  assert.throws(() => validateAppBackup(invalid), /broken subject/);
  assert.deepEqual(study.getSnapshot().subjects.map((item) => item.name), ['Chemistry']);
  assert.ok(storage.getItem(STUDY_KEY));
});

test('corrupted settings are reported and not overwritten by ordinary edits', () => {
  const storage = createMemoryStorage();
  storage.setItem(SETTINGS_STORAGE_KEY, 'invalid');
  const settings = createSettingsStore(storage);
  assert.ok(settings.getLoadError());
  assert.throws(() => settings.updateCategory('general', { dateFormat: 'DD/MM/YYYY' }), /unavailable/);
  assert.equal(storage.getItem(SETTINGS_STORAGE_KEY), 'invalid');
});

test('module preferences are validated and notification sounds follow the shared setting', () => {
  const settingsStore = createSettingsStore(createMemoryStorage());
  settingsStore.updateModule('study', { remindersEnabled: false });
  assert.equal(settingsStore.getSnapshot().moduleSettings.study.remindersEnabled, false);
  assert.throws(() => settingsStore.updateModule('study', { remindersEnabled: 'yes' }), /invalid/);

  const originalNotification = globalThis.Notification;
  const delivered = [];
  globalThis.Notification = class {
    static permission = 'granted';
    constructor(title, options) {
      delivered.push({ title, options });
    }
  };
  try {
    const settings = settingsStore.getSnapshot();
    assert.equal(deliverNotification(settings, { title: 'Blocked' }).reason, 'disabled');
    settingsStore.updateCategory('notifications', { enabled: true, soundEnabled: false });
    const quiet = deliverNotification(settingsStore.getSnapshot(), { title: 'Quiet', sourceId: 'quiet' });
    assert.equal(quiet.delivered, true);
    assert.equal(delivered[0].options.silent, true);
    settingsStore.updateCategory('notifications', { soundEnabled: true });
    deliverNotification(settingsStore.getSnapshot(), { title: 'Audible', sourceId: 'audible' });
    assert.equal(delivered[1].options.silent, false);
  } finally {
    if (originalNotification === undefined) delete globalThis.Notification;
    else globalThis.Notification = originalNotification;
  }
});

test('date and time formatting follow central preferences', () => {
  const settings = {
    general: { dateFormat: 'DD/MM/YYYY', timeFormat: '12h' },
  };
  assert.equal(formatSettingsDate('2026-03-04', settings), '04/03/2026');
  assert.match(formatSettingsTime('2026-03-04T13:05:00', settings), /1:05/);
});
