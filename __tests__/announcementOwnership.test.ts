jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore, loadStore } from '@/storage/demoStore';
import { canManageAnnouncement } from '@/domain/announcementAccess';

beforeEach(() => resetStore());

test('staff can manage only their own notices; admins can manage all, including legacy notices', () => {
  for (const role of ['maintenance', 'trainer', 'wellness_director', 'aquatics_director', 'membership_director', 'staff'] as const) {
    expect(canManageAnnouncement(role, 'me', { authorId: 'other' })).toBe(false);
    expect(canManageAnnouncement(role, 'me', {})).toBe(false);
  }
  expect(canManageAnnouncement('maintenance', 'me', { authorId: 'me' })).toBe(true);
  for (const role of ['admin', 'staff_admin', 'it_admin'] as const) {
    expect(canManageAnnouncement(role, 'me', {})).toBe(true);
    expect(canManageAnnouncement(role, 'me', { authorId: 'other' })).toBe(true);
  }
});

test('adapter enforces ownership, rejects missing actors, and preserves authorship', async () => {
  const api = new MockProtivityAdapter();
  const state = await loadStore();
  const owner = state.staff.find(s => s.staffRole === 'maintenance')!;
  const admin = state.staff.find(s => s.staffRole === 'staff_admin')!;
  const notice = await api.createAnnouncement({ branchId: 'silver-spring', title: 'Repair', body: 'Details', category: 'facility', priority: 'normal', authorName: owner.name, authorId: admin.id }, owner.id);
  expect(notice.authorId).toBe(owner.id);
  await expect(api.updateAnnouncement(notice.id, { title: 'Updated' }, owner.id)).resolves.toMatchObject({ title: 'Updated' });
  await expect(api.updateAnnouncement(notice.id, { pinned: true })).rejects.toThrow();
  await expect(api.deleteAnnouncement(notice.id)).rejects.toThrow();
  const legacy = state.announcements[0];
  await expect(api.updateAnnouncement(legacy.id, { popupNotice: true }, owner.id)).rejects.toThrow();
  await expect(api.deleteAnnouncement(legacy.id, owner.id)).rejects.toThrow();
  await expect(api.updateAnnouncement(notice.id, { authorId: admin.id }, admin.id)).resolves.toMatchObject({ authorId: owner.id });
  await expect(api.deleteAnnouncement(notice.id, admin.id)).resolves.toBeUndefined();
});
