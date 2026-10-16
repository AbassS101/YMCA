import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { demoNow, minutesUsedToday } from '@/domain/childWatch';
import { requiredStaff, ratioStatus, staffOnDutyAt, type RatioStatus } from '@/domain/childWatchStaffing';
import { getDemoToday } from '@/domain/demoClock';
import { hourlyForecast } from '@/domain/stats/childWatchStats';
import type {
  ChildWatchAuthorizedPickup,
  ChildWatchHeadcount,
  ChildWatchIncident,
  ChildWatchShift,
  ChildWatchVisit,
  Member,
} from '@/domain/types';
import { childWatchRepo } from '@/repositories/childWatchRepo';

import { BRANCH_ID } from './format';

export type RoomChild = {
  visit: ChildWatchVisit;
  child: Member;
  ageMonths: number;
  minutesIn: number;
  minutesLeft: number;
  hasAllergy: boolean;
};

export type RoomAlert = {
  key: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  action?: 'headcount' | 'incident' | 'pickups' | 'shifts' | 'room';
};

export type ChildWatchRoom = {
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  inRoom: RoomChild[];
  capacity: number;
  staffOnDuty: number;
  staffNeeded: number;
  ratio: RatioStatus;
  lastHeadcount: ChildWatchHeadcount | null;
  headcountDueInMin: number; // negative = overdue
  todayShifts: ChildWatchShift[];
  coverageGaps: { start: string; end: string }[]; // open hours with 0 staff
  openIncidents: ChildWatchIncident[];
  awaitingAck: ChildWatchIncident[];
  pendingPickups: ChildWatchAuthorizedPickup[]; // [] unless manageChildWatchProgram
  forecast: ReturnType<typeof hourlyForecast>;
  todayStats: { visits: number; avgStayMin: number; peak: number };
  alerts: RoomAlert[];
  isOpenNow: boolean;
  closesInMin: number | null;
};

