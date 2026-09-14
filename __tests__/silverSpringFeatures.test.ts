jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { DEMO_TODAY } from '@/domain/demoClock';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

test('paid swim class registers with amount and paymentLast4', async () => {
  const api = new MockProtivityAdapter();
  // sched-swim-lesson-tue is Youth Swim Lessons ($25.00)
  const reg = await api.registerForClass('member-jordan', 'sched-swim-lesson-tue');

  expect(reg.status).toBe('registered');
  expect(reg.paidAmountCents).toBe(2500);
  expect(reg.paymentLast4).toBe('4242');

  const mine = await api.listMyRegistrations('member-jordan');
  const found = mine.find((r) => r.scheduleItemId === 'sched-swim-lesson-tue');
  expect(found).toBeDefined();
  expect(found?.paidAmountCents).toBe(2500);
});

test('membership-included class registers with 0 paidAmountCents', async () => {
  const api = new MockProtivityAdapter();
  // sched-bodypump-mon is free with membership
  const reg = await api.registerForClass('member-jordan', 'sched-bodypump-mon');

  expect(reg.status).toBe('registered');
  expect(reg.paidAmountCents).toBe(0);
  expect(reg.paymentLast4).toBeUndefined();
});

test('special events have correct extra-cost pricing and metadata', async () => {
  const api = new MockProtivityAdapter();
  const schedules = await api.getSchedules({
    branchId: 'silver-spring',
    from: '2026-09-14',
    to: '2026-09-20',
    category: 'event',
  });

  const turkeyRace = schedules.find((s) => s.id === 'sched-event-turkey-sat');
  expect(turkeyRace).toBeDefined();
  expect(turkeyRace?.priceCents).toBe(3500);
  expect(turkeyRace?.isSpecialEvent).toBe(true);

  const openHouse = schedules.find((s) => s.id === 'sched-event-sat');
  expect(openHouse).toBeDefined();
  expect(openHouse?.priceCents).toBe(0);
  expect(openHouse?.isSpecialEvent).toBeFalsy();
});

test('seniors filter returns senior category and seniorFriendly classes', async () => {
  const api = new MockProtivityAdapter();
  const seniorClasses = await api.getSchedules({
    branchId: 'silver-spring',
    from: '2026-09-14',
    to: '2026-09-20',
    category: 'seniors',
  });

  // Should include Gentle Chair Yoga, Fit & Well Seniors, Aqua Arthritis, Parkinson's
  const titles = seniorClasses.map((c) => c.title);
  expect(titles).toContain('Gentle Chair Yoga');
  expect(titles).toContain('Fit & Well Seniors');
  expect(titles).toContain('Aqua Arthritis Warm Water Therapy');
  expect(titles).toContain("Movement for Parkinson's & Balance");

  // Aqua Fit is seniorFriendly: true, so it should also appear
  expect(titles).toContain('Aqua Fit (Water Aerobics)');

  // All returned items should be senior-friendly or in seniors category
  for (const item of seniorClasses) {
    expect(item.category === 'seniors' || item.seniorFriendly === true).toBe(true);
  }
});

test('cancelling a paid class registration updates status to cancelled', async () => {
  const api = new MockProtivityAdapter();
  await api.registerForClass('member-jordan', 'sched-swim-clinic-wed');

  const cancelled = await api.cancelClassRegistration('member-jordan', 'sched-swim-clinic-wed');
  expect(cancelled.status).toBe('cancelled');

  const mine = await api.listMyRegistrations('member-jordan');
  expect(mine.find((r) => r.scheduleItemId === 'sched-swim-clinic-wed')).toBeUndefined();
});

test('staff list separates into personal trainers and wellness desk with distinct messaging threads', async () => {
  const api = new MockProtivityAdapter();
  const allStaff = await api.listStaff('silver-spring');

  const trainers = allStaff.filter((s) => s.id !== 'staff-desk');
  const desk = allStaff.find((s) => s.id === 'staff-desk');

  expect(trainers.length).toBeGreaterThanOrEqual(3);
  expect(trainers.map((t) => t.name)).toContain('Alex Rivera');
  expect(trainers.map((t) => t.name)).toContain('Sarah Jenkins');
  expect(trainers.map((t) => t.name)).toContain('Elena Rostova');

  expect(desk).toBeDefined();
  expect(desk?.name).toBe('Marcus Vance');
  expect(desk?.roleLabel).toContain('Wellness Desk');

  // Verify separate messaging threads can be created and messaged
  const trainerThread = await api.getOrCreateThread('member-jordan', 'staff-alex');
  const deskThread = await api.getOrCreateThread('member-jordan', 'staff-desk');

  expect(trainerThread.id).not.toBe(deskThread.id);

  await api.sendMessage({
    threadId: trainerThread.id,
    fromId: 'member-jordan',
    body: 'Hi Alex, looking forward to our session!',
  });

  await api.sendMessage({
    threadId: deskThread.id,
    fromId: 'member-jordan',
    body: 'Hello, what time does the lap pool close tonight?',
  });

  const trainerMsgs = await api.listMessages(trainerThread.id);
  const deskMsgs = await api.listMessages(deskThread.id);

  expect(trainerMsgs.some((m) => m.body.includes('session'))).toBe(true);
  expect(deskMsgs.some((m) => m.body.includes('lap pool'))).toBe(true);
});

