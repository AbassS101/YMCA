jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { availabilityRepo } from '@/repositories/lessonRepo';
import { resetStore } from '@/storage/demoStore';
import type { TrainerAvailabilityInput } from '@/domain/types';

const api = new MockProtivityAdapter();

// Celine's seeded schedule: Tuesday and Thursday 9-12 and 15-18 (demo today is Monday 2026-09-14).
const TUE = '2026-09-15';
const at = (hm: string, date = TUE) => `${date}T${hm}:00-04:00`;
const iso = (s: string) => new Date(s).toISOString();

const input = (over: Partial<Parameters<typeof api.createSessionRequest>[1]> = {}) => ({
  staffId: 'staff-celine',
  lessonType: 'training' as const,
  durationMin: 60 as const,
  start: at('10:00'),
  paymentTiming: 'after' as const,
  ...over,
});

const starts = async (memberId: string, date = TUE, durationMin: 30 | 60 = 60) =>
  (
    await api.listBookableTimes(memberId, {
      lessonType: 'training',
      durationMin,
      from: date,
      to: date,
      staffId: 'staff-celine',
    })
  ).map((t) => t.start);

const weeklyFor = (weekday: number): TrainerAvailabilityInput['weekly'] => [
  { id: 'n1', weekday, startTime: '09:00', endTime: '12:00', location: 'Wellness Floor' },
];

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

test('weekly schedule yields bookable times and leaves out the gap and other days', async () => {
  const times = await starts('member-riley');
  expect(times).toContain(iso(at('09:00')));
  expect(times).toContain(iso(at('11:00')));
  expect(times).not.toContain(iso(at('11:30'))); // would run past the 12:00 window end
  expect(times).not.toContain(iso(at('12:00'))); // the gap
  expect(times).not.toContain(iso(at('14:30')));
  expect(times).toContain(iso(at('15:00')));
  expect(times).toContain(iso(at('17:00')));
  expect(times).not.toContain(iso(at('17:30')));
  expect(await starts('member-riley', '2026-09-14')).toEqual([]); // Monday
  expect(await starts('member-riley', '2026-09-22')).toContain(iso(at('09:00', '2026-09-22'))); // repeats weekly
});

test('requests outside a window are rejected and the window location is used', async () => {
  await expect(api.createSessionRequest('member-riley', input({ start: at('12:00') }))).rejects.toThrow();
  const req = await api.createSessionRequest('member-riley', input());
  expect(req.location).toBe('Wellness Floor');
});

test('a pending request does not hide the spot, and two members can both request it', async () => {
  const a = await api.createSessionRequest('member-riley', input());
  expect(await starts('member-sam')).toContain(iso(at('10:00')));
  const b = await api.createSessionRequest('member-sam', input());
  expect(a.status).toBe('pending');
  expect(b.status).toBe('pending');
  // The same member cannot ask twice for the same time.
  await expect(api.createSessionRequest('member-riley', input())).rejects.toThrow();
});

test('accepting one request books the spot and auto-declines overlapping open requests', async () => {
  const a = await api.createSessionRequest('member-riley', input());
  const b = await api.createSessionRequest('member-sam', input({ start: at('10:30') }));
  const clear = await api.createSessionRequest('member-nora', input({ start: at('15:00') }));

  const done = await api.respondToSessionRequest(a.id, 'staff-celine', { action: 'accept' });
  expect(done.status).toBe('accepted');

  const all = await api.listSessionRequests({ staffId: 'staff-celine' });
  const declined = all.find((r) => r.id === b.id);
  expect(declined?.status).toBe('declined');
  expect(declined?.history.at(-1)?.action).toBe('declined');
  expect(all.find((r) => r.id === clear.id)?.status).toBe('pending');
  await expect(api.respondToSessionRequest(b.id, 'staff-celine', { action: 'accept' })).rejects.toThrow();
});