const REFRESH_MS = 60_000;
const NEAR_LIMIT_MIN = 15;
const HEADCOUNT_OVERDUE_MIN = 5;
const ACK_WAIT_MIN = 30;
const GAP_LOOKAHEAD_MIN = 120;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ageInMonths(birthDate: string | undefined, now: Date): number {
  if (!birthDate) return 0;
  const b = new Date(`${birthDate}T12:00:00`);
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

const levelOrder: Record<RoomAlert['level'], number> = { critical: 0, warning: 1, info: 2 };

/** Pure: derives alerts from the room state, so it can be unit tested. */
export function deriveRoomAlerts(
  input: Pick<
    ChildWatchRoom,
    | 'inRoom'
    | 'capacity'
    | 'ratio'
    | 'headcountDueInMin'
    | 'openIncidents'
    | 'awaitingAck'
    | 'pendingPickups'
    | 'closesInMin'
    | 'coverageGaps'
  >,
  ctx: { nowMs?: number; nowMinutes?: number; canManage?: boolean; headcountMismatch?: boolean } = {}
): RoomAlert[] {
  const nowMs = ctx.nowMs ?? Date.now();
  const nowMinutes = ctx.nowMinutes ?? new Date(nowMs).getHours() * 60 + new Date(nowMs).getMinutes();
  const alerts: RoomAlert[] = [];

  if (input.ratio === 'over') {
    alerts.push({ key: 'ratio-over', level: 'critical', title: 'Over staffing ratio', detail: 'Not enough staff for the children in the room.', action: 'shifts' });
  } else if (input.ratio === 'at_limit') {
    alerts.push({ key: 'ratio-limit', level: 'warning', title: 'At staffing limit', detail: 'One more child needs another staff member.', action: 'shifts' });
  }
  if (input.inRoom.length > input.capacity) {
    alerts.push({ key: 'capacity', level: 'critical', title: 'Over room capacity', detail: `${input.inRoom.length} children in a room for ${input.capacity}.`, action: 'room' });
  }
  if (input.headcountDueInMin < -HEADCOUNT_OVERDUE_MIN) {
    alerts.push({ key: 'headcount-overdue', level: 'critical', title: 'Headcount overdue', detail: `${Math.abs(input.headcountDueInMin)} min past due.`, action: 'headcount' });
  }
  if (ctx.headcountMismatch) {
    alerts.push({ key: 'headcount-mismatch', level: 'critical', title: 'Headcount mismatch', detail: 'The last count did not match sign-ins. Count again.', action: 'headcount' });
  }
  for (const i of input.openIncidents.filter((x) => x.severity === 'high' && x.status === 'open')) {
    alerts.push({ key: `incident-high-${i.id}`, level: 'critical', title: 'Open high-severity incident', detail: i.type.replace('_', ' '), action: 'incident' });
  }

  for (const c of input.inRoom.filter((r) => r.minutesLeft <= NEAR_LIMIT_MIN)) {
    alerts.push({
      key: `limit-${c.visit.id}`,
      level: 'warning',
      title: c.minutesLeft <= 0 ? 'Child over daily limit' : 'Child near daily limit',
      detail: `${c.child.name.split(' ')[0]}: ${c.minutesLeft <= 0 ? 'limit reached' : `${c.minutesLeft} min left`}.`,
      action: 'room',
    });
  }
  if (input.closesInMin != null && input.closesInMin <= 15 && input.inRoom.length > 0) {
    alerts.push({ key: 'closing', level: 'warning', title: 'Room closing soon', detail: `Closes in ${input.closesInMin} min with ${input.inRoom.length} still in.`, action: 'room' });
  }
  const soonGap = input.coverageGaps.find((g) => toMinutes(g.start) < nowMinutes + GAP_LOOKAHEAD_MIN && toMinutes(g.end) > nowMinutes);
  if (soonGap) {
    alerts.push({ key: 'gap', level: 'warning', title: 'Coverage gap coming up', detail: `No staff ${soonGap.start}-${soonGap.end}.`, action: 'shifts' });
  }
  for (const i of input.awaitingAck) {
    const waited = i.parentNotifiedAt ? (nowMs - new Date(i.parentNotifiedAt).getTime()) / 60_000 : 0;
    if (waited > ACK_WAIT_MIN) {
      alerts.push({ key: `ack-${i.id}`, level: 'warning', title: 'Parent has not acknowledged', detail: `Waiting ${Math.round(waited)} min.`, action: 'incident' });
    }
  }

  if (ctx.canManage) {
    if (input.pendingPickups.length > 0) {
      alerts.push({ key: 'pickups', level: 'info', title: 'Pickup approvals waiting', detail: `${input.pendingPickups.length} pending.`, action: 'pickups' });
    }
    const unreviewed = input.openIncidents.filter((i) => i.status === 'open');
    if (unreviewed.length > 0) {
      alerts.push({ key: 'unreviewed', level: 'info', title: 'Incidents to review', detail: `${unreviewed.length} unreviewed.`, action: 'incident' });
    }
  }

  return alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
}

type Raw = {
  visits: ChildWatchVisit[];
  members: Member[];
  shifts: ChildWatchShift[];
  headcounts: ChildWatchHeadcount[];
  incidents: ChildWatchIncident[];
  pickups: ChildWatchAuthorizedPickup[];
};

export function useChildWatchRoom(staffId: string): ChildWatchRoom {
  const { api } = useSession();
  const { config } = useAppConfig();
  const { can } = useStaffCapabilities();
  const rules = config.childWatch;
  const canManage = can('manageChildWatchProgram');

  const [raw, setRaw] = useState<Raw | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (staffId === '') return;
    try {
      setError(false);
      const today = getDemoToday();
      const [visits, members, shifts, headcounts, incidents, pickups] = await Promise.all([
        childWatchRepo.visitsForViewer(staffId),
        api.listAllMembers(BRANCH_ID),
        childWatchRepo.shifts(today, staffId),
        childWatchRepo.headcounts(today, staffId),
        childWatchRepo.incidents({}, staffId),
        canManage ? childWatchRepo.pendingPickups(staffId).catch(() => []) : Promise.resolve([]),
      ]);
      setRaw({ visits, members, shifts, headcounts, incidents, pickups });
      setTick((t) => t + 1);
    } catch {
      setError(true);
    }
  }, [api, staffId, canManage]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const id = setInterval(() => void load(), REFRESH_MS);
      return () => clearInterval(id);
    }, [load])
  );

  void tick;
  const now = demoNow();
  const today = localDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const capacity = rules.roomCapacity;

  const visits = raw?.visits ?? [];
  const members = raw?.members ?? [];
  const memberById = new Map(members.map((m) => [m.id, m]));
  const agesByChild = new Map<string, number>();
  for (const m of members) if (m.birthDate) agesByChild.set(m.id, ageInMonths(m.birthDate, now));

  const inRoom: RoomChild[] = visits
    .filter((v) => !v.signedOutAt)
    .flatMap((v) => {
      const child = memberById.get(v.childId);
      if (!child) return [];
      const used = minutesUsedToday(visits, v.childId, now);
      return [
        {
          visit: v,
          child,
          ageMonths: ageInMonths(child.birthDate, now),
          minutesIn: Math.max(0, Math.round((now.getTime() - new Date(v.signedInAt).getTime()) / 60_000)),
          minutesLeft: Math.round(rules.maxMinutesPerDay - used),
          hasAllergy: !!child.allergies && child.allergies.trim() !== '',
        },
      ];
    })
    .sort((a, b) => a.minutesLeft - b.minutesLeft);

  const shifts = raw?.shifts ?? [];
  const ages = inRoom.map((c) => c.ageMonths);
  const staffOnDuty = staffOnDutyAt(shifts, now);
  const needed = requiredStaff(ages, rules.ratios);
  const staffNeeded = Number.isFinite(needed) ? needed : 0;
  const ratio = ratioStatus(ages, staffOnDuty, rules.ratios);

  const windows = rules.hours[now.getDay()] ?? [];
  const currentWindow = windows.find((w) => nowMinutes >= toMinutes(w.open) && nowMinutes < toMinutes(w.close));
  const isOpenNow = !!currentWindow;
  const closesInMin = currentWindow ? toMinutes(currentWindow.close) - nowMinutes : null;

  const headcounts = [...(raw?.headcounts ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  const lastHeadcount = headcounts[0] ?? null;
  let headcountDueInMin = 0;
  if (isOpenNow) {
    const refMs = lastHeadcount
      ? new Date(lastHeadcount.at).getTime()
      : inRoom.length > 0
        ? Math.min(...inRoom.map((c) => new Date(c.visit.signedInAt).getTime()))
        : now.getTime();
    headcountDueInMin = Math.round(rules.headcountIntervalMin - (now.getTime() - refMs) / 60_000);
  }

  const coverageGaps: { start: string; end: string }[] = [];
  for (const w of windows) {
    const spans = shifts
      .map((s) => [toMinutes(s.start), toMinutes(s.end)] as const)
      .sort((a, b) => a[0] - b[0]);
    let cursor = toMinutes(w.open);
    const close = toMinutes(w.close);
    for (const [s, e] of spans) {
      if (e <= cursor) continue;
      if (s > cursor) coverageGaps.push({ start: toHhmm(cursor), end: toHhmm(Math.min(s, close)) });
      cursor = Math.max(cursor, e);
      if (cursor >= close) break;
    }
    if (cursor < close) coverageGaps.push({ start: toHhmm(cursor), end: toHhmm(close) });
  }
  const upcomingGaps = coverageGaps.filter((g) => toMinutes(g.end) > nowMinutes);

  const incidents = raw?.incidents ?? [];
  const openIncidents = incidents.filter((i) => i.status === 'open');
  const awaitingAck = incidents.filter((i) => i.parentNotifiedAt && !i.parentAcknowledgedAt);
  const pendingPickups = canManage ? (raw?.pickups ?? []) : [];

  const todayVisits = visits.filter((v) => localDate(new Date(v.signedInAt)) === today);
  const closed = todayVisits.filter((v) => v.signedOutAt);
  const avgStayMin = closed.length
    ? Math.round(closed.reduce((s, v) => s + (new Date(v.signedOutAt as string).getTime() - new Date(v.signedInAt).getTime()) / 60_000, 0) / closed.length)
    : 0;
  const events = todayVisits.flatMap((v) => [
    { t: new Date(v.signedInAt).getTime(), d: 1 },
    { t: v.signedOutAt ? new Date(v.signedOutAt).getTime() : now.getTime(), d: -1 },
  ]);
  events.sort((a, b) => a.t - b.t || a.d - b.d);
  let cur = 0;
  let peak = 0;
  for (const e of events) {
    cur += e.d;
    peak = Math.max(peak, cur);
  }

  const forecast = hourlyForecast(visits, agesByChild, rules.ratios, now.getDay(), today);
  const lastHeadcountMismatch = !!lastHeadcount && lastHeadcount.counted !== lastHeadcount.expected;

  const alerts = deriveRoomAlerts(
    { inRoom, capacity, ratio, headcountDueInMin, openIncidents, awaitingAck, pendingPickups, closesInMin, coverageGaps: upcomingGaps },
    { nowMs: now.getTime(), nowMinutes, canManage, headcountMismatch: lastHeadcountMismatch }
  );

  return {
    loading: raw === null && !error,
    error,
    reload: load,
    inRoom,
    capacity,
    staffOnDuty,
    staffNeeded,
    ratio,
    lastHeadcount,
    headcountDueInMin,
    todayShifts: shifts,
    coverageGaps: upcomingGaps,
    openIncidents,
    awaitingAck,
    pendingPickups,
    forecast,
    todayStats: { visits: todayVisits.length, avgStayMin, peak },
    alerts,
    isOpenNow,
    closesInMin,
  };
}
