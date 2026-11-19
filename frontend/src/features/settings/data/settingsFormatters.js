export function formatSettingsDate(value, settings) {
  if (!value) return '';
  const date = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const format = settings.general.dateFormat;
  if (format === 'YYYY-MM-DD') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  if (format === 'DD/MM/YYYY') {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
  if (format === 'MM/DD/YYYY') {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(undefined).format(date);
}

export function formatSettingsTime(value, settings) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: settings.general.timeFormat === '12h',
  }).format(date);
}

export function formatSettingsDateTime(value, settings) {
  const date = formatSettingsDate(value, settings);
  const time = formatSettingsTime(value, settings);
  return [date, time].filter(Boolean).join(' ');
}
