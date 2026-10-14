import { addDaysToDate, easternOffset } from '@/domain/demoClock';
import type { ArrivalRecord, ChildWatchVisit, Member } from '@/domain/types';

/**
 * Generates believable day-to-day activity (gym check-ins and Child Watch visits) for the days
 * leading up to "today". It is deterministic, so the same member shows up on the same days every
 * time, and it is regenerated relative to the real date instead of being stored in the seed.
 */

function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(key: string): number {
  return (hash(key) % 10000) / 10000;
}

function ageYears(birthDate: string, on: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(date: string, minuteOfDay: number): string {
  const hh = Math.floor(minuteOfDay / 60);
  return `${date}T${pad(hh)}:${pad(minuteOfDay % 60)}:00${easternOffset(date, hh)}`;
}

/** Demo personas start every day not yet checked in, so walkthroughs can scan them in live. */
const LIVE_PERSONAS = new Set(['member-jordan', 'member-jordan-spouse', 'member-jordan-teen', 'member-riley', 'member-sam', 'member-nora']);

const DOW_WEIGHT = [0.5, 1.1, 1, 1, 0.9, 0.7, 0.6]; // Sunday first
const CHILD_WATCH_WINDOWS: [number, number][] = [
  [9 * 60 + 15, 10 * 60 + 30],
  [16 * 60 + 30, 18 * 60 + 15],
];

export type ActivityInput = {
  today: string;
  /** Minutes since midnight, Eastern. Records later than this on `today` are not generated. */
  nowMinutes: number;
  members: Member[];
  daysBack?: number;
};

export function generateActivity(input: ActivityInput): { arrivals: ArrivalRecord[]; visits: ChildWatchVisit[] } {
  const { today, nowMinutes, members } = input;
  const daysBack = input.daysBack ?? 20;
  const arrivals: ArrivalRecord[] = [];
  const visits: ChildWatchVisit[] = [];

  const people = members.filter((m) => m.status === 'active' && !m.id.startsWith('guest-'));

  for (let back = daysBack; back >= 0; back--) {
    const date = addDaysToDate(today, -back);
    const dow = dayOfWeek(date);
    const isToday = back === 0;
    const arrivedToday = new Set<string>();

    // Households with a young Child Watch child: the parent checks in at the desk inside a window.
    const primaries = people.filter((m) => m.householdRole === 'primary' || m.householdRole === 'adult');
    for (const parent of primaries) {
      if (dow === 0) continue;
      if (isToday && LIVE_PERSONAS.has(parent.id)) continue;
      const kids = people.filter(
        (k) =>
          k.householdId === parent.householdId &&
          k.householdRole === 'dependent' &&
          k.birthDate &&
          ageYears(k.birthDate, date) <= 10 &&
          // Leo is a baby; children under 6 weeks are not eligible.
          Date.parse(date) - Date.parse(k.birthDate) > 42 * 86_400_000
      );
      if (kids.length === 0) continue;
      if (parent.householdRole === 'adult' && rand(`${parent.id}-cw-adult-${date}`) < 0.6) continue;
      if (rand(`${parent.id}-cw-${date}`) > 0.55) continue;
      const evening = dow === 6 ? false : rand(`${parent.id}-win`) > 0.5;
      const [from, to] = CHILD_WATCH_WINDOWS[evening ? 1 : 0];
      const arriveAt = from + Math.floor(rand(`${parent.id}-t-${date}`) * (to - from - 60));
      if (isToday && arriveAt + 5 > nowMinutes) continue;
      arrivedToday.add(parent.id);
      arrivals.push({
        id: `arr-live-${date}-${parent.id}`,
        memberId: parent.id,
        date,
        at: iso(date, arriveAt),
        source: 'desk',
        notifiedStaffIds: [],
      });
      for (const kid of kids) {
        const signIn = arriveAt + 5;
        const duration = 60 + Math.floor(rand(`${kid.id}-d-${date}`) * 45);
        const signOut = signIn + duration;
        const open = isToday && signOut > nowMinutes;
        visits.push({
          id: `cwv-live-${date}-${kid.id}`,
          childId: kid.id,
          memberId: kid.householdId ?? parent.id,
          signedInAt: iso(date, signIn),
          ...(open ? {} : { signedOutAt: iso(date, signOut), signedOutBy: 'member' }),
          signedInBy: 'member',
          droppedOffByMemberId: parent.id,
          verification: 'household_self',
          pickupCode: String(1000 + (hash(`${kid.id}-${date}`) % 9000)),
        });
      }
    }

    // Everyone else: regular gym visits.
    for (const m of people) {
      if (arrivedToday.has(m.id)) continue;
      if (isToday && LIVE_PERSONAS.has(m.id)) continue;
      if (m.householdRole === 'dependent' && (!m.birthDate || ageYears(m.birthDate, date) < 13)) continue;
      const base = [0.2, 0.3, 0.45, 0.6, 0.75][hash(m.id) % 5];
      if (rand(`${m.id}-v-${date}`) > base * DOW_WEIGHT[dow]) continue;
      const slot = hash(`${m.id}-slot`) % 3;
      const start = [5 * 60 + 45, 11 * 60 + 30, 17 * 60][slot];
      const spread = [160, 120, 150][slot];
      const at = start + Math.floor(rand(`${m.id}-m-${date}`) * spread);
      if (isToday && at > nowMinutes) continue;
      const roll = rand(`${m.id}-s-${date}`);
      arrivals.push({
        id: `arr-live-${date}-${m.id}`,
        memberId: m.id,
        date,
        at: iso(date, at),
        source: roll < 0.7 ? 'scanner' : roll < 0.9 ? 'class' : 'desk',
        notifiedStaffIds: [],
      });
    }
  }
  return { arrivals, visits };
}
