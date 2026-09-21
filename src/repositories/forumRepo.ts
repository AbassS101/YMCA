import type { ForumReply, ForumTopic, ForumTopicCategory, UserRole } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const forumRepo = {
  listTopics(
    api: ProtivityPort,
    filter?: {
      category?: ForumTopicCategory;
      staffMentioned?: boolean;
      authorId?: string;
      searchQuery?: string;
    }
  ): Promise<ForumTopic[]> {
    return api.listForumTopics(filter);
  },

  getTopic(api: ProtivityPort, topicId: string): Promise<ForumTopic | null> {
    return api.getForumTopic(topicId);
  },

  createTopic(
    api: ProtivityPort,
    input: {
      title: string;
      content: string;
      category: ForumTopicCategory;
      authorId: string;
      authorName: string;
      authorRole: UserRole | string;
      authorAvatarUrl?: string;
      pinned?: boolean;
      mentionedStaffIds?: string[];
      mentionedStaffNames?: string[];
    }
  ): Promise<ForumTopic> {
    return api.createForumTopic(input);
  },

  deleteTopic(api: ProtivityPort, topicId: string, requesterUserId: string): Promise<void> {
    return api.deleteForumTopic(topicId, requesterUserId);
  },

  togglePinTopic(
    api: ProtivityPort,
    topicId: string,
    requesterUserId: string
  ): Promise<ForumTopic> {
    return api.togglePinForumTopic(topicId, requesterUserId);
  },

  toggleLikeTopic(api: ProtivityPort, topicId: string, userId: string): Promise<ForumTopic> {
    return api.toggleLikeForumTopic(topicId, userId);
  },

  listReplies(api: ProtivityPort, topicId: string): Promise<ForumReply[]> {
    return api.listForumReplies(topicId);
  },

  createReply(
    api: ProtivityPort,
    input: {
      topicId: string;
      content: string;
      authorId: string;
      authorName: string;
      authorRole: UserRole | string;
      authorAvatarUrl?: string;
      isStaffReply: boolean;
      mentionedStaffIds?: string[];
    }
  ): Promise<ForumReply> {
    return api.createForumReply(input);
  },

  deleteReply(api: ProtivityPort, replyId: string, requesterUserId: string): Promise<void> {
    return api.deleteForumReply(replyId, requesterUserId);
  },

  toggleLikeReply(api: ProtivityPort, replyId: string, userId: string): Promise<ForumReply> {
    return api.toggleLikeForumReply(replyId, userId);
  },
};
