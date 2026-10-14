import { addDaysToDate, easternOffset } from '@/domain/demoClock';
import type {
  AvailabilityConflict,
  AvailabilityException,
  LessonSlot,
  PrivateLesson,
  SessionRequest,
  TrainerAvailability,
  TrainerAvailabilityInput,
  WeeklyWindow,
} from '@/domain/types';

type TimeWindow = { id: string; startTime: string; endTime: string };

export type WindowValidation = { ok: boolean; errors: { id: string; msg: string }[] };

const STEP_MIN = 15;
const MIN_WINDOW_MIN = 30;
const DAY_MIN = 24 * 60;

/** Minutes since midnight for 'HH:MM', or NaN when malformed. */
export function toMinutes(hm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 24 || min > 59 || (h === 24 && min > 0) ? NaN : h * 60 + min;
}

/** Validates one day's windows: 15-minute steps, at least 30 minutes, no overlaps (touching is fine). */
export function validateWindows(windows: TimeWindow[]): WindowValidation {
  const errors: { id: string; msg: string }[] = [];
  const valid: { id: string; s: number; e: number }[] = [];
  for (const w of windows) {
    const s = toMinutes(w.startTime);
    const e = toMinutes(w.endTime);
    if (Number.isNaN(s) || Number.isNaN(e)) {
      errors.push({ id: w.id, msg: 'Use HH:MM times.' });
    } else if (e <= s) {
      errors.push({ id: w.id, msg: 'End time must be after the start time.' });
    } else if (s % STEP_MIN !== 0 || e % STEP_MIN !== 0) {
      errors.push({ id: w.id, msg: 'Times must be in 15 minute steps.' });
    } else if (e - s < MIN_WINDOW_MIN) {
      errors.push({ id: w.id, msg: 'A window must be at least 30 minutes.' });
    } else {
      valid.push({ id: w.id, s, e });
    }
  }
  const sorted = [...valid].sort((a, b) => a.s - b.s || a.e - b.e);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].s < sorted[i - 1].e) errors.push({ id: sorted[i].id, msg: 'Windows on the same day cannot overlap.' });
  }
  return { ok: errors.length === 0, errors };
}

/** Validates a whole schedule: weekly windows per weekday, plus each custom exception day. */
export function validateAvailability(input: TrainerAvailabilityInput): WindowValidation {
  const errors: { id: string; msg: string }[] = [];
  for (const w of input.weekly) {
    if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6) errors.push({ id: w.id, msg: 'Pick a weekday.' });
  }
  for (let day = 0; day < 7; day++) {
    errors.push(...validateWindows(input.weekly.filter((w) => w.weekday === day)).errors);
  }
  for (const ex of input.exceptions) {
    if (ex.kind === 'custom') errors.push(...validateWindows(ex.windows).errors);
  }
  if (input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) {
    errors.push({ id: 'effectiveUntil', msg: 'The end date must be on or after the start date.' });
  }
  return { ok: errors.length === 0, errors };
}

/** Sorts windows and merges ones that touch (or overlap) at the same location. */
export function normalizeWindows<T extends { startTime: string; endTime: string; location: string }>(windows: T[]): T[] {
  const sorted = [...windows].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const out: T[] = [];
  for (const w of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.location === w.location && toMinutes(w.startTime) <= toMinutes(prev.endTime)) {
      if (toMinutes(w.endTime) > toMinutes(prev.endTime)) out[out.length - 1] = { ...prev, endTime: w.endTime };
    } else {
      out.push(w);
    }
  }
  return out;
}

