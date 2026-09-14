import type { LessonSlot, PrivateLesson } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const lessonRepo = {
  listOpenSlots(
    api: ProtivityPort,
    staffId: string,
    from: string,
    to: string
  ): Promise<LessonSlot[]> {
    return api.listLessonSlots(staffId, from, to);
  },

  listMine(api: ProtivityPort, memberId: string): Promise<PrivateLesson[]> {
    return api.listMyLessons(memberId);
  },

  listStaffDay(api: ProtivityPort, staffId: string, date: string): Promise<PrivateLesson[]> {
    return api.listStaffLessons(staffId, date);
  },

  book(api: ProtivityPort, memberId: string, slotId: string): Promise<PrivateLesson> {
    return api.bookPrivateLesson(memberId, slotId);
  },

  cancel(api: ProtivityPort, memberId: string, lessonId: string): Promise<PrivateLesson> {
    return api.cancelPrivateLesson(memberId, lessonId);
  },

  /** Cancel current lesson and book a different open slot with the same trainer. */
  async change(
    api: ProtivityPort,
    memberId: string,
    lessonId: string,
    newSlotId: string
  ): Promise<PrivateLesson> {
    await api.cancelPrivateLesson(memberId, lessonId);
    return api.bookPrivateLesson(memberId, newSlotId);
  },
};
