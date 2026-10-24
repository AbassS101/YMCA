jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

describe('staff group chats', () => {
  const api = new MockProtivityAdapter();
  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
  });

  it('persists one shared conversation for every selected staff member', async () => {
    const staff = await api.listStaff();
    const ids = staff.slice(0, 3).map((s) => s.id);
    const group = await api.createStaffGroup(ids[0], '  Front desk team  ', ids.slice(1));
    expect(group.name).toBe('Front desk team');
    for (const id of ids) {
      expect((await api.listThreads(id)).some((t) => t.id === group.id)).toBe(true);
    }
    expect((await api.listThreads(staff[3].id)).some((t) => t.id === group.id)).toBe(false);
    await api.sendMessage({ threadId: group.id, fromId: ids[1], body: 'Hello team' });
    const reopened = new MockProtivityAdapter();
    expect((await reopened.listMessages(group.id))[0].body).toBe('Hello team');
    await expect(api.sendMessage({ threadId: group.id, fromId: staff[3].id, body: 'No' })).rejects.toThrow('participants');
    const direct = await api.getOrCreateThread(ids[0], ids[1]);
    expect(direct.id).not.toBe(group.id);
  });

  it('rejects invalid groups and deduplicates participants', async () => {
    const ids = (await api.listStaff()).slice(0, 3).map((s) => s.id);
    await expect(api.createStaffGroup(ids[0], '', ids.slice(1))).rejects.toThrow('group name');
    await expect(api.createStaffGroup(ids[0], 'Team', [ids[1], ids[1]])).rejects.toThrow('at least two');
    await expect(api.createStaffGroup(ids[0], 'Team', [ids[1], 'member-jordan'])).rejects.toThrow('staff members only');
    const group = await api.createStaffGroup(ids[0], 'Team', [...ids, ids[1]]);
    expect(group.participantIds).toEqual(ids);
  });
});
