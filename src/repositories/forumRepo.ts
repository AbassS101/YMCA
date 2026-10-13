import type {
  ForumContentReportInput,
  ForumReply,
  ForumTopic,
  ForumTopicCategory,
  Message,
  SupportTicket,
  Thread,
  UserForumInterests,
  UserRole,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const forumRepo = {
  listTopics(
    api: ProtivityPort,
    filter?: {
      category?: ForumTopicCategory;
      categories?: ForumTopicCategory[];
      staffMentioned?: boolean;
      authorId?: string;
      interestedUserId?: string;
      chattedByUserId?: string;
      chattedOrCreatedByUserId?: string;
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
      mentionedUserIds?: string[];
      mentionedUserNames?: string[];
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

  toggleInterestedTopic(api: ProtivityPort, topicId: string, userId: string): Promise<ForumTopic> {
    return api.toggleInterestedForumTopic(topicId, userId);
  },

  getInterests(api: ProtivityPort, userId: string): Promise<UserForumInterests> {
    return api.getForumInterests(userId);
  },

  updateInterests(
    api: ProtivityPort,
    userId: string,
    updates: Partial<Omit<UserForumInterests, 'userId'>>
  ): Promise<UserForumInterests> {
    return api.updateForumInterests(userId, updates);
  },

  toggleInterestedCategory(
    api: ProtivityPort,
    userId: string,
    category: ForumTopicCategory
  ): Promise<UserForumInterests> {
    return api.toggleInterestedForumCategory(userId, category);
  },

  toggleInterestedClass(
    api: ProtivityPort,
    userId: string,
    classId: string
  ): Promise<UserForumInterests> {
    return api.toggleInterestedClassForum(userId, classId);
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
      mentionedUserIds?: string[];
      mentionedUserNames?: string[];
      replyToId?: string;
      replyToAuthorName?: string;
      replyToExcerpt?: string;
    }
  ): Promise<ForumReply> {
    return api.createForumReply(input);
  },

  toggleReplyReaction(
    api: ProtivityPort,
    replyId: string,
    userId: string,
    emoji: string
  ): Promise<ForumReply> {
    return api.toggleForumReplyReaction(replyId, userId, emoji);
  },

  editReply(
    api: ProtivityPort,
    replyId: string,
    userId: string,
    content: string
  ): Promise<ForumReply> {
    return api.editForumReply(replyId, userId, content);
  },

  deleteReply(api: ProtivityPort, replyId: string, requesterUserId: string): Promise<void> {
    return api.deleteForumReply(replyId, requesterUserId);
  },

  toggleLikeReply(api: ProtivityPort, replyId: string, userId: string): Promise<ForumReply> {
    return api.toggleLikeForumReply(replyId, userId);
  },

  reportContent(
    api: ProtivityPort,
    input: ForumContentReportInput
  ): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    return api.reportForumContent(input);
  },
};
