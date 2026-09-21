jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { isAdminRole } from '@/domain/types';
import { classForumRepo } from '@/repositories/classForumRepo';
import { resetStore } from '@/storage/demoStore';

describe('Admin Roles, Profile Avatars, and Class Community Forums', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Two Admin Types with Full Admin Privileges', () => {
    it('authenticates both IT Admin and Staff Admin with full administrative rights', async () => {
      // 1. IT Admin Login
      const itSession = await adapter.login('itadmin@silverspring.ymca', 'ymca-demo');
      expect(itSession.userId).toBe('staff-itadmin');
      expect(itSession.role).toBe('it_admin');
      expect(isAdminRole(itSession.role)).toBe(true);

      // 2. Staff Admin Login
      const staffAdminSession = await adapter.login('admin@silverspring.ymca', 'ymca-demo');
      expect(staffAdminSession.userId).toBe('staff-admin');
      expect(isAdminRole(staffAdminSession.role)).toBe(true);

      // 3. Regular member & trainer
      expect(isAdminRole('member')).toBe(false);
      expect(isAdminRole('trainer')).toBe(false);
      expect(isAdminRole('desk')).toBe(false);
    });

    it('creates new IT Admin and Staff Admin accounts with correct permissions', async () => {
      const newIT = await adapter.createStaff({
        name: 'Sarah IT Specialist',
        email: 'sarah.it@silverspring.ymca',
        roleLabel: 'Cloud Infrastructure Admin',
        homeBranchId: 'silver-spring',
        staffRole: 'it_admin',
        password: 'secure-password',
      });

      expect(newIT.staffRole).toBe('it_admin');

      const loginResult = await adapter.login('sarah.it@silverspring.ymca', 'secure-password');
      expect(loginResult.role).toBe('it_admin');
      expect(isAdminRole(loginResult.role)).toBe(true);
    });
  });

  describe('2. User Profile Photo and Silhouette Avatars', () => {
    it('updates and persists avatarUrl on member profile', async () => {
      const photoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb';
      const updatedMember = await adapter.updateMemberProfile('member-jordan', {
        avatarUrl: photoUrl,
      });

      expect(updatedMember.avatarUrl).toBe(photoUrl);

      const fetched = await adapter.getMember('member-jordan');
      expect(fetched.avatarUrl).toBe(photoUrl);
    });

    it('updates and persists avatarUrl on staff profile', async () => {
      const staffPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d';
      const updatedStaff = await adapter.updateStaff('staff-alex', {
        avatarUrl: staffPhoto,
      });

      expect(updatedStaff.avatarUrl).toBe(staffPhoto);

      const fetched = await adapter.getStaff('staff-alex');
      expect(fetched.avatarUrl).toBe(staffPhoto);
    });
  });

  describe('3. Class Community Forums & Chats', () => {
    const classId = 'sched-bodypump-mon';

    it('lists seeded forum posts for a class', async () => {
      const posts = await classForumRepo.list(adapter, classId);
      expect(posts.length).toBeGreaterThanOrEqual(4);

      // Pinned posts should be first
      expect(posts[0].pinned).toBe(true);
      expect(posts[0].authorRole).toBe('trainer');
    });

    it('allows a member to post a message in the class forum', async () => {
      const newPost = await classForumRepo.create(adapter, {
        classId,
        authorId: 'member-jordan',
        authorName: 'Jordan Hale',
        authorRole: 'member',
        content: 'Does anyone want to partner up for bench press sets today?',
      });

      expect(newPost.id).toBeDefined();
      expect(newPost.content).toBe('Does anyone want to partner up for bench press sets today?');
      expect(newPost.pinned).toBe(false);

      const list = await classForumRepo.list(adapter, classId);
      expect(list.some((p) => p.id === newPost.id)).toBe(true);
    });

    it('allows IT Admin and the respective trainer to pin announcements, but rejects regular members', async () => {
      // 1. Create a regular post
      const memberPost = await classForumRepo.create(adapter, {
        classId,
        authorId: 'member-jordan',
        authorName: 'Jordan Hale',
        authorRole: 'member',
        content: 'Hey everyone, check this out!',
      });

      // 2. Member trying to pin should be rejected
      await expect(
        classForumRepo.togglePin(adapter, memberPost.id, 'member-jordan')
      ).rejects.toThrow('Only IT Admins, Staff Admins, or the class trainer can pin announcements.');

      // 3. Respective Trainer (staff-alex teaches BodyPump Monday) can pin
      const pinnedByTrainer = await classForumRepo.togglePin(adapter, memberPost.id, 'staff-alex');
      expect(pinnedByTrainer.pinned).toBe(true);

      // 4. IT Admin (staff-itadmin) can also unpin
      const unpinnedByIT = await classForumRepo.togglePin(adapter, memberPost.id, 'staff-itadmin');
      expect(unpinnedByIT.pinned).toBe(false);

      // 5. Staff Admin (staff-admin) can also pin
      const pinnedByStaffAdmin = await classForumRepo.togglePin(adapter, memberPost.id, 'staff-admin');
      expect(pinnedByStaffAdmin.pinned).toBe(true);
    });

    it('moderation: author, respective trainer, and IT/Staff Admins can delete posts, while unauthorized members cannot', async () => {
      // Create a test post from Jordan
      const post = await classForumRepo.create(adapter, {
        classId,
        authorId: 'member-jordan',
        authorName: 'Jordan Hale',
        authorRole: 'member',
        content: 'Accidental message!',
      });

      // Another unauthorized user cannot delete Jordan's post
      await expect(
        classForumRepo.delete(adapter, post.id, 'staff-desk')
      ).rejects.toThrow('Only the post author, class trainer, or IT/Staff Admins can delete this message.');

      // Author CAN delete their own post
      await expect(
        classForumRepo.delete(adapter, post.id, 'member-jordan')
      ).resolves.not.toThrow();

      // Create another post
      const post2 = await classForumRepo.create(adapter, {
        classId,
        authorId: 'member-jordan',
        authorName: 'Jordan Hale',
        authorRole: 'member',
        content: 'Inappropriate spam to be moderated',
      });

      // IT Admin CAN moderate and delete
      await expect(
        classForumRepo.delete(adapter, post2.id, 'staff-itadmin')
      ).resolves.not.toThrow();

      const listAfter = await classForumRepo.list(adapter, classId);
      expect(listAfter.some((p) => p.id === post2.id)).toBe(false);
    });
  });
});
