import type { Message, Thread } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const messageRepo = {
  listMessages(api: ProtivityPort, threadId: string): Promise<Message[]> {
    return api.listMessages(threadId);
  },

  listThreads(api: ProtivityPort, userId: string): Promise<Thread[]> {
    return api.listThreads(userId);
  },

  createStaffGroup(api: ProtivityPort, creatorId: string, name: string, staffIds: string[]): Promise<Thread> {
    return api.createStaffGroup(creatorId, name, staffIds);
  },

  getOrCreateThread(
    api: ProtivityPort,
    memberId: string,
    staffId: string
  ): Promise<Thread> {
    return api.getOrCreateThread(memberId, staffId);
  },

  sendMessage(
    api: ProtivityPort,
    input: {
      threadId: string;
      fromId: string;
      body: string;
      replyToId?: string;
      replyToAuthorName?: string;
      replyToExcerpt?: string;
    }
  ): Promise<Message> {
    return api.sendMessage(input);
  },

  editMessage(api: ProtivityPort, id: string, userId: string, body: string): Promise<Message> {
    return api.editMessage(id, userId, body);
  },

  toggleReaction(api: ProtivityPort, id: string, userId: string, emoji: string): Promise<Message> {
    return api.toggleMessageReaction(id, userId, emoji);
  },

  deleteMessage(api: ProtivityPort, id: string, userId: string): Promise<void> {
    return api.deleteMessage(id, userId);
  },
};
