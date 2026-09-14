import { computeCancelDates } from '@/domain/cancelDates';
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
import { loadStore, saveStore } from '@/storage/demoStore';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

function scheduleLocalDate(isoStart: string): string {
  const d = new Date(isoStart);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class MockProtivityAdapter implements ProtivityPort {
  async login(email: string, password: string): Promise<{ userId: string; role: UserRole }> {
    const state = await loadStore();
    const cred = state.credentials.find(
      (c) => c.email === email && c.password === password
    );
    if (!cred) {
      throw new Error('Invalid credentials');
    }
    return { userId: cred.userId, role: cred.role };
  }

  async getMember(id: string): Promise<Member> {
    const state = await loadStore();
    const member = state.members.find((m) => m.id === id);
    if (!member) {
      throw new Error(`Member not found: ${id}`);
    }
    return member;
  }

  async getStaff(id: string): Promise<Staff> {
    const state = await loadStore();
    const staff = state.staff.find((s) => s.id === id);
    if (!staff) {
      throw new Error(`Staff not found: ${id}`);
    }
    return staff;
  }

  async getMembership(memberId: string): Promise<Membership> {
    const state = await loadStore();
    const membership = state.memberships.find((m) => m.memberId === memberId);
    if (!membership) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    return membership;
  }

  async getSchedules(q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]> {
    const state = await loadStore();
    return state.schedules.filter((item) => {
      if (item.branchId !== q.branchId) {
        return false;
      }
      const day = scheduleLocalDate(item.start);
      if (day < q.from || day > q.to) {
        return false;
      }
      if (q.category != null && item.category !== q.category) {
        return false;
      }
      return true;
    });
  }

  async getStaffDay(staffId: string, date: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    return state.schedules.filter(
      (item) => item.staffId === staffId && scheduleLocalDate(item.start) === date
    );
  }

  async listAssignedMembers(staffId: string): Promise<Member[]> {
    const state = await loadStore();
    const memberIds = state.assignments
      .filter((a) => a.staffId === staffId)
      .map((a) => a.memberId);
    return state.members.filter((m) => memberIds.includes(m.id));
  }

  async getAssignedTrainer(memberId: string): Promise<Staff | null> {
    const state = await loadStore();
    const assignment = state.assignments.find((a) => a.memberId === memberId);
    if (!assignment) {
      return null;
    }
    return state.staff.find((s) => s.id === assignment.staffId) ?? null;
  }

  async updatePaymentMethod(
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership> {
    const state = await loadStore();
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const updated: Membership = {
      ...state.memberships[idx],
      paymentBrand: payment.brand,
      paymentLast4: payment.last4,
    };
    state.memberships[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest> {
    const state = await loadStore();
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const member = state.members[memberIdx];
    const existing = state.cancelRequests.some((r) => r.memberId === memberId);
    if (member.status === 'cancel_pending' || existing) {
      throw new Error('Cancel notice already submitted');
    }

    const membershipIdx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (membershipIdx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const membership = state.memberships[membershipIdx];
    const dates = computeCancelDates({
      nextBillingDate: membership.nextBillingDate,
      requestedAt: input.requestedAt,
      previousBillingDate: membership.lastBillDate,
    });

    const cancelRequest: CancelRequest = {
      id: `cancel-${memberId}`,
      memberId,
      reason: input.reason,
      requestedAt: input.requestedAt,
      lastBillDate: dates.lastBillDate,
      accessThrough: dates.accessThrough,
      status: 'submitted',
    };

    state.cancelRequests.push(cancelRequest);
    state.members[memberIdx] = { ...member, status: 'cancel_pending' };
    state.memberships[membershipIdx] = {
      ...membership,
      lastBillDate: dates.lastBillDate,
      cancelEffectiveDate: dates.accessThrough,
    };
    await saveStore(state);
    return cancelRequest;
  }

  async listPendingCancels(branchId: string): Promise<CancelRequest[]> {
    const state = await loadStore();
    const branchMemberIds = new Set(
      state.members.filter((m) => m.homeBranchId === branchId).map((m) => m.id)
    );
    return state.cancelRequests.filter(
      (r) => r.status === 'submitted' && branchMemberIds.has(r.memberId)
    );
  }

  async listMessages(threadId: string): Promise<Message[]> {
    const state = await loadStore();
    return state.messages.filter((m) => m.threadId === threadId);
  }

  async listThreads(userId: string): Promise<Thread[]> {
    const state = await loadStore();
    return state.threads.filter((t) => t.memberId === userId || t.staffId === userId);
  }

  async sendMessage(input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message> {
    const state = await loadStore();
    const thread = state.threads.find((t) => t.id === input.threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${input.threadId}`);
    }
    const message: Message = {
      id: `msg-${state.messages.length + 1}-${input.threadId}`,
      threadId: input.threadId,
      fromId: input.fromId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(message);
    await saveStore(state);
    return message;
  }
}
