import { computeCancelDates } from '@/domain/cancelDates';
import { getDemoToday } from '@/domain/demoClock';
import {
  isAdminRole,
  YMCA_MEMBERSHIP_PLANS,
  type Announcement,
  type AppNotification,
  type AttendanceStatus,
  type CancelRequest,
  type ClassForumPost,
  type ClassRegistration,
  type ClientFitnessGoal,
  type ClientWorkoutLog,
  type ComplaintSuggestion,
  type Donation,
  type FeedbackStatus,
  type ForumReply,
  type ForumTopic,
  type ForumTopicCategory,
  type LessonSlot,
  type Member,
  type Membership,
  type Message,
  type NotificationPreferences,
  type PrivateLesson,
  type ScheduleCategory,
  type ScheduleItem,
  type Staff,
  type SupportTicket,
  type Survey,
  type SurveyResponse,
  type Thread,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
  type UserForumInterests,
  type UserRole,
} from '@/domain/types';
import { loadStore, saveStore, type DemoState } from '@/storage/demoStore';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

/** Calendar day from seeded ISO datetimes (YYYY-MM-DD), TZ-independent. */
function scheduleCalendarDay(isoStart: string): string {
  return isoStart.slice(0, 10);
}

function defaultNotificationPreferences(userId: string): NotificationPreferences {
  const isStaff = userId.startsWith('staff') || userId.startsWith('trainer');
  return {
    userId,
    mentions: true,
    topicReplies: true,
    interestedTopicActivity: true,
    chattedTopicReplies: true,
    classForumAlerts: true,
    staffInquiries: isStaff,
    announcements: true,
    events: true,
    directMessages: true,
    emailDigest: isStaff ? 'instant' : 'daily',
    pushEnabled: true,
    inAppBannerEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };
}

