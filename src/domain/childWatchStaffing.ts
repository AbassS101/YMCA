import type { ChildWatchRatio } from '@/domain/childWatch';
import type { ChildWatchShift } from '@/domain/types';

export type RatioStatus = 'ok' | 'at_limit' | 'over';

/** Children per staff for a child of this age: the first band that covers them (the last band if older). */
function childrenPerStaffFor(ageMonths: number, ratios: ChildWatchRatio[]): number {
  const sorted = [...ratios].sort((a, b) => a.maxAgeMonths - b.maxAgeMonths);
  if (sorted.length === 0) return Infinity;
  return (sorted.find((r) => ageMonths <= r.maxAgeMonths) ?? sorted[sorted.length - 1]).childrenPerStaff;
}

/**
 * Staff needed for these children. Each child counts as 1/childrenPerStaff of a staff member,
 * so mixed ages share staff; the total is rounded up. No children needs no staff.
 */
export function requiredStaff(agesMonths: number[], ratios: ChildWatchRatio[]): number {
  if (agesMonths.length === 0) return 0;
  const load = agesMonths.reduce((sum, m) => sum + 1 / childrenPerStaffFor(m, ratios), 0);
  // Guard against float noise such as 2.0000000000000004.
  return Math.ceil(load - 1e-9);
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Number of distinct staff whose shift covers `now` (start inclusive, end exclusive). */
export function staffOnDutyAt(shifts: ChildWatchShift[], now: Date): number {
  const date = localDate(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const staff = new Set<string>();
  for (const s of shifts) {
    if (s.date === date && minute >= minutesOf(s.start) && minute < minutesOf(s.end)) staff.add(s.staffId);
  }
  return staff.size;
}

/** 'over' when staff are short, 'at_limit' when exactly enough (and there are children), else 'ok'. */
export function ratioStatus(agesMonths: number[], staffOnDuty: number, ratios: ChildWatchRatio[]): RatioStatus {
  const needed = requiredStaff(agesMonths, ratios);
  if (needed > staffOnDuty) return 'over';
  return needed > 0 && needed === staffOnDuty ? 'at_limit' : 'ok';
}

/** Counted minus expected (positive = more children in the room than the sign-in records show). */
export function headcountMismatch(counted: number, expected: number): number {
  return counted - expected;
}
