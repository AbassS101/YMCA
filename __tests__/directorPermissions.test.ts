jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';

const ADMIN = 'staff-admin';
const TRAINER = 'staff-alex';
const WELLNESS_DIRECTOR = 'staff-celine';
const MEMBERSHIP_DIRECTOR = 'staff-desk';
const MEMBER = 'member-jordan';

describe('Director roles and membership permissions', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  async function submitCancel() {
    return adapter.submitCancelNotice(MEMBER, {
      reason: 'Moving out of state',
      requestedAt: new Date().toISOString(),
    });
  }

  async function createMember(email: string) {
    const { member } = await adapter.createMemberAdmin({
      name: 'Pat Tester',
      email,
      phone: '301-555-0199',
      planId: 'adult',
      homeBranchId: 'silver-spring',
    });
    return member;
  }

  describe('seeded director accounts', () => {
    it('signs Celine in as the Wellness Director', async () => {
      const session = await adapter.login('celine@silverspring.ymca', 'ymca-demo');
      expect(session.role).toBe('wellness_director');
      expect((await adapter.getStaff(WELLNESS_DIRECTOR)).staffRole).toBe('wellness_director');
    });

    it('signs Billy in as the Membership Director', async () => {
      const session = await adapter.login('membership@silverspring.ymca', 'ymca-demo');
      expect(session.role).toBe('membership_director');
      expect((await adapter.getStaff(MEMBERSHIP_DIRECTOR)).staffRole).toBe('membership_director');
    });

    it('upgrades legacy director roles saved by older builds', async () => {
      const state = await loadStore();
      state.staff = state.staff.map((s) =>
        s.id === WELLNESS_DIRECTOR ? { ...s, staffRole: 'trainer' } : s.id === MEMBERSHIP_DIRECTOR ? { ...s, staffRole: 'desk' } : s
      );
      state.credentials = state.credentials.map((c) =>
        c.userId === WELLNESS_DIRECTOR ? { ...c, role: 'trainer' } : c.userId === MEMBERSHIP_DIRECTOR ? { ...c, role: 'staff' } : c
      );
      await saveStore(state);

      expect((await adapter.login('celine@silverspring.ymca', 'ymca-demo')).role).toBe('wellness_director');
      expect((await adapter.login('membership@silverspring.ymca', 'ymca-demo')).role).toBe('membership_director');
    });

    it('keeps an admin-assigned role instead of forcing the director role', async () => {
      await adapter.updateStaff(MEMBERSHIP_DIRECTOR, { staffRole: 'staff_admin' });
      expect((await adapter.login('membership@silverspring.ymca', 'ymca-demo')).role).toBe('staff_admin');
    });
  });

  describe('Membership Director', () => {
    it('approves a cancellation and the member keeps access through the end date', async () => {
      const request = await submitCancel();
      const approved = await adapter.approveCancelRequest(MEMBER, MEMBERSHIP_DIRECTOR);

      expect(approved.status).toBe('approved');
      expect(approved.reviewedById).toBe(MEMBERSHIP_DIRECTOR);
      expect(approved.reviewedByName).toBeDefined();
      expect(approved.accessThrough).toBe(request.accessThrough);
      expect(await adapter.listPendingCancels('silver-spring')).toHaveLength(0);

      const notifications = await adapter.listNotifications(MEMBER);
      expect(notifications.some((n) => n.title === 'Cancellation Confirmed')).toBe(true);
    });

    it('rescinds a cancellation request', async () => {
      await submitCancel();
      const member = await adapter.rescindCancelNotice(MEMBER, MEMBERSHIP_DIRECTOR);
      expect(member.status).toBe('active');
      expect(await adapter.listPendingCancels('silver-spring')).toHaveLength(0);
    });

    it('changes a membership plan', async () => {
      const updated = await adapter.changeMembership(MEMBER, 'Family', 9900, MEMBERSHIP_DIRECTOR);
      expect(updated.rateName).toBe('Family');
      expect(updated.monthlyAmountCents).toBe(9900);
    });

    it('deletes a member account', async () => {
      const member = await createMember('pat.md@example.com');
      await adapter.deleteMemberAccount(member.id, MEMBERSHIP_DIRECTOR);
      await expect(adapter.getMember(member.id)).rejects.toThrow();
    });
  });

  describe.each([['Trainer', TRAINER]])('%s', (_label, staffId) => {
    it('cannot approve a cancellation', async () => {
      await submitCancel();
      await expect(adapter.approveCancelRequest(MEMBER, staffId)).rejects.toThrow(/not permitted/);
      expect(await adapter.listPendingCancels('silver-spring')).toHaveLength(1);
    });

    it('cannot rescind a cancellation', async () => {
      await submitCancel();
      await expect(adapter.rescindCancelNotice(MEMBER, staffId)).rejects.toThrow(/not permitted/);
      expect((await adapter.getMember(MEMBER)).status).toBe('cancel_pending');
    });

    it('cannot change a membership plan', async () => {
      await expect(adapter.changeMembership(MEMBER, 'Family', 9900, staffId)).rejects.toThrow(/not permitted/);
    });

    it('cannot delete a member account', async () => {
      await expect(adapter.deleteMemberAccount(MEMBER, staffId)).rejects.toThrow(/not permitted/);
      expect((await adapter.getMember(MEMBER)).id).toBe(MEMBER);
    });
  });

  describe('Wellness Director', () => {
    it('has Staff Admin membership powers', async () => {
      await submitCancel();
      expect((await adapter.approveCancelRequest(MEMBER, WELLNESS_DIRECTOR)).status).toBe('approved');
      expect((await adapter.rescindCancelNotice(MEMBER, WELLNESS_DIRECTOR)).status).toBe('active');
      expect((await adapter.changeMembership(MEMBER, 'Senior', 4500, WELLNESS_DIRECTOR)).rateName).toBe('Senior');
    });
  });

  describe('Staff Admin override', () => {
    it('can approve, rescind, change plans and delete', async () => {
      await submitCancel();
      expect((await adapter.approveCancelRequest(MEMBER, ADMIN)).status).toBe('approved');
      expect((await adapter.rescindCancelNotice(MEMBER, ADMIN)).status).toBe('active');
      expect((await adapter.changeMembership(MEMBER, 'Senior', 4500, ADMIN)).rateName).toBe('Senior');

      const member = await createMember('pat.admin@example.com');
      await adapter.deleteMemberAccount(member.id, ADMIN);
      await expect(adapter.getMember(member.id)).rejects.toThrow();
    });
  });

  it('still lets members rescind their own cancellation without a staff requester', async () => {
    await submitCancel();
    expect((await adapter.rescindCancelNotice(MEMBER)).status).toBe('active');
  });
});
