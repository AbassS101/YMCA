import { computeCancelDates } from '@/domain/cancelDates';
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
import { loadStore, saveStore } from '@/storage/demoStore';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

/** Calendar day from seeded ISO datetimes (YYYY-MM-DD), TZ-independent. */
function scheduleCalendarDay(isoStart: string): string {
  return isoStart.slice(0, 10);
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
      const day = scheduleCalendarDay(item.start);
      if (day < q.from || day > q.to) {
        return false;
      }
      if (q.category != null) {
        if (q.category === 'seniors') {
          if (item.category !== 'seniors' && !item.seniorFriendly) {
            return false;
          }
        } else if (item.category !== q.category) {
          return false;
        }
      }
      return true;
    });
  }

  async getStaffDay(staffId: string, date: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    return state.schedules.filter(
      (item) => item.staffId === staffId && scheduleCalendarDay(item.start) === date
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

  async setAssignedTrainer(memberId: string, staffId: string): Promise<void> {
    const state = await loadStore();
    const idx = state.assignments.findIndex((a) => a.memberId === memberId);
    if (idx !== -1) {
      state.assignments[idx].staffId = staffId;
    } else {
      state.assignments.push({ memberId, staffId });
    }
    await saveStore(state);
  }

  async listStaff(branchId?: string): Promise<Staff[]> {
    const state = await loadStore();
    if (branchId) {
      return state.staff.filter((s) => s.homeBranchId === branchId);
    }
    return state.staff;
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

  async changeMembership(
    memberId: string,
    planName: string,
    monthlyAmountCents: number
  ): Promise<Membership> {
    const state = await loadStore();
    const membershipIdx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (membershipIdx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }

    const updatedMembership: Membership = {
      ...state.memberships[membershipIdx],
      rateName: planName,
      monthlyAmountCents,
    };
    state.memberships[membershipIdx] = updatedMembership;
    state.members[memberIdx] = {
      ...state.members[memberIdx],
      type: planName,
    };

    await saveStore(state);
    return updatedMembership;
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

  async getOrCreateThread(memberId: string, staffId: string): Promise<Thread> {
    const state = await loadStore();
    const existing = state.threads.find(
      (t) => t.memberId === memberId && t.staffId === staffId
    );
    if (existing) {
      return existing;
    }
    const newThread: Thread = {
      id: `thread-${memberId}-${staffId}`,
      memberId,
      staffId,
    };
    state.threads.push(newThread);
    await saveStore(state);
    return newThread;
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

  async registerForClass(
    memberId: string,
    scheduleItemId: string
  ): Promise<ClassRegistration> {
    const state = await loadStore();
    const item = state.schedules.find((s) => s.id === scheduleItemId);
    if (!item) {
      throw new Error(`Schedule item not found: ${scheduleItemId}`);
    }

    const activeForClass = state.classRegistrations.filter(
      (r) => r.scheduleItemId === scheduleItemId && r.status === 'registered'
    );
    if (activeForClass.length >= item.capacity) {
      throw new Error('Class is full');
    }

    const membership = state.memberships.find((m) => m.memberId === memberId);
    const paidAmountCents = item.priceCents ?? 0;
    const paymentLast4 = paidAmountCents > 0 ? membership?.paymentLast4 : undefined;
    const now = new Date().toISOString();

    const existingIdx = state.classRegistrations.findIndex(
      (r) => r.memberId === memberId && r.scheduleItemId === scheduleItemId
    );

    if (existingIdx !== -1) {
      const existing = state.classRegistrations[existingIdx];
      if (existing.status === 'registered') {
        throw new Error('Already registered for this class');
      }
      const reactivated: ClassRegistration = {
        ...existing,
        status: 'registered',
        paidAmountCents,
        paymentLast4,
        registeredAt: now,
      };
      state.classRegistrations[existingIdx] = reactivated;
      await saveStore(state);
      return reactivated;
    }

    const registration: ClassRegistration = {
      id: `reg-${memberId}-${scheduleItemId}`,
      memberId,
      scheduleItemId,
      status: 'registered',
      paidAmountCents,
      paymentLast4,
      registeredAt: now,
    };
    state.classRegistrations.push(registration);
    await saveStore(state);
    return registration;
  }

  async cancelClassRegistration(
    memberId: string,
    scheduleItemId: string
  ): Promise<ClassRegistration> {
    const state = await loadStore();
    const idx = state.classRegistrations.findIndex(
      (r) =>
        r.memberId === memberId &&
        r.scheduleItemId === scheduleItemId &&
        r.status === 'registered'
    );
    if (idx === -1) {
      throw new Error('No active registration found');
    }
    const updated: ClassRegistration = {
      ...state.classRegistrations[idx],
      status: 'cancelled',
    };
    state.classRegistrations[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async listMyRegistrations(memberId: string): Promise<ClassRegistration[]> {
    const state = await loadStore();
    return state.classRegistrations.filter(
      (r) => r.memberId === memberId && r.status === 'registered'
    );
  }

  async listClassRoster(scheduleItemId: string): Promise<Member[]> {
    const state = await loadStore();
    const memberIds = state.classRegistrations
      .filter((r) => r.scheduleItemId === scheduleItemId && r.status === 'registered')
      .map((r) => r.memberId);
    return state.members.filter((m) => memberIds.includes(m.id));
  }

  async listLessonSlots(
    staffId: string,
    from: string,
    to: string
  ): Promise<LessonSlot[]> {
    const state = await loadStore();
    const bookedSlotIds = new Set(
      state.privateLessons
        .filter((l) => l.status === 'booked')
        .map((l) => l.slotId)
    );
    return state.lessonSlots.filter((slot) => {
      if (slot.staffId !== staffId) {
        return false;
      }
      const day = scheduleCalendarDay(slot.start);
      if (day < from || day > to) {
        return false;
      }
      return !bookedSlotIds.has(slot.id);
    });
  }

  async bookPrivateLesson(memberId: string, slotId: string): Promise<PrivateLesson> {
    const state = await loadStore();
    const slot = state.lessonSlots.find((s) => s.id === slotId);
    if (!slot) {
      throw new Error(`Lesson slot not found: ${slotId}`);
    }
    const alreadyBooked = state.privateLessons.some(
      (l) => l.slotId === slotId && l.status === 'booked'
    );
    if (alreadyBooked) {
      throw new Error('This time slot is no longer available');
    }

    const lesson: PrivateLesson = {
      id: `lesson-${memberId}-${slotId}`,
      memberId,
      staffId: slot.staffId,
      slotId: slot.id,
      start: slot.start,
      end: slot.end,
      location: slot.location,
      status: 'booked',
    };
    state.privateLessons.push(lesson);
    await saveStore(state);
    return lesson;
  }

  async cancelPrivateLesson(memberId: string, lessonId: string): Promise<PrivateLesson> {
    const state = await loadStore();
    const idx = state.privateLessons.findIndex(
      (l) => l.id === lessonId && l.memberId === memberId && l.status === 'booked'
    );
    if (idx === -1) {
      throw new Error('No active lesson found');
    }
    const updated: PrivateLesson = {
      ...state.privateLessons[idx],
      status: 'cancelled',
    };
    state.privateLessons[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async listMyLessons(memberId: string): Promise<PrivateLesson[]> {
    const state = await loadStore();
    return state.privateLessons.filter(
      (l) => l.memberId === memberId && l.status === 'booked'
    );
  }

  async listStaffLessons(staffId: string, date: string): Promise<PrivateLesson[]> {
    const state = await loadStore();
    return state.privateLessons.filter(
      (l) =>
        l.staffId === staffId &&
        l.status === 'booked' &&
        scheduleCalendarDay(l.start) === date
    );
  }
}
