/**
 * The demo calendar follows the real Eastern-time date. Seed data is authored against the week of
 * SEED_ANCHOR_MONDAY and shifted forward by whole weeks (see seedDateShift.ts), so weekdays line up.
 */
export const SEED_ANCHOR_MONDAY = '2026-09-14';

let todayOverride: string | null = null;

/** Tests pin the clock; pass null to restore the real date. */
export function setDemoTodayForTests(date: string | null): void {
  todayOverride = date;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function realEasternDate(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    const y = get('year');
    const m = get('month');
    const d = get('day');
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fall through to the device-local date
  }
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function getDemoToday(): string {
  return todayOverride ?? realEasternDate();
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDaysToDate(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * 86_400_000);
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  const dow = new Date(toUtcMs(date)).getUTCDay(); // 0 = Sunday
  return addDaysToDate(date, -((dow + 6) % 7));
}

export function currentWeekMonday(): string {
  return mondayOf(getDemoToday());
}

/** Whole weeks between the seed anchor week and the week containing `date` (default: today). */
export function weeksSinceAnchor(date: string = getDemoToday()): number {
  return Math.round((toUtcMs(mondayOf(date)) - toUtcMs(SEED_ANCHOR_MONDAY)) / (7 * 86_400_000));
}

function nthSunday(year: number, monthIndex: number, n: number): number {
  const first = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}

/** US Eastern UTC offset for a wall-clock local date/time ("-04:00" during daylight time, else "-05:00"). */
export function easternOffset(date: string, hour = 12): string {
  const [y, m, d] = date.split('-').map(Number);
  const start = nthSunday(y, 2, 2); // second Sunday of March, 2:00
  const end = nthSunday(y, 10, 1); // first Sunday of November, 2:00
  const afterStart = m > 3 || (m === 3 && (d > start || (d === start && hour >= 2)));
  const beforeEnd = m < 11 || (m === 11 && (d < end || (d === end && hour < 2)));
  return afterStart && beforeEnd ? '-04:00' : '-05:00';
}

/** Minutes since midnight, Eastern time (real wall clock). */
export function easternNowMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return (h % 24) * 60 + m;
  } catch {
    // fall through to device-local time
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** ISO timestamp on the demo calendar day with the real wall-clock time. */
export function demoNowIso(): string {
  return `${getDemoToday()}T${new Date().toISOString().slice(11)}`;
}

/** Back-compat alias for code that wants a constant; prefer getDemoToday(). */
export const DEMO_TODAY = SEED_ANCHOR_MONDAY;
