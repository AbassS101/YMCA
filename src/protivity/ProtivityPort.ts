import type {
  CancelRequest,
  ClassRegistration,
  LessonSlot,
  Member,
  Membership,
  Message,
  PrivateLesson,
  ScheduleCategory,
  ScheduleItem,
  Staff,
  Thread,
  UserRole,
} from '@/domain/types';

export interface ProtivityPort {
  login(email: string, password: string): Promise<{ userId: string; role: UserRole }>;
  getMember(id: string): Promise<Member>;
  getStaff(id: string): Promise<Staff>;
  getMembership(memberId: string): Promise<Membership>;
  getSchedules(q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]>;
  getStaffDay(staffId: string, date: string): Promise<ScheduleItem[]>;
  listAssignedMembers(staffId: string): Promise<Member[]>;
  getAssignedTrainer(memberId: string): Promise<Staff | null>;
  setAssignedTrainer(memberId: string, staffId: string): Promise<void>;
  listStaff(branchId?: string): Promise<Staff[]>;
  updatePaymentMethod(
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership>;
  changeMembership(
    memberId: string,
    planName: string,
    monthlyAmountCents: number
  ): Promise<Membership>;
  submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest>;
  listPendingCancels(branchId: string): Promise<CancelRequest[]>;
  listMessages(threadId: string): Promise<Message[]>;
  listThreads(userId: string): Promise<Thread[]>;
  getOrCreateThread(memberId: string, staffId: string): Promise<Thread>;
  sendMessage(input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message>;

  registerForClass(memberId: string, scheduleItemId: string): Promise<ClassRegistration>;
  cancelClassRegistration(memberId: string, scheduleItemId: string): Promise<ClassRegistration>;
  listMyRegistrations(memberId: string): Promise<ClassRegistration[]>;
  listClassRoster(scheduleItemId: string): Promise<Member[]>;

  listLessonSlots(staffId: string, from: string, to: string): Promise<LessonSlot[]>;
  bookPrivateLesson(memberId: string, slotId: string): Promise<PrivateLesson>;
  cancelPrivateLesson(memberId: string, lessonId: string): Promise<PrivateLesson>;
  listMyLessons(memberId: string): Promise<PrivateLesson[]>;
  listStaffLessons(staffId: string, date: string): Promise<PrivateLesson[]>;
}