/** Normalizes weekly windows per weekday and custom exception windows. */
export function normalizeAvailability(input: TrainerAvailabilityInput): TrainerAvailabilityInput {
  const weekly: WeeklyWindow[] = [];
  for (let day = 0; day < 7; day++) {
    weekly.push(...normalizeWindows(input.weekly.filter((w) => w.weekday === day)));
  }
  const exceptions: AvailabilityException[] = input.exceptions.map((ex) => ({
    ...ex,
    windows: ex.kind === 'custom' ? normalizeWindows(ex.windows) : [],
  }));
  return { ...input, weekly, exceptions };
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Expands a weekly schedule into concrete windows for each date in [fromDate, toDate].
 * Blocked dates yield none, custom dates replace the weekly windows. Times are Eastern wall clock.
 */
export function expandAvailability(
  av: TrainerAvailability | undefined | null,
  branchId: string,
  fromDate: string,
  toDate: string
): LessonSlot[] {
  if (!av) return [];
  const out: LessonSlot[] = [];
  for (let date = fromDate; date <= toDate; date = addDaysToDate(date, 1)) {
    if (date < av.effectiveFrom || (av.effectiveUntil && date > av.effectiveUntil)) continue;
    const exception = av.exceptions.find((e) => e.date === date);
    if (exception?.kind === 'blocked') continue;
    const windows = exception ? exception.windows : av.weekly.filter((w) => w.weekday === weekdayOf(date));
    for (const w of windows) {
      const s = toMinutes(w.startTime);
      const e = toMinutes(w.endTime);
      if (Number.isNaN(s) || Number.isNaN(e) || e <= s || e > DAY_MIN || s >= DAY_MIN) continue;
      out.push({
        id: `avail-${av.staffId}-${date}-${w.id}`,
        staffId: av.staffId,
        branchId,
        start: `${date}T${w.startTime}:00${easternOffset(date, Math.floor(s / 60))}`,
        end: `${date}T${w.endTime}:00${easternOffset(date, Math.floor(e / 60))}`,
        location: w.location,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Booked lessons and open (pending/countered/accepted) requests that are not fully inside the
 * trainer's availability. `extraWindows` are one-off slots that also count as availability.
 * Items ending before `fromIso` are ignored. Nothing is changed; callers decide what to do.
 */
export function findConflicts(
  av: TrainerAvailability | undefined | null,
  branchId: string,
  lessons: Pick<PrivateLesson, 'id' | 'status' | 'start' | 'end'>[],
  requests: Pick<SessionRequest, 'id' | 'status' | 'start' | 'end' | 'memberName' | 'lessonId'>[],
  options: { extraWindows?: Pick<LessonSlot, 'start' | 'end'>[]; fromIso?: string } = {}
): AvailabilityConflict[] {
  const fromMs = options.fromIso ? new Date(options.fromIso).getTime() : -Infinity;
  const bookedLessons = lessons.filter((l) => l.status === 'booked');
  const lessonIds = new Set(bookedLessons.map((l) => l.id));
  const items: AvailabilityConflict[] = [
    ...bookedLessons.map((l) => ({ kind: 'lesson' as const, id: l.id, start: l.start, end: l.end })),
    ...requests
      .filter(
        (r) =>
          r.status === 'pending' ||
          r.status === 'countered' ||
          // an accepted request is already represented by its booked lesson
          (r.status === 'accepted' && !(r.lessonId && lessonIds.has(r.lessonId)))
      )
      .map((r) => ({ kind: 'request' as const, id: r.id, memberName: r.memberName, start: r.start, end: r.end })),
  ].filter((i) => new Date(i.end).getTime() > fromMs);
  if (items.length === 0) return [];

  const days = items.flatMap((i) => [i.start, i.end].map((iso) => iso.slice(0, 10))).sort();
  const windows: Pick<LessonSlot, 'start' | 'end'>[] = [
    ...expandAvailability(av, branchId, addDaysToDate(days[0], -1), addDaysToDate(days[days.length - 1], 1)),
    ...(options.extraWindows ?? []),
  ];
  return items.filter((i) => {
    const s = new Date(i.start).getTime();
    const e = new Date(i.end).getTime();
    return !windows.some((w) => new Date(w.start).getTime() <= s && new Date(w.end).getTime() >= e);
  });
}
