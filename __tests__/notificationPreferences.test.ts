jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { notificationRepo } from '@/repositories/notificationRepo';
import { forumRepo } from '@/repositories/forumRepo';
import { resetStore } from '@/storage/demoStore';

describe('Notification Preferences and Alert Management', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Default Preferences & Persistence', () => {
    it('retrieves default preferences for a member', async () => {
      const prefs = await notificationRepo.getPreferences(adapter, 'member-jordan');
      expect(prefs).toBeDefined();
      expect(prefs.mentions).toBe(true);
      expect(prefs.topicReplies).toBe(true);
      expect(prefs.staffInquiries).toBe(false);
      expect(prefs.announcements).toBe(true);
      expect(prefs.events).toBe(true);
      expect(prefs.pushEnabled).toBe(true);
      expect(prefs.emailDigest).toBe('daily');
      expect(prefs.quietHoursEnabled).toBe(false);
    });

    it('generates fallback default preferences for any new user', async () => {
      const prefs = await notificationRepo.getPreferences(adapter, 'new-user-123');
      expect(prefs.userId).toBe('new-user-123');
      expect(prefs.mentions).toBe(true);
      expect(prefs.topicReplies).toBe(true);
      expect(prefs.pushEnabled).toBe(true);
    });

    it('updates and persists user preferences', async () => {
      const updated = await notificationRepo.updatePreferences(adapter, 'member-jordan', {
        mentions: false,
        emailDigest: 'weekly',
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      });

      expect(updated.mentions).toBe(false);
      expect(updated.emailDigest).toBe('weekly');
      expect(updated.quietHoursEnabled).toBe(true);

      // Re-fetch to ensure persistence
      const fetched = await notificationRepo.getPreferences(adapter, 'member-jordan');
      expect(fetched.mentions).toBe(false);
      expect(fetched.emailDigest).toBe('weekly');
      expect(fetched.quietHoursStart).toBe('23:00');
    });
  });

  describe('2. @ Mentions & Staff Desk Inquiries Filtering', () => {
    it('dispatches @mention notifications to target when mentions are enabled', async () => {
      // Ensure staff-alex has mentions enabled
      await notificationRepo.updatePreferences(adapter, 'staff-alex', { mentions: true });

      const initialCount = (await notificationRepo.list(adapter, 'staff-alex')).length;

      await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Question for Alex regarding lap swimming',
        content: 'Hey @Alex Rivera, what are the best times for open lanes?',
        category: 'swim',
        mentionedStaffIds: ['staff-alex'],
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'staff-alex');
      expect(updatedNotifs.length).toBe(initialCount + 1);

      const latest = updatedNotifs[0];
      expect(latest.type).toBe('forum_mention');
      expect(latest.title).toContain('Mention from Jordan Taylor');
      expect(latest.link).toBe('/(member)/community-forum');
    });

    it('suppresses @mention notifications if target user disabled mentions', async () => {
      // Disable mentions for staff-alex
      await notificationRepo.updatePreferences(adapter, 'staff-alex', { mentions: false });

      const initialCount = (await notificationRepo.list(adapter, 'staff-alex')).length;

      await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Another question for Alex',
        content: 'Hey @Alex Rivera, checking again on lanes',
        category: 'swim',
        mentionedStaffIds: ['staff-alex'],
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'staff-alex');
      // Should not have received a mention notification
      expect(updatedNotifs.length).toBe(initialCount);
    });

    it('dispatches @staff_inquiry to staff-desk when staffInquiries is enabled', async () => {
      await notificationRepo.updatePreferences(adapter, 'staff-desk', { staffInquiries: true });

      const initialCount = (await notificationRepo.list(adapter, 'staff-desk')).length;

      await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'General question for the front desk',
        content: 'Can someone at @All Staff Desk confirm weekend hours?',
        category: 'general',
        mentionedStaffIds: ['staff-all'],
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'staff-desk');
      expect(updatedNotifs.length).toBe(initialCount + 1);

      const latest = updatedNotifs[0];
      expect(latest.type).toBe('staff_inquiry');
      expect(latest.title).toContain('@ Staff Desk: Question from Jordan Taylor');
    });

    it('suppresses @staff_inquiry when staffInquiries is disabled', async () => {
      await notificationRepo.updatePreferences(adapter, 'staff-desk', { staffInquiries: false });

      const initialCount = (await notificationRepo.list(adapter, 'staff-desk')).length;

      await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Muted front desk inquiry',
        content: 'Hey @All Staff Desk, are towels provided?',
        category: 'general',
        mentionedStaffIds: ['staff-all'],
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'staff-desk');
      expect(updatedNotifs.length).toBe(initialCount);
    });
  });

  describe('3. Forum Topic Replies Notifications', () => {
    it('notifies topic author when someone replies to their topic and topicReplies is enabled', async () => {
      // Create a topic authored by Jordan
      const topic = await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Weekend running club meetup',
        content: 'Who is free this Saturday morning for a 5k trail run?',
        category: 'fitness',
      });

      await notificationRepo.updatePreferences(adapter, 'member-jordan', { topicReplies: true });
      const initialCount = (await notificationRepo.list(adapter, 'member-jordan')).length;

      // Alex replies to Jordan's topic
      await forumRepo.createReply(adapter, {
        topicId: topic.id,
        authorId: 'staff-alex',
        authorName: 'Alex Rivera',
        authorRole: 'trainer',
        content: 'Count me in! What time are we meeting?',
        isStaffReply: true,
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'member-jordan');
      expect(updatedNotifs.length).toBe(initialCount + 1);

      const latest = updatedNotifs[0];
      expect(latest.type).toBe('forum_reply');
      expect(latest.title).toContain('Official YMCA Response: Alex Rivera');
      expect(latest.body).toContain('Weekend running club meetup');
      expect(latest.body).toContain('Count me in');
      expect(latest.link).toBe('/(member)/community-forum');
    });

    it('does not send self-notification when author replies to their own topic', async () => {
      const topic = await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Solo training notes',
        content: 'Testing my own topic',
        category: 'fitness',
      });

      const initialCount = (await notificationRepo.list(adapter, 'member-jordan')).length;

      // Jordan replies to own topic
      await forumRepo.createReply(adapter, {
        topicId: topic.id,
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        content: 'Adding an update for myself',
        isStaffReply: false,
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'member-jordan');
      expect(updatedNotifs.length).toBe(initialCount);
    });

    it('suppresses topic reply notification if topic author has disabled topicReplies', async () => {
      const topic = await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Quiet topic without notifications',
        content: 'No alerts please',
        category: 'community',
      });

      // Disable topicReplies for Jordan
      await notificationRepo.updatePreferences(adapter, 'member-jordan', { topicReplies: false });
      const initialCount = (await notificationRepo.list(adapter, 'member-jordan')).length;

      // Alex replies
      await forumRepo.createReply(adapter, {
        topicId: topic.id,
        authorId: 'staff-alex',
        authorName: 'Alex Rivera',
        authorRole: 'trainer',
        content: 'Replying anyway!',
        isStaffReply: true,
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'member-jordan');
      expect(updatedNotifs.length).toBe(initialCount);
    });

    it('notifies users mentioned inside reply body if mentions are enabled', async () => {
      const topic = await forumRepo.createTopic(adapter, {
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        title: 'Pool schedule debate',
        content: 'Let us discuss pool times',
        category: 'swim',
      });

      await notificationRepo.updatePreferences(adapter, 'staff-alex', { mentions: true });
      const initialCount = (await notificationRepo.list(adapter, 'staff-alex')).length;

      // Jordan replies and mentions Alex
      await forumRepo.createReply(adapter, {
        topicId: topic.id,
        authorId: 'member-jordan',
        authorName: 'Jordan Taylor',
        authorRole: 'member',
        content: 'What do you think @Alex Rivera about keeping lanes open until 9pm?',
        isStaffReply: false,
        mentionedStaffIds: ['staff-alex'],
      });

      const updatedNotifs = await notificationRepo.list(adapter, 'staff-alex');
      expect(updatedNotifs.length).toBe(initialCount + 1);

      const latest = updatedNotifs[0];
      expect(latest.type).toBe('forum_mention');
      expect(latest.title).toContain('Reply Mention from Jordan Taylor');
    });
  });
});
