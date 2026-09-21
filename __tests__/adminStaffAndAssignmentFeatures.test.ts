jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

describe('Admin Staff, Member Management, and Trainer Assignment Features', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  it('allows Admin to provision a new trainer with custom credentials and log in', async () => {
    const newTrainer = await adapter.createStaff({
      name: 'Coach Maya Chen',
      email: 'maya@silverspring.ymca',
      roleLabel: 'Senior Aquatic Coach',
      homeBranchId: 'silver-spring',
      staffRole: 'trainer',
      password: 'maya-secure-pass',
    });

    expect(newTrainer.id).toBeDefined();
    expect(newTrainer.name).toBe('Coach Maya Chen');
    expect(newTrainer.staffRole).toBe('trainer');

    // Verify trainer can log in with provisioned password
    const loginRes = await adapter.login('maya@silverspring.ymca', 'maya-secure-pass');
    expect(loginRes.userId).toBe(newTrainer.id);
    expect(loginRes.role).toBe('trainer');
  });

  it('allows Admin to update staff profile and role', async () => {
    const staffList = await adapter.listStaff();
    const trainer = staffList.find((s) => s.email === 'alex@silverspring.ymca');
    expect(trainer).toBeDefined();

    const updated = await adapter.updateStaff(trainer!.id, {
      roleLabel: 'Lead Master Fitness Instructor',
    });
    expect(updated.roleLabel).toBe('Lead Master Fitness Instructor');

    const refetched = await adapter.getStaff(trainer!.id);
    expect(refetched.roleLabel).toBe('Lead Master Fitness Instructor');
  });

  it('allows Admin to reset any member or staff password', async () => {
    // Initial login works
    const initialLogin = await adapter.login('jordan@silverspring.ymca', 'ymca-demo');
    expect(initialLogin.role).toBe('member');

    // Admin resets password
    await adapter.changeUserPassword('jordan@silverspring.ymca', 'NewSecretJordan2026!');

    // Old password should fail
    await expect(
      adapter.login('jordan@silverspring.ymca', 'ymca-demo')
    ).rejects.toThrow('Invalid credentials');

    // New password should succeed
    const newLogin = await adapter.login('jordan@silverspring.ymca', 'NewSecretJordan2026!');
    expect(newLogin.userId).toBe('member-jordan');
  });

  it('allows Admin to assign and reassign a trainer to a member', async () => {
    const memberId = 'member-jordan';
    const staffList = await adapter.listStaff();
    const alex = staffList.find((s) => s.email === 'alex@silverspring.ymca')!;
    const sarah = staffList.find((s) => s.email === 'sarah@silverspring.ymca')!;

    // Initially Alex is assigned
    const initialTrainer = await adapter.getAssignedTrainer(memberId);
    expect(initialTrainer?.id).toBe(alex.id);

    // Admin reassigns Jordan to Sarah
    await adapter.setAssignedTrainer(memberId, sarah.id);

    const updatedTrainer = await adapter.getAssignedTrainer(memberId);
    expect(updatedTrainer?.id).toBe(sarah.id);
    expect(updatedTrainer?.name).toBe('Sarah Jenkins');
  });

  it('allows Admin to create a new member with active membership and instant barcode', async () => {
    const res = await adapter.createMemberAdmin({
      name: 'Eleanor Vance',
      email: 'eleanor.vance@example.com',
      phone: '240-555-8899',
      address: '742 Evergreen Terr, Silver Spring, MD',
      planId: 'senior',
      password: 'eleanor-password',
      homeBranchId: 'silver-spring',
    });

    expect(res.member.name).toBe('Eleanor Vance');
    expect(res.member.membershipId).toHaveLength(6);
    expect(res.membership.rateName).toContain('Senior');
    expect(res.membership.status).toBe('active');

    // Member can log in
    const login = await adapter.login('eleanor.vance@example.com', 'eleanor-password');
    expect(login.userId).toBe(res.member.id);
    expect(login.role).toBe('member');

    // Member has welcome notification
    const notifs = await adapter.listNotifications(res.member.id);
    expect(notifs.some((n) => n.title.includes('Welcome to YMCA Silver Spring'))).toBe(true);
  });

  it('allows Admin to delete a staff member and clean up records', async () => {
    const tempStaff = await adapter.createStaff({
      name: 'Temporary Coach',
      email: 'temp.coach@silverspring.ymca',
      roleLabel: 'Seasonal Coach',
      homeBranchId: 'silver-spring',
      staffRole: 'trainer',
      password: 'temp-pass-123',
    });

    await adapter.deleteStaff(tempStaff.id);

    const list = await adapter.listStaff();
    expect(list.some((s) => s.id === tempStaff.id)).toBe(false);

    // Login fails
    await expect(
      adapter.login('temp.coach@silverspring.ymca', 'temp-pass-123')
    ).rejects.toThrow('Invalid credentials');
  });
});
