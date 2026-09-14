import type { ClassRegistration, Member, ScheduleItem } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const registrationRepo = {
  listMine(api: ProtivityPort, memberId: string): Promise<ClassRegistration[]> {
    return api.listMyRegistrations(memberId);
  },

  register(
    api: ProtivityPort,
    memberId: string,
    scheduleItemId: string
  ): Promise<ClassRegistration> {
    return api.registerForClass(memberId, scheduleItemId);
  },

  cancel(
    api: ProtivityPort,
    memberId: string,
    scheduleItemId: string
  ): Promise<ClassRegistration> {
    return api.cancelClassRegistration(memberId, scheduleItemId);
  },

  roster(api: ProtivityPort, scheduleItemId: string): Promise<Member[]> {
    return api.listClassRoster(scheduleItemId);
  },

  /** Cancel current registration and register for another occurrence of the same title. */
  async change(
    api: ProtivityPort,
    memberId: string,
    fromItem: ScheduleItem,
    toItem: ScheduleItem
  ): Promise<ClassRegistration> {
    if (fromItem.title !== toItem.title) {
      throw new Error('Can only change to another session of the same class');
    }
    if (fromItem.id === toItem.id) {
      throw new Error('Already registered for this session');
    }
    await api.cancelClassRegistration(memberId, fromItem.id);
    return api.registerForClass(memberId, toItem.id);
  },
};
