jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';
import { resetStore } from '@/storage/demoStore';
import { isAdminRole } from '@/domain/types';

describe('Complaints & Suggestions and Admin Staff Management', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Complaints & Suggestions Submission & Staff Response', () => {
    it('lists seeded complaints and suggestions', async () => {
      const list = await complaintSuggestionRepo.list(adapter, 'silver-spring');
      expect(list.length).toBeGreaterThanOrEqual(3);

      const hasPoolSuggestion = list.some((item) => item.title.includes('Lap Pool'));
      expect(hasPoolSuggestion).toBe(true);

      const hasDumbbellComplaint = list.some((item) => item.type === 'complaint' && item.isAnonymous);
      expect(hasDumbbellComplaint).toBe(true);
    });

    it('creates a new suggestion with member details', async () => {
      const created = await complaintSuggestionRepo.create(adapter, {
        type: 'suggestion',
        category: 'hours_schedules',
        title: 'Open early on Saturday mornings',
        details: 'Would love the wellness center to open at 6:30 AM on Saturdays for weekend workouts.',
        branchId: 'silver-spring',
        memberId: 'member-jordan',
        memberName: 'Jordan Hale',
        memberEmail: 'jordan@silverspring.ymca',
        isAnonymous: false,
      });

      expect(created.id).toBeDefined();
      expect(created.status).toBe('submitted');
      expect(created.isAnonymous).toBe(false);

      const memberList = await complaintSuggestionRepo.list(adapter, 'silver-spring', 'member-jordan');
      expect(memberList.some((item) => item.id === created.id)).toBe(true);
    });

    it('creates an anonymous complaint hiding personal details', async () => {
      const created = await complaintSuggestionRepo.create(adapter, {
        type: 'complaint',
        category: 'locker_rooms',
        title: 'Shower locker bench needs repair',
        details: 'The wooden bench near locker 42 is loose and wobbles.',
        branchId: 'silver-spring',
        isAnonymous: true,
      });

      expect(created.id).toBeDefined();
      expect(created.isAnonymous).toBe(true);
      expect(created.memberName).toBeUndefined();
    });

    it('allows staff to mark under review, add official response, and mark resolved', async () => {
      const list = await complaintSuggestionRepo.list(adapter, 'silver-spring');
      const target = list[0];

      const underReview = await complaintSuggestionRepo.updateStatus(
        adapter,
        target.id,
        'under_review',
        'Staff is investigating this item.',
        'staff-admin',
        'Jane Smith (Director)'
      );

      expect(underReview.status).toBe('under_review');
      expect(underReview.staffResponse).toBe('Staff is investigating this item.');
      expect(underReview.respondedByStaffName).toBe('Jane Smith (Director)');

      const resolved = await complaintSuggestionRepo.updateStatus(
        adapter,
        target.id,
        'resolved',
        'Issue has been resolved by facility maintenance.',
        'staff-admin',
        'Jane Smith (Director)'
      );

      expect(resolved.status).toBe('resolved');
      expect(resolved.staffResponse).toBe('Issue has been resolved by facility maintenance.');
    });
  });

  describe('2. Staff Account Creation and Customization (Staff Admin & IT Admin)', () => {
    it('verifies both staff_admin and it_admin are recognized as admin roles', () => {
      expect(isAdminRole('staff_admin')).toBe(true);
      expect(isAdminRole('it_admin')).toBe(true);
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('trainer')).toBe(false);
      expect(isAdminRole('desk')).toBe(false);
      expect(isAdminRole('member')).toBe(false);
    });

    it('allows admin to create a new customized staff account with avatar and credentials', async () => {
      const created = await adapter.createStaff({
        name: 'Taylor Brooks',
        email: 'taylor@silverspring.ymca',
        password: 'taylor-secret-pass',
        roleLabel: 'Youth Fitness Coach',
        staffRole: 'trainer',
        homeBranchId: 'silver-spring',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Taylor Brooks');
      expect(created.avatarUrl).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');

      // Can log in with the new staff credentials
      const loginResult = await adapter.login('taylor@silverspring.ymca', 'taylor-secret-pass');
      expect(loginResult.userId).toBe(created.id);
      expect(loginResult.role).toBe('trainer');
    });

    it('allows admin to update and customize staff profile attributes and roles', async () => {
      const staffList = await adapter.listStaff('silver-spring');
      const target = staffList.find((s) => s.id === 'staff-desk')!;

      const updated = await adapter.updateStaff(target.id, {
        name: 'Marcus Taylor (Updated)',
        roleLabel: 'Senior Front Desk Lead & Guest Concierge',
        staffRole: 'staff_admin',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(updated.name).toBe('Marcus Taylor (Updated)');
      expect(updated.roleLabel).toBe('Senior Front Desk Lead & Guest Concierge');
      expect(updated.staffRole).toBe('staff_admin');

      // Password can also be changed by admin
      await adapter.changeUserPassword(target.email, 'new-desk-pass-2026');
      const login = await adapter.login(target.email, 'new-desk-pass-2026');
      expect(login.userId).toBe(target.id);
      expect(login.role).toBe('staff_admin');
    });
  });
});
