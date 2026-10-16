import type {
  ArrivalRecord,
  BillingIssueRow,
  CancelRequest,
  ChildWatchAuthorizedPickup,
  ChildWatchHeadcount,
  ChildWatchIncident,
  ChildWatchShift,
  ChildWatchVisit,
  Donation,
  EnrollmentCampaign,
  Lead,
  Member,
  MemberContact,
  Membership,
  PrivateLesson,
  ScheduleItem,
  SessionRequest,
  Staff,
  SwimClassEnrollment,
  TrainerAvailability,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';
import { childWatchRepo } from '@/repositories/childWatchRepo';
import { sessionRequestRepo, swimClassRepo } from '@/repositories/lessonRepo';
import { loadStore } from '@/storage/demoStore';

/** Inclusive YYYY-MM-DD range. */
export type StatsRange = { from: string; to: string };

export type BranchRaw = {
  members: Member[];
  memberships: Membership[];
  arrivals: ArrivalRecord[];
  cancels: CancelRequest[];
  leads: Lead[];
  donations: Donation[];
  billingIssues: BillingIssueRow[];
  childWatchVisitCount: number;
};

export type ChildWatchRaw = {
  visits: ChildWatchVisit[];
  incidents: ChildWatchIncident[];
  headcounts: ChildWatchHeadcount[];
  shifts: ChildWatchShift[];
  /** Under-13 dependents seen in the visits, for age-banded ratios. */
  children: { id: string; birthDate: string }[];
  pendingPickups: ChildWatchAuthorizedPickup[];
};

export type AquaticsRaw = {
  classes: ScheduleItem[];
  enrollmentsByClass: Record<string, SwimClassEnrollment[]>;
  lessons: PrivateLesson[];
  sessionRequests: SessionRequest[];
};

export type WellnessRaw = {
  lessons: PrivateLesson[];
  trainers: Staff[];
  /** Member id -> assigned trainer id, for members of this branch. */
  assignments: Record<string, string>;
  availability: Record<string, TrainerAvailability>;
  sessionRequests: SessionRequest[];
};

export type MembershipRaw = {
  members: Member[];
  memberships: Membership[];
  cancels: CancelRequest[];
  leads: Lead[];
  campaigns: EnrollmentCampaign[];
  contacts: MemberContact[];
  billingIssues: BillingIssueRow[];
};

const inRange = (iso: string, { from, to }: StatsRange) => {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
};

async function branchMembers(api: ProtivityPort, branchId: string): Promise<Member[]> {
  return api.listAllMembers(branchId);
}

export const statsRepo = {
  async branchRaw(
    api: ProtivityPort,
    range: StatsRange,
    branchId: string,
    requesterId: string
  ): Promise<BranchRaw> {
    const [members, memberships, arrivals, cancels, leads, donations, billingIssues] = await Promise.all([
      branchMembers(api, branchId),
      api.listMemberships(branchId),
      api.listArrivalsRange(branchId, range.from, range.to),
      api.listCancelRequests(branchId),
      api.listLeads(requesterId),
      api.listDonations(),
      api.listBillingIssues(branchId, requesterId),
    ]);
    const childWatchVisitCount = await childWatchRepo
      .visitsInRange(range.from, range.to, requesterId)
      .then((v) => v.length)
      .catch(() => 0);
    return {
      members,
      memberships,
      arrivals,
      cancels,
      leads,
      donations: donations.filter((d) => inRange(d.createdAt, range)),
      billingIssues,
      childWatchVisitCount,
    };
  },

  async childWatchRaw(range: StatsRange, requesterId: string): Promise<ChildWatchRaw> {
    const [visits, incidents, headcounts, shifts, pendingPickups, state] = await Promise.all([
      childWatchRepo.visitsInRange(range.from, range.to, requesterId),
      childWatchRepo.incidentsInRange(range.from, range.to, requesterId),
      childWatchRepo.headcountsInRange(range.from, range.to, requesterId),
      childWatchRepo.shiftsInRange(range.from, range.to, requesterId),
      childWatchRepo.pendingPickups(requesterId).catch(() => [] as ChildWatchAuthorizedPickup[]),
      loadStore(),
    ]);
    const childIds = new Set(visits.map((v) => v.childId));
    const children = state.members
      .filter((m) => childIds.has(m.id) && m.birthDate)
      .map((m) => ({ id: m.id, birthDate: m.birthDate as string }));
    return { visits, incidents, headcounts, shifts, children, pendingPickups };
  },

  async aquaticsRaw(api: ProtivityPort, range: StatsRange, branchId: string): Promise<AquaticsRaw> {
    const [schedules, sessionRequests, state] = await Promise.all([
      api.listAllSchedules(branchId),
      sessionRequestRepo.list(api),
      loadStore(),
    ]);
    const classes = schedules.filter((s) => s.category === 'swim' && inRange(s.start, range));
    const lists = await Promise.all(classes.map((c) => swimClassRepo.listForClass(api, c.id)));
    const enrollmentsByClass: Record<string, SwimClassEnrollment[]> = {};
    classes.forEach((c, i) => {
      enrollmentsByClass[c.id] = lists[i];
    });
    return {
      classes,
      enrollmentsByClass,
      lessons: state.privateLessons.filter((l) => l.lessonType === 'swim' && inRange(l.start, range)),
      sessionRequests: sessionRequests.filter((r) => r.lessonType === 'swim' && inRange(r.start, range)),
    };
  },

  async wellnessRaw(api: ProtivityPort, range: StatsRange, branchId: string): Promise<WellnessRaw> {
    const [staff, members, sessionRequests, state] = await Promise.all([
      api.listStaff(branchId),
      branchMembers(api, branchId),
      sessionRequestRepo.list(api),
      loadStore(),
    ]);
    const trainers = staff.filter((s) => s.staffRole === 'trainer');
    const trainerIds = new Set(trainers.map((t) => t.id));
    const assigned = await Promise.all(members.map((m) => api.getAssignedTrainer(m.id)));
    const assignments: Record<string, string> = {};
    members.forEach((m, i) => {
      const t = assigned[i];
      if (t) assignments[m.id] = t.id;
    });
    const availability: Record<string, TrainerAvailability> = {};
    for (const id of trainerIds) {
      const a = state.trainerAvailability[id];
      if (a) availability[id] = a;
    }
    return {
      lessons: state.privateLessons.filter(
        (l) => l.lessonType !== 'swim' && trainerIds.has(l.staffId) && inRange(l.start, range)
      ),
      trainers,
      assignments,
      availability,
      sessionRequests: sessionRequests.filter((r) => r.lessonType !== 'swim' && inRange(r.start, range)),
    };
  },

  async membershipRaw(
    api: ProtivityPort,
    range: StatsRange,
    branchId: string,
    requesterId: string
  ): Promise<MembershipRaw> {
    const [members, memberships, cancels, leads, campaigns, contacts, billingIssues] = await Promise.all([
      branchMembers(api, branchId),
      api.listMemberships(branchId),
      api.listCancelRequests(branchId, range.from, range.to),
      api.listLeads(requesterId),
      api.listCampaigns(),
      api.listMemberContacts(),
      api.listBillingIssues(branchId, requesterId),
    ]);
    return {
      members,
      memberships,
      cancels,
      leads,
      campaigns,
      contacts: contacts.filter((c) => inRange(c.createdAt, range)),
      billingIssues,
    };
  },
};
