import type { ScheduleCategory, ScheduleItem } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const scheduleRepo = {
  list(
    api: ProtivityPort,
    q: {
      branchId: string;
      from: string;
      to: string;
      category?: ScheduleCategory;
    }
  ): Promise<ScheduleItem[]> {
    return api.getSchedules(q);
  },

  getStaffDay(api: ProtivityPort, staffId: string, date: string): Promise<ScheduleItem[]> {
    return api.getStaffDay(staffId, date);
  },
};
