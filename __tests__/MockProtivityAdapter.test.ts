jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { DEMO_TODAY } from '@/domain/demoClock';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { lessonRepo } from '@/repositories/lessonRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

test('login returns jordan as member', async () => {
  const api = new MockProtivityAdapter();
  await expect(api.login('jordan@silverspring.ymca', 'ymca-demo')).resolves.toEqual({
    userId: 'member-jordan',
    role: 'member',
  });
});

test('getStaffDay matches demo today from ISO date prefix', async () => {
  const api = new MockProtivityAdapter();
  const day = await api.getStaffDay('staff-alex', DEMO_TODAY);
  expect(day.map((i) => i.id)).toContain('sched-bodypump-mon');
});

test('bad login throws', async () => {
  const api = new MockProtivityAdapter();
  await expect(api.login('jordan@silverspring.ymca', 'wrong')).rejects.toThrow();
});

test('cancel after deadline sets pending and blocks second submit', async () => {
  const api = new MockProtivityAdapter();
  const req = await api.submitCancelNotice('member-jordan', {
    reason: 'Moving',
    requestedAt: '2026-09-14',
  });
  expect(req.lastBillDate).toBe('2026-10-12');
  expect(req.accessThrough).toBe('2026-11-11');
  const member = await api.getMember('member-jordan');
  expect(member.status).toBe('cancel_pending');
  await expect(
    api.submitCancelNotice('member-jordan', { reason: 'again', requestedAt: '2026-09-14' })
  ).rejects.toThrow(/already/i);
});

test('MockProtivityAdapter exposes all ProtivityPort methods', () => {
  const api = new MockProtivityAdapter();
  const methods = [
    'login',
    'getMember',
    'updateMemberProfile',
    'getStaff',
    'getMembership',
    'getSchedules',
    'getStaffDay',
    'listAssignedMembers',
    'getAssignedTrainer',
    'updatePaymentMethod',
    'submitCancelNotice',
    'listPendingCancels',
    'listMessages',
    'listThreads',
    'sendMessage',
    'registerForClass',
    'cancelClassRegistration',
    'listMyRegistrations',
    'listClassRoster',
    'listLessonSlots',
    'bookPrivateLesson',
    'cancelPrivateLesson',
    'listMyLessons',
    'listStaffLessons',
  ];
  for (const m of methods) {
    expect(typeof (api as any)[m]).toBe('function');
  }
});

test('updateMemberProfile updates name and phone and persists changes', async () => {
  const api = new MockProtivityAdapter();
  const initial = await api.getMember('member-jordan');
  expect(initial.name).toBe('Jordan Hale');

  const updated = await api.updateMemberProfile('member-jordan', {
    name: 'Jordan M. Hale',
    phone: '(301) 555-9999',
  });

  expect(updated.name).toBe('Jordan M. Hale');
  expect(updated.phone).toBe('(301) 555-9999');

  // Verify persistence
  const reloaded = await api.getMember('member-jordan');
  expect(reloaded.name).toBe('Jordan M. Hale');
  expect(reloaded.phone).toBe('(301) 555-9999');
});

test('register for class and block double register', async () => {
  const api = new MockProtivityAdapter();
  const reg = await api.registerForClass('member-jordan', 'sched-bodypump-mon');
  expect(reg.status).toBe('registered');
  await expect(
    api.registerForClass('member-jordan', 'sched-bodypump-mon')
  ).rejects.toThrow(/already/i);
  const mine = await api.listMyRegistrations('member-jordan');
  expect(mine.map((r) => r.scheduleItemId)).toContain('sched-bodypump-mon');
});

test('cancel class registration frees the spot', async () => {
  const api = new MockProtivityAdapter();
  await api.registerForClass('member-jordan', 'sched-yoga-mon');
  const cancelled = await api.cancelClassRegistration('member-jordan', 'sched-yoga-mon');
  expect(cancelled.status).toBe('cancelled');
  const mine = await api.listMyRegistrations('member-jordan');
  expect(mine.find((r) => r.scheduleItemId === 'sched-yoga-mon')).toBeUndefined();
});

test('change registration to another day of same class', async () => {
  const api = new MockProtivityAdapter();
  await api.registerForClass('member-jordan', 'sched-bodypump-mon');
  const from = (await api.getSchedules({
    branchId: 'silver-spring',
    from: '2026-09-14',
    to: '2026-09-20',
  })).find((s) => s.id === 'sched-bodypump-mon')!;
  const to = (await api.getSchedules({
    branchId: 'silver-spring',
    from: '2026-09-14',
    to: '2026-09-20',
  })).find((s) => s.id === 'sched-bodypump-fri')!;
  const next = await registrationRepo.change(api, 'member-jordan', from, to);
  expect(next.scheduleItemId).toBe('sched-bodypump-fri');
  const mine = await api.listMyRegistrations('member-jordan');
  expect(mine.map((r) => r.scheduleItemId)).toEqual(['sched-bodypump-fri']);
});

