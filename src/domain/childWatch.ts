import { getDemoToday } from '@/domain/demoClock';
import type { ChildProfile, ChildWatchVisit } from '@/domain/types';

export type HoursWindow = { open: string; close: string }; // 'HH:MM' 24h

/** Index 0 = Sunday. */
export const CHILD_WATCH_HOURS: HoursWindow[][] = [
  [], // Sunday: closed
  [{ open: '09:00', close: '12:00' }, { open: '16:00', close: '20:00' }],
  [{ open: '09:00', close: '12:00' }, { open: '16:00', close: '20:00' }],
  [{ open: '09:00', close: '12:00' }, { open: '16:00', close: '20:00' }],
  [{ open: '09:00', close: '12:00' }, { open: '16:00', close: '20:00' }],
  [{ open: '09:00', close: '12:00' }, { open: '16:00', close: '20:00' }],
  [{ open: '09:00', close: '12:00' }], // Saturday
];

export const SIGN_IN_CUTOFF_MIN = 30;
export const MAX_MINUTES_PER_DAY = 120;
export const MIN_AGE_WEEKS = 6;
export const ROOM_CAPACITY = 25;

export const CHILD_WATCH_INFO = {
  title: 'Child Watch',
  intro:
    'As a service to our valued members, the YMCA Silver Spring Child Watch program provides positive and fun on-site childcare during your visit to our facility for a maximum of 2 hours per day. Parents must remain in the building while their children are in Child Watch.',
  ages: 'CHILD WATCH: (6 weeks and up)',
  hoursLines: ['Monday – Friday: 9 am-12 pm, 4 pm-8 pm', 'Saturday – 9 am-12 pm'],
  closedLine: 'Sunday – Closed',
  cutoff: 'Sign in cut off is 30 minutes prior to closing time.',
  noteTitle: 'Please Note:',
  note:
    'All members must check-in at the Y Membership Desk before dropping children off in Child Watch. Children must be signed in and out of the Child Watch program every day. Parents must remain in the building at all times.',
  contactText:
    'If you have any questions or concerns regarding our Child Watch program, please contact Meena Suri, Senior Program Director, at ',
  contactEmail: 'Meena.Suri@ymcadc.org',
} as const;

export type ChildWatchStatus =
  | { state: 'open'; signInUntil: Date; closesAt: Date }
  | { state: 'signInClosed'; closesAt: Date }
  | { state: 'closed'; nextOpen: Date | null };

function at(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** The current moment on the demo date (time of day comes from the real clock). */
export function demoNow(): Date {
  const real = new Date();
  const d = new Date(`${getDemoToday()}T00:00:00`);
  d.setHours(real.getHours(), real.getMinutes(), real.getSeconds(), 0);
  return d;
}

export function getStatusAt(now: Date): ChildWatchStatus {
  const windows = CHILD_WATCH_HOURS[now.getDay()];
  for (const w of windows) {
    const open = at(now, w.open);
    const close = at(now, w.close);
    if (now >= open && now < close) {
      const cutoff = new Date(close.getTime() - SIGN_IN_CUTOFF_MIN * 60000);
      return now < cutoff
        ? { state: 'open', signInUntil: cutoff, closesAt: close }
        : { state: 'signInClosed', closesAt: close };
    }
  }
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    for (const w of CHILD_WATCH_HOURS[day.getDay()]) {
      const open = at(day, w.open);
      if (open > now) return { state: 'closed', nextOpen: open };
    }
  }
  return { state: 'closed', nextOpen: null };
}

export function formatClock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeStatus(status: ChildWatchStatus): string {
  switch (status.state) {
    case 'open':
      return `Open – sign in until ${formatClock(status.signInUntil)}`;
    case 'signInClosed':
      return `Sign-in closed, room open until ${formatClock(status.closesAt)}`;
    default:
      return status.nextOpen
        ? `Closed – opens ${DAY_NAMES[status.nextOpen.getDay()]} ${formatClock(status.nextOpen)}`
        : 'Closed';
  }
}

export function ageInWeeks(birthDate: string, now: Date): number {
  const born = new Date(`${birthDate}T12:00:00`);
  return Math.floor((now.getTime() - born.getTime()) / (7 * 24 * 3600 * 1000));
}

export function formatAge(birthDate: string, now: Date): string {
  const weeks = ageInWeeks(birthDate, now);
  if (weeks < 12) return `${Math.max(weeks, 0)} wks`;
  const months = Math.floor(weeks / 4.345);
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yrs`;
}

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minutes a child has spent in Child Watch on the day of `now`, counting any open visit up to `now`. */
export function minutesUsedToday(visits: ChildWatchVisit[], childId: string, now: Date): number {
  const day = localDay(now.toISOString());
  let total = 0;
  for (const v of visits) {
    if (v.childId !== childId || localDay(v.signedInAt) !== day) continue;
    const end = v.signedOutAt ? new Date(v.signedOutAt) : now;
    total += Math.max(0, Math.round((end.getTime() - new Date(v.signedInAt).getTime()) / 60000));
  }
  return total;
}

export type SignInCheck = { ok: true } | { ok: false; reason: string };

export function validateSignIn(input: {
  now: Date;
  child: ChildProfile;
  visits: ChildWatchVisit[];
  parentCheckedInAtDesk: boolean;
}): SignInCheck {
  const { now, child, visits, parentCheckedInAtDesk } = input;
  const status = getStatusAt(now);
  if (status.state === 'closed') {
    return { ok: false, reason: `Child Watch is closed. ${describeStatus(status)}.` };
  }
  if (status.state === 'signInClosed') {
    return { ok: false, reason: 'Sign in cut off is 30 minutes prior to closing time.' };
  }
  if (!parentCheckedInAtDesk) {
    return { ok: false, reason: 'Check in at the Y Membership Desk before dropping children off in Child Watch.' };
  }
  if (ageInWeeks(child.birthDate, now) < MIN_AGE_WEEKS) {
    return { ok: false, reason: 'Child Watch is for children 6 weeks and up.' };
  }
  if (visits.some((v) => v.childId === child.id && !v.signedOutAt)) {
    return { ok: false, reason: `${child.firstName} is already signed in.` };
  }
  if (minutesUsedToday(visits, child.id, now) >= MAX_MINUTES_PER_DAY) {
    return { ok: false, reason: `${child.firstName} has used the maximum of 2 hours today.` };
  }
  if (visits.filter((v) => !v.signedOutAt).length >= ROOM_CAPACITY) {
    return { ok: false, reason: 'Child Watch is at capacity right now.' };
  }
  return { ok: true };
}