test('an accepted request hides the time for everyone else, including overlaps', async () => {
  const a = await api.createSessionRequest('member-riley', input());
  await api.respondToSessionRequest(a.id, 'staff-celine', { action: 'accept' });
  const times = await starts('member-sam');
  expect(times).not.toContain(iso(at('09:30')));
  expect(times).not.toContain(iso(at('10:00')));
  expect(times).not.toContain(iso(at('10:30')));
  expect(times).toContain(iso(at('09:00')));
  expect(times).toContain(iso(at('11:00')));
  await expect(api.createSessionRequest('member-sam', input())).rejects.toThrow();
});

test('an instant booking also declines overlapping open requests', async () => {
  const open = await api.createSessionRequest('member-sam', input());
  await api.setInstantBooking('staff-celine', 'member-riley', true, 'staff-celine');
  const instant = await api.createSessionRequest('member-riley', input({ start: at('10:30') }));
  expect(instant.status).toBe('accepted');
  const all = await api.listSessionRequests({ staffId: 'staff-celine' });
  expect(all.find((r) => r.id === open.id)?.status).toBe('declined');
});

test('a blocked date has no bookable times', async () => {
  const current = await api.getTrainerAvailability('staff-celine', 'staff-admin');
  await api.saveTrainerAvailability(
    'staff-celine',
    { ...current, exceptions: [{ id: 'x1', date: TUE, kind: 'blocked', windows: [] }] },
    'staff-admin'
  );
  expect(await starts('member-riley')).toEqual([]);
  expect(await starts('member-riley', '2026-09-17')).not.toEqual([]);
  await expect(api.createSessionRequest('member-riley', input())).rejects.toThrow();
});

test('a custom date replaces the weekly windows', async () => {
  const current = await api.getTrainerAvailability('staff-celine', 'staff-admin');
  await api.saveTrainerAvailability(
    'staff-celine',
    {
      ...current,
      exceptions: [
        {
          id: 'x2',
          date: TUE,
          kind: 'custom',
          windows: [{ id: 'c1', startTime: '07:00', endTime: '08:00', location: 'Studio' }],
        },
      ],
    },
    'staff-admin'
  );
  expect(await starts('member-riley')).toEqual([iso(at('07:00'))]);
});

test('listAvailabilityWindows merges weekly windows with one-off slots', async () => {
  await api.addLessonSlot(
    { staffId: 'staff-celine', branchId: 'branch-silver-spring', start: at('13:00'), end: at('14:00'), location: 'Studio' },
    'staff-celine'
  );
  const windows = await availabilityRepo.listWindows(api, 'staff-celine', TUE, TUE);
  expect(windows.map((w) => w.start)).toEqual([at('09:00'), at('13:00'), at('15:00')]);
  expect(windows[0].id).toMatch(/^avail-staff-celine-2026-09-15-/);
});

test('save validates, and trainers may only edit themselves', async () => {
  await expect(
    api.saveTrainerAvailability(
      'staff-alex',
      { weekly: [{ id: 'bad', weekday: 2, startTime: '11:00', endTime: '10:00', location: 'F' }], effectiveFrom: TUE, exceptions: [] },
      'staff-alex'
    )
  ).rejects.toThrow();

  const mine = { weekly: weeklyFor(3), effectiveFrom: '2026-01-01', exceptions: [] };
  const saved = await api.saveTrainerAvailability('staff-alex', mine, 'staff-alex');
  expect(saved.availability.updatedBy).toBe('staff-alex');
  expect((await api.getTrainerAvailability('staff-alex', 'staff-alex')).weekly).toHaveLength(1);

  await expect(api.saveTrainerAvailability('staff-celine', mine, 'staff-alex')).rejects.toThrow();
  await expect(api.getTrainerAvailability('staff-celine', 'staff-alex')).rejects.toThrow();
  await expect(api.saveTrainerAvailability('staff-alex', mine, 'staff-sarah')).rejects.toThrow();
  await expect(api.addLessonSlot({ staffId: 'staff-celine', branchId: 'b', start: at('13:00'), end: at('14:00'), location: 'F' }, 'staff-alex')).rejects.toThrow();
});

