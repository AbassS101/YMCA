import type { ChildWatchRatio, ChildWatchRules } from '@/domain/childWatch';
import { buildChildWatchReport, type ChildWatchReport } from '@/domain/childWatchReports';
import { requiredStaff, staffOnDutyAt } from '@/domain/childWatchStaffing';
import { addDays, daysInRange, pct } from '@/domain/stats/retention';
import type { ChildWatchVisit } from '@/domain/types';
import type { ChildWatchRaw, StatsRange } from '@/repositories/statsRepo';

export type ChildWatchStats = ChildWatchReport & {
  uniqueChildren: number;
  uniqueHouseholds: number;
  occupancyByHour: number[]; // avg children present per open hour
  ratioViolationMinutes: number; // minutes where requiredStaff > staffOnDutyAt (5-min sweep)
  staffHours: number;
  childrenPerStaffHour: number;
  incidentsBySeverity: Record<'low' | 'medium' | 'high', number>;
  parentAckPct: number; // acknowledged / notified
  avgIncidentReviewHours: number | null;
  overridePickups: number;
  lockedVisits: number;
  capacityUtilizationPct: number; // peakOccupancy / roomCapacity
};

const DEFAULT_AGE_MONTHS = 60;
const SWEEP_MIN = 5;

function localDayOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function ageMonthsAt(birthDate: string | undefined, at: Date): number {
  if (!birthDate) return DEFAULT_AGE_MONTHS;
  const [y, m, d] = birthDate.split('-').map(Number);
  let months = (at.getFullYear() - y) * 12 + (at.getMonth() + 1 - m);
  if (at.getDate() < d) months -= 1;
  return Math.max(0, months);
}

/** Stay as [startMs, endMs]; an open visit is capped at the daily limit. */
function stay(v: ChildWatchVisit, maxMinutes: number): [number, number] {
  const start = new Date(v.signedInAt).getTime();
  const end = v.signedOutAt ? new Date(v.signedOutAt).getTime() : start + maxMinutes * 60000;
  return [start, Math.max(start, end)];
}

