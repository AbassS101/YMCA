jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { forumRepo } from '@/repositories/forumRepo';
import { resetStore } from '@/storage/demoStore';

describe('Dedicated YMCA Community Forum & @ Staff Mentions', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Seeded Community Forum Topics', () => {
    it('loads initial seeded forum topics with categories and replies', async () => {
      const topics = await forumRepo.listTopics(adapter);
      expect(topics.length).toBeGreaterThanOrEqual(5);

      // Pinned topic should be first
      expect(topics[0].pinned).toBe(true);
      expect(topics[0].id).toBe('topic-welcome');

      // Check categories
      const categories = topics.map((t) => t.category);
      expect(categories).toContain('general');
      expect(categories).toContain('swim');
      expect(categories).toContain('fitness');
      expect(categories).toContain('community');
    });

    it('filters topics by category', async () => {
      const swimTopics = await forumRepo.listTopics(adapter, { category: 'swim' });
      expect(swimTopics.length).toBeGreaterThanOrEqual(1);
      expect(swimTopics.every((t) => t.category === 'swim')).toBe(true);

      const fitnessTopics = await forumRepo.listTopics(adapter, { category: 'fitness' });
      expect(fitnessTopics.length).toBeGreaterThanOrEqual(1);
      expect(fitnessTopics.every((t) => t.category === 'fitness')).toBe(true);
    });

    it('filters topics where staff was @ mentioned', async () => {
      const staffAsked = await forumRepo.listTopics(adapter, { staffMentioned: true });
      expect(staffAsked.length).toBeGreaterThanOrEqual(3);
      expect(
        staffAsked.every((t) => t.mentionedStaffIds && t.mentionedStaffIds.length > 0)
      ).toBe(true);
    });

    it('searches topics by keyword', async () => {
      const searchResults = await forumRepo.listTopics(adapter, { searchQuery: 'Pickleball' });
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].title).toContain('Pickleball');
    });
  });

  describe('2. Creating Forum Topics with @ Staff Mentions', () => {
    it('creates a new topic with @ staff mention and notifies staff', async () => {
      const newTopic = await forumRepo.createTopic(adapter, {
        title: '@Alex Rivera Are weightlifting belts recommended for beginners?',
        content: 'Hi Alex, I am starting heavy compound lifts and wondering if a 4-inch leather belt helps core stability.',
        category: 'fitness',
        authorId: 'member-jordan',
        authorName: 'Jordan Hale',
        authorRole: 'member',
        mentionedStaffIds: ['staff-alex'],
        mentionedStaffNames: ['Alex Rivera (Trainer)'],
      });

      expect(newTopic.id).toBeDefined();
      expect(newTopic.title).toContain('@Alex Rivera');
      expect(newTopic.mentionedStaffIds).toContain('staff-alex');
      expect(newTopic.likes).toBe(0);
      expect(newTopic.replyCount).toBe(0);

      // Verify topic appears in topics list
      const topics = await forumRepo.listTopics(adapter);
      expect(topics.some((t) => t.id === newTopic.id)).toBe(true);

      // Verify in-app notification was generated for staff-alex
      const staffNotifications = await adapter.listNotifications('staff-alex');
      const mentionNotif = staffNotifications.find((n) => n.relatedId === newTopic.id);
      expect(mentionNotif).toBeDefined();
      expect(mentionNotif?.title).toContain('Jordan Hale');
    });
  });

  describe('3. Threaded Forum Replies & Staff Answers', () => {
    it('lists existing replies for a topic', async () => {
      const replies = await forumRepo.listReplies(adapter, 'topic-pool-winter');
      expect(replies.length).toBeGreaterThanOrEqual(2);

      // Staff reply check
      const staffReply = replies.find((r) => r.isStaffReply);
      expect(staffReply).toBeDefined();
      expect(staffReply?.authorName).toBe('Marcus Vance');
    });

    it('allows members and staff to post replies to a topic', async () => {
      const topicId = 'topic-pickleball';

      const reply = await forumRepo.createReply(adapter, {
        topicId,
        content: 'I would love to join! What level paddle do you recommend bringing?',
        authorId: 'member-carlos',
        authorName: 'Carlos Mendez',
        authorRole: 'member',
        isStaffReply: false,
      });

      expect(reply.id).toBeDefined();
      expect(reply.content).toContain('What level paddle');

      // Verify reply appears in topic replies list
      const updatedReplies = await forumRepo.listReplies(adapter, topicId);
      expect(updatedReplies.some((r) => r.id === reply.id)).toBe(true);

      // Verify topic replyCount incremented
      const updatedTopic = await forumRepo.getTopic(adapter, topicId);
      expect(updatedTopic?.replyCount).toBeGreaterThanOrEqual(3);
    });

    it('marks topic as hasStaffReply when a staff member responds', async () => {
      const topicId = 'topic-squat-warmup';

      const staffReply = await forumRepo.createReply(adapter, {
        topicId,
        content: 'Always ensure your core is braced with 360-degree diaphragmatic breathing before descending!',
        authorId: 'staff-alex',
        authorName: 'Alex Rivera',
        authorRole: 'trainer',
        isStaffReply: true,
      });

      expect(staffReply.isStaffReply).toBe(true);

      const topic = await forumRepo.getTopic(adapter, topicId);
      expect(topic?.hasStaffReply).toBe(true);
    });
  });

  describe('4. Likes & Interactivity', () => {
    it('toggles like on a forum topic', async () => {
      const topicId = 'topic-squat-warmup';
      const initialTopic = await forumRepo.getTopic(adapter, topicId);
      const initialLikes = initialTopic?.likes ?? 0;

      // Jordan likes the topic
      const liked = await forumRepo.toggleLikeTopic(adapter, topicId, 'member-jordan');
      expect(liked.likes).toBe(initialLikes + 1);
      expect(liked.likedBy).toContain('member-jordan');

      // Jordan unlikes the topic
      const unliked = await forumRepo.toggleLikeTopic(adapter, topicId, 'member-jordan');
      expect(unliked.likes).toBe(initialLikes);
      expect(unliked.likedBy).not.toContain('member-jordan');
    });

    it('toggles like on a forum reply', async () => {
      const replies = await forumRepo.listReplies(adapter, 'topic-welcome');
      const firstReply = replies[0];
      const initialLikes = firstReply.likes;

      const liked = await forumRepo.toggleLikeReply(adapter, firstReply.id, 'member-jordan');
      expect(liked.likes).toBe(initialLikes + 1);

      const unliked = await forumRepo.toggleLikeReply(adapter, firstReply.id, 'member-jordan');
      expect(unliked.likes).toBe(initialLikes);
    });
  });

  describe('5. Topic Pinning and Permissions', () => {
    it('allows staff or admin to toggle topic pin', async () => {
      const topicId = 'topic-pickleball';

      // Staff admin pins topic
      const pinned = await forumRepo.togglePinTopic(adapter, topicId, 'staff-admin');
      expect(pinned.pinned).toBe(true);

      // Pinned topic should now sort to the top of list
      const topics = await forumRepo.listTopics(adapter);
      expect(topics.findIndex((t) => t.id === topicId)).toBeLessThan(3);

      // Staff admin unpins topic
      const unpinned = await forumRepo.togglePinTopic(adapter, topicId, 'staff-admin');
      expect(unpinned.pinned).toBe(false);
    });

    it('rejects pinning by regular member', async () => {
      await expect(
        forumRepo.togglePinTopic(adapter, 'topic-pickleball', 'member-jordan')
      ).rejects.toThrow('Only staff or administrators can pin forum topics.');
    });
  });

  describe('6. Deleting Topics and Replies', () => {
    it('allows author to delete their own topic', async () => {
      const topic = await forumRepo.createTopic(adapter, {
        title: 'Temporary Question to Delete',
        content: 'Testing delete functionality.',
        category: 'general',
        authorId: 'member-jordan',
        authorName: 'Jordan Hale',
        authorRole: 'member',
      });

      await forumRepo.deleteTopic(adapter, topic.id, 'member-jordan');
      const fetched = await forumRepo.getTopic(adapter, topic.id);
      expect(fetched).toBeNull();
    });

    it('allows staff admin to delete any inappropriate topic', async () => {
      const topic = await forumRepo.createTopic(adapter, {
        title: 'Spam Topic',
        content: 'Buy cheap watches now!',
        category: 'general',
        authorId: 'member-other',
        authorName: 'Unknown User',
        authorRole: 'member',
      });

      await forumRepo.deleteTopic(adapter, topic.id, 'staff-admin');
      const fetched = await forumRepo.getTopic(adapter, topic.id);
      expect(fetched).toBeNull();
    });
  });
});
