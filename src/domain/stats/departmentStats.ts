import { cohortRetention, daysInRange, monthlyRetention, monthsInRange, pct } from '@/domain/stats/retention';
import type { CohortRow, MonthlyRetention } from '@/domain/stats/retention';
import type { LeadSource, LeadStatus, SessionRequest, TrainerAvailability } from '@/domain/types';
import type { AquaticsRaw, MembershipRaw, StatsRange, WellnessRaw } from '@/repositories/statsRepo';

const round1 = (n: number) => Math.round(n * 10) / 10;

function bump(rec: Record<string, number>, key: string, by = 1) {
  rec[key] = (rec[key] ?? 0) + by;
}

/** Hours from the request being made to the first staff decision; null when nobody has answered. */
function responseHours(r: SessionRequest): number | null {
  const asked = r.history.find((e) => e.action === 'requested');
  const answered = r.history.find((e) =>
    ['auto_accepted', 'accepted', 'declined', 'countered'].includes(e.action)
  );
  if (!asked || !answered) return null;
  const ms = new Date(answered.at).getTime() - new Date(asked.at).getTime();
  return ms >= 0 ? ms / 3600000 : null;
}

function avgResponseHours(requests: SessionRequest[]): number {
  const hours = requests.map(responseHours).filter((h): h is number => h !== null);
  return hours.length > 0 ? round1(hours.reduce((s, h) => s + h, 0) / hours.length) : 0;
}

function nameByStaff(requests: SessionRequest[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of requests) if (r.staffName) out[r.staffId] = r.staffName;
  return out;
}

// --- Aquatics -----------------------------------------------------------------------------------

export type AquaticsStats = {
  classCount: number;
  enrolled: number;
  capacity: number;
  avgFillPct: number;
  /** Enrollments beyond a class's capacity. */
  waitlist: number;
  classFill: { classId: string; title: string; enrolled: number; capacity: number; fillPct: number }[];
  lessonsDelivered: number;
  lessonsByInstructor: Record<string, number>;
  requests: number;
  avgResponseHours: number;
};

export function buildAquaticsStats(raw: AquaticsRaw, _range: StatsRange): AquaticsStats {
  const classFill = raw.classes.map((c) => {
    const enrolled = (raw.enrollmentsByClass[c.id] ?? []).filter((e) => e.status === 'enrolled').length;
    return { classId: c.id, title: c.title, enrolled, capacity: c.capacity, fillPct: pct(enrolled, c.capacity) };
  });
  const enrolled = classFill.reduce((s, c) => s + c.enrolled, 0);
  const capacity = classFill.reduce((s, c) => s + c.capacity, 0);
  const names = nameByStaff(raw.sessionRequests);
  const lessonsByInstructor: Record<string, number> = {};
  const delivered = raw.lessons.filter((l) => l.status === 'completed');
  for (const l of delivered) bump(lessonsByInstructor, names[l.staffId] ?? l.staffId);
  return {
    classCount: raw.classes.length,
    enrolled,
    capacity,
    avgFillPct: pct(enrolled, capacity),
    waitlist: classFill.reduce((s, c) => s + Math.max(0, c.enrolled - c.capacity), 0),
    classFill,
    lessonsDelivered: delivered.length,
    lessonsByInstructor,
    requests: raw.sessionRequests.length,
    avgResponseHours: avgResponseHours(raw.sessionRequests),
  };
}

// --- Wellness -----------------------------------------------------------------------------------

export type TrainerUtilization = {
  trainerId: string;
  name: string;
  sessions: number;
  bookedHours: number;
  availableHours: number;
  utilizationPct: number;
};

export type WellnessStats = {
  sessionsDelivered: number;
  sessionsPerTrainer: Record<string, number>;
  membersWithTrainer: number;
  /** Paid, non-orientation sessions (the closest signal to package sales in the data). */
  paidSessions: number;
  paidRevenueCents: number;
  trainerUtilization: TrainerUtilization[];
  requests: number;
  avgResponseHours: number;
};

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function availableHours(a: TrainerAvailability | undefined, range: StatsRange): number {
  if (!a) return 0;
  let minutes = 0;
  for (const day of daysInRange(range.from, range.to)) {
    if (day < a.effectiveFrom || (a.effectiveUntil && day > a.effectiveUntil)) continue;
    const exception = a.exceptions.find((e) => e.date === day);
    const windows = exception
      ? exception.kind === 'blocked'
        ? []
        : exception.windows
      : a.weekly.filter((w) => w.weekday === new Date(`${day}T12:00:00`).getDay());
    for (const w of windows) minutes += Math.max(0, minutesOf(w.endTime) - minutesOf(w.startTime));
  }
  return minutes / 60;
}

