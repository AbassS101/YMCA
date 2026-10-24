import type { Announcement } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const announcementRepo = {
  list(api: ProtivityPort, branchId?: string): Promise<Announcement[]> {
    return api.listAnnouncements(branchId);
  },

  create(
    api: ProtivityPort,
    input: Omit<Announcement, 'id' | 'createdAt'>,
    requesterUserId?: string
  ): Promise<Announcement> {
    return api.createAnnouncement(input, requesterUserId);
  },

  update(
    api: ProtivityPort,
    id: string,
    updates: Partial<Announcement>,
    requesterUserId?: string
  ): Promise<Announcement> {
    return api.updateAnnouncement(id, updates, requesterUserId);
  },

  delete(api: ProtivityPort, id: string, requesterUserId?: string): Promise<void> {
    return api.deleteAnnouncement(id, requesterUserId);
  },
};
