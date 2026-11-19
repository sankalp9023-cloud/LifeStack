import { useEffect, useRef } from 'react';
import useSettings from './useSettings';
import useStudyData from '@/features/study/hooks/useStudyData';
import { deliverNotification } from '../data/notificationService';

function getScheduledEvents(data, settings) {
  if (!settings.notifications.enabled
    || !settings.notifications.reminders.enabled
    || !settings.moduleSettings.study?.remindersEnabled) return [];

  const events = [
    ...data.assessments.filter((item) => item.date).map((item) => ({
      sourceId: `study:assessment:${item.id}`,
      title: `Upcoming assessment: ${item.title}`,
      body: `${item.subjectId ? data.subjects.find((subject) => subject.id === item.subjectId)?.name || 'Study' : 'Study'} · ${item.date}`,
      date: item.date,
    })),
    ...data.revisions.filter((item) => item.status === 'pending' && item.dueDate).map((item) => {
      const topic = data.topics.find((record) => record.id === item.topicId);
      return {
        sourceId: `study:revision:${item.id}`,
        title: `Revision due: ${topic?.name || 'Study topic'}`,
        body: `Scheduled for ${item.dueDate}`,
        date: item.dueDate,
      };
    }),
  ];
  return events;
}

export default function useStudyReminders() {
  const { settings, settingsStore } = useSettings();
  const { data } = useStudyData();
  const deliveredThisSession = useRef(new Set());

  useEffect(() => {
    if (!settingsStore || !settings.notifications.enabled || !settings.notifications.reminders.enabled) return undefined;

    const deliverDueReminders = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const deliveredIds = new Set([
        ...settings.notifications.history.map((item) => item.sourceId),
        ...deliveredThisSession.current,
      ]);
      const now = new Date();
      const { reminderTime, leadHours } = settings.notifications.reminders;
      for (const event of getScheduledEvents(data, settings)) {
        if (deliveredIds.has(event.sourceId)) continue;
        const scheduled = new Date(`${event.date}T${reminderTime}:00`);
        const firesAt = new Date(scheduled.getTime() - leadHours * 60 * 60 * 1000);
        const expiresAt = new Date(`${event.date}T23:59:59`);
        if (firesAt <= now && now <= expiresAt) {
          const entry = {
            id: event.sourceId,
            sourceId: event.sourceId,
            module: 'study',
            title: event.title,
            body: event.body,
            createdAt: now.toISOString(),
          };
          try {
            const result = deliverNotification(settings, entry);
            if (result.delivered) {
              deliveredThisSession.current.add(event.sourceId);
              settingsStore.addNotification(entry);
            }
          } catch (error) {
            console.error('LifeStack could not deliver a study reminder.', error);
          }
        }
      }
    };

    deliverDueReminders();
    const intervalId = window.setInterval(deliverDueReminders, 30_000);
    return () => window.clearInterval(intervalId);
  }, [data, settings, settingsStore]);
}
