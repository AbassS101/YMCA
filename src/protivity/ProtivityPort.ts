import type {
  CancelRequest,
  Member,
  Membership,
  Message,
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
  updatePaymentMethod(
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership>;
  submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest>;
  listPendingCancels(branchId: string): Promise<CancelRequest[]>;
  listMessages(threadId: string): Promise<Message[]>;
  listThreads(userId: string): Promise<Thread[]>;
  sendMessage(input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message>;
}
