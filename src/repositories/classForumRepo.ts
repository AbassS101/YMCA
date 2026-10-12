import type { ClassForumPost, UserRole } from '@/domain/types';
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
    }
  ): Promise<ClassForumPost> {
    return api.createClassForumPost(input);
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
};
