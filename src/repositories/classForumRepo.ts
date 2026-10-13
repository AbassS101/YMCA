import type {
  ClassForumPost,
  ForumContentReportInput,
  Message,
  SupportTicket,
  Thread,
  UserRole,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const classForumRepo = {
  list(api: ProtivityPort, classId: string): Promise<ClassForumPost[]> {
    return api.listClassForumPosts(classId);
  },

  listRecentlyChattedClassIds(api: ProtivityPort, userId: string): Promise<string[]> {
    return api.listRecentlyChattedClassIds(userId);
  },

  create(
    api: ProtivityPort,
    input: {
      classId: string;
      authorId: string;
      authorName: string;
      authorRole: UserRole | string;
      authorAvatarUrl?: string;
      content: string;
      pinned?: boolean;
      mentionedUserIds?: string[];
      mentionedUserNames?: string[];
      replyToId?: string;
      replyToAuthorName?: string;
      replyToExcerpt?: string;
    }
  ): Promise<ClassForumPost> {
    return api.createClassForumPost(input);
  },

  toggleReaction(
    api: ProtivityPort,
    postId: string,
    userId: string,
    emoji: string
  ): Promise<ClassForumPost> {
    return api.toggleClassForumPostReaction(postId, userId, emoji);
  },

  edit(
    api: ProtivityPort,
    postId: string,
    userId: string,
    content: string
  ): Promise<ClassForumPost> {
    return api.editClassForumPost(postId, userId, content);
  },

  delete(api: ProtivityPort, postId: string, requesterUserId: string): Promise<void> {
    return api.deleteClassForumPost(postId, requesterUserId);
  },

  togglePin(
    api: ProtivityPort,
    postId: string,
    requesterUserId: string
  ): Promise<ClassForumPost> {
    return api.togglePinClassForumPost(postId, requesterUserId);
  },

  reportPost(
    api: ProtivityPort,
    input: Omit<ForumContentReportInput, 'targetType'>
  ): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    return api.reportForumContent({
      ...input,
      targetType: 'class_post',
    });
  },
};
