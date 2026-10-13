jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { SWIM_CLASS_CAPACITY } from '@/domain/lessonPricing';
import { lessonRepo } from '@/repositories/lessonRepo';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';

const api = new MockProtivityAdapter();

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

test('paid private swim booking records price and last 4', async () => {
  const lesson = await lessonRepo.book(api, 'member-jordan', 'slot-elena-wed-0900', {
    lessonType: 'swim',
    durationMin: 30,
    swimmerName: 'Mia',
    stageCode: '2',
  });
  expect(lesson.paidAmountCents).toBe(3500);
  expect(lesson.paymentLast4).toBe('4242');
  expect(lesson.lessonType).toBe('swim');
  expect(lesson.swimmerName).toBe('Mia');
  const end = new Date(lesson.end).getTime() - new Date(lesson.start).getTime();
  expect(end).toBe(30 * 60000);
});

test('60 minute training lesson is $60 and rescheduling carries payment over', async () => {
  const lesson = await lessonRepo.book(api, 'member-jordan', 'slot-alex-thu-0900', {
    lessonType: 'training',
    durationMin: 60,
  });
  expect(lesson.paidAmountCents).toBe(6000);
  const moved = await lessonRepo.change(api, 'member-jordan', lesson.id, 'slot-alex-fri-1000');
  expect(moved.paidAmountCents).toBe(6000);
  expect(moved.lessonType).toBe('training');
});

test('full and program members are charged their tier', async () => {
  const full = await api.enrollInSwimClass('member-jordan', 'class-sat-04', 'Jordan');
  expect(full.paidAmountCents).toBe(11200);
  expect(full.pricingTier).toBe('full');
  const program = await api.enrollInSwimClass('guest-taylor', 'class-sat-04');
  expect(program.paidAmountCents).toBe(18500);
  expect(program.pricingTier).toBe('program');
});

test('free Friday class charges $0', async () => {
  const e = await api.enrollInSwimClass('member-jordan', 'class-fri-teen-adult-beginner');
  expect(e.paidAmountCents).toBe(0);
  expect(e.paymentLast4).toBeUndefined();
});

test('duplicate and over-capacity enrollments are rejected', async () => {
  await api.enrollInSwimClass('member-jordan', 'class-sat-04');
  await expect(api.enrollInSwimClass('member-jordan', 'class-sat-04')).rejects.toThrow(
    'Already enrolled'
  );

  const state = await loadStore();
  for (let i = 0; i < SWIM_CLASS_CAPACITY; i += 1) {
    state.swimEnrollments.push({
      id: `fill-${i}`,
      memberId: `other-${i}`,
      classId: 'class-sat-05',
      participantName: 'x',
      paidAmountCents: 0,
      pricingTier: 'full',
      status: 'enrolled',
      enrolledAt: new Date().toISOString(),
    });
  }
  await saveStore(state);
  await expect(api.enrollInSwimClass('member-jordan', 'class-sat-05')).rejects.toThrow('full');
});

test('admin price change applies to next booking', async () => {
  await api.updateLessonPricing({
    swim: { 30: 4000, 60: 7000 },
    swimClassOverrides: { 'class-sat-06': { fullCents: 9900, programCents: 15000 } },
  });
  const lesson = await api.bookPrivateLesson('member-jordan', 'slot-elena-mon-1500', {
    lessonType: 'swim',
    durationMin: 60,
  });
  expect(lesson.paidAmountCents).toBe(7000);
  const e = await api.enrollInSwimClass('member-jordan', 'class-sat-06');
  expect(e.paidAmountCents).toBe(9900);
  await expect(api.updateLessonPricing({ swim: { 30: -1, 60: 1 } })).rejects.toThrow();
});

test('migration from schema v4 fills in pricing, enrollments, staff types and slots', async () => {
  const state = await loadStore();
  const legacy: Record<string, unknown> = { ...state, schemaVersion: 4 };
  delete legacy.lessonPricing;
  delete legacy.swimEnrollments;
  legacy.staff = state.staff.map((s) => ({ ...s, lessonTypes: undefined }));
  legacy.lessonSlots = state.lessonSlots.filter((s) => !s.id.startsWith('slot-pool-'));
  await AsyncStorage.setItem('@ymca/demo-state', JSON.stringify(legacy));

  const migrated = await loadStore();
  expect(migrated.schemaVersion).toBe(5);
  expect(migrated.lessonPricing.training[60]).toBe(6000);
  expect(migrated.swimEnrollments).toEqual([]);
  expect(migrated.staff.find((s) => s.id === 'staff-elena')?.lessonTypes).toEqual(['swim']);
  expect(migrated.lessonSlots.some((s) => s.id.startsWith('slot-pool-'))).toBe(true);
});
