jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { childWatchRepo } from '@/repositories/childWatchRepo';
import { resetStore } from '@/storage/demoStore';

const api = new MockProtivityAdapter();

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

describe('household-backed Child Watch', () => {
  it('lists only the under-13 dependents of the household, from any adult', async () => {
    const fromPrimary = await childWatchRepo.listChildren('member-jordan');
    const fromSpouse = await childWatchRepo.listChildren('member-jordan-spouse');
    expect(fromPrimary.map((c) => c.firstName).sort()).toEqual(['Leo', 'Mia']);
    expect(fromSpouse.map((c) => c.id).sort()).toEqual(fromPrimary.map((c) => c.id).sort());
  });

  it('adds a child as a household member with their own barcode and no login', async () => {
    const saved = await childWatchRepo.saveChild({
      memberId: 'member-jordan',
      firstName: 'Ava',
      lastName: 'Doe',
      birthDate: '2020-05-05',
    });
    const { members } = await api.getHousehold('member-jordan');
    const ava = members.find((m) => m.id === saved.id)!;
    expect(ava.membershipId).toMatch(/^\d{6}$/);
    expect(ava.hasLogin).toBe(false);
    expect(ava.householdId).toBe('member-jordan');
  });
});

describe('household rules in the API', () => {
  it('only the primary can change the plan or cancel', async () => {
    await expect(api.changeMembership('member-jordan-spouse', 'Adult', 8900)).rejects.toThrow(/primary/);
    await expect(
      api.submitCancelNotice('member-jordan-teen', { reason: 'x', requestedAt: '2026-10-13' })
    ).rejects.toThrow(/primary/);
  });

  it('household members share the primary membership', async () => {
    const m = await api.getMembership('member-jordan-teen');
    expect(m.memberId).toBe('member-jordan');
  });

  it('Family II rejects a third adult but accepts a teen with a login', async () => {
    await expect(
      api.addHouseholdMember('member-jordan', { name: 'Third Adult', birthDate: '1970-01-01' })
    ).rejects.toThrow(/adults/);
    const teen = await api.addHouseholdMember('member-jordan', {
      name: 'Kai Doe',
      birthDate: '2010-02-02',
      email: 'kai@example.com',
    });
    expect(teen.hasLogin).toBe(true);
    await expect(api.login('kai@example.com', 'ymca-demo')).resolves.toMatchObject({ userId: teen.id });
  });

  it('under-13s cannot buy alone', async () => {
    await expect(
      api.buyMembership({
        name: 'Little One',
        email: 'little@example.com',
        phone: '1',
        address: 'a',
        planId: 'youth',
        payment: { brand: 'Visa', last4: '4242' },
        birthDate: '2018-01-01',
      })
    ).rejects.toThrow(/under 13/);
  });

  it('gym orientation is limited to trainers/admins and ages 13-17', async () => {
    await expect(api.recordGymOrientation('member-jordan-teen', 'member-jordan')).rejects.toThrow(/trainers/);
    await expect(api.recordGymOrientation('child-jordan-1', 'staff-admin')).rejects.toThrow(/13 to 17/);
    const teen = await api.recordGymOrientation('member-jordan-teen', 'staff-admin');
    expect(teen.gymOrientation?.staffId).toBe('staff-admin');
  });

  it('cancelling the primary puts the whole household on cancel pending', async () => {
    await api.submitCancelNotice('member-jordan', { reason: 'moving', requestedAt: '2026-10-13' });
    const { members } = await api.getHousehold('member-jordan-teen');
    expect(members.every((m) => m.status === 'cancel_pending')).toBe(true);
  });
});
