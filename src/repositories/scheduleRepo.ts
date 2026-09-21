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

  listAll(api: ProtivityPort, branchId?: string): Promise<ScheduleItem[]> {
    return api.listAllSchedules(branchId);
  },

  getStaffDay(api: ProtivityPort, staffId: string, date: string): Promise<ScheduleItem[]> {
    return api.getStaffDay(staffId, date);
  },

  listTrainerSchedule(api: ProtivityPort, staffId: string): Promise<ScheduleItem[]> {
    return api.listTrainerSchedule(staffId);
  },

  create(api: ProtivityPort, item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    return api.createScheduleItem(item);
  },

  update(api: ProtivityPort, id: string, updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
    return api.updateScheduleItem(id, updates);
  },

  delete(api: ProtivityPort, id: string, notifyReason?: string): Promise<void> {
    return api.deleteScheduleItem(id, notifyReason);
  },

  cancelClassAndNotify(api: ProtivityPort, scheduleItemId: string, reason: string): Promise<void> {
    return api.cancelClassAndNotify(scheduleItemId, reason);
  },
};
