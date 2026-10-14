import type { SavedClass } from '@/domain/types';
import { loadStore, saveStore } from '@/storage/demoStore';

function formatReminderSchedule(startIso: string): string {
  try {
    const dayDate = new Date(`${startIso.slice(0, 10)}T12:00:00`);
    const dayStr = dayDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = new Date(startIso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dayStr} at ${timeStr}`;
  } catch {
    return startIso;
  }
}

export const savedClassesRepo = {
  async list(memberId: string): Promise<SavedClass[]> {
    const state = await loadStore();
    return state.savedClasses.filter((s) => s.memberId === memberId);
  },

  async toggle(memberId: string, scheduleItemId: string): Promise<boolean> {
    const state = await loadStore();
    const idx = state.savedClasses.findIndex(
      (s) => s.memberId === memberId && s.scheduleItemId === scheduleItemId
    );
    const notifId = `notif-star-${memberId}-${scheduleItemId}`;

    if (idx === -1) {
      state.savedClasses.push({ memberId, scheduleItemId });

      const item = state.schedules.find((s) => s.id === scheduleItemId);
      if (item) {
        const whenStr = formatReminderSchedule(item.start);
        state.notifications = state.notifications.filter((n) => n.id !== notifId);
        state.notifications.unshift({
          id: notifId,
          userId: memberId,
          title: `Class saved: ${item.title}`,
          body: `You starred ${item.title} with ${item.instructorName} (${whenStr} · ${item.location}). You will be notified when this class is happening!`,
          type: 'event',
          createdAt: new Date().toISOString(),
          read: false,
          relatedId: scheduleItemId,
          link: '/(member)/(tabs)/schedules',
        });
      }

      await saveStore(state);
      return true;
    }

    state.savedClasses.splice(idx, 1);
    state.notifications = state.notifications.filter((n) => n.id !== notifId);
    await saveStore(state);
    return false;
  },
};