function defaultForumInterests(userId: string): UserForumInterests {
  return {
    userId,
    categories: [],
    topicIds: [],
    classIds: [],
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMentionsFromText(
  text: string,
  state: DemoState
): {
  allIds: string[];
  allNames: string[];
  staffIds: string[];
  staffNames: string[];
} {
  if (!text || !text.includes('@')) {
    return { allIds: [], allNames: [], staffIds: [], staffNames: [] };
  }

  type Candidate = {
    id: string;
    name: string;
    isStaff: boolean;
    aliases: string[];
  };

  const candidates: Candidate[] = [
    {
      id: 'staff-all',
      name: 'All Staff Desk',
      isStaff: true,
      aliases: ['all staff desk', 'all staff', 'staff desk', 'staff-all'],
    },
  ];

  const seenIds = new Set<string>(['staff-all']);

  for (const s of state.staff ?? []) {
    if (seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    const first = s.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    const compact = s.name.replace(/\s+/g, '').toLowerCase();
    candidates.push({
      id: s.id,
      name: s.name,
      isStaff: true,
      aliases: Array.from(new Set([s.name.toLowerCase(), compact, s.id.toLowerCase(), first].filter(Boolean))),
    });
  }

  for (const m of state.members ?? []) {
    if (seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    const first = m.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    const compact = m.name.replace(/\s+/g, '').toLowerCase();
    candidates.push({
      id: m.id,
      name: m.name,
      isStaff: false,
      aliases: Array.from(new Set([m.name.toLowerCase(), compact, m.id.toLowerCase(), first].filter(Boolean))),
    });
  }

  // Also include any authors from existing forum topics/replies/class posts
  const extraAuthors: { id: string; name: string; role: string }[] = [];
  for (const t of state.forumTopics ?? []) {
    extraAuthors.push({ id: t.authorId, name: t.authorName, role: String(t.authorRole) });
  }
  for (const r of state.forumReplies ?? []) {
    extraAuthors.push({ id: r.authorId, name: r.authorName, role: String(r.authorRole) });
  }
  for (const p of state.classForumPosts ?? []) {
    extraAuthors.push({ id: p.authorId, name: p.authorName, role: String(p.authorRole) });
  }
  for (const a of extraAuthors) {
    if (!a.id || !a.name || seenIds.has(a.id)) continue;
    seenIds.add(a.id);
    const first = a.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    const compact = a.name.replace(/\s+/g, '').toLowerCase();
    const isStaff = a.id.startsWith('staff') || a.role !== 'member';
    candidates.push({
      id: a.id,
      name: a.name,
      isStaff,
      aliases: Array.from(new Set([a.name.toLowerCase(), compact, a.id.toLowerCase(), first].filter(Boolean))),
    });
  }

  const allIds: string[] = [];
  const allNames: string[] = [];
  const staffIds: string[] = [];
  const staffNames: string[] = [];

  for (const cand of candidates) {
    const matched = cand.aliases.some((alias) => {
      const pattern = new RegExp(`(?:^|\\s)@${escapeRegex(alias)}(?=$|\\s|[.,!?:;\\)\\]])`, 'i');
      return pattern.test(text);
    });
    if (matched) {
      allIds.push(cand.id);
      allNames.push(cand.name);
      if (cand.isStaff) {
        staffIds.push(cand.id);
        staffNames.push(cand.name);
      }
    }
  }

  return { allIds, allNames, staffIds, staffNames };
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

  async updateMemberProfile(
    memberId: string,
    updates: { name?: string; phone?: string; avatarUrl?: string }
  ): Promise<Member> {
    const state = await loadStore();
    const idx = state.members.findIndex((m) => m.id === memberId);
    if (idx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const updated: Member = {
      ...state.members[idx],
      ...(updates.name != null && updates.name.trim() !== ''
        ? { name: updates.name.trim() }
        : {}),
      ...(updates.phone != null && updates.phone.trim() !== ''
        ? { phone: updates.phone.trim() }
        : {}),
      ...(updates.avatarUrl !== undefined
        ? { avatarUrl: updates.avatarUrl }
        : {}),
    };
    state.members[idx] = updated;
    await saveStore(state);
    return updated;
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
        l.status !== 'cancelled' &&
        scheduleCalendarDay(l.start) === date
    );
  }

  async scheduleMembershipChange(
    memberId: string,
    planName: string,
    monthlyAmountCents: number,
    effectiveDate: string
  ): Promise<Membership> {
    const state = await loadStore();
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }

    const updatedMembership: Membership = {
      ...state.memberships[idx],
      pendingChange: {
        planName,
        monthlyAmountCents,
        effectiveDate,
        requestedAt: getDemoToday(),
      },
    };
    state.memberships[idx] = updatedMembership;

    const notifId = `notif-change-${Date.now()}`;
    state.notifications.unshift({
      id: notifId,
      userId: memberId,
      title: 'Membership Change Scheduled',
      body: `Your plan change to ${planName} ($${(monthlyAmountCents / 100).toFixed(2)}/mo) has been scheduled to take effect on ${effectiveDate}.`,
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return updatedMembership;
  }

  async cancelScheduledChange(memberId: string): Promise<Membership> {
    const state = await loadStore();
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }

    const updatedMembership: Membership = {
      ...state.memberships[idx],
      pendingChange: undefined,
    };
    state.memberships[idx] = updatedMembership;

    state.notifications.unshift({
      id: `notif-cancel-change-${Date.now()}`,
      userId: memberId,
      title: 'Scheduled Plan Change Cancelled',
      body: 'Your scheduled plan change was cancelled. You will continue on your current plan.',
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return updatedMembership;
  }

  async buyMembership(input: {
    name: string;
    email: string;
    phone: string;
    address: string;
    planId: string;
    payment: { brand: string; last4: string };
    donationCents?: number;
    password?: string;
  }): Promise<{ member: Member; membership: Membership }> {
    const state = await loadStore();
    const plan =
      YMCA_MEMBERSHIP_PLANS.find((p) => p.id === input.planId) ??
      YMCA_MEMBERSHIP_PLANS.find((p) => p.name.toLowerCase() === input.planId.toLowerCase()) ??
      YMCA_MEMBERSHIP_PLANS[0];

    const trimmedEmail = input.email.trim().toLowerCase();
    const existingMemberIdx = state.members.findIndex(
      (m) => m.email.toLowerCase() === trimmedEmail
    );

    let member: Member;
    let membership: Membership;
    const nowIso = new Date().toISOString();
    const nextBill = new Date();
    nextBill.setMonth(nextBill.getMonth() + 1);
    const nextBillingDate = nextBill.toISOString().slice(0, 10);

    if (existingMemberIdx !== -1) {
      // Reactivate or update existing member
      member = {
        ...state.members[existingMemberIdx],
        name: input.name.trim() || state.members[existingMemberIdx].name,
        phone: input.phone.trim() || state.members[existingMemberIdx].phone,
        address: input.address.trim() || state.members[existingMemberIdx].address,
        type: plan.name,
        status: 'active',
      };
      state.members[existingMemberIdx] = member;

      // Remove any pending cancel requests
      state.cancelRequests = state.cancelRequests.filter((c) => c.memberId !== member.id);

      const memIdx = state.memberships.findIndex((m) => m.memberId === member.id);
      membership = {
        memberId: member.id,
        rateName: plan.name,
        monthlyAmountCents: plan.monthlyAmountCents,
        nextBillingDate,
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        status: 'active',
        pendingChange: undefined,
        cancelEffectiveDate: undefined,
        lastBillDate: undefined,
      };
      if (memIdx !== -1) {
        state.memberships[memIdx] = membership;
      } else {
        state.memberships.push(membership);
      }
    } else {
      // Create new member
      const newId = `member-${Date.now()}`;
      const barcodeId = String(Math.floor(100000 + Math.random() * 900000));
      member = {
        id: newId,
        name: input.name.trim(),
        email: trimmedEmail,
        phone: input.phone.trim(),
        address: input.address.trim(),
        membershipId: barcodeId,
        homeBranchId: 'silver-spring',
        type: plan.name,
        status: 'active',
      };
      membership = {
        memberId: newId,
        rateName: plan.name,
        monthlyAmountCents: plan.monthlyAmountCents,
        nextBillingDate,
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        status: 'active',
        joinedDate: getDemoToday(),
      };
      state.members.push(member);
      state.memberships.push(membership);

      state.credentials.push({
        email: trimmedEmail,
        password: input.password || 'ymca-demo',
        userId: newId,
        role: 'member',
      });
    }

    if (input.donationCents && input.donationCents > 0) {
      state.donations.unshift({
        id: `don-${Date.now()}`,
        memberId: member.id,
        donorName: member.name,
        donorEmail: member.email,
        amountCents: input.donationCents,
        frequency: 'monthly',
        designation: 'Annual Community Campaign (Where Needed Most)',
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        createdAt: nowIso,
        taxDeductibleId: '53-0196605',
        receiptNumber: `YMCA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      });
    }

    state.notifications.unshift({
      id: `notif-welcome-${Date.now()}`,
      userId: member.id,
      title: `Welcome to YMCA Silver Spring, ${member.name.split(' ')[0]}!`,
      body: `Your ${plan.name} membership is active! Use your digital scan barcode at the welcome desk to access the facilities, heated pools, and fitness center.`,
      type: 'membership',
      createdAt: nowIso,
      read: false,
      link: '/(member)/home',
    });

    await saveStore(state);
    return { member, membership };
  }

  async rescindCancelNotice(memberId: string): Promise<Member> {
    const state = await loadStore();
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const mem = state.members[memberIdx];

    // Remove pending cancel requests
    state.cancelRequests = state.cancelRequests.filter((r) => r.memberId !== memberId);

    // Set member status back to active
    const updatedMember: Member = {
      ...mem,
      status: 'active',
    };
    state.members[memberIdx] = updatedMember;

    // Reset membership cancel dates
    const memIdx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (memIdx !== -1) {
      state.memberships[memIdx] = {
        ...state.memberships[memIdx],
        cancelEffectiveDate: undefined,
        lastBillDate: undefined,
        status: 'active',
      };
    }

    state.notifications.unshift({
      id: `notif-rescind-${Date.now()}`,
      userId: memberId,
      title: 'Cancellation Rescinded',
      body: 'Your cancellation notice has been removed. We are thrilled you are continuing your wellness journey with YMCA Silver Spring!',
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return updatedMember;
  }

  async listAnnouncements(branchId?: string): Promise<Announcement[]> {
    const state = await loadStore();
    const list = branchId
      ? state.announcements.filter((a) => a.branchId === branchId)
      : state.announcements;
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  async createAnnouncement(input: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    const state = await loadStore();
    const now = new Date().toISOString();
    const newAnn: Announcement = {
      ...input,
      id: `ann-${Date.now()}`,
      createdAt: now,
    };
    state.announcements.unshift(newAnn);

    // Broadcast to all active members as an in-app notification
    for (const m of state.members) {
      state.notifications.unshift({
        id: `notif-ann-${Date.now()}-${m.id}`,
        userId: m.id,
        title: input.title,
        body: input.body.length > 120 ? input.body.slice(0, 117) + '...' : input.body,
        type: 'announcement',
        createdAt: now,
        read: false,
        link: input.actionUrl || '/(member)/notifications',
      });
    }

    await saveStore(state);
    return newAnn;
  }

  async listNotifications(userId: string): Promise<AppNotification[]> {
    const state = await loadStore();
    return state.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const state = await loadStore();
    const idx = state.notifications.findIndex(
      (n) => n.id === notificationId && n.userId === userId
    );
    if (idx !== -1) {
      state.notifications[idx] = { ...state.notifications[idx], read: true };
      await saveStore(state);
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const state = await loadStore();
    state.notifications = state.notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n
    );
    await saveStore(state);
  }

  async createNotification(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    const state = await loadStore();
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    state.notifications.unshift(newNotif);
    await saveStore(state);
    return newNotif;
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const state = await loadStore();
    if (!state.notificationPreferences) {
      state.notificationPreferences = {};
    }
    if (!state.notificationPreferences[userId]) {
      state.notificationPreferences[userId] = defaultNotificationPreferences(userId);
      await saveStore(state);
    }
    return { ...state.notificationPreferences[userId] };
  }

  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const state = await loadStore();
    if (!state.notificationPreferences) {
      state.notificationPreferences = {};
    }
    const current = state.notificationPreferences[userId] ?? defaultNotificationPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      userId,
    };
    state.notificationPreferences[userId] = updated;
    await saveStore(state);
    return updated;
  }

  async createDonation(
    donation: Omit<Donation, 'id' | 'createdAt' | 'taxDeductibleId' | 'receiptNumber'>
  ): Promise<Donation> {
    const state = await loadStore();
    const nowIso = new Date().toISOString();
    const receiptNumber = `YMCA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const newDonation: Donation = {
      ...donation,
      id: `don-${Date.now()}`,
      createdAt: nowIso,
      taxDeductibleId: '53-0196605',
      receiptNumber,
    };
    state.donations.unshift(newDonation);

    if (donation.memberId) {
      state.notifications.unshift({
        id: `notif-don-${Date.now()}`,
        userId: donation.memberId,
        title: 'Thank You for Your Donation!',
        body: `Your gift of $${(donation.amountCents / 100).toFixed(2)} to ${donation.designation} makes a vital impact. Tax receipt #${receiptNumber}.`,
        type: 'donation',
        createdAt: nowIso,
        read: false,
        link: '/(member)/donate',
      });
    }

    await saveStore(state);
    return newDonation;
  }

  async listDonations(memberId?: string): Promise<Donation[]> {
    const state = await loadStore();
    const list = memberId
      ? state.donations.filter((d) => d.memberId === memberId)
      : state.donations;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ==========================================
  // Announcements Admin CRUD
  // ==========================================
  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement> {
    const state = await loadStore();
    const idx = state.announcements.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Announcement not found: ${id}`);
    }
    const updated: Announcement = {
      ...state.announcements[idx],
      ...updates,
    };
    state.announcements[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const state = await loadStore();
    state.announcements = state.announcements.filter((a) => a.id !== id);
    await saveStore(state);
  }

  // ==========================================
  // Staff Admin: Member Account Management
  // ==========================================
  async listAllMembers(branchId?: string): Promise<Member[]> {
    const state = await loadStore();
    if (branchId) {
      return state.members.filter((m) => m.homeBranchId === branchId);
    }
    return [...state.members].sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteMemberAccount(memberId: string): Promise<void> {
    const state = await loadStore();
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const memberEmail = state.members[memberIdx].email;

    // Completely delete member and all associated entities
    state.members = state.members.filter((m) => m.id !== memberId);
    state.memberships = state.memberships.filter((m) => m.memberId !== memberId);
    state.credentials = state.credentials.filter((c) => c.userId !== memberId && c.email !== memberEmail);
    state.classRegistrations = state.classRegistrations.filter((r) => r.memberId !== memberId);
    state.savedClasses = state.savedClasses.filter((s) => s.memberId !== memberId);
    state.privateLessons = state.privateLessons.filter((l) => l.memberId !== memberId);
    state.assignments = state.assignments.filter((a) => a.memberId !== memberId);
    state.cancelRequests = state.cancelRequests.filter((c) => c.memberId !== memberId);
    state.notifications = state.notifications.filter((n) => n.userId !== memberId);
    state.threads = state.threads.filter((t) => t.memberId !== memberId);

    await saveStore(state);
  }

  async updateMemberAdmin(memberId: string, updates: Partial<Member>): Promise<Member> {
    const state = await loadStore();
    const idx = state.members.findIndex((m) => m.id === memberId);
    if (idx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const updated: Member = {
      ...state.members[idx],
      ...updates,
      id: state.members[idx].id, // preserve ID
    };
    state.members[idx] = updated;

    // If email changed, sync credentials
    if (updates.email && updates.email.trim() !== '') {
      state.credentials = state.credentials.map((c) =>
        c.userId === memberId ? { ...c, email: updates.email!.trim() } : c
      );
    }

    await saveStore(state);
    return updated;
  }

  async updateMembershipAdmin(
    memberId: string,
    updates: Partial<Membership>
  ): Promise<Membership> {
    const state = await loadStore();
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const updated: Membership = {
      ...state.memberships[idx],
      ...updates,
      memberId,
    };
    state.memberships[idx] = updated;

    // Sync member type & status if changed
    const memIdx = state.members.findIndex((m) => m.id === memberId);
    if (memIdx !== -1) {
      if (updates.rateName) {
        state.members[memIdx].type = updates.rateName;
      }
      if (updates.status) {
        state.members[memIdx].status = updates.status;
      }
    }

    await saveStore(state);
    return updated;
  }

  async listMemberRegistrations(
    memberId: string
  ): Promise<(ClassRegistration & { scheduleItem?: ScheduleItem })[]> {
    const state = await loadStore();
    const regs = state.classRegistrations.filter((r) => r.memberId === memberId);
    return regs.map((r) => ({
      ...r,
      scheduleItem: state.schedules.find((s) => s.id === r.scheduleItemId),
    }));
  }

  async listMemberLessons(memberId: string): Promise<PrivateLesson[]> {
    const state = await loadStore();
    return state.privateLessons
      .filter((l) => l.memberId === memberId)
      .sort((a, b) => b.start.localeCompare(a.start));
  }

  // ==========================================
  // Schedule & Events CRUD
  // ==========================================
  async createScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    const state = await loadStore();
    const newItem: ScheduleItem = {
      ...item,
      id: `sched-${Date.now()}`,
    };
    state.schedules.push(newItem);
    await saveStore(state);
    return newItem;
  }

  async updateScheduleItem(id: string, updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
    const state = await loadStore();
    const idx = state.schedules.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Schedule item not found: ${id}`);
    }
    const oldItem = state.schedules[idx];
    const updated: ScheduleItem = {
      ...oldItem,
      ...updates,
      id,
    };
    state.schedules[idx] = updated;

    // If time or location changed, notify registered members
    const timeChanged = updates.start && updates.start !== oldItem.start;
    if (timeChanged) {
      const rosterRegs = state.classRegistrations.filter(
        (r) => r.scheduleItemId === id && r.status === 'registered'
      );
      const nowIso = new Date().toISOString();
      const newTimeStr = new Date(updated.start).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      for (const reg of rosterRegs) {
        state.notifications.unshift({
          id: `notif-sched-upd-${Date.now()}-${reg.memberId}`,
          userId: reg.memberId,
          title: `Schedule Update: ${updated.title}`,
          body: `${updated.title} has been moved to ${newTimeStr} at ${updated.location}.`,
          type: 'event',
          createdAt: nowIso,
          read: false,
          link: '/(member)/schedule',
        });
      }
    }

    await saveStore(state);
    return updated;
  }

  async deleteScheduleItem(id: string, notifyReason?: string): Promise<void> {
    const state = await loadStore();
    const item = state.schedules.find((s) => s.id === id);
    if (!item) {
      return;
    }

    // If notifyReason is provided, dispatch alerts to all rostered members
    const rosterRegs = state.classRegistrations.filter(
      (r) => r.scheduleItemId === id && r.status === 'registered'
    );
    const nowIso = new Date().toISOString();
    for (const reg of rosterRegs) {
      state.notifications.unshift({
        id: `notif-cancel-${Date.now()}-${reg.memberId}`,
        userId: reg.memberId,
        title: `Cancelled: ${item.title}`,
        body: notifyReason
          ? `${item.title} has been cancelled. Reason: ${notifyReason}`
          : `${item.title} has been cancelled by YMCA staff.`,
        type: 'event',
        createdAt: nowIso,
        read: false,
        link: '/(member)/schedule',
      });
    }

    state.schedules = state.schedules.filter((s) => s.id !== id);
    state.classRegistrations = state.classRegistrations.filter((r) => r.scheduleItemId !== id);
    state.savedClasses = state.savedClasses.filter((sc) => sc.scheduleItemId !== id);
    await saveStore(state);
  }

  async listAllSchedules(branchId?: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    const list = branchId
      ? state.schedules.filter((s) => s.branchId === branchId)
      : state.schedules;
    return [...list].sort((a, b) => a.start.localeCompare(b.start));
  }

  // ==========================================
  // Trainer Operations
  // ==========================================
  async listTrainerSchedule(staffId: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    const staff = state.staff.find((s) => s.id === staffId);
    const staffName = staff?.name.toLowerCase() ?? '';
    return state.schedules
      .filter(
        (item) =>
          item.staffId === staffId ||
          (staffName && item.instructorName.toLowerCase().includes(staffName))
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async cancelClassAndNotify(scheduleItemId: string, reason: string): Promise<void> {
    return this.deleteScheduleItem(scheduleItemId, reason);
  }

  async cancelLessonAndNotify(lessonId: string, reason: string): Promise<PrivateLesson> {
    const state = await loadStore();
    const idx = state.privateLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    const lesson = state.privateLessons[idx];
    lesson.status = 'cancelled';
    state.privateLessons[idx] = lesson;

    // Send notification to member
    const nowIso = new Date().toISOString();
    state.notifications.unshift({
      id: `notif-lesson-cancel-${Date.now()}`,
      userId: lesson.memberId,
      title: 'Private Lesson Cancelled',
      body: `Your private lesson on ${new Date(lesson.start).toLocaleDateString()} has been cancelled. Reason: ${reason}`,
      type: 'general',
      createdAt: nowIso,
      read: false,
      link: '/(member)/book-lesson',
    });

    await saveStore(state);
    return lesson;
  }

  async rescheduleLesson(
    lessonId: string,
    newStart: string,
    newEnd: string,
    newLocation?: string
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    const idx = state.privateLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    const lesson = state.privateLessons[idx];
    lesson.start = newStart;
    lesson.end = newEnd;
    if (newLocation) {
      lesson.location = newLocation;
    }
    state.privateLessons[idx] = lesson;

    // Send notification to member
    const nowIso = new Date().toISOString();
    const timeFormatted = new Date(newStart).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    state.notifications.unshift({
      id: `notif-lesson-resched-${Date.now()}`,
      userId: lesson.memberId,
      title: 'Private Lesson Rescheduled',
      body: `Your private lesson has been updated to ${new Date(newStart).toLocaleDateString()} at ${timeFormatted}.`,
      type: 'general',
      createdAt: nowIso,
      read: false,
      link: '/(member)/book-lesson',
    });

    await saveStore(state);
    return lesson;
  }

  async addLessonSlot(slot: Omit<LessonSlot, 'id'>): Promise<LessonSlot> {
    const state = await loadStore();
    const newSlot: LessonSlot = {
      ...slot,
      id: `slot-${Date.now()}`,
    };
    state.lessonSlots.push(newSlot);
    await saveStore(state);
    return newSlot;
  }

  async deleteLessonSlot(slotId: string): Promise<void> {
    const state = await loadStore();
    state.lessonSlots = state.lessonSlots.filter((s) => s.id !== slotId);
    await saveStore(state);
  }

  // ==========================================
  // Trainer: Attendance & Session Operations
  // ==========================================
  async getClassRegistrations(scheduleItemId: string): Promise<ClassRegistration[]> {
    const state = await loadStore();
    return state.classRegistrations.filter(
      (r) => r.scheduleItemId === scheduleItemId && r.status === 'registered'
    );
  }

  async markClassAttendance(
    scheduleItemId: string,
    memberId: string,
    attendanceStatus: AttendanceStatus
  ): Promise<void> {
    const state = await loadStore();
    const reg = state.classRegistrations.find(
      (r) => r.scheduleItemId === scheduleItemId && r.memberId === memberId && r.status === 'registered'
    );
    if (!reg) {
      throw new Error('Registration not found for this member and class.');
    }
    reg.attendanceStatus = attendanceStatus;
    if (attendanceStatus === 'attended') {
      reg.checkedInAt = new Date().toISOString();
    }
    await saveStore(state);
  }

  async addWalkInRegistration(
    scheduleItemId: string,
    memberId: string
  ): Promise<ClassRegistration> {
    const state = await loadStore();
    const member = state.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const sched = state.schedules.find((s) => s.id === scheduleItemId);
    if (!sched) {
      throw new Error(`Schedule item not found: ${scheduleItemId}`);
    }
    const existing = state.classRegistrations.find(
      (r) => r.scheduleItemId === scheduleItemId && r.memberId === memberId
    );
    if (existing) {
      existing.status = 'registered';
      existing.attendanceStatus = 'attended';
      existing.checkedInAt = new Date().toISOString();
      await saveStore(state);
      return existing;
    }
    const newReg: ClassRegistration = {
      id: `reg-walkin-${Date.now()}`,
      memberId,
      scheduleItemId,
      status: 'registered',
      attendanceStatus: 'attended',
      checkedInAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    };
    state.classRegistrations.push(newReg);
    await saveStore(state);
    return newReg;
  }

  async markLessonStatus(
    lessonId: string,
    status: 'booked' | 'completed' | 'no_show',
    notes?: string
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    const lesson = state.privateLessons.find((l) => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    lesson.status = status;
    if (status === 'completed') {
      lesson.completedAt = new Date().toISOString();
    }
    if (notes !== undefined) {
      lesson.notes = notes;
    }
    await saveStore(state);
    return lesson;
  }

  async bookLessonForMember(
    staffId: string,
    memberId: string,
    slotIdOrCustom: string | { start: string; end: string; location: string }
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    if (typeof slotIdOrCustom === 'string') {
      return this.bookPrivateLesson(memberId, slotIdOrCustom);
    }
    const newLesson: PrivateLesson = {
      id: `lesson-custom-${Date.now()}`,
      memberId,
      staffId,
      slotId: `slot-direct-${Date.now()}`,
      start: slotIdOrCustom.start,
      end: slotIdOrCustom.end,
      location: slotIdOrCustom.location,
      status: 'booked',
    };
    state.privateLessons.push(newLesson);

    // Notify member
    state.notifications.unshift({
      id: `notif-lesson-booked-${Date.now()}`,
      userId: memberId,
      title: 'New Private Session Booked',
      body: `Your trainer scheduled a private session for ${new Date(slotIdOrCustom.start).toLocaleDateString()} at ${new Date(slotIdOrCustom.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.`,
      type: 'general',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/book-lesson',
    });

    await saveStore(state);
    return newLesson;
  }

  // ==========================================
  // Trainer: Client Workout Logs & Progression
  // ==========================================
  async listClientWorkoutLogs(memberId: string): Promise<ClientWorkoutLog[]> {
    const state = await loadStore();
    return (state.workoutLogs || [])
      .filter((w) => w.memberId === memberId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async logClientWorkout(
    input: Omit<ClientWorkoutLog, 'id' | 'createdAt'>
  ): Promise<ClientWorkoutLog> {
    const state = await loadStore();
    const newLog: ClientWorkoutLog = {
      ...input,
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    if (!state.workoutLogs) state.workoutLogs = [];
    state.workoutLogs.unshift(newLog);
    await saveStore(state);
    return newLog;
  }

  async updateClientWorkoutLog(
    logId: string,
    updates: Partial<ClientWorkoutLog>
  ): Promise<ClientWorkoutLog> {
    const state = await loadStore();
    if (!state.workoutLogs) state.workoutLogs = [];
    const index = state.workoutLogs.findIndex((w) => w.id === logId);
    if (index === -1) {
      throw new Error(`Workout log ${logId} not found`);
    }
    const updated: ClientWorkoutLog = {
      ...state.workoutLogs[index],
      ...updates,
      id: logId,
    };
    state.workoutLogs[index] = updated;
    await saveStore(state);
    return updated;
  }

  async deleteClientWorkoutLog(logId: string): Promise<void> {
    const state = await loadStore();
    if (!state.workoutLogs) return;
    state.workoutLogs = state.workoutLogs.filter((w) => w.id !== logId);
    await saveStore(state);
  }

  // ==========================================
  // Trainer: Client Fitness Goals
  // ==========================================
  async getClientFitnessGoal(memberId: string): Promise<ClientFitnessGoal | null> {
    const state = await loadStore();
    return state.clientGoals?.[memberId] ?? null;
  }

  async saveClientFitnessGoal(goal: ClientFitnessGoal): Promise<ClientFitnessGoal> {
    const state = await loadStore();
    if (!state.clientGoals) state.clientGoals = {};
    const updated = {
      ...goal,
      updatedAt: new Date().toISOString(),
    };
    state.clientGoals[goal.memberId] = updated;
    await saveStore(state);
    return updated;
  }

  // ==========================================
  // Staff & Trainer Management (Admin)
  // ==========================================
  async createStaff(input: Omit<Staff, 'id'> & { password: string }): Promise<Staff> {
    const state = await loadStore();
    const existing = state.credentials.find((c) => c.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      throw new Error(`An account with email ${input.email} already exists.`);
    }

    const newId = `staff-${Date.now()}`;
    const newStaff: Staff = {
      id: newId,
      name: input.name.trim(),
      email: input.email.trim(),
      roleLabel: input.roleLabel.trim(),
      homeBranchId: input.homeBranchId || 'silver-spring',
      staffRole: input.staffRole || 'trainer',
      avatarUrl: input.avatarUrl,
    };

    state.staff.push(newStaff);
    state.credentials.push({
      email: input.email.trim(),
      password: input.password || 'ymca-demo',
      userId: newId,
      role:
        input.staffRole === 'it_admin'
          ? 'it_admin'
          : input.staffRole === 'staff_admin'
            ? 'staff_admin'
            : input.staffRole === 'admin'
              ? 'admin'
              : input.staffRole === 'trainer'
                ? 'trainer'
                : 'staff',
    });

    await saveStore(state);
    return newStaff;
  }

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff> {
    const state = await loadStore();
    const idx = state.staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Staff member not found: ${id}`);
    }

    const old = state.staff[idx];
    const updated: Staff = {
      ...old,
      ...updates,
      id,
    };
    state.staff[idx] = updated;

    // Sync credentials
    const credIdx = state.credentials.findIndex((c) => c.userId === id);
    if (credIdx !== -1) {
      if (updates.email) {
        state.credentials[credIdx].email = updates.email.trim();
      }
      if (updates.staffRole) {
        state.credentials[credIdx].role =
          updates.staffRole === 'it_admin'
            ? 'it_admin'
            : updates.staffRole === 'staff_admin'
              ? 'staff_admin'
              : updates.staffRole === 'admin'
                ? 'admin'
                : updates.staffRole === 'trainer'
                  ? 'trainer'
                  : 'staff';
      }
    }

    await saveStore(state);
    return updated;
  }

  async deleteStaff(id: string): Promise<void> {
    const state = await loadStore();
    state.staff = state.staff.filter((s) => s.id !== id);
    state.credentials = state.credentials.filter((c) => c.userId !== id);
    state.lessonSlots = state.lessonSlots.filter((slot) => slot.staffId !== id);
    state.assignments = state.assignments.filter((a) => a.staffId !== id);
    await saveStore(state);
  }

  // ==========================================
  // Password Management (Admin)
  // ==========================================
  async changeUserPassword(email: string, newPassword: string): Promise<void> {
    const state = await loadStore();
    const credIdx = state.credentials.findIndex(
      (c) => c.email.toLowerCase() === email.toLowerCase()
    );
    if (credIdx === -1) {
      throw new Error(`User with email ${email} not found.`);
    }
    state.credentials[credIdx].password = newPassword;
    await saveStore(state);
  }

  // ==========================================
  // Admin Member Creation
  // ==========================================
  async createMemberAdmin(input: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    planId: string;
    password?: string;
    homeBranchId?: string;
  }): Promise<{ member: Member; membership: Membership }> {
    const state = await loadStore();
    const existing = state.credentials.find(
      (c) => c.email.toLowerCase() === input.email.toLowerCase()
    );
    if (existing) {
      throw new Error(`User with email ${input.email} already exists.`);
    }

    const plan =
      YMCA_MEMBERSHIP_PLANS.find((p) => p.id === input.planId || p.name === input.planId) ||
      YMCA_MEMBERSHIP_PLANS[0];

    const newMemberId = `member-${Date.now()}`;
    const membershipId = String(Math.floor(100000 + Math.random() * 900000));
    const nowIso = new Date().toISOString();
    const branch = input.homeBranchId || 'silver-spring';

    const newMember: Member = {
      id: newMemberId,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address?.trim() || '101 Georgia Ave, Silver Spring, MD',
      membershipId,
      homeBranchId: branch,
      type: plan.name,
      status: 'active',
    };

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    const newMembership: Membership = {
      memberId: newMemberId,
      rateName: plan.name,
      monthlyAmountCents: plan.monthlyAmountCents,
      nextBillingDate: nextBillingDate.toISOString().slice(0, 10),
      paymentBrand: 'Visa',
      paymentLast4: '4242',
      status: 'active',
      joinedDate: nowIso.slice(0, 10),
    };

    state.members.push(newMember);
    state.memberships.push(newMembership);
    state.credentials.push({
      email: input.email.trim(),
      password: input.password || 'ymca-demo',
      userId: newMemberId,
      role: 'member',
    });

    state.notifications.unshift({
      id: `notif-welcome-${Date.now()}`,
      userId: newMemberId,
      title: 'Welcome to YMCA Silver Spring!',
      body: `Your ${plan.name} Membership is active. Scan your barcode #${membershipId} for instant facility access.`,
      type: 'membership',
      createdAt: nowIso,
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return { member: newMember, membership: newMembership };
  }

  // ==========================================
  // Class Community Forum & Chat
  // ==========================================
  async listClassForumPosts(classId: string): Promise<ClassForumPost[]> {
    const state = await loadStore();
    const posts = (state.classForumPosts ?? []).filter((p) => p.classId === classId);
    return posts.sort((a, b) => {
      // Pinned posts first, then chronological
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  async listRecentlyChattedClassIds(userId: string): Promise<string[]> {
    const state = await loadStore();
    const userPosts = (state.classForumPosts ?? [])
      .filter((p) => p.authorId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of userPosts) {
      if (!seen.has(p.classId)) {
        seen.add(p.classId);
        result.push(p.classId);
      }
    }
    return result;
  }

  async createClassForumPost(input: {
    classId: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    content: string;
    pinned?: boolean;
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
  }): Promise<ClassForumPost> {
    const state = await loadStore();
    if (!state.classForumPosts) {
      state.classForumPosts = [];
    }

    const now = new Date().toISOString();
    const extracted = extractMentionsFromText(input.content, state);
    const mentionedUserIds = Array.from(
      new Set([...(input.mentionedUserIds ?? []), ...extracted.allIds])
    );
    const mentionedUserNames = Array.from(
      new Set([...(input.mentionedUserNames ?? []), ...extracted.allNames])
    );

    const post: ClassForumPost = {
      id: `cfp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      classId: input.classId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole as any,
      authorAvatarUrl: input.authorAvatarUrl,
      content: input.content.trim(),
      createdAt: now,
      pinned: input.pinned ?? false,
      mentionedUserIds,
      mentionedUserNames,
    };

    const existingClassPosts = state.classForumPosts.filter((p) => p.classId === input.classId);
    state.classForumPosts.push(post);

    if (!state.notifications) {
      state.notifications = [];
    }
    const classItem = state.schedules.find((s) => s.id === input.classId);
    const classTitle = classItem?.title ?? 'Class Chat';
    const notifiedUsers = new Set<string>([input.authorId]);

    // 1. Notify any @mentioned users in the class chat post
    for (const rawId of mentionedUserIds) {
      const isStaffAll = rawId === 'staff-all';
      const targetUserId = isStaffAll ? 'staff-desk' : rawId;
      if (notifiedUsers.has(targetUserId)) continue;

      const targetPrefs =
        state.notificationPreferences?.[targetUserId] ?? defaultNotificationPreferences(targetUserId);
      const isEnabled = isStaffAll ? targetPrefs.staffInquiries : targetPrefs.mentions;
      if (!isEnabled) continue;

      notifiedUsers.add(targetUserId);
      state.notifications.push({
        id: `notif-cfp-mention-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: targetUserId,
        title: isStaffAll
          ? `@ Staff Desk in ${classTitle}: ${input.authorName}`
          : `Mentioned in ${classTitle} by ${input.authorName}`,
        body: `"${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}"`,
        type: isStaffAll ? 'staff_inquiry' : 'forum_mention',
        createdAt: now,
        read: false,
        relatedId: input.classId,
        link: '/(member)/community-forum',
      });
    }

    // 2. Notify users who previously chatted in this class forum or marked it as interested
    const classParticipantIds = new Set<string>(existingClassPosts.map((p) => p.authorId));
    for (const [uid, interests] of Object.entries(state.forumInterests ?? {})) {
      if (interests?.classIds?.includes(input.classId)) {
        classParticipantIds.add(uid);
      }
    }
    if (classItem?.staffId) {
      classParticipantIds.add(classItem.staffId);
    }

    for (const targetUserId of classParticipantIds) {
      if (notifiedUsers.has(targetUserId)) continue;
      const targetPrefs =
        state.notificationPreferences?.[targetUserId] ?? defaultNotificationPreferences(targetUserId);
      if (!targetPrefs.classForumAlerts) continue;

      notifiedUsers.add(targetUserId);
      state.notifications.push({
        id: `notif-cfp-reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: targetUserId,
        title: `New Message in ${classTitle} from ${input.authorName}`,
        body: `"${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}"`,
        type: 'class_forum',
        createdAt: now,
        read: false,
        relatedId: input.classId,
        link: '/(member)/community-forum',
      });
    }

    await saveStore(state);
    return post;
  }

  async deleteClassForumPost(postId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    if (!state.classForumPosts) return;

    const idx = state.classForumPosts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      throw new Error(`Forum post not found: ${postId}`);
    }

    const post = state.classForumPosts[idx];

    // Check permissions
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);
    const classItem = state.schedules.find((s) => s.id === post.classId);

    const isAuthor = post.authorId === requesterUserId;
    const isStaffOrITAdmin =
      isAdminRole(requesterStaff?.staffRole) || isAdminRole(requesterCred?.role);
    const isClassTrainer =
      classItem &&
      requesterStaff &&
      (classItem.staffId === requesterUserId ||
        (requesterStaff.name &&
          classItem.instructorName.toLowerCase().includes(requesterStaff.name.toLowerCase())));

    if (!isAuthor && !isStaffOrITAdmin && !isClassTrainer) {
      throw new Error('Only the post author, class trainer, or IT/Staff Admins can delete this message.');
    }

    state.classForumPosts.splice(idx, 1);
    await saveStore(state);
  }

  async togglePinClassForumPost(postId: string, requesterUserId: string): Promise<ClassForumPost> {
    const state = await loadStore();
    if (!state.classForumPosts) {
      throw new Error(`Forum post not found: ${postId}`);
    }

    const idx = state.classForumPosts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      throw new Error(`Forum post not found: ${postId}`);
    }

    const post = state.classForumPosts[idx];

    // Check manager permissions
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);
    const classItem = state.schedules.find((s) => s.id === post.classId);

    const isStaffOrITAdmin =
      isAdminRole(requesterStaff?.staffRole) || isAdminRole(requesterCred?.role);
    const isClassTrainer =
      classItem &&
      requesterStaff &&
      (classItem.staffId === requesterUserId ||
        (requesterStaff.name &&
          classItem.instructorName.toLowerCase().includes(requesterStaff.name.toLowerCase())));

    if (!isStaffOrITAdmin && !isClassTrainer) {
      throw new Error('Only IT Admins, Staff Admins, or the class trainer can pin announcements.');
    }

    post.pinned = !post.pinned;
    state.classForumPosts[idx] = post;
    await saveStore(state);
    return post;
  }

  // ==========================================
  // Dedicated Community Forum
  // ==========================================
  async listForumTopics(filter?: {
    category?: ForumTopicCategory;
    categories?: ForumTopicCategory[];
    staffMentioned?: boolean;
    authorId?: string;
    interestedUserId?: string;
    chattedByUserId?: string;
    chattedOrCreatedByUserId?: string;
    searchQuery?: string;
  }): Promise<ForumTopic[]> {
    const state = await loadStore();
    let topics = [...(state.forumTopics ?? [])];
    const replies = state.forumReplies ?? [];

    const hasUserChattedInTopic = (t: ForumTopic, uid: string): boolean => {
      if ((t.participantIds ?? []).includes(uid)) return true;
      if (t.lastChattedAtBy?.[uid]) return true;
      return replies.some((r) => r.topicId === t.id && r.authorId === uid);
    };

    const isUserInterestedInTopic = (t: ForumTopic, uid: string): boolean => {
      const userInterests = state.forumInterests?.[uid];
      if ((t.interestedBy ?? []).includes(uid)) return true;
      if (userInterests?.topicIds?.includes(t.id)) return true;
      if (userInterests?.categories?.includes(t.category)) return true;
      return false;
    };

    if (filter?.category) {
      topics = topics.filter((t) => t.category === filter.category);
    }
    if (filter?.categories && filter.categories.length > 0) {
      topics = topics.filter((t) => filter.categories!.includes(t.category));
    }
    if (filter?.staffMentioned) {
      topics = topics.filter((t) => t.mentionedStaffIds && t.mentionedStaffIds.length > 0);
    }
    if (filter?.authorId) {
      topics = topics.filter((t) => t.authorId === filter.authorId);
    }
    if (filter?.interestedUserId) {
      const uid = filter.interestedUserId;
      topics = topics.filter((t) => isUserInterestedInTopic(t, uid));
    }
    if (filter?.chattedByUserId) {
      const uid = filter.chattedByUserId;
      topics = topics.filter((t) => hasUserChattedInTopic(t, uid));
    }
    if (filter?.chattedOrCreatedByUserId) {
      const uid = filter.chattedOrCreatedByUserId;
      topics = topics.filter((t) => t.authorId === uid || hasUserChattedInTopic(t, uid));
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      topics = topics.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.authorName.toLowerCase().includes(q)
      );
    }

    if (filter?.chattedByUserId) {
      const uid = filter.chattedByUserId;
      return topics.sort((a, b) => {
        const aTime = a.lastChattedAtBy?.[uid] || a.updatedAt || a.createdAt;
        const bTime = b.lastChattedAtBy?.[uid] || b.updatedAt || b.createdAt;
        return bTime.localeCompare(aTime);
      });
    }

    return topics.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
  }

  async getForumTopic(topicId: string): Promise<ForumTopic | null> {
    const state = await loadStore();
    return (state.forumTopics ?? []).find((t) => t.id === topicId) ?? null;
  }

  async createForumTopic(input: {
    title: string;
    content: string;
    category: ForumTopicCategory;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    pinned?: boolean;
    mentionedStaffIds?: string[];
    mentionedStaffNames?: string[];
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
  }): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      state.forumTopics = [];
    }

    const combinedText = `${input.title} ${input.content}`;
    const extracted = extractMentionsFromText(combinedText, state);

    const mentionedStaffIds = Array.from(
      new Set([...(input.mentionedStaffIds ?? []), ...extracted.staffIds])
    );
    const mentionedStaffNames = Array.from(
      new Set([...(input.mentionedStaffNames ?? []), ...extracted.staffNames])
    );
    const mentionedUserIds = Array.from(
      new Set([...(input.mentionedUserIds ?? []), ...mentionedStaffIds, ...extracted.allIds])
    );
    const mentionedUserNames = Array.from(
      new Set([...(input.mentionedUserNames ?? []), ...mentionedStaffNames, ...extracted.allNames])
    );

    const now = new Date().toISOString();
    const topic: ForumTopic = {
      id: `topic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole as any,
      authorAvatarUrl: input.authorAvatarUrl,
      pinned: input.pinned ?? false,
      likes: 0,
      likedBy: [],
      interestedBy: [],
      participantIds: [],
      lastChattedAtBy: {},
      replyCount: 0,
      mentionedStaffIds,
      mentionedStaffNames,
      mentionedUserIds,
      mentionedUserNames,
      hasStaffReply: false,
      createdAt: now,
      updatedAt: now,
    };

    state.forumTopics.unshift(topic);

    // Notify any mentioned users (staff or members), checking their notification preferences
    if (mentionedUserIds.length > 0) {
      if (!state.notifications) {
        state.notifications = [];
      }
      const notifiedTargets = new Set<string>([input.authorId]);
      for (const rawTargetId of mentionedUserIds) {
        const isStaffAll = rawTargetId === 'staff-all';
        const targetUserId = isStaffAll ? 'staff-desk' : rawTargetId;
        if (notifiedTargets.has(targetUserId)) continue;

        const targetPrefs =
          state.notificationPreferences?.[targetUserId] ??
          defaultNotificationPreferences(targetUserId);
        const isEnabled = isStaffAll ? targetPrefs.staffInquiries : targetPrefs.mentions;
        if (!isEnabled) continue;

        notifiedTargets.add(targetUserId);
        state.notifications.push({
          id: `notif-forum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: targetUserId,
          title: isStaffAll
            ? `@ Staff Desk: Question from ${input.authorName}`
            : `Forum Mention from ${input.authorName}`,
          body: `Tagged in "${input.title}": "${input.content.slice(0, 70)}..."`,
          type: isStaffAll ? 'staff_inquiry' : 'forum_mention',
          createdAt: now,
          read: false,
          relatedId: topic.id,
          link: '/(member)/community-forum',
        });
      }
    }

    await saveStore(state);
    return topic;
  }

  async deleteForumTopic(topicId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    if (!state.forumTopics) return;

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);

    const isAuthor = topic.authorId === requesterUserId;
    const isStaffOrAdmin =
      isAdminRole(requesterStaff?.staffRole) ||
      isAdminRole(requesterCred?.role) ||
      requesterCred?.role === 'staff' ||
      requesterCred?.role === 'trainer';

    if (!isAuthor && !isStaffOrAdmin) {
      throw new Error('Only the topic author or staff/admin can delete this topic.');
    }

    state.forumTopics.splice(idx, 1);
    // Clean up replies for this topic
    if (state.forumReplies) {
      state.forumReplies = state.forumReplies.filter((r) => r.topicId !== topicId);
    }

    await saveStore(state);
  }

  async togglePinForumTopic(topicId: string, requesterUserId: string): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);

    const isStaffOrAdmin =
      isAdminRole(requesterStaff?.staffRole) ||
      isAdminRole(requesterCred?.role) ||
      requesterCred?.role === 'staff' ||
      requesterCred?.role === 'trainer';

    if (!isStaffOrAdmin) {
      throw new Error('Only staff or administrators can pin forum topics.');
    }

    topic.pinned = !topic.pinned;
    state.forumTopics[idx] = topic;
    await saveStore(state);
    return topic;
  }

  async toggleLikeForumTopic(topicId: string, userId: string): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    if (!topic.likedBy) {
      topic.likedBy = [];
    }

    const likedIndex = topic.likedBy.indexOf(userId);
    if (likedIndex >= 0) {
      topic.likedBy.splice(likedIndex, 1);
      topic.likes = Math.max(0, (topic.likes ?? 1) - 1);
    } else {
      topic.likedBy.push(userId);
      topic.likes = (topic.likes ?? 0) + 1;
    }

    state.forumTopics[idx] = topic;
    await saveStore(state);
    return topic;
  }

  async toggleInterestedForumTopic(topicId: string, userId: string): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    if (!topic.interestedBy) {
      topic.interestedBy = [];
    }
    if (!state.forumInterests) {
      state.forumInterests = {};
    }
    const userInterests = state.forumInterests[userId] ?? defaultForumInterests(userId);

    const interestedIdx = topic.interestedBy.indexOf(userId);
    if (interestedIdx >= 0) {
      topic.interestedBy.splice(interestedIdx, 1);
      userInterests.topicIds = (userInterests.topicIds ?? []).filter((id) => id !== topicId);
    } else {
      topic.interestedBy.push(userId);
      if (!userInterests.topicIds.includes(topicId)) {
        userInterests.topicIds = [...userInterests.topicIds, topicId];
      }
    }

    state.forumInterests[userId] = userInterests;
    state.forumTopics[idx] = topic;
    await saveStore(state);
    return topic;
  }

  async getForumInterests(userId: string): Promise<UserForumInterests> {
    const state = await loadStore();
    if (!state.forumInterests) {
      state.forumInterests = {};
    }
    if (!state.forumInterests[userId]) {
      const topicIdsFromTopics = (state.forumTopics ?? [])
        .filter((t) => (t.interestedBy ?? []).includes(userId))
        .map((t) => t.id);
      state.forumInterests[userId] = {
        ...defaultForumInterests(userId),
        topicIds: topicIdsFromTopics,
      };
      await saveStore(state);
    }
    return {
      userId,
      categories: [...(state.forumInterests[userId].categories ?? [])],
      topicIds: [...(state.forumInterests[userId].topicIds ?? [])],
      classIds: [...(state.forumInterests[userId].classIds ?? [])],
    };
  }

  async updateForumInterests(
    userId: string,
    updates: Partial<Omit<UserForumInterests, 'userId'>>
  ): Promise<UserForumInterests> {
    const state = await loadStore();
    if (!state.forumInterests) {
      state.forumInterests = {};
    }
    const current = state.forumInterests[userId] ?? defaultForumInterests(userId);
    const updated: UserForumInterests = {
      userId,
      categories: updates.categories !== undefined ? [...updates.categories] : [...(current.categories ?? [])],
      topicIds: updates.topicIds !== undefined ? [...updates.topicIds] : [...(current.topicIds ?? [])],
      classIds: updates.classIds !== undefined ? [...updates.classIds] : [...(current.classIds ?? [])],
    };
    state.forumInterests[userId] = updated;

    // Sync topic.interestedBy if topicIds was updated
    if (updates.topicIds !== undefined && state.forumTopics) {
      const topicIdSet = new Set(updated.topicIds);
      for (const t of state.forumTopics) {
        const set = new Set(t.interestedBy ?? []);
        if (topicIdSet.has(t.id)) {
          set.add(userId);
        } else {
          set.delete(userId);
        }
        t.interestedBy = Array.from(set);
      }
    }

    await saveStore(state);
    return updated;
  }

  async toggleInterestedForumCategory(
    userId: string,
    category: ForumTopicCategory
  ): Promise<UserForumInterests> {
    const current = await this.getForumInterests(userId);
    const exists = current.categories.includes(category);
    const nextCategories = exists
      ? current.categories.filter((c) => c !== category)
      : [...current.categories, category];
    return this.updateForumInterests(userId, { categories: nextCategories });
  }

  async toggleInterestedClassForum(
    userId: string,
    classId: string
  ): Promise<UserForumInterests> {
    const current = await this.getForumInterests(userId);
    const exists = current.classIds.includes(classId);
    const nextClassIds = exists
      ? current.classIds.filter((c) => c !== classId)
      : [...current.classIds, classId];
    return this.updateForumInterests(userId, { classIds: nextClassIds });
  }

  async listForumReplies(topicId: string): Promise<ForumReply[]> {
    const state = await loadStore();
    const replies = (state.forumReplies ?? []).filter((r) => r.topicId === topicId);
    return replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createForumReply(input: {
    topicId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    isStaffReply: boolean;
    mentionedStaffIds?: string[];
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
  }): Promise<ForumReply> {
    const state = await loadStore();
    if (!state.forumReplies) {
      state.forumReplies = [];
    }

    const extracted = extractMentionsFromText(input.content, state);
    const mentionedStaffIds = Array.from(
      new Set([...(input.mentionedStaffIds ?? []), ...extracted.staffIds])
    );
    const mentionedUserIds = Array.from(
      new Set([...(input.mentionedUserIds ?? []), ...mentionedStaffIds, ...extracted.allIds])
    );
    const mentionedUserNames = Array.from(
      new Set([...(input.mentionedUserNames ?? []), ...extracted.allNames])
    );

    const now = new Date().toISOString();
    const reply: ForumReply = {
      id: `freply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      topicId: input.topicId,
      content: input.content.trim(),
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole as any,
      authorAvatarUrl: input.authorAvatarUrl,
      isStaffReply: input.isStaffReply,
      mentionedStaffIds,
      mentionedUserIds,
      mentionedUserNames,
      likes: 0,
      likedBy: [],
      createdAt: now,
    };

    const previousReplies = state.forumReplies.filter((r) => r.topicId === input.topicId);
    state.forumReplies.push(reply);

    // Update parent topic with replyCount, updatedAt, participantIds, and lastChattedAtBy
    const topic = (state.forumTopics ?? []).find((t) => t.id === input.topicId);
    const previousParticipantIds = new Set<string>([
      ...(topic?.participantIds ?? []),
      ...previousReplies.map((r) => r.authorId),
    ]);

    if (topic) {
      topic.replyCount = (topic.replyCount ?? 0) + 1;
      topic.updatedAt = now;
      if (input.isStaffReply) {
        topic.hasStaffReply = true;
      }
      const nextParticipants = new Set<string>(previousParticipantIds);
      nextParticipants.add(input.authorId);
      topic.participantIds = Array.from(nextParticipants);
      topic.lastChattedAtBy = {
        ...(topic.lastChattedAtBy ?? {}),
        [input.authorId]: now,
      };
    }

    if (!state.notifications) {
      state.notifications = [];
    }
    const notifiedUsers = new Set<string>([input.authorId]);

    // 1. If any users (staff or members) were @mentioned in the reply, check preferences and notify them first
    if (mentionedUserIds.length > 0) {
      for (const rawId of mentionedUserIds) {
        const isStaffAll = rawId === 'staff-all';
        const targetUserId = isStaffAll ? 'staff-desk' : rawId;
        if (notifiedUsers.has(targetUserId)) continue;

        const targetPrefs =
          state.notificationPreferences?.[targetUserId] ??
          defaultNotificationPreferences(targetUserId);
        const isEnabled = isStaffAll ? targetPrefs.staffInquiries : targetPrefs.mentions;
        if (!isEnabled) continue;

        notifiedUsers.add(targetUserId);
        state.notifications.push({
          id: `notif-reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: targetUserId,
          title: isStaffAll
            ? `@ Staff Desk: Reply from ${input.authorName}`
            : `Reply Mention from ${input.authorName}`,
          body: `Tagged in "${topic?.title ?? 'discussion'}": "${input.content.slice(0, 70)}..."`,
          type: isStaffAll ? 'staff_inquiry' : 'forum_mention',
          createdAt: now,
          read: false,
          relatedId: input.topicId,
          link: '/(member)/community-forum',
        });
      }
    }

    // 2. Notify the original topic author if replied by someone else and author has topicReplies enabled
    if (topic && topic.authorId !== input.authorId && !notifiedUsers.has(topic.authorId)) {
      const authorPrefs =
        state.notificationPreferences?.[topic.authorId] ??
        defaultNotificationPreferences(topic.authorId);
      if (authorPrefs.topicReplies) {
        notifiedUsers.add(topic.authorId);
        state.notifications.push({
          id: `notif-freply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: topic.authorId,
          title: input.isStaffReply
            ? `Official YMCA Response: ${input.authorName}`
            : `New Reply from ${input.authorName}`,
          body: `In "${topic.title}": "${input.content.slice(0, 70)}..."`,
          type: 'forum_reply',
          createdAt: now,
          read: false,
          relatedId: input.topicId,
          link: '/(member)/community-forum',
        });
      }
    }

    // 3. Notify other users who recently chatted in this topic or marked this topic as interested
    if (topic) {
      const interestedOrParticipantUsers = new Set<string>([
        ...previousParticipantIds,
        ...(topic.interestedBy ?? []),
      ]);
      for (const [uid, interests] of Object.entries(state.forumInterests ?? {})) {
        if (interests?.topicIds?.includes(topic.id)) {
          interestedOrParticipantUsers.add(uid);
        }
      }

      for (const targetUserId of interestedOrParticipantUsers) {
        if (notifiedUsers.has(targetUserId) || targetUserId === topic.authorId) continue;
        const targetPrefs =
          state.notificationPreferences?.[targetUserId] ??
          defaultNotificationPreferences(targetUserId);
        if (!targetPrefs.topicReplies) continue;

        const wasParticipant = previousParticipantIds.has(targetUserId);
        const wasInterested =
          (topic.interestedBy ?? []).includes(targetUserId) ||
          Boolean(state.forumInterests?.[targetUserId]?.topicIds?.includes(topic.id));

        if (wasParticipant && targetPrefs.chattedTopicReplies === false) continue;
        if (!wasParticipant && wasInterested && targetPrefs.interestedTopicActivity === false) continue;

        notifiedUsers.add(targetUserId);
        state.notifications.push({
          id: `notif-fpart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: targetUserId,
          title: input.isStaffReply
            ? `Official YMCA Response: ${input.authorName}`
            : wasParticipant
              ? `New Reply in Thread You Chatted In: ${input.authorName}`
              : `New Reply in Followed Topic: ${input.authorName}`,
          body: `In "${topic.title}": "${input.content.slice(0, 70)}..."`,
          type: 'forum_reply',
          createdAt: now,
          read: false,
          relatedId: input.topicId,
          link: '/(member)/community-forum',
        });
      }
    }

    await saveStore(state);
    return reply;
  }

  async deleteForumReply(replyId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    if (!state.forumReplies) return;

    const idx = state.forumReplies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      throw new Error(`Forum reply not found: ${replyId}`);
    }

    const reply = state.forumReplies[idx];
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);

    const isAuthor = reply.authorId === requesterUserId;
    const isStaffOrAdmin =
      isAdminRole(requesterStaff?.staffRole) ||
      isAdminRole(requesterCred?.role) ||
      requesterCred?.role === 'staff' ||
      requesterCred?.role === 'trainer';

    if (!isAuthor && !isStaffOrAdmin) {
      throw new Error('Only the reply author or staff/admin can delete this message.');
    }

    state.forumReplies.splice(idx, 1);

    // Decrement count on topic
    const topic = (state.forumTopics ?? []).find((t) => t.id === reply.topicId);
    if (topic && topic.replyCount > 0) {
      topic.replyCount -= 1;
    }

    await saveStore(state);
  }

  async toggleLikeForumReply(replyId: string, userId: string): Promise<ForumReply> {
    const state = await loadStore();
    if (!state.forumReplies) {
      throw new Error(`Forum reply not found: ${replyId}`);
    }

    const idx = state.forumReplies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      throw new Error(`Forum reply not found: ${replyId}`);
    }

    const reply = state.forumReplies[idx];
    if (!reply.likedBy) {
      reply.likedBy = [];
    }

    const likedIndex = reply.likedBy.indexOf(userId);
    if (likedIndex >= 0) {
      reply.likedBy.splice(likedIndex, 1);
      reply.likes = Math.max(0, (reply.likes ?? 1) - 1);
    } else {
      reply.likedBy.push(userId);
      reply.likes = (reply.likes ?? 0) + 1;
    }

    state.forumReplies[idx] = reply;
    await saveStore(state);
    return reply;
  }

  async createSupportTicket(input: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: UserRole | string;
    type: TicketType;
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    deviceInfo?: string;
  }): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    const state = await loadStore();
    if (!state.supportTickets) {
      state.supportTickets = [];
    }

    const nextTicketNum = 1000 + state.supportTickets.length + 1;
    const ticketNumber = `YMCA-IT-${nextTicketNum}`;
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    // 1. Get or create thread with IT Admin (staff-itadmin)
    const itStaffId = 'staff-itadmin';
    let thread = state.threads.find(
      (t) =>
        (t.memberId === input.userId && t.staffId === itStaffId) ||
        (t.staffId === input.userId && t.memberId === itStaffId)
    );
    if (!thread) {
      thread = {
        id: `thread-${input.userId}-${itStaffId}`,
        memberId: input.userId,
        staffId: itStaffId,
      };
      state.threads.push(thread);
    }

    // 2. Create SupportTicket
    const ticket: SupportTicket = {
      id: ticketId,
      ticketNumber,
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      userRole: input.userRole,
      type: input.type,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: 'open',
      threadId: thread.id,
      deviceInfo: input.deviceInfo,
      createdAt: now,
      updatedAt: now,
    };
    state.supportTickets.unshift(ticket);

    // 3. Post user's initial ticket message into thread
    const typeLabel = input.type === 'feature_request' ? '💡 Feature Request' : '🛠️ Problem Report';
    const userMsgBody = `[Ticket #${ticketNumber} · ${typeLabel}]\nSubject: ${input.title}\nCategory: ${input.category}\nPriority: ${input.priority.toUpperCase()}\n\n${input.description}`;
    const userMessage: Message = {
      id: `msg-${Date.now()}-1`,
      threadId: thread.id,
      fromId: input.userId,
      body: userMsgBody,
      createdAt: now,
    };
    state.messages.push(userMessage);

    // 4. Auto-generate IT triage acknowledgment response from David Miller (IT Admin)
    const itAckBody = `Hello ${input.userName.split(' ')[0]}! This is David Miller from YMCA IT Systems. We've logged your ticket #${ticketNumber} ("${input.title}") as ${input.priority.toUpperCase()} priority. Our technical support team is reviewing your report. Please feel free to send any additional details or screenshots right here!`;
    const itAckMsg: Message = {
      id: `msg-${Date.now()}-2`,
      threadId: thread.id,
      fromId: itStaffId,
      body: itAckBody,
      createdAt: new Date(Date.now() + 1000).toISOString(),
    };
    state.messages.push(itAckMsg);

    // 5. Create in-app notification for the user
    state.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: input.userId,
      title: `IT Support Ticket Logged: ${ticketNumber}`,
      body: `Ticket "${input.title}" has been registered. David Miller from YMCA IT responded.`,
      type: 'general',
      createdAt: now,
      read: false,
      link: '/(member)/account',
    });

    await saveStore(state);
    return { ticket, thread, initialMessage: userMessage };
  }

  async listSupportTickets(userId?: string): Promise<SupportTicket[]> {
    const state = await loadStore();
    const list = state.supportTickets ?? [];
    if (userId) {
      return list.filter((t) => t.userId === userId);
    }
    return list;
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket | null> {
    const state = await loadStore();
    return (state.supportTickets ?? []).find((t) => t.id === ticketId) ?? null;
  }

  async updateSupportTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket> {
    const state = await loadStore();
    const idx = (state.supportTickets ?? []).findIndex((t) => t.id === ticketId);
    if (idx === -1) {
      throw new Error(`Support ticket not found: ${ticketId}`);
    }
    state.supportTickets[idx].status = status;
    state.supportTickets[idx].updatedAt = new Date().toISOString();
    await saveStore(state);
    return state.supportTickets[idx];
  }

  // ==========================================
  // Complaints & Suggestions
  // ==========================================
  async listComplaintsSuggestions(branchId?: string, memberId?: string): Promise<ComplaintSuggestion[]> {
    const state = await loadStore();
    let list = state.complaintsSuggestions ?? [];
    if (branchId) {
      list = list.filter((item) => !item.branchId || item.branchId === branchId);
    }
    if (memberId) {
      list = list.filter((item) => item.memberId === memberId);
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createComplaintSuggestion(
    input: Omit<ComplaintSuggestion, 'id' | 'createdAt' | 'status'>
  ): Promise<ComplaintSuggestion> {
    const state = await loadStore();
    const now = new Date().toISOString();
    const item: ComplaintSuggestion = {
      ...input,
      id: `cs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'submitted',
      createdAt: now,
    };
    if (!state.complaintsSuggestions) {
      state.complaintsSuggestions = [];
    }
    state.complaintsSuggestions.unshift(item);
    await saveStore(state);
    return item;
  }

  async updateComplaintSuggestionStatus(
    id: string,
    status: FeedbackStatus,
    staffResponse?: string,
    staffId?: string,
    staffName?: string
  ): Promise<ComplaintSuggestion> {
    const state = await loadStore();
    const list = state.complaintsSuggestions ?? [];
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Complaint/Suggestion not found: ${id}`);
    }
    const existing = list[idx];
    const updated: ComplaintSuggestion = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    if (staffResponse !== undefined) {
      updated.staffResponse = staffResponse;
    }
    if (staffId !== undefined) {
      updated.respondedByStaffId = staffId;
    }
    if (staffName !== undefined) {
      updated.respondedByStaffName = staffName;
    }
    list[idx] = updated;
    state.complaintsSuggestions = list;
    await saveStore(state);
    return updated;
  }

  // Member Surveys & Polls
  async listSurveys(branchId?: string, onlyActive?: boolean): Promise<Survey[]> {
    const state = await loadStore();
    let list = state.surveys ?? [];
    if (branchId) {
      list = list.filter((s) => !s.branchId || s.branchId === branchId);
    }
    if (onlyActive) {
      list = list.filter((s) => s.isActive);
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSurvey(id: string): Promise<Survey | null> {
    const state = await loadStore();
    return (state.surveys ?? []).find((s) => s.id === id) ?? null;
  }

  async createSurvey(
    input: Omit<Survey, 'id' | 'createdAt' | 'totalResponses'>
  ): Promise<Survey> {
    const state = await loadStore();
    const newSurvey: Survey = {
      ...input,
      id: `survey-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      totalResponses: 0,
    };
    state.surveys = [newSurvey, ...(state.surveys ?? [])];
    await saveStore(state);
    return newSurvey;
  }

  async updateSurveyStatus(id: string, isActive: boolean): Promise<Survey> {
    const state = await loadStore();
    const list = state.surveys ?? [];
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Survey not found: ${id}`);
    }
    const updated: Survey = {
      ...list[idx],
      isActive,
    };
    list[idx] = updated;
    state.surveys = list;
    await saveStore(state);
    return updated;
  }

  async deleteSurvey(id: string): Promise<void> {
    const state = await loadStore();
    state.surveys = (state.surveys ?? []).filter((s) => s.id !== id);
    state.surveyResponses = (state.surveyResponses ?? []).filter(
      (r) => r.surveyId !== id
    );
    await saveStore(state);
  }

  async listSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    const state = await loadStore();
    return (state.surveyResponses ?? []).filter((r) => r.surveyId === surveyId);
  }

  async submitSurveyResponse(
    input: Omit<SurveyResponse, 'id' | 'submittedAt'>
  ): Promise<SurveyResponse> {
    const state = await loadStore();
    const responses = state.surveyResponses ?? [];
    const existing = responses.find(
      (r) => r.surveyId === input.surveyId && r.memberId === input.memberId
    );
    if (existing) {
      throw new Error('You have already submitted a response to this survey/poll.');
    }

    const newResponse: SurveyResponse = {
      ...input,
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      submittedAt: new Date().toISOString(),
    };

    state.surveyResponses = [...responses, newResponse];

    // Increment totalResponses on survey
    const surveys = state.surveys ?? [];
    const sIdx = surveys.findIndex((s) => s.id === input.surveyId);
    if (sIdx !== -1) {
      surveys[sIdx] = {
        ...surveys[sIdx],
        totalResponses: (surveys[sIdx].totalResponses || 0) + 1,
      };
      state.surveys = surveys;
    }

    await saveStore(state);
    return newResponse;
  }

  async getMemberSurveyResponses(memberId: string): Promise<SurveyResponse[]> {
    const state = await loadStore();
    return (state.surveyResponses ?? []).filter((r) => r.memberId === memberId);
  }
}


