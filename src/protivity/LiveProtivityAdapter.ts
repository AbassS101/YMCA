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
import type { ProtivityPort } from '@/protivity/ProtivityPort';
import { ProtivityNotConnected } from '@/protivity/ProtivityNotConnected';

export class LiveProtivityAdapter implements ProtivityPort {
  async login(_email: string, _password: string): Promise<{ userId: string; role: UserRole }> {
    throw new ProtivityNotConnected();
  }

  async getMember(_id: string): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async getStaff(_id: string): Promise<Staff> {
    throw new ProtivityNotConnected();
  }

  async getMembership(_memberId: string): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async getSchedules(_q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]> {
    throw new ProtivityNotConnected();
  }

  async getStaffDay(_staffId: string, _date: string): Promise<ScheduleItem[]> {
    throw new ProtivityNotConnected();
  }

  async listAssignedMembers(_staffId: string): Promise<Member[]> {
    throw new ProtivityNotConnected();
  }

  async getAssignedTrainer(_memberId: string): Promise<Staff | null> {
    throw new ProtivityNotConnected();
  }

  async updatePaymentMethod(
    _memberId: string,
    _payment: { brand: string; last4: string }
  ): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async submitCancelNotice(
    _memberId: string,
    _input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest> {
    throw new ProtivityNotConnected();
  }

  async listPendingCancels(_branchId: string): Promise<CancelRequest[]> {
    throw new ProtivityNotConnected();
  }

  async listMessages(_threadId: string): Promise<Message[]> {
    throw new ProtivityNotConnected();
  }

  async listThreads(_userId: string): Promise<Thread[]> {
    throw new ProtivityNotConnected();
  }

  async sendMessage(_input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message> {
    throw new ProtivityNotConnected();
  }
}
