jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AQUATICS_CLASSES } from '@/domain/aquaticsGuideData';
import { SEED } from '@/protivity/seed';
import { loadStore, resetStore } from '@/storage/demoStore';

const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('demo seed', () => {
  it('has no duplicate ids', () => {
    for (const list of [
      SEED.members,
      SEED.staff,
      SEED.schedules,
      SEED.threads,
      SEED.messages,
      SEED.notifications,
      SEED.announcements,
      SEED.forumTopics,
      SEED.forumReplies,
      SEED.leads,
      SEED.supportTickets,
      SEED.complaintsSuggestions,
      SEED.sessionRequests,
      SEED.privateLessons,
      SEED.classRegistrations,
    ]) {
      expect(new Set(ids(list)).size).toBe(list.length);
    }
    const membershipIds = SEED.members.map((m) => m.membershipId);
    expect(new Set(membershipIds).size).toBe(membershipIds.length);
  });

  it('resolves every reference', () => {
    const memberIds = new Set(SEED.members.map((m) => m.id));
    const staffIds = new Set(SEED.staff.map((s) => s.id));
    const scheduleIds = new Set(SEED.schedules.map((s) => s.id));
    const threadIds = new Set(SEED.threads.map((t) => t.id));
    const topicIds = new Set(SEED.forumTopics.map((t) => t.id));
    const classIds = new Set(AQUATICS_CLASSES.map((c) => c.id));

    for (const m of SEED.memberships) expect(memberIds.has(m.memberId)).toBe(true);
    for (const t of SEED.threads) {
      expect(memberIds.has(t.memberId)).toBe(true);
      expect(staffIds.has(t.staffId)).toBe(true);
    }
    for (const m of SEED.messages) {
      expect(threadIds.has(m.threadId)).toBe(true);
      const t = SEED.threads.find((x) => x.id === m.threadId)!;
      expect([t.memberId, t.staffId]).toContain(m.fromId);
    }
    for (const r of SEED.classRegistrations) {
      expect(memberIds.has(r.memberId)).toBe(true);
      expect(scheduleIds.has(r.scheduleItemId)).toBe(true);
    }
    for (const s of SEED.savedClasses) {
      expect(memberIds.has(s.memberId)).toBe(true);
      expect(scheduleIds.has(s.scheduleItemId)).toBe(true);
    }
    for (const e of SEED.swimEnrollments) {
      expect(memberIds.has(e.memberId)).toBe(true);
      expect(classIds.has(e.classId)).toBe(true);
    }
    for (const l of SEED.privateLessons) {
      expect(memberIds.has(l.memberId)).toBe(true);
      expect(staffIds.has(l.staffId)).toBe(true);
    }
    for (const r of SEED.sessionRequests) {
      expect(memberIds.has(r.memberId)).toBe(true);
      expect(staffIds.has(r.staffId)).toBe(true);
    }
    for (const r of SEED.forumReplies) expect(topicIds.has(r.topicId)).toBe(true);
    for (const t of SEED.supportTickets) expect(threadIds.has(t.threadId) || t.id === 'ticket-seed-1').toBe(true);
    for (const w of SEED.workoutLogs) expect(memberIds.has(w.memberId)).toBe(true);
    for (const a of SEED.assignments) {
      expect(memberIds.has(a.memberId)).toBe(true);
      expect(staffIds.has(a.staffId)).toBe(true);
    }
    for (const m of SEED.members) {
      if (m.householdId) expect(memberIds.has(m.householdId)).toBe(true);
    }
  });

  it('is large enough to look like a working branch', () => {
    expect(SEED.members.length).toBeGreaterThanOrEqual(40);
    expect(SEED.threads.length).toBeGreaterThanOrEqual(15);
    expect(SEED.messages.length).toBeGreaterThanOrEqual(50);
    expect(SEED.notifications.length).toBeGreaterThanOrEqual(30);
    expect(SEED.announcements.length).toBeGreaterThanOrEqual(10);
    expect(SEED.forumTopics.length).toBeGreaterThanOrEqual(10);
    expect(SEED.leads.length).toBeGreaterThanOrEqual(12);
    expect(SEED.donations.length).toBeGreaterThanOrEqual(8);
  });
});

describe('seeded store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
  });

  it('generates recent gym check-ins and Child Watch visits', async () => {
    const state = await loadStore();
    expect(state.arrivals.length).toBeGreaterThan(100);
    expect(state.childWatchVisits.length).toBeGreaterThan(10);
    const memberIds = new Set(state.members.map((m) => m.id));
    for (const a of state.arrivals) expect(memberIds.has(a.memberId)).toBe(true);
    for (const v of state.childWatchVisits) expect(memberIds.has(v.childId)).toBe(true);
  });

  it('covers the following week so seven-day views are never empty', async () => {
    const state = await loadStore();
    expect(state.schedules.some((s) => s.id.endsWith('-w2') && s.start.startsWith('2026-09-21'))).toBe(true);
  });
});
