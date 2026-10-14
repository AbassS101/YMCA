import { addDaysToDate, easternOffset } from './demoClock';

const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})$/;
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(.*)$/;

/** Keys whose values are real calendar facts (not part of the demo week) and must never move. */
const FIXED_KEYS = new Set(['birthDate', 'birthdate', 'dob']);

export function shiftDateString(value: string, weeks: number): string {
  if (weeks === 0) return value;
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) return addDaysToDate(dateOnly[1], weeks * 7);
  const dt = DATE_TIME.exec(value);
  if (!dt) return value;
  const [, date, hh, mm, rest] = dt;
  const nextDate = addDaysToDate(date, weeks * 7);
  // Re-derive the Eastern offset so shifted times stay correct across daylight-saving changes.
  const offsetMatch = /^(:\d{2}(?:\.\d+)?)?(-0[45]:00)$/.exec(rest);
  if (offsetMatch) {
    return `${nextDate}T${hh}:${mm}${offsetMatch[1] ?? ''}${easternOffset(nextDate, Number(hh))}`;
  }
  return `${nextDate}T${hh}:${mm}${rest}`;
}

/** Deep-copies `input`, moving every ISO date / datetime string forward by whole weeks. */
export function shiftSeedDates<T>(input: T, weeks: number): T {
  if (weeks === 0) return input;
  const walk = (node: unknown, key?: string): unknown => {
    if (typeof node === 'string') {
      if (key && FIXED_KEYS.has(key)) return node;
      return shiftDateString(node, weeks);
    }
    if (Array.isArray(node)) return node.map((n) => walk(n));
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        // Record keys can also be dates (e.g. per-day maps); shift those too.
        const nk = DATE_ONLY.test(k) ? shiftDateString(k, weeks) : k;
        out[nk] = walk(v, k);
      }
      return out;
    }
    return node;
  };
  return walk(input) as T;
}
