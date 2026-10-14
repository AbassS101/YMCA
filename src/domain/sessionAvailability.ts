import type { BookableTime, LessonSlot, PrivateLesson, SessionRequest, Staff } from '@/domain/types';

export type Interval = { start: string; end: string };

export const DEFAULT_SESSION_LENGTHS: readonly (30 | 60)[] = [30, 60];
const MIN = 60000;

export function sessionLengthsFor(staff?: Pick<Staff, 'sessionLengths'> | null): (30 | 60)[] {
  const lengths = staff?.sessionLengths;
  return lengths && lengths.length > 0 ? [...lengths] : [...DEFAULT_SESSION_LENGTHS];
}

export function overlaps(a: Interval, b: Interval): boolean {
  return new Date(a.start).getTime() < new Date(b.end).getTime() &&
    new Date(b.start).getTime() < new Date(a.end).getTime();
}

/**
 * Splits availability windows into start times that fit `durationMin`, skipping anything
 * overlapping `busy` or starting before `after`.
 */
export function openStartTimes<W extends Interval>(
  windows: W[],
  busy: Interval[],
  durationMin: number,
  stepMin = 30,
  after?: string
): (W & Interval)[] {
  const out: (W & Interval)[] = [];
  const seen = new Set<string>();
  const afterMs = after ? new Date(after).getTime() : -Infinity;
  for (const w of windows) {
    const wEnd = new Date(w.end).getTime();
    for (
      let t = new Date(w.start).getTime();
      t + durationMin * MIN <= wEnd;
      t += stepMin * MIN
    ) {
      if (t < afterMs) continue;
      const candidate = { start: new Date(t).toISOString(), end: new Date(t + durationMin * MIN).toISOString() };
      if (busy.some((b) => overlaps(candidate, b))) continue;
      const key = `${(w as { staffId?: string }).staffId ?? ''}|${candidate.start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...w, ...candidate });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Intervals blocked by confirmed lessons and open (pending/countered) requests. */
export function busyIntervals(
  lessons: Pick<PrivateLesson, 'start' | 'end' | 'status'>[],
  requests: Pick<SessionRequest, 'start' | 'end' | 'status'>[]
): Interval[] {
  return [
    ...lessons.filter((l) => l.status === 'booked').map((l) => ({ start: l.start, end: l.end })),
    ...requests
      .filter((r) => r.status === 'pending' || r.status === 'countered')
      .map((r) => ({ start: r.start, end: r.end })),
  ];
}

/**
 * Times to offer for "any available instructor": every instructor's open times, de-duplicated
 * per start time (instant-bookable instructors first, then alphabetical by staff id).
 */
export function availableAt(
  windows: LessonSlot[],
  staffBusy: Record<string, Interval[]>,
  memberBusy: Interval[],
  durationMin: number,
  options: { stepMin?: number; after?: string; instantStaffIds?: ReadonlySet<string> } = {}
): BookableTime[] {
  const instant = options.instantStaffIds ?? new Set<string>();
  const all: BookableTime[] = [];
  const byStaff = new Map<string, LessonSlot[]>();
  for (const w of windows) byStaff.set(w.staffId, [...(byStaff.get(w.staffId) ?? []), w]);
  for (const [staffId, ws] of byStaff) {
    const times = openStartTimes(ws, [...(staffBusy[staffId] ?? []), ...memberBusy], durationMin, options.stepMin ?? 30, options.after);
    for (const t of times) {
      all.push({ staffId, start: t.start, end: t.end, location: t.location, instant: instant.has(staffId) });
    }
  }
  return all.sort((a, b) => a.start.localeCompare(b.start) || Number(b.instant) - Number(a.instant) || a.staffId.localeCompare(b.staffId));
}

/** Keeps one entry per start time (the first, i.e. instant-bookable preferred). */
export function dedupeByStart(times: BookableTime[]): BookableTime[] {
  const seen = new Set<string>();
  return times.filter((t) => (seen.has(t.start) ? false : (seen.add(t.start), true)));
}
