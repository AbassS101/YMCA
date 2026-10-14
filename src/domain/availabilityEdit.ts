import { toMinutes } from '@/domain/trainerAvailability';
import type { AvailabilityException, DateWindow, WeeklyWindow } from '@/domain/types';

/** Pure state transforms behind the weekly availability editor. Nothing here mutates its input. */

export const TIME_STEP_MIN = 15;
const DAY_MIN = 24 * 60;
const DEFAULT_START = '09:00';
const DEFAULT_LENGTH_MIN = 60;

let idCounter = 0;

/** Locally unique id for a window or exception that has not been saved yet. */
export function newEditorId(prefix = 'w'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function formatHm(minutes: number): string {
  const m = Math.max(0, Math.min(DAY_MIN, minutes));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Moves 'HH:MM' by `deltaMin`, clamped to the day. Malformed input is returned unchanged. */
export function shiftTime(hm: string, deltaMin: number): string {
  const m = toMinutes(hm);
  return Number.isNaN(m) ? hm : formatHm(m + deltaMin);
}

/** The next free hour-long window after the last one in `existing`, or 09:00-10:00. */
function nextWindowTimes(existing: { startTime: string; endTime: string }[]): { startTime: string; endTime: string } {
  const lastEnd = existing.reduce((max, w) => Math.max(max, toMinutes(w.endTime) || 0), 0);
  const start = existing.length === 0 ? toMinutes(DEFAULT_START) : lastEnd;
  // Past 23:00 there is no room for an hour; fall back to the default rather than an invalid window.
  const s = start + DEFAULT_LENGTH_MIN > DAY_MIN ? toMinutes(DEFAULT_START) : start;
  return { startTime: formatHm(s), endTime: formatHm(s + DEFAULT_LENGTH_MIN) };
}

export function windowsOnDay(weekly: WeeklyWindow[], weekday: number): WeeklyWindow[] {
  return weekly
    .filter((w) => w.weekday === weekday)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

export function addWindow(
  weekly: WeeklyWindow[],
  weekday: number,
  location: string,
  id: string = newEditorId()
): WeeklyWindow[] {
  const times = nextWindowTimes(weekly.filter((w) => w.weekday === weekday));
  return [...weekly, { id, weekday, location, ...times }];
}

export function updateWindow(
  weekly: WeeklyWindow[],
  id: string,
  patch: Partial<Pick<WeeklyWindow, 'startTime' | 'endTime' | 'location'>>
): WeeklyWindow[] {
  return weekly.map((w) => (w.id === id ? { ...w, ...patch } : w));
}

export function removeWindow(weekly: WeeklyWindow[], id: string): WeeklyWindow[] {
  return weekly.filter((w) => w.id !== id);
}

/** Replaces the windows on each target day with copies of the source day's windows. */
export function copyDayTo(
  weekly: WeeklyWindow[],
  fromDay: number,
  toDays: number[],
  makeId: () => string = newEditorId
): WeeklyWindow[] {
  const targets = new Set(toDays.filter((d) => d !== fromDay));
  if (targets.size === 0) return weekly;
  const source = windowsOnDay(weekly, fromDay);
  const kept = weekly.filter((w) => !targets.has(w.weekday));
  const copies = [...targets]
    .sort((a, b) => a - b)
    .flatMap((weekday) => source.map((w) => ({ ...w, id: makeId(), weekday })));
  return [...kept, ...copies];
}

/** Adds a blocked or custom-hours exception; an existing exception on that date is replaced. */
export function addException(
  exceptions: AvailabilityException[],
  date: string,
  kind: AvailabilityException['kind'],
  location: string,
  makeId: () => string = newEditorId
): AvailabilityException[] {
  const windows: DateWindow[] =
    kind === 'custom' ? [{ id: makeId(), location, ...nextWindowTimes([]) }] : [];
  const next: AvailabilityException = { id: makeId(), date, kind, windows };
  return [...exceptions.filter((e) => e.date !== date), next].sort((a, b) => a.date.localeCompare(b.date));
}

export function removeException(exceptions: AvailabilityException[], id: string): AvailabilityException[] {
  return exceptions.filter((e) => e.id !== id);
}

/** Moves an exception to another date, replacing any other exception already on that date. */
export function moveException(exceptions: AvailabilityException[], id: string, date: string): AvailabilityException[] {
  return exceptions
    .filter((e) => e.id === id || e.date !== date)
    .map((e) => (e.id === id ? { ...e, date } : e))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function addExceptionWindow(
  exceptions: AvailabilityException[],
  exceptionId: string,
  location: string,
  id: string = newEditorId()
): AvailabilityException[] {
  return exceptions.map((e) =>
    e.id === exceptionId && e.kind === 'custom'
      ? { ...e, windows: [...e.windows, { id, location, ...nextWindowTimes(e.windows) }] }
      : e
  );
}

export function updateExceptionWindow(
  exceptions: AvailabilityException[],
  windowId: string,
  patch: Partial<Pick<DateWindow, 'startTime' | 'endTime' | 'location'>>
): AvailabilityException[] {
  return exceptions.map((e) => ({ ...e, windows: e.windows.map((w) => (w.id === windowId ? { ...w, ...patch } : w)) }));
}

export function removeExceptionWindow(exceptions: AvailabilityException[], windowId: string): AvailabilityException[] {
  return exceptions.map((e) => ({ ...e, windows: e.windows.filter((w) => w.id !== windowId) }));
}

/** Turns validateAvailability's error list into a lookup by window id (first message wins). */
export function errorMap(errors: { id: string; msg: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of errors) if (!(e.id in out)) out[e.id] = e.msg;
  return out;
}