/** Local midnight of a YYYY-MM-DD day, in ms. */
function dayStartMs(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function buildChildWatchStats(raw: ChildWatchRaw, rules: ChildWatchRules, range: StatsRange): ChildWatchStats {
  const maxMin = rules.maxMinutesPerDay;
  const base = buildChildWatchReport(raw.visits, raw.incidents, raw.headcounts, range, maxMin);
  const days = daysInRange(range.from, range.to);
  const birthById = new Map(raw.children.map((c) => [c.id, c.birthDate]));
  const visits = raw.visits.filter((v) => {
    const day = localDayOf(new Date(v.signedInAt));
    return day >= range.from && day <= range.to;
  });

  const occupancySum = new Array<number>(24).fill(0);
  const openDays = new Array<number>(24).fill(0);
  let ratioViolationMinutes = 0;
  let childMinutes = 0;

  for (const day of days) {
    const start = dayStartMs(day);
    const weekday = new Date(start).getDay();
    const windows = (rules.hours[weekday] ?? []).map((w) => [minutesOf(w.open), minutesOf(w.close)] as const);
    const stays = visits
      .map((v) => ({ v, span: stay(v, maxMin) }))
      .filter(({ span }) => span[1] > start && span[0] < start + 24 * 3600000);

    for (let h = 0; h < 24; h += 1) {
      if (!windows.some(([o, c]) => h * 60 < c && (h + 1) * 60 > o)) continue;
      openDays[h] += 1;
      const hs = start + h * 3600000;
      const he = hs + 3600000;
      let presentMs = 0;
      for (const { span } of stays) presentMs += Math.max(0, Math.min(span[1], he) - Math.max(span[0], hs));
      occupancySum[h] += presentMs / 3600000;
    }

    const dayShifts = raw.shifts.filter((s) => s.date === day);
    for (const [open, close] of windows) {
      for (let min = open; min < close; min += SWEEP_MIN) {
        const at = new Date(start + min * 60000);
        const ages = stays
          .filter(({ span }) => span[0] <= at.getTime() && at.getTime() < span[1])
          .map(({ v }) => ageMonthsAt(birthById.get(v.childId), at));
        if (ages.length > 0 && requiredStaff(ages, rules.ratios) > staffOnDutyAt(dayShifts, at)) {
          ratioViolationMinutes += SWEEP_MIN;
        }
      }
    }
  }
  for (const v of visits) {
    const [s, e] = stay(v, maxMin);
    childMinutes += (e - s) / 60000;
  }

  const staffHours =
    raw.shifts
      .filter((s) => s.date >= range.from && s.date <= range.to)
      .reduce((sum, s) => sum + Math.max(0, minutesOf(s.end) - minutesOf(s.start)), 0) / 60;

  const incidentsBySeverity: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 0, high: 0 };
  let notified = 0;
  let acknowledged = 0;
  for (const i of raw.incidents) {
    const day = localDayOf(new Date(i.at));
    if (day < range.from || day > range.to) continue;
    incidentsBySeverity[i.severity] += 1;
    if (i.parentNotifiedAt) {
      notified += 1;
      if (i.parentAcknowledgedAt) acknowledged += 1;
    }
  }

  return {
    ...base,
    uniqueChildren: new Set(visits.map((v) => v.childId)).size,
    uniqueHouseholds: new Set(visits.map((v) => v.droppedOffByMemberId ?? v.memberId)).size,
    occupancyByHour: occupancySum.map((sum, h) => (openDays[h] > 0 ? Math.round((sum / openDays[h]) * 10) / 10 : 0)),
    ratioViolationMinutes,
    staffHours: Math.round(staffHours * 10) / 10,
    childrenPerStaffHour: staffHours > 0 ? Math.round((childMinutes / 60 / staffHours) * 100) / 100 : 0,
    incidentsBySeverity,
    parentAckPct: pct(acknowledged, notified),
    // Incidents record who reviewed them but not when, so a review duration cannot be derived.
    avgIncidentReviewHours: null,
    overridePickups: visits.filter((v) => v.verification === 'supervisor_override').length,
    lockedVisits: visits.filter((v) => v.locked).length,
    capacityUtilizationPct: pct(base.peakOccupancy, rules.roomCapacity),
  };
}

/** Average children present per hour over the last `weeks` same weekdays, plus staff needed at that load. */
export function hourlyForecast(
  visits: ChildWatchVisit[],
  agesMonthsByChild: Map<string, number>,
  ratios: ChildWatchRatio[],
  weekday: number,
  today: string,
  weeks = 4
): { hour: number; expectedKids: number; staffNeeded: number }[] {
  // The most recent `weeks` dates before today that fall on this weekday.
  const dates: string[] = [];
  for (let d = addDays(today, -1); dates.length < weeks && d >= addDays(today, -7 * weeks - 7); d = addDays(d, -1)) {
    if (new Date(`${d}T12:00:00`).getDay() === weekday) dates.push(d);
  }
  const sample = dates.map((date) => {
    const start = dayStartMs(date);
    const stays = visits
      .map((v) => ({ v, span: stay(v, 120) }))
      .filter(({ span }) => span[1] > start && span[0] < start + 24 * 3600000);
    return { start, stays };
  });

  return Array.from({ length: 24 }, (_, hour) => {
    if (sample.length === 0) return { hour, expectedKids: 0, staffNeeded: 0 };
    let kids = 0;
    let staff = 0;
    for (const { start, stays } of sample) {
      const hs = start + hour * 3600000;
      const he = hs + 3600000;
      let presentMs = 0;
      const ages: number[] = [];
      for (const { v, span } of stays) {
        const overlap = Math.min(span[1], he) - Math.max(span[0], hs);
        if (overlap <= 0) continue;
        presentMs += overlap;
        ages.push(agesMonthsByChild.get(v.childId) ?? DEFAULT_AGE_MONTHS);
      }
      kids += presentMs / 3600000;
      staff += requiredStaff(ages, ratios);
    }
    return {
      hour,
      expectedKids: Math.round((kids / sample.length) * 10) / 10,
      staffNeeded: Math.ceil(staff / sample.length - 1e-9) || 0,
    };
  });
}
