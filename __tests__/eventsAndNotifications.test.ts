jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

describe('YMCA Events and Announcements with Notifications', () => {
  test('listAnnouncements returns seeded announcements with pinned first', async () => {
    const api = new MockProtivityAdapter();
    const anns = await api.listAnnouncements('silver-spring');

    expect(anns.length).toBeGreaterThanOrEqual(4);
    expect(anns[0].pinned).toBe(true);
    expect(anns.some((a) => a.title.includes('Indoor Lap Pool'))).toBe(true);
    expect(anns.some((a) => a.title.includes('Turkey Chase Charity 5K'))).toBe(true);
  });

  test('createAnnouncement broadcasts in-app notification to all members', async () => {
    const api = new MockProtivityAdapter();

    const created = await api.createAnnouncement({
      branchId: 'silver-spring',
      title: 'Sauna & Steam Room Maintenance Complete',
      body: 'Both wet and dry saunas have reopened for member use following quarterly deep cleaning.',
      category: 'facility',
      priority: 'normal',
      authorName: 'Pat Nguyen (Aquatics)',
      pinned: false,
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Sauna & Steam Room Maintenance Complete');

    // Jordan Hale should have received the notification
    const notifs = await api.listNotifications('member-jordan');
    const annNotif = notifs.find((n) => n.title === 'Sauna & Steam Room Maintenance Complete');
    expect(annNotif).toBeDefined();
    expect(annNotif?.read).toBe(false);
    expect(annNotif?.type).toBe('announcement');
  });

  test('notifications: mark read and mark all read', async () => {
    const api = new MockProtivityAdapter();
    const notifs = await api.listNotifications('member-jordan');
    const unread = notifs.filter((n) => !n.read);
    expect(unread.length).toBeGreaterThan(0);

    // Mark single notification read
    const firstUnread = unread[0];
    await api.markNotificationRead(firstUnread.id, 'member-jordan');
    const notifsAfterSingle = await api.listNotifications('member-jordan');
    const target = notifsAfterSingle.find((n) => n.id === firstUnread.id);
    expect(target?.read).toBe(true);

    // Mark all read
    await api.markAllNotificationsRead('member-jordan');
    const notifsAllRead = await api.listNotifications('member-jordan');
    expect(notifsAllRead.every((n) => n.read)).toBe(true);
  });

  test('createNotification stores custom alert for user', async () => {
    const api = new MockProtivityAdapter();
    const notif = await api.createNotification({
      userId: 'member-jordan',
      title: 'Reminder: Turkey Chase 5K This Saturday',
      body: 'Packet pick-up begins at 7:30 AM at the Silver Spring YMCA outdoor track.',
      type: 'event',
      link: '/(member)/events',
    });

    expect(notif.id).toBeTruthy();
    expect(notif.read).toBe(false);

    const list = await api.listNotifications('member-jordan');
    expect(list.some((n) => n.id === notif.id)).toBe(true);
  });
});
