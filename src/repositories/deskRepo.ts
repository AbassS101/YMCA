import { getDemoToday } from '@/domain/demoClock';
import type {
  ArrivalRecord,
  BillingIssueRow,
  EnrollmentCampaign,
  Lead,
  LeadStatus,
  MemberContact,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export type RepKpiPeriod = 'today' | 'week' | 'month';

export type RepKpis = {
  staffId: string | 'branch';
  checkIns: number;
  calls: number;
  contacts: number;
  billingRecovered: number;
  membershipsSold: number;
  /** won / (won + lost) across leads, 0 when nothing is decided yet. */
  leadConversionRate: number;
  openLeads: number;
};

export const OPEN_LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'tour_scheduled', 'follow_up'];

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive start date for a KPI period (week starts Monday). */
export function periodStart(period: RepKpiPeriod, today: string = getDemoToday()): string {
  if (period === 'today') return today;
  if (period === 'month') return `${today.slice(0, 7)}-01`;
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDate(today, -((dow + 6) % 7));
}

export function computeRepKpis(input: {
  staffId: string | 'branch';
  period: RepKpiPeriod;
  today?: string;
  contacts: MemberContact[];
  arrivals: ArrivalRecord[];
  leads: Lead[];
}): RepKpis {
  const today = input.today ?? getDemoToday();
  const start = periodStart(input.period, today);
  const mine = (staffId?: string) => input.staffId === 'branch' || staffId === input.staffId;
  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    return d >= start && d <= today;
  };

  const contacts = input.contacts.filter((c) => mine(c.staffId) && inRange(c.createdAt));
  const arrivals = input.arrivals.filter((a) => a.checkedInByStaffId && mine(a.checkedInByStaffId) && inRange(a.at));
  const leads = input.leads.filter((l) => input.staffId === 'branch' || l.assignedStaffId === input.staffId);
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;

  return {
    staffId: input.staffId,
    checkIns: arrivals.length,
    calls: contacts.filter((c) => c.channel === 'call').length,
    contacts: contacts.length,
    billingRecovered: contacts.filter(
      (c) => c.purpose === 'billing' && (c.outcome === 'card_updated' || c.outcome === 'resolved')
    ).length,
    membershipsSold: contacts.filter((c) => c.outcome === 'sold').length,
    leadConversionRate: won + lost === 0 ? 0 : won / (won + lost),
    openLeads: leads.filter((l) => OPEN_LEAD_STATUSES.includes(l.status)).length,
  };
}

export type FollowUp = {
  key: string;
  kind: 'member' | 'lead';
  id: string;
  name: string;
  phone: string;
  date: string;
  reason: string;
};

export const deskRepo = {
  listBillingIssues(api: ProtivityPort, branchId: string, requesterUserId?: string): Promise<BillingIssueRow[]> {
    return api.listBillingIssues(branchId, requesterUserId);
  },

  resolveBillingIssue(
    api: ProtivityPort,
    memberId: string,
    payment: { brand: string; last4: string },
    requesterUserId: string
  ) {
    return api.resolveBillingIssue(memberId, payment, requesterUserId);
  },

  listContacts(api: ProtivityPort, filter?: { memberId?: string; leadId?: string; staffId?: string }) {
    return api.listMemberContacts(filter);
  },

  logContact(
    api: ProtivityPort,
    input: Omit<MemberContact, 'id' | 'createdAt' | 'staffId' | 'staffName'>,
    requesterUserId: string
  ) {
    return api.logMemberContact(input, requesterUserId);
  },

  listLeads(api: ProtivityPort, requesterUserId?: string) {
    return api.listLeads(requesterUserId);
  },

  createLead(api: ProtivityPort, input: Parameters<ProtivityPort['createLead']>[0], requesterUserId: string) {
    return api.createLead(input, requesterUserId);
  },

  updateLead(api: ProtivityPort, id: string, updates: Partial<Lead>, requesterUserId: string) {
    return api.updateLead(id, updates, requesterUserId);
  },

  convertLead(
    api: ProtivityPort,
    leadId: string,
    input: Parameters<ProtivityPort['convertLeadToMember']>[1],
    requesterUserId: string
  ) {
    return api.convertLeadToMember(leadId, input, requesterUserId);
  },

  listCampaigns(api: ProtivityPort): Promise<EnrollmentCampaign[]> {
    return api.listCampaigns();
  },

  activeCampaign(api: ProtivityPort, planId?: string, date: string = getDemoToday()) {
    return api.getActiveCampaign(date, planId);
  },

  saveCampaign(api: ProtivityPort, input: Parameters<ProtivityPort['saveCampaign']>[0], requesterUserId: string) {
    return api.saveCampaign(input, requesterUserId);
  },

  deleteCampaign(api: ProtivityPort, id: string, requesterUserId: string) {
    return api.deleteCampaign(id, requesterUserId);
  },

  async kpis(
    api: ProtivityPort,
    branchId: string,
    staffId: string | 'branch',
    period: RepKpiPeriod
  ): Promise<RepKpis> {
    const today = getDemoToday();
    const [contacts, leads, arrivalsByDay] = await Promise.all([
      api.listMemberContacts(),
      api.listLeads().catch(() => [] as Lead[]),
      Promise.all(
        // Arrivals are stored per day; walk back to the start of the period (max 31 days).
        Array.from({ length: 31 }, (_, i) => i)
          .map((i) => shiftDate(today, -i))
          .filter((d) => d >= periodStart(period, today))
          .map((d) => api.listArrivals(branchId, d))
      ),
    ]);
    return computeRepKpis({ staffId, period, today, contacts, arrivals: arrivalsByDay.flat(), leads });
  },

  /** Contact follow-ups and lead follow-ups that are due on or before `date`. */
  async followUpsDue(api: ProtivityPort, date: string = getDemoToday()): Promise<FollowUp[]> {
    const [contacts, leads, members] = await Promise.all([
      api.listMemberContacts(),
      api.listLeads().catch(() => [] as Lead[]),
      api.listAllMembers(),
    ]);
    const memberById = new Map(members.map((m) => [m.id, m]));
    const out: FollowUp[] = [];

    // Only the most recent contact per member counts; an older callback is superseded by a newer one.
    const latestByMember = new Map<string, MemberContact>();
    for (const c of contacts) {
      if (c.memberId && !latestByMember.has(c.memberId)) latestByMember.set(c.memberId, c);
    }
    for (const c of latestByMember.values()) {
      if (!c.followUpDate || c.followUpDate > date) continue;
      const m = memberById.get(c.memberId!);
      if (!m) continue;
      out.push({
        key: `m-${c.id}`,
        kind: 'member',
        id: m.id,
        name: m.name,
        phone: m.phone,
        date: c.followUpDate,
        reason: `${c.purpose} follow-up: ${c.notes || c.outcome}`,
      });
    }
    for (const l of leads) {
      if (!OPEN_LEAD_STATUSES.includes(l.status) || !l.nextFollowUpDate || l.nextFollowUpDate > date) continue;
      out.push({
        key: `l-${l.id}`,
        kind: 'lead',
        id: l.id,
        name: l.name,
        phone: l.phone,
        date: l.nextFollowUpDate,
        reason: 'Sales follow-up',
      });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  },
};
