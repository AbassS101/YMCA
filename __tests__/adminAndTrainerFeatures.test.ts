jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

describe('Staff Admin and Trainer Capabilities', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Role Authentication', () => {
    it('authenticates admin with admin role', async () => {
      const session = await adapter.login('admin@silverspring.ymca', 'ymca-demo');
      expect(session.userId).toBe('staff-admin');
      expect(session.role).toBe('admin');
    });

    it('authenticates trainer with trainer role', async () => {
      const session = await adapter.login('alex@silverspring.ymca', 'ymca-demo');
      expect(session.userId).toBe('staff-alex');
      expect(session.role).toBe('trainer');
    });
  });

  describe('2. Admin Announcement CRUD & Broadcast', () => {
    it('creates announcement, broadcasts notifications to all members, updates and deletes it', async () => {
      // 1. Create announcement
      const ann = await adapter.createAnnouncement({
        branchId: 'silver-spring',
        title: 'Heated Lap Pool Maintenance Update',
        body: 'Dry saunas and 25m lanes will be open for extended hours this weekend.',
        category: 'facility',
        priority: 'high',
        authorName: 'Pat Nguyen (Staff Admin)',
        pinned: true,
      });
      expect(ann.id).toBeDefined();

      // Verify member received notification
      const memberNotifs = await adapter.listNotifications('member-jordan');
      const found = memberNotifs.find((n) => n.title === 'Heated Lap Pool Maintenance Update');
      expect(found).toBeDefined();
      expect(found?.type).toBe('announcement');

      // 2. Update announcement
      const updated = await adapter.updateAnnouncement(ann.id, {
        title: 'Heated Lap Pool Maintenance Concluded',
        priority: 'urgent',
      });
      expect(updated.title).toBe('Heated Lap Pool Maintenance Concluded');
      expect(updated.priority).toBe('urgent');

      // 3. Delete announcement
      await adapter.deleteAnnouncement(ann.id);
      const allAnns = await adapter.listAnnouncements('silver-spring');
      expect(allAnns.find((a) => a.id === ann.id)).toBeUndefined();
    });
  });

  describe('3. Admin Schedule & Event CRUD', () => {
    it('creates class, updates it, notifies on time change, and cancels with reason', async () => {
      // 1. Create new community event
      const created = await adapter.createScheduleItem({
        branchId: 'silver-spring',
        title: 'Community Pickleball Tournament',
        category: 'event',
        instructorName: 'Alex Rivera',
        staffId: 'staff-alex',
        start: '2026-09-19T09:00:00-04:00',
        end: '2026-09-19T12:00:00-04:00',
        location: 'JOOLA Pickleball Courts 1-4',
        capacity: 32,
        priceCents: 1500,
        isSpecialEvent: true,
        seniorFriendly: true,
        description: 'Double elimination tournament with prizes.',
      });
      expect(created.id).toBeDefined();
      expect(created.title).toBe('Community Pickleball Tournament');

      // Register Jordan Hale for the event
      await adapter.registerForClass('member-jordan', created.id);
      const roster = await adapter.listClassRoster(created.id);
      expect(roster.some((m) => m.id === 'member-jordan')).toBe(true);

      // 2. Update time and verify rostered member receives notification
      await adapter.updateScheduleItem(created.id, {
        start: '2026-09-19T10:00:00-04:00',
        end: '2026-09-19T13:00:00-04:00',
      });
      const jordanNotifs = await adapter.listNotifications('member-jordan');
      const timeAlert = jordanNotifs.find((n) => n.title.includes('Schedule Update'));
      expect(timeAlert).toBeDefined();

      // 3. Cancel and delete schedule item with reason
      await adapter.deleteScheduleItem(created.id, 'Severe weather condition');
      const finalNotifs = await adapter.listNotifications('member-jordan');
      const cancelAlert = finalNotifs.find((n) => n.title.includes('Cancelled: Community Pickleball'));
      expect(cancelAlert).toBeDefined();
      expect(cancelAlert?.body).toContain('Severe weather condition');

      // Verify item removed from schedule
      const allSchedules = await adapter.listAllSchedules('silver-spring');
      expect(allSchedules.find((s) => s.id === created.id)).toBeUndefined();
    });
  });

  describe('4. Admin Member Account Management', () => {
    it('allows admin to list all members, edit profile, change membership plan, and delete account', async () => {
      // 1. List all members
      const members = await adapter.listAllMembers('silver-spring');
      expect(members.length).toBeGreaterThan(0);
      expect(members.some((m) => m.id === 'member-jordan')).toBe(true);

      // 2. Update member contact info
      const updatedMember = await adapter.updateMemberAdmin('member-jordan', {
        name: 'Jordan Hale-Smith',
        phone: '(301) 555-9999',
        address: '456 Colesville Rd, Silver Spring, MD 20910',
      });
      expect(updatedMember.name).toBe('Jordan Hale-Smith');
      expect(updatedMember.phone).toBe('(301) 555-9999');

      // 3. Admin updates membership plan directly
      const updatedMembership = await adapter.updateMembershipAdmin('member-jordan', {
        rateName: 'Family / Household',
        monthlyAmountCents: 14500,
        status: 'active',
      });
      expect(updatedMembership.rateName).toBe('Family / Household');
      expect(updatedMembership.monthlyAmountCents).toBe(14500);

      const reloadedMember = await adapter.getMember('member-jordan');
      expect(reloadedMember.type).toBe('Family / Household');

      // 4. Admin deletes member account permanently
      await adapter.deleteMemberAccount('member-jordan');
      await expect(adapter.getMember('member-jordan')).rejects.toThrow();
      await expect(adapter.getMembership('member-jordan')).rejects.toThrow();

      // Verify credentials removed
      await expect(adapter.login('jordan@silverspring.ymca', 'ymca-demo')).rejects.toThrow();
    });
  });

  describe('5. Trainer Capabilities', () => {
    it('allows trainer to view own schedule, manage lesson slots, cancel class & private lesson with alerts', async () => {
      // 1. Trainer views assigned schedule
      const trainerClasses = await adapter.listTrainerSchedule('staff-alex');
      expect(trainerClasses.length).toBeGreaterThan(0);
      expect(trainerClasses[0].instructorName).toBe('Alex Rivera');

      // 2. Trainer adds an open lesson slot
      const slot = await adapter.addLessonSlot({
        staffId: 'staff-alex',
        branchId: 'silver-spring',
        start: '2026-09-17T14:00:00-04:00',
        end: '2026-09-17T15:00:00-04:00',
        location: 'Wellness Center Free Weights',
      });
      expect(slot.id).toBeDefined();

      const slots = await adapter.listLessonSlots('staff-alex', '2026-09-01', '2026-09-30');
      expect(slots.some((s) => s.id === slot.id)).toBe(true);

      // 3. Member books the slot
      const booked = await adapter.bookPrivateLesson('member-jordan', slot.id);
      expect(booked.status).toBe('booked');

      // 4. Trainer reschedules private lesson
      await adapter.rescheduleLesson(
        booked.id,
        '2026-09-17T15:00:00-04:00',
        '2026-09-17T16:00:00-04:00',
        'Studio B'
      );
      const memberNotifs = await adapter.listNotifications('member-jordan');
      expect(memberNotifs.some((n) => n.title === 'Private Lesson Rescheduled')).toBe(true);

      // 5. Trainer cancels private lesson with custom reason
      await adapter.cancelLessonAndNotify(booked.id, 'Trainer emergency medical appointment');
      const updatedNotifs = await adapter.listNotifications('member-jordan');
      const cancelNotif = updatedNotifs.find((n) => n.title === 'Private Lesson Cancelled');
      expect(cancelNotif).toBeDefined();
      expect(cancelNotif?.body).toContain('Trainer emergency medical appointment');

      // 6. Trainer deletes open slot
      const openSlot = await adapter.addLessonSlot({
        staffId: 'staff-alex',
        branchId: 'silver-spring',
        start: '2026-09-20T10:00:00-04:00',
        end: '2026-09-20T11:00:00-04:00',
        location: 'Studio A',
      });
      await adapter.deleteLessonSlot(openSlot.id);
      const slotsAfter = await adapter.listLessonSlots('staff-alex', '2026-09-01', '2026-09-30');
      expect(slotsAfter.some((s) => s.id === openSlot.id)).toBe(false);
    });
  });
});
