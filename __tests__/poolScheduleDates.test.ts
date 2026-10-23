import { setDemoTodayForTests } from '@/domain/demoClock';
import { getPoolSlots } from '@/domain/poolScheduleData';
import { poolDayForDate, poolSlotTimes } from '@/domain/poolScheduleDates';

afterEach(() => setDemoTodayForTests(null));

it('maps dates to published weekly pool schedules across a year boundary', () => {
  expect(poolDayForDate('2026-12-31')).toBe('thursday');
  expect(poolDayForDate('2027-01-01')).toBe('friday');
  expect(poolDayForDate('2027-01-03')).toBe('sunday');
});

it('exports the selected date with the correct Eastern daylight-saving offset', () => {
  const slot = getPoolSlots('indoor', 'monday').find((item) => !item.isClosed)!;
  expect(poolSlotTimes(slot, '2026-10-26').startIso).toBe('2026-10-26T06:00:00-04:00');
  expect(poolSlotTimes(slot, '2026-11-02').startIso).toBe('2026-11-02T06:00:00-05:00');
  expect(new Date(poolSlotTimes(slot, '2026-11-02').endIso).getTime()).toBeGreaterThan(new Date(poolSlotTimes(slot, '2026-11-02').startIso).getTime());
});

it('exports the upcoming occurrence of the slot weekday when no date is selected', () => {
  setDemoTodayForTests('2026-10-23');
  const monday = getPoolSlots('outdoor', 'monday')[0];
  expect(poolSlotTimes(monday).startIso).toMatch(/^2026-10-26T/);
  const friday = getPoolSlots('outdoor', 'friday')[0];
  expect(poolSlotTimes(friday).startIso).toMatch(/^2026-10-23T/);
});
