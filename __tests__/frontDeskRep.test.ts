jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { getDemoToday } from '@/domain/demoClock';
import { deskAlertsFor, hasBlockingAlert } from '@/domain/deskAlerts';
import { activeCampaignFor, isCampaignRunning } from '@/domain/enrollmentCampaigns';
import {
  YMCA_MEMBERSHIP_PLANS,
  effectiveEnrollmentFeeCents,
  type EnrollmentCampaign,
} from '@/domain/types';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { computeRepKpis } from '@/repositories/deskRepo';
import { resetStore } from '@/storage/demoStore';

const REP = 'staff-frontdesk';
const TRAINER = 'staff-alex';
const ADMIN = 'staff-admin';
const PLAN = YMCA_MEMBERSHIP_PLANS.find((p) => p.enrollmentFeeCents > 0)!;

const waiver: EnrollmentCampaign = {
  id: 'c1',
  name: 'Waiver',
  description: '',
  startDate: '2026-09-01',
  endDate: '2026-10-31',
  waiveEnrollmentFee: true,
  active: true,
  createdByStaffId: ADMIN,
};

describe('enrollment campaign fees', () => {
  it('waives the fee inside the window and charges it outside', () => {
    expect(isCampaignRunning(waiver, '2026-09-14')).toBe(true);
    expect(isCampaignRunning(waiver, '2026-11-01')).toBe(false);
    expect(effectiveEnrollmentFeeCents(PLAN, { campaign: waiver })).toBe(0);
    expect(effectiveEnrollmentFeeCents(PLAN)).toBe(PLAN.enrollmentFeeCents);
  });

  it('respects eligible plans', () => {
    const limited = { ...waiver, eligiblePlanIds: ['__other__'] };
    expect(effectiveEnrollmentFeeCents(PLAN, { campaign: limited })).toBe(PLAN.enrollmentFeeCents);
  });

  it('only returns running, active campaigns', () => {
    expect(activeCampaignFor('2026-09-14', PLAN.id, [waiver])?.id).toBe('c1');
    expect(activeCampaignFor('2026-12-01', PLAN.id, [waiver])).toBeNull();
    expect(activeCampaignFor('2026-09-14', PLAN.id, [{ ...waiver, active: false }])).toBeNull();
  });

  it('keeps the guest pass waiver on top of a campaign', () => {
    expect(effectiveEnrollmentFeeCents(PLAN, { waiveEnrollmentFee: true, campaign: waiver })).toBe(0);
  });
});