export function buildWellnessStats(raw: WellnessRaw, range: StatsRange): WellnessStats {
  const delivered = raw.lessons.filter((l) => l.status === 'completed');
  const sessionsPerTrainer: Record<string, number> = {};
  for (const l of delivered) bump(sessionsPerTrainer, l.staffId);
  const paid = raw.lessons.filter((l) => !l.isOrientation && (l.paidAmountCents ?? 0) > 0 && l.status !== 'cancelled');

  const trainerUtilization = raw.trainers.map((t) => {
    const mine = raw.lessons.filter((l) => l.staffId === t.id && l.status !== 'cancelled');
    const bookedHours = mine.reduce(
      (s, l) => s + (new Date(l.end).getTime() - new Date(l.start).getTime()) / 3600000,
      0
    );
    const avail = availableHours(raw.availability[t.id], range);
    return {
      trainerId: t.id,
      name: t.name,
      sessions: sessionsPerTrainer[t.id] ?? 0,
      bookedHours: round1(bookedHours),
      availableHours: round1(avail),
      utilizationPct: pct(bookedHours, avail),
    };
  });

  return {
    sessionsDelivered: delivered.length,
    sessionsPerTrainer,
    membersWithTrainer: Object.keys(raw.assignments).length,
    paidSessions: paid.length,
    paidRevenueCents: paid.reduce((s, l) => s + (l.paidAmountCents ?? 0), 0),
    trainerUtilization,
    requests: raw.sessionRequests.length,
    avgResponseHours: avgResponseHours(raw.sessionRequests),
  };
}

// --- Membership ---------------------------------------------------------------------------------

export type MembershipStats = {
  joins: number;
  cancels: number;
  cancelsByReason: Record<string, number>;
  /** Cancel requests in range whose membership is no longer ending. */
  saveRatePct: number;
  monthly: MonthlyRetention[];
  cohorts: CohortRow[];
  leadFunnel: Record<LeadStatus, number>;
  leadConversionPct: number;
  conversionBySource: { source: LeadSource; leads: number; won: number; conversionPct: number }[];
  campaignJoins: { campaignId: string; name: string; joins: number }[];
  /** Card updates logged ÷ (card updates + members still in a billing issue). */
  billingRecoveryPct: number;
  contactsByRep: Record<string, number>;
};

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'tour_scheduled', 'follow_up', 'won', 'lost'];

export function buildMembershipStats(raw: MembershipRaw, range: StatsRange, today = range.to): MembershipStats {
  const inRange = (day?: string) => !!day && day >= range.from && day <= range.to;
  const joins = raw.memberships.filter((m) => inRange(m.joinedDate)).length;

  const cancelsByReason: Record<string, number> = {};
  for (const c of raw.cancels) bump(cancelsByReason, c.reason || 'Unspecified');
  const byMember = new Map(raw.memberships.map((m) => [m.memberId, m]));
  const saved = raw.cancels.filter((c) => {
    const m = byMember.get(c.memberId);
    return !!m && m.status !== 'cancel_pending' && m.status !== 'cancelled' && !m.cancelEffectiveDate;
  }).length;

  const leadFunnel = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  const sources = new Map<LeadSource, { leads: number; won: number }>();
  for (const l of raw.leads) {
    leadFunnel[l.status] += 1;
    const s = sources.get(l.source) ?? { leads: 0, won: 0 };
    s.leads += 1;
    if (l.status === 'won') s.won += 1;
    sources.set(l.source, s);
  }

  const campaignName = new Map(raw.campaigns.map((c) => [c.id, c.name]));
  const joinsByCampaign: Record<string, number> = {};
  for (const m of raw.memberships) {
    if (m.campaignId && inRange(m.joinedDate)) bump(joinsByCampaign, m.campaignId);
  }

  const cardUpdates = raw.contacts.filter((c) => c.outcome === 'card_updated').length;
  const contactsByRep: Record<string, number> = {};
  for (const c of raw.contacts) bump(contactsByRep, c.staffName);

  return {
    joins,
    cancels: raw.cancels.length,
    cancelsByReason,
    saveRatePct: pct(saved, raw.cancels.length),
    monthly: monthlyRetention(raw.memberships, monthsInRange(range.from, range.to)),
    cohorts: cohortRetention(raw.memberships, today),
    leadFunnel,
    leadConversionPct: pct(leadFunnel.won, raw.leads.length),
    conversionBySource: [...sources.entries()].map(([source, s]) => ({
      source,
      leads: s.leads,
      won: s.won,
      conversionPct: pct(s.won, s.leads),
    })),
    campaignJoins: Object.entries(joinsByCampaign).map(([campaignId, n]) => ({
      campaignId,
      name: campaignName.get(campaignId) ?? campaignId,
      joins: n,
    })),
    billingRecoveryPct: pct(cardUpdates, cardUpdates + raw.billingIssues.length),
    contactsByRep,
  };
}
