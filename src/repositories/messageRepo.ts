import type { Message, Thread } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const messageRepo = {
  listMessages(api: ProtivityPort, threadId: string): Promise<Message[]> {
    return api.listMessages(threadId);
  },

  listThreads(api: ProtivityPort, userId: string): Promise<Thread[]> {
    return api.listThreads(userId);
  },

  sendMessage(
    api: ProtivityPort,
    input: { threadId: string; fromId: string; body: string }
  ): Promise<Message> {
    return api.sendMessage(input);
  },
};