test('class capacity is enforced', async () => {
  const api = new MockProtivityAdapter();
  const state = await loadStore();
  const tiny = state.schedules.find((s) => s.id === 'sched-cycle-tue')!;
  tiny.capacity = 1;
  state.classRegistrations.push({
    id: 'reg-other',
    memberId: 'member-other',
    scheduleItemId: 'sched-cycle-tue',
    status: 'registered',
  });
  await saveStore(state);
  await expect(api.registerForClass('member-jordan', 'sched-cycle-tue')).rejects.toThrow(
    /full/i
  );
});

test('book private lesson and reject slot conflict', async () => {
  const api = new MockProtivityAdapter();
  const lesson = await api.bookPrivateLesson('member-jordan', 'slot-alex-tue-1000');
  expect(lesson.status).toBe('booked');
  await expect(
    api.bookPrivateLesson('member-jordan', 'slot-alex-tue-1000')
  ).rejects.toThrow(/available/i);
  const open = await api.listLessonSlots('staff-alex', '2026-09-14', '2026-09-20');
  expect(open.find((s) => s.id === 'slot-alex-tue-1000')).toBeUndefined();
});

test('cancel private lesson and change to another slot', async () => {
  const api = new MockProtivityAdapter();
  const first = await api.bookPrivateLesson('member-jordan', 'slot-alex-wed-1100');
  const updated = await lessonRepo.change(
    api,
    'member-jordan',
    first.id,
    'slot-alex-thu-0900'
  );
  expect(updated.slotId).toBe('slot-alex-thu-0900');
  const mine = await api.listMyLessons('member-jordan');
  expect(mine).toHaveLength(1);
  expect(mine[0].slotId).toBe('slot-alex-thu-0900');
});

test('schedules include capacity', async () => {
  const api = new MockProtivityAdapter();
  const list = await api.getSchedules({
    branchId: 'silver-spring',
    from: '2026-09-14',
    to: '2026-09-14',
  });
  expect(list.every((s) => typeof s.capacity === 'number' && s.capacity > 0)).toBe(true);
});

test('listStaff returns multiple trainers and wellness desk staff', async () => {
  const api = new MockProtivityAdapter();
  const staff = await api.listStaff('silver-spring');
  expect(staff.length).toBeGreaterThanOrEqual(4);
  const names = staff.map((s) => s.name);
  expect(names).toContain('Alex Rivera');
  expect(names).toContain('Sarah Davis');
  expect(names).toContain('Emily Wilson');
  expect(names).toContain('Marcus Taylor');
});

test('getOrCreateThread resolves existing thread or creates new one', async () => {
  const api = new MockProtivityAdapter();
  const threadAlex = await api.getOrCreateThread('member-jordan', 'staff-alex');
  expect(threadAlex.id).toBe('thread-jordan-alex');

  const threadDesk = await api.getOrCreateThread('member-jordan', 'staff-desk');
  expect(threadDesk.id).toBe('thread-jordan-desk');

  const msg = await api.sendMessage({
    threadId: threadDesk.id,
    fromId: 'member-jordan',
    body: 'Can I get information on swimming hours?',
  });
  expect(msg.body).toBe('Can I get information on swimming hours?');
  const msgs = await api.listMessages(threadDesk.id);
  expect(msgs.some((m) => m.body.includes('swimming hours'))).toBe(true);
});

test('setAssignedTrainer updates member primary trainer', async () => {
  const api = new MockProtivityAdapter();
  await api.setAssignedTrainer('member-jordan', 'staff-sarah');
  const assigned = await api.getAssignedTrainer('member-jordan');
  expect(assigned?.name).toBe('Sarah Davis');
});

test('book private lesson with different trainers (Sarah Davis)', async () => {
  const api = new MockProtivityAdapter();
  const openSarah = await api.listLessonSlots('staff-sarah', '2026-09-14', '2026-09-20');
  expect(openSarah.length).toBeGreaterThan(0);
  const lesson = await api.bookPrivateLesson('member-jordan', openSarah[0].id);
  expect(lesson.status).toBe('booked');
  expect(lesson.staffId).toBe('staff-sarah');
});