test('the aquatics director manages swim staff but not personal trainers', async () => {
  const mine = { weekly: weeklyFor(3), effectiveFrom: '2026-01-01', exceptions: [] };
  await expect(api.saveTrainerAvailability('staff-sarah', mine, 'staff-alek')).resolves.toBeDefined();
  await expect(api.saveTrainerAvailability('staff-alex', mine, 'staff-alek')).rejects.toThrow();
});

test('the wellness director manages personal trainers but not swim staff', async () => {
  const mine = { weekly: weeklyFor(3), effectiveFrom: '2026-01-01', exceptions: [] };
  await expect(api.saveTrainerAvailability('staff-alex', mine, 'staff-celine')).resolves.toBeDefined();
  await expect(api.saveTrainerAvailability('staff-sarah', mine, 'staff-celine')).rejects.toThrow();
});

test('an admin can answer a request on a trainer’s behalf; unrelated staff cannot', async () => {
  const req = await api.createSessionRequest('member-riley', input());
  await expect(api.respondToSessionRequest(req.id, 'staff-sarah', { action: 'accept' })).rejects.toThrow();
  await expect(api.respondToSessionRequest(req.id, 'staff-alek', { action: 'accept' })).rejects.toThrow();

  const countered = await api.respondToSessionRequest(req.id, 'staff-admin', { action: 'counter', start: at('11:00') });
  expect(countered.status).toBe('countered');
  expect(countered.history.at(-1)?.byId).toBe('staff-admin');

  const second = await api.createSessionRequest('member-sam', input({ start: at('15:00') }));
  const done = await api.respondToSessionRequest(second.id, 'staff-admin', { action: 'accept' });
  expect(done.status).toBe('accepted');
  expect((await api.listMyLessons('member-sam'))[0].staffId).toBe('staff-celine');
});

test('a wellness director can answer requests for personal trainers, not for swim', async () => {
  const swim = await api.createSessionRequest('member-riley', {
    staffId: 'staff-alek',
    lessonType: 'swim',
    durationMin: 30,
    start: '2026-09-17T10:00:00-04:00',
    paymentTiming: 'after',
    swimmerName: 'Mia',
  });
  await expect(api.respondToSessionRequest(swim.id, 'staff-celine', { action: 'decline' })).rejects.toThrow();
  const aq = await api.respondToSessionRequest(swim.id, 'staff-alek', { action: 'decline' });
  expect(aq.status).toBe('declined');
});

test('saving reports conflicts but never cancels the booked lesson', async () => {
  const req = await api.createSessionRequest('member-riley', input());
  await api.respondToSessionRequest(req.id, 'staff-celine', { action: 'accept' });
  const open = await api.createSessionRequest('member-sam', input({ start: at('15:00') }));

  const current = await api.getTrainerAvailability('staff-celine', 'staff-admin');
  const { conflicts } = await api.saveTrainerAvailability(
    'staff-celine',
    { ...current, weekly: current.weekly.filter((w) => w.weekday !== 2) },
    'staff-admin'
  );
  expect(conflicts.map((c) => `${c.kind}:${c.id}`).sort()).toEqual([`lesson:lesson-req-${req.id}`, `request:${open.id}`]);
  expect(conflicts.find((c) => c.kind === 'request')?.memberName).toBeDefined();

  const [lesson] = await api.listMyLessons('member-riley');
  expect(lesson.status).toBe('booked');
  expect(await starts('member-nora')).toEqual([]);
});

test('availability persists and saving with no conflicts reports none', async () => {
  const current = await api.getTrainerAvailability('staff-celine', 'staff-celine');
  const { conflicts, availability } = await api.saveTrainerAvailability('staff-celine', current, 'staff-celine');
  expect(conflicts).toEqual([]);
  expect(availability.updatedBy).toBe('staff-celine');
  expect((await availabilityRepo.get(api, 'staff-celine', 'staff-admin')).weekly).toEqual(current.weekly);
});
