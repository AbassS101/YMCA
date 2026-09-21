import type { AppNotification, NotificationPreferences } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const notificationRepo = {
  list(api: ProtivityPort, userId: string): Promise<AppNotification[]> {
    return api.listNotifications(userId);
  },

  async getUnreadCount(api: ProtivityPort, userId: string): Promise<number> {
    const list = await api.listNotifications(userId);
    return list.filter((n) => !n.read).length;
  },

  markRead(api: ProtivityPort, notificationId: string, userId: string): Promise<void> {
    return api.markNotificationRead(notificationId, userId);
  },

  markAllRead(api: ProtivityPort, userId: string): Promise<void> {
    return api.markAllNotificationsRead(userId);
  },

  send(
    api: ProtivityPort,
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    return api.createNotification(notification);
  },

  getPreferences(api: ProtivityPort, userId: string): Promise<NotificationPreferences> {
    return api.getNotificationPreferences(userId);
  },

  updatePreferences(
    api: ProtivityPort,
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return api.updateNotificationPreferences(userId, updates);
  },
};
