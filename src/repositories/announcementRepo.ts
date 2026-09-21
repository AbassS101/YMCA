import type { Announcement } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const announcementRepo = {
  list(api: ProtivityPort, branchId?: string): Promise<Announcement[]> {
    return api.listAnnouncements(branchId);
  },

  create(
    api: ProtivityPort,
    input: Omit<Announcement, 'id' | 'createdAt'>
  ): Promise<Announcement> {
    return api.createAnnouncement(input);
  },

  update(
    api: ProtivityPort,
    id: string,
    updates: Partial<Announcement>
  ): Promise<Announcement> {
    return api.updateAnnouncement(id, updates);
  },

  delete(api: ProtivityPort, id: string): Promise<void> {
    return api.deleteAnnouncement(id);
  },
};
