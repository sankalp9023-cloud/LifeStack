export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

export function deliverNotification(settings, entry) {
  if (!settings.notifications.enabled) return { delivered: false, reason: 'disabled' };
  if (typeof Notification === 'undefined') return { delivered: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { delivered: false, reason: 'permission-required' };

  const notification = new Notification(entry.title, {
    body: entry.body,
    tag: entry.sourceId,
    silent: !settings.notifications.soundEnabled,
  });
  notification.onclick = () => window.focus();
  return { delivered: true };
}
