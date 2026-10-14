import {
  currentWeekMonday,
  easternOffset,
  getDemoToday,
  setDemoTodayForTests,
  weeksSinceAnchor,
} from '@/domain/demoClock';
import { shiftDateString, shiftSeedDates } from '@/domain/seedDateShift';

afterEach(() => setDemoTodayForTests('2026-09-14'));

test('clock is pinned to the anchor day under test', () => {
  expect(getDemoToday()).toBe('2026-09-14');
  expect(weeksSinceAnchor()).toBe(0);
});

test('weeks since anchor follows the current week', () => {
  setDemoTodayForTests('2026-10-13');
  expect(currentWeekMonday()).toBe('2026-10-12');
  expect(weeksSinceAnchor()).toBe(4);
});

test('eastern offset handles daylight saving boundaries', () => {
  expect(easternOffset('2026-09-14')).toBe('-04:00');
  expect(easternOffset('2026-11-01', 12)).toBe('-05:00');
  expect(easternOffset('2026-12-01')).toBe('-05:00');
  expect(easternOffset('2027-03-14', 12)).toBe('-04:00');
});

test('shifting keeps weekday and wall-clock time, and fixes the offset after DST ends', () => {
  expect(shiftDateString('2026-09-14T07:00:00-04:00', 4)).toBe('2026-10-12T07:00:00-04:00');
  expect(shiftDateString('2026-09-14T07:00:00-04:00', 7)).toBe('2026-11-02T07:00:00-05:00');
  expect(shiftDateString('2026-09-14', 1)).toBe('2026-09-21');
  expect(shiftDateString('hello', 3)).toBe('hello');
});

test('shifting leaves birth dates alone', () => {
  const out = shiftSeedDates({ birthDate: '2012-05-01', start: '2026-09-14T10:00:00-04:00' }, 2);
  expect(out.birthDate).toBe('2012-05-01');
  expect(out.start).toBe('2026-09-28T10:00:00-04:00');
});
