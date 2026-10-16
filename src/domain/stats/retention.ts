import type { Membership } from '@/domain/types';

export type MonthKey = string; // 'YYYY-MM'
export type MonthlyRetention = {
  month: MonthKey;
  startActive: number;
  endActive: number;
  retained: number;
  retentionPct: number;
  churned: number;
  churnPct: number;
  newJoins: number;
};
export type CohortRow = {
  cohort: MonthKey;
  size: number;
  d30Pct: number | null;
  d90Pct: number | null;
  d365Pct: number | null;
};

const GUEST_PASS = '1-Day Guest Pass';

const pad = (n: number) => String(n).padStart(2, '0');

/** Date at local noon, so day arithmetic never lands on a DST edge. */
function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function formatDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return formatDay(d);
}

/** Every YYYY-MM-DD from `from` to `to`, inclusive. Empty when `to` is before `from`. */
export function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Local YYYY-MM-DD of an ISO timestamp. */
export function localDay(iso: string): string {
  return formatDay(new Date(iso));
}

export function monthOf(day: string): MonthKey {
  return day.slice(0, 7);
}

function lastDayOfMonth(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return formatDay(new Date(y, m, 0, 12));
}

/** Every month touched by the range, oldest first. */
export function monthsInRange(from: string, to: string): MonthKey[] {
  const out: MonthKey[] = [];
  let [y, m] = from.split('-').map(Number);
  const end = monthOf(to);
  for (;;) {
    const key = `${y}-${pad(m)}`;
    if (key > end) break;
    out.push(key);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/** Guest passes are not memberships for retention purposes. */
function isCountable(m: Membership): boolean {
  return !m.rateName.includes(GUEST_PASS);
}

/** Active on day D if joinedDate <= D and (no cancelEffectiveDate or cancelEffectiveDate > D). */
export function isActiveOn(m: Membership, day: string): boolean {
  if (m.joinedDate && m.joinedDate > day) return false;
  if (m.cancelEffectiveDate && m.cancelEffectiveDate <= day) return false;
  return true;
}

export function monthlyRetention(memberships: Membership[], months: MonthKey[]): MonthlyRetention[] {
  const pool = memberships.filter(isCountable);
  return months.map((month) => {
    const first = `${month}-01`;
    const last = lastDayOfMonth(month);
    let startActive = 0;
    let endActive = 0;
    let retained = 0;
    let newJoins = 0;
    for (const m of pool) {
      const atStart = isActiveOn(m, first);
      const atEnd = isActiveOn(m, last);
      if (atStart) startActive += 1;
      if (atEnd) endActive += 1;
      if (atStart && atEnd) retained += 1;
      if (m.joinedDate && monthOf(m.joinedDate) === month) newJoins += 1;
    }
    const churned = startActive - retained;
    return {
      month,
      startActive,
      endActive,
      retained,
      retentionPct: pct(retained, startActive),
      churned,
      churnPct: pct(churned, startActive),
      newJoins,
    };
  });
}

export function cohortRetention(memberships: Membership[], today: string): CohortRow[] {
  const byCohort = new Map<MonthKey, Membership[]>();
  for (const m of memberships) {
    if (!isCountable(m) || !m.joinedDate) continue;
    const key = monthOf(m.joinedDate);
    byCohort.set(key, [...(byCohort.get(key) ?? []), m]);
  }
  return [...byCohort.keys()]
    .sort()
    .map((cohort) => {
      const members = byCohort.get(cohort) as Membership[];
      const lastJoin = lastDayOfMonth(cohort);
      const milestone = (days: number): number | null => {
        // Not old enough until even the last joiner of the month has reached the milestone.
        if (addDays(lastJoin, days) > today) return null;
        const kept = members.filter((m) => isActiveOn(m, addDays(m.joinedDate as string, days))).length;
        return pct(kept, members.length);
      };
      return {
        cohort,
        size: members.length,
        d30Pct: milestone(30),
        d90Pct: milestone(90),
        d365Pct: milestone(365),
      };
    });
}