describe('front desk membership rep', () => {
  let api: MockProtivityAdapter;

  beforeEach(async () => {
    await resetStore();
    api = new MockProtivityAdapter();
  });

  it('flags declined cards as blocking desk alerts', async () => {
    const member = (await api.listAllMembers('silver-spring')).find((m) => m.id === 'member-riley')!;
    const membership = await api.getMembership('member-riley');
    const alerts = deskAlertsFor(member, membership, getDemoToday());
    expect(alerts.some((a) => a.kind === 'card_declined')).toBe(true);
    expect(hasBlockingAlert(alerts)).toBe(true);
  });

  it('lists billing issues for a rep but not for a trainer', async () => {
    const rows = await api.listBillingIssues('silver-spring', REP);
    expect(rows.map((r) => r.member.id)).toEqual(expect.arrayContaining(['member-riley', 'member-sam']));
    await expect(api.listBillingIssues('silver-spring', TRAINER)).rejects.toThrow();
  });

  it('clears a declined card when the payment method is updated and logs the call', async () => {
    await api.resolveBillingIssue('member-riley', { brand: 'Visa', last4: '4242' }, REP);
    const membership = await api.getMembership('member-riley');
    expect(membership?.billingStatus).toBe('current');
    expect(membership?.paymentLast4).toBe('4242');
    const contacts = await api.listMemberContacts({ memberId: 'member-riley' });
    expect(contacts.some((c) => c.outcome === 'card_updated' && c.staffId === REP)).toBe(true);
  });

  it('blocks trainers from logging contacts and reps from managing campaigns', async () => {
    await expect(
      api.logMemberContact(
        { memberId: 'member-riley', channel: 'call', purpose: 'billing', outcome: 'resolved', notes: 'x' },
        TRAINER
      )
    ).rejects.toThrow();
    await expect(
      api.saveCampaign(
        { name: 'x', description: '', startDate: '2026-09-01', endDate: '2026-09-30', waiveEnrollmentFee: true, active: true },
        REP
      )
    ).rejects.toThrow();
    const saved = await api.saveCampaign(
      { name: 'Winter', description: '', startDate: '2026-12-01', endDate: '2026-12-31', waiveEnrollmentFee: true, active: true },
      ADMIN
    );
    expect(saved.id).toBeTruthy();
  });

  it('notifies the assigned trainer once when a client arrives', async () => {
    const first = await api.recordArrival('member-jordan', { source: 'desk', staffId: REP });
    expect(first.isNew).toBe(true);
    expect(first.notifiedStaff.map((s) => s.id)).toContain(TRAINER);
    const second = await api.recordArrival('member-jordan', { source: 'desk', staffId: REP });
    expect(second.isNew).toBe(false);
    expect(second.notifiedStaff).toHaveLength(0);
    const notes = (await api.listNotifications(TRAINER)).filter((n) => n.type === 'client_arrival');
    expect(notes).toHaveLength(1);
    expect(notes[0].link).toBe('/(staff)/members/member-jordan');
    const arrivals = await api.listArrivals('silver-spring', getDemoToday());
    expect(arrivals.map((a) => a.memberId)).toContain('member-jordan');
  });

  it('respects the trainer arrival alert preference', async () => {
    await api.updateNotificationPreferences(TRAINER, { clientArrivals: false });
    await api.recordArrival('member-jordan', { source: 'desk', staffId: REP });
    const notes = (await api.listNotifications(TRAINER)).filter((n) => n.type === 'client_arrival');
    expect(notes).toHaveLength(0);
  });

  it('converts a lead with the campaign fee waived and marks it won', async () => {
    const lead = await api.createLead(
      {
        name: 'Casey Tester',
        email: 'casey.tester@example.com',
        phone: '301-555-0100',
        source: 'walk_in',
        interestPlanId: PLAN.id,
        notes: '',
      } as any,
      REP
    );
    const result = await api.convertLeadToMember(lead.id, { planId: PLAN.id, payment: { brand: 'Visa', last4: '1111' } }, REP);
    expect(result.enrollmentFeeCents).toBe(0);
    expect(result.campaign?.id).toBe('camp-fall-2026');
    const leads = await api.listLeads(REP);
    const won = leads.find((l) => l.id === lead.id)!;
    expect(won.status).toBe('won');
    expect(won.convertedMemberId).toBe(result.member.id);
  });
});

describe('computeRepKpis', () => {
  it('counts contacts, calls, and conversions inside the period for one rep', () => {
    const today = '2026-09-14';
    const base = { memberId: 'm', notes: '', staffName: 'R' };
    const kpis = computeRepKpis({
      staffId: REP,
      period: 'today',
      today,
      contacts: [
        { ...base, id: '1', staffId: REP, channel: 'call', purpose: 'billing', outcome: 'card_updated', createdAt: `${today}T10:00:00` },
        { ...base, id: '2', staffId: REP, channel: 'in_person', purpose: 'sales', outcome: 'sold', createdAt: `${today}T11:00:00` },
        { ...base, id: '3', staffId: 'someone-else', channel: 'call', purpose: 'general', outcome: 'resolved', createdAt: `${today}T12:00:00` },
        { ...base, id: '4', staffId: REP, channel: 'call', purpose: 'general', outcome: 'resolved', createdAt: '2026-09-01T12:00:00' },
      ] as any,
      arrivals: [
        { id: 'a1', memberId: 'm', date: today, at: `${today}T09:00:00`, source: 'desk', checkedInByStaffId: REP, notifiedStaffIds: [] },
        { id: 'a2', memberId: 'n', date: today, at: `${today}T09:30:00`, source: 'desk', checkedInByStaffId: 'someone-else', notifiedStaffIds: [] },
      ] as any,
      leads: [],
    });
    expect(kpis.checkIns).toBe(1);
    expect(kpis.contacts).toBe(2);
    expect(kpis.calls).toBe(1);
    expect(kpis.membershipsSold).toBe(1);
  });
});
