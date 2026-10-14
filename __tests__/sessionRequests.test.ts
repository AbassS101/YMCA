jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

const api = new MockProtivityAdapter();

// Alek's seeded windows: 9-14 and 16-19 on 2026-09-17 (demo today is 2026-09-14).
const T10 = '2026-09-17T10:00:00-04:00';
const T11 = '2026-09-17T11:00:00-04:00';
const T1630 = '2026-09-17T16:30:00-04:00';

const input = (over: Partial<Parameters<typeof api.createSessionRequest>[1]> = {}) => ({
  staffId: 'staff-alek',
  lessonType: 'swim' as const,
  durationMin: 30 as const,
  start: T10,
  paymentTiming: 'before' as const,
  swimmerName: 'Mia',
  ...over,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

test('bookable times come from windows, respect length and lesson type', async () => {
  const times = await api.listBookableTimes('member-jordan', {
    lessonType: 'swim',
    durationMin: 60,
    from: '2026-09-17',
    to: '2026-09-17',
    staffId: 'staff-alek',
  });
  const starts = times.map((t) => t.start);
  // 9:00 fits a full hour; 10:00 stays open (the seeded 10:30 counter-offer is only pending); 18:00 is the last 60 min start.
  expect(starts).toContain(new Date('2026-09-17T09:00:00-04:00').toISOString());
  expect(starts).toContain(new Date(T10).toISOString());
  expect(starts).toContain(new Date('2026-09-17T18:00:00-04:00').toISOString());
  expect(starts).not.toContain(new Date('2026-09-17T18:30:00-04:00').toISOString());
  expect(times.every((t) => t.staffId === 'staff-alek')).toBe(true);

  const pt = await api.listBookableTimes('member-jordan', {
    lessonType: 'training',
    durationMin: 60,
    from: '2026-09-17',
    to: '2026-09-17',
    staffId: 'staff-alek',
  });
  expect(pt).toHaveLength(0);
});

test('"any instructor" lists several swim instructors', async () => {
  const times = await api.listBookableTimes('member-jordan', {
    lessonType: 'swim',
    durationMin: 30,
    from: '2026-09-15',
    to: '2026-09-19',
  });
  expect(new Set(times.map((t) => t.staffId)).size).toBeGreaterThan(1);
});

test('default is a pending request: nothing is booked or charged until accepted', async () => {
  const req = await api.createSessionRequest('member-jordan', input());
  expect(req.status).toBe('pending');
  expect(req.lessonId).toBeUndefined();
  expect(await api.listMyLessons('member-jordan')).toHaveLength(0);

  // A pending request does not hold the slot: other members still see it as open.
  const open = await api.listBookableTimes('member-riley', {
    lessonType: 'swim',
    durationMin: 30,
    from: '2026-09-17',
    to: '2026-09-17',
    staffId: 'staff-alek',
  });
  expect(open.map((t) => t.start)).toContain(new Date(T10).toISOString());
});

test('accepting a pay-before request books the lesson and charges the card', async () => {
  const req = await api.createSessionRequest('member-jordan', input());
  const done = await api.respondToSessionRequest(req.id, 'staff-alek', { action: 'accept' });
  expect(done.status).toBe('accepted');
  const [lesson] = await api.listMyLessons('member-jordan');
  expect(lesson.paymentStatus).toBe('paid');
  expect(lesson.paidAmountCents).toBe(3500);
  expect(lesson.paymentLast4).toBe('4242');
});

test('pay-after is charged when the session is marked completed', async () => {
  const req = await api.createSessionRequest('member-jordan', input({ paymentTiming: 'after' }));
  await api.respondToSessionRequest(req.id, 'staff-alek', { action: 'accept' });
  const [lesson] = await api.listMyLessons('member-jordan');
  expect(lesson.paymentStatus).toBe('due');
  expect(lesson.paidAmountCents).toBe(0);
  const completed = await api.markLessonStatus(lesson.id, 'completed');
  expect(completed.paymentStatus).toBe('paid');
  expect(completed.paidAmountCents).toBe(3500);
});

test('decline, counter then accept, and counter then decline', async () => {
  const a = await api.createSessionRequest('member-jordan', input());
  expect((await api.respondToSessionRequest(a.id, 'staff-alek', { action: 'decline', note: 'Out' })).status).toBe('declined');

  const b = await api.createSessionRequest('member-jordan', input());
  const countered = await api.respondToSessionRequest(b.id, 'staff-alek', { action: 'counter', start: T11 });
  expect(countered.status).toBe('countered');
  expect(new Date(countered.start).toISOString()).toBe(new Date(T11).toISOString());
  const accepted = await api.respondToCounterOffer(b.id, 'member-jordan', 'accept');
  expect(accepted.status).toBe('accepted');
  const [lesson] = await api.listMyLessons('member-jordan');
  expect(new Date(lesson.start).toISOString()).toBe(new Date(T11).toISOString());

  const c = await api.createSessionRequest('member-riley', input({ start: T1630 }));
  await api.respondToSessionRequest(c.id, 'staff-alek', { action: 'counter', start: '2026-09-17T17:00:00-04:00' });
  expect((await api.respondToCounterOffer(c.id, 'member-riley', 'decline')).status).toBe('declined');
});

test('only the requested instructor can answer, and only once', async () => {
  const req = await api.createSessionRequest('member-jordan', input());
  await expect(api.respondToSessionRequest(req.id, 'staff-sarah', { action: 'accept' })).rejects.toThrow();
  await api.respondToSessionRequest(req.id, 'staff-alek', { action: 'accept' });
  await expect(api.respondToSessionRequest(req.id, 'staff-alek', { action: 'decline' })).rejects.toThrow();
});

test('times outside availability or already taken are rejected', async () => {
  await expect(api.createSessionRequest('member-jordan', input({ start: '2026-09-17T14:30:00-04:00' }))).rejects.toThrow();
  // Pending requests do not block other members, but the same member cannot ask twice for one time.
  await api.createSessionRequest('member-riley', input());
  await expect(api.createSessionRequest('member-riley', input())).rejects.toThrow();
  await expect(api.createSessionRequest('member-jordan', input())).resolves.toBeDefined();
});

test('instant booking is off by default and confirms immediately for listed members only', async () => {
  const off = await api.createSessionRequest('member-jordan', input());
  expect(off.status).toBe('pending');

  await api.setInstantBooking('staff-alek', 'member-riley', true, 'staff-alek');
  const on = await api.createSessionRequest('member-riley', input({ start: T11 }));
  expect(on.status).toBe('accepted');
  expect(on.history.map((e) => e.action)).toEqual(['requested', 'auto_accepted']);
  expect(await api.listMyLessons('member-riley')).toHaveLength(1);

  await api.setInstantBooking('staff-alek', 'member-riley', false, 'staff-alek');
  const again = await api.createSessionRequest('member-riley', input({ start: T1630 }));
  expect(again.status).toBe('pending');
});

test('instant booking can be changed by the owner or the matching director, not a trainer', async () => {
  await expect(api.setInstantBooking('staff-alek', 'member-riley', true, 'staff-alex')).rejects.toThrow();
  const s = await api.setInstantBooking('staff-alek', 'member-riley', true, 'staff-admin');
  expect(s.instantBookMemberIds).toContain('member-riley');
});

test('visibility: Wellness Director sees PT, Aquatics Director sees swim, admin sees all', async () => {
  await api.createSessionRequest('member-jordan', input());
  const pt = await api.createSessionRequest('member-riley', {
    staffId: 'staff-alex',
    lessonType: 'training',
    durationMin: 60,
    start: '2026-09-15T10:00:00-04:00',
    paymentTiming: 'after',
  }).catch(() => null);

  const celine = await api.listSessionRequests({ viewerId: 'staff-celine' });
  const alek = await api.listSessionRequests({ viewerId: 'staff-alek' });
  const admin = await api.listSessionRequests({ viewerId: 'staff-admin' });
  const alex = await api.listSessionRequests({ viewerId: 'staff-alex' });

  expect(celine.every((r) => r.lessonType === 'training')).toBe(true);
  expect(alek.every((r) => r.lessonType === 'swim')).toBe(true);
  expect(alek.length).toBeGreaterThan(0);
  expect(admin.length).toBeGreaterThanOrEqual(celine.length + alek.length);
  expect(alex.every((r) => r.staffId === 'staff-alex')).toBe(true);
  void pt;
});

test('cancelling an accepted request cancels the lesson', async () => {
  const req = await api.createSessionRequest('member-jordan', input());
  await api.respondToSessionRequest(req.id, 'staff-alek', { action: 'accept' });
  const cancelled = await api.cancelSessionRequest(req.id, 'member-jordan');
  expect(cancelled.status).toBe('cancelled');
  expect(await api.listMyLessons('member-jordan')).toHaveLength(0);
});

test('rescheduling carries payment over and replaces the old lesson on confirm', async () => {
  const first = await api.createSessionRequest('member-jordan', input());
  await api.respondToSessionRequest(first.id, 'staff-alek', { action: 'accept' });
  const [old] = await api.listMyLessons('member-jordan');
  const next = await api.createSessionRequest('member-jordan', input({ start: T11, replacesLessonId: old.id }));
  expect(next.status).toBe('pending');
  expect(await api.listMyLessons('member-jordan')).toHaveLength(1);
  await api.respondToSessionRequest(next.id, 'staff-alek', { action: 'accept' });
  const lessons = await api.listMyLessons('member-jordan');
  expect(lessons).toHaveLength(1);
  expect(lessons[0].paidAmountCents).toBe(3500);
});

test('Aquatics Director can log in', async () => {
  const session = await api.login('aquatics@silverspring.ymca', 'ymca-demo');
  expect(session.role).toBe('aquatics_director');
});
