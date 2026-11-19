import { validateStudyData } from '../../study/data/studyRepository.js';
import { mergeSettingsDefaults, validateSettings } from './settingsSchema.js';

export const BACKUP_STORAGE_KEY = 'lifestack.backups.v1';
export const BACKUP_FORMAT_VERSION = 1;
const MAX_MANUAL_BACKUPS = 5;
const backupModules = new Map();

export function registerBackupModule(moduleId, adapter) {
  if (!/^[a-z][a-z0-9-]*$/.test(moduleId) || ['settings', 'study'].includes(moduleId)) {
    throw new Error('Backup module IDs must be unique lowercase module identifiers.');
  }
  if (!adapter || typeof adapter.read !== 'function'
    || typeof adapter.validate !== 'function' || typeof adapter.replace !== 'function') {
    throw new Error(`Backup module "${moduleId}" must register read, validate, and replace functions.`);
  }
  backupModules.set(moduleId, adapter);
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createAppBackup(settings, study, exportedAt = new Date().toISOString()) {
  const modules = { settings, study };
  for (const [moduleId, adapter] of backupModules) {
    modules[moduleId] = adapter.read();
  }
  return {
    application: 'LifeStack',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    modules,
  };
}

export function validateAppBackup(backup) {
  if (!backup || typeof backup !== 'object'
    || backup.application !== 'LifeStack'
    || backup.formatVersion !== BACKUP_FORMAT_VERSION
    || !backup.modules
    || !Object.prototype.hasOwnProperty.call(backup.modules, 'settings')
    || !Object.prototype.hasOwnProperty.call(backup.modules, 'study')) {
    throw new Error('This is not a supported LifeStack backup.');
  }
  const validatedModules = {
    settings: validateSettings(mergeSettingsDefaults(backup.modules.settings)),
    study: validateStudyData(backup.modules.study),
  };
  for (const [moduleId, moduleData] of Object.entries(backup.modules)) {
    if (moduleId === 'settings' || moduleId === 'study') continue;
    const adapter = backupModules.get(moduleId);
    if (!adapter) throw new Error(`Backup contains unsupported module data: "${moduleId}".`);
    validatedModules[moduleId] = adapter.validate(moduleData, backup.modules);
  }
  return validatedModules;
}

export function restoreAppBackup(backup, settingsStore, studyRepository) {
  const validated = validateAppBackup(backup);
  const previousSettings = settingsStore.getSnapshot();
  const previousStudy = studyRepository.getSnapshot();
  const previousModules = {};
  const unavailablePreviousModules = [];
  for (const [moduleId, adapter] of backupModules) {
    try {
      previousModules[moduleId] = adapter.read();
    } catch {
      unavailablePreviousModules.push(moduleId);
    }
  }
  try {
    settingsStore.replaceSettings(validated.settings);
    studyRepository.replaceData(validated.study);
    for (const [moduleId, adapter] of backupModules) {
      if (Object.prototype.hasOwnProperty.call(validated, moduleId)) adapter.replace(validated[moduleId]);
    }
  } catch (error) {
    try {
      settingsStore.replaceSettings(previousSettings);
      studyRepository.replaceData(previousStudy);
      for (const [moduleId, adapter] of backupModules) {
        if (Object.prototype.hasOwnProperty.call(previousModules, moduleId)) {
          adapter.replace(previousModules[moduleId]);
        }
      }
    } catch (rollbackError) {
      throw new Error(`Restore failed (${error.message}) and rollback failed (${rollbackError.message}).`);
    }
    if (unavailablePreviousModules.length) {
      throw new Error(`Restore failed (${error.message}); previous ${unavailablePreviousModules.join(', ')} data could not be captured for rollback.`);
    }
    throw new Error(`Restore failed and existing data was restored: ${error.message}`);
  }
}

function readBackups(storage) {
  const serialized = storage.getItem(BACKUP_STORAGE_KEY);
  if (serialized === null) return [];
  const backups = JSON.parse(serialized);
  if (!Array.isArray(backups)) throw new Error('Saved manual backups are invalid.');
  backups.forEach((backup) => validateAppBackup(backup.data));
  return backups;
}

export function listManualBackups(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable in this browser.');
  return readBackups(storage);
}

export function saveManualBackup(storage, backup) {
  if (!storage) throw new Error('Local storage is unavailable in this browser.');
  validateAppBackup(backup);
  const backups = readBackups(storage);
  const record = {
    id: createId(),
    createdAt: new Date().toISOString(),
    data: backup,
  };
  storage.setItem(BACKUP_STORAGE_KEY, JSON.stringify([record, ...backups].slice(0, MAX_MANUAL_BACKUPS)));
  return record;
}

export function deleteManualBackup(storage, backupId) {
  if (!storage) throw new Error('Local storage is unavailable in this browser.');
  const backups = readBackups(storage);
  if (!backups.some((backup) => backup.id === backupId)) throw new Error('Backup was not found.');
  storage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups.filter((backup) => backup.id !== backupId)));
}
