import {
  addDays,
  cohortRetention,
  daysInRange,
  isActiveOn,
  monthlyRetention,
  monthsInRange,
  pct,
  type CohortRow,
  type MonthlyRetention,
} from '@/domain/stats/retention';
import type { LeadStatus } from '@/domain/types';
import type { BranchRaw, StatsRange } from '@/repositories/statsRepo';

export type DailyCount = { date: string; value: number };

export type BranchStats = {
  activeMembers: number;
  paused: number;
  cancelPending: number;
  dailyVisitors: DailyCount[]; // distinct memberId per arrivals.date
  avgDailyVisitors: number;
  peakDay: DailyCount | null;
  visitsByHour: number[]; // 24 buckets from arrival.at
  visitsByWeekday: number[]; // 7 buckets (0=Sun), averaged
  newJoins: number;
  cancellations: number;
  netGrowth: number;
  monthly: MonthlyRetention[];
  cohorts: CohortRow[];
  mrrCents: number; // sum monthlyAmountCents of active memberships
  billingIssues: { declined: number; pastDue: number };
  avgVisitsPerActiveMember: number;
  atRiskMembers: number; // active, 0 arrivals in last 30 days
  leadFunnel: Record<LeadStatus, number>;
  leadConversionPct: number;
  donations: { count: number; totalCents: number };
  childWatchVisits: number; // headline only
};

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'tour_scheduled', 'follow_up', 'won', 'lost'];

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildBranchStats(raw: BranchRaw, range: StatsRange, today: string): BranchStats {
  const days = daysInRange(range.from, range.to);
  const inRange = (day: string) => day >= range.from && day <= range.to;

  const live = raw.memberships.filter((m) => !m.rateName.includes('1-Day Guest Pass'));
  const paused = live.filter((m) => m.status === 'paused').length;
  const cancelPending = live.filter((m) => m.status === 'cancel_pending').length;
  const activeList = live.filter((m) => m.status !== 'paused' && m.status !== 'cancelled' && isActiveOn(m, today));
  const activeMembers = activeList.length;

  // Visitors: distinct members per day, zero-filled across the range.
  const visitorsByDay = new Map<string, Set<string>>();
  const visitsByHour = new Array<number>(24).fill(0);
  const weekdayTotals = new Array<number>(7).fill(0);
  let arrivalsInRange = 0;
  for (const a of raw.arrivals) {
    if (!inRange(a.date)) continue;
    arrivalsInRange += 1;
    const set = visitorsByDay.get(a.date) ?? new Set<string>();
    set.add(a.memberId);
    visitorsByDay.set(a.date, set);
    visitsByHour[new Date(a.at).getHours()] += 1;
  }
  const dailyVisitors: DailyCount[] = days.map((date) => ({ date, value: visitorsByDay.get(date)?.size ?? 0 }));
  const weekdayDays = new Array<number>(7).fill(0);
  for (const d of dailyVisitors) {
    const wd = new Date(`${d.date}T12:00:00`).getDay();
    weekdayTotals[wd] += d.value;
    weekdayDays[wd] += 1;
  }
  const visitsByWeekday = weekdayTotals.map((t, i) => (weekdayDays[i] > 0 ? round1(t / weekdayDays[i]) : 0));
  const totalVisitors = dailyVisitors.reduce((s, d) => s + d.value, 0);
  const peakDay = dailyVisitors.reduce<DailyCount | null>(
    (best, d) => (d.value > 0 && (!best || d.value > best.value) ? d : best),
    null
  );

  const newJoins = live.filter((m) => m.joinedDate && inRange(m.joinedDate)).length;
  const cancellations = live.filter((m) => m.cancelEffectiveDate && inRange(m.cancelEffectiveDate)).length;

  const recentFrom = addDays(today, -29);
  const recentVisitors = new Set(raw.arrivals.filter((a) => a.date >= recentFrom && a.date <= today).map((a) => a.memberId));
  const atRiskMembers = activeList.filter((m) => !recentVisitors.has(m.memberId)).length;

  const leadFunnel = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const l of raw.leads) leadFunnel[l.status] += 1;

  return {
    activeMembers,
    paused,
    cancelPending,
    dailyVisitors,
    avgDailyVisitors: days.length > 0 ? round1(totalVisitors / days.length) : 0,
    peakDay,
    visitsByHour,
    visitsByWeekday,
    newJoins,
    cancellations,
    netGrowth: newJoins - cancellations,
    monthly: monthlyRetention(raw.memberships, monthsInRange(range.from, range.to)),
    cohorts: cohortRetention(raw.memberships, today),
    mrrCents: activeList.reduce((s, m) => s + m.monthlyAmountCents, 0),
    billingIssues: {
      declined: raw.billingIssues.filter((r) => r.membership.billingStatus === 'declined').length,
      pastDue: raw.billingIssues.filter((r) => r.membership.billingStatus === 'past_due').length,
    },
    avgVisitsPerActiveMember: activeMembers > 0 ? round1(arrivalsInRange / activeMembers) : 0,
    atRiskMembers,
    leadFunnel,
    leadConversionPct: pct(leadFunnel.won, raw.leads.length),
    donations: {
      count: raw.donations.length,
      totalCents: raw.donations.reduce((s, d) => s + d.amountCents, 0),
    },
    childWatchVisits: raw.childWatchVisitCount,
  };
}
