import { buildBranchStats } from '@/domain/stats/branchStats';
import type { ArrivalRecord, Membership } from '@/domain/types';
import type { BranchRaw } from '@/repositories/statsRepo';

const range = { from: '2026-06-01', to: '2026-06-03' };
const today = '2026-06-03';

function raw(over: Partial<BranchRaw> = {}): BranchRaw {
  return {
    members: [],
    memberships: [],
    arrivals: [],
    cancels: [],
    leads: [],
    donations: [],
    billingIssues: [],
    childWatchVisitCount: 0,
    ...over,
  };
}

function arrival(id: string, memberId: string, date: string, hour = 9): ArrivalRecord {
  return { id, memberId, date, at: new Date(2026, 5, Number(date.slice(8)), hour).toISOString(), source: 'desk', notifiedStaffIds: [] };
}

function ms(memberId: string, over: Partial<Membership> = {}): Membership {
  return {
    memberId,
    rateName: 'Individual',
    monthlyAmountCents: 5000,
    nextBillingDate: '2026-07-01',
    paymentBrand: 'visa',
    paymentLast4: '4242',
    joinedDate: '2025-01-01',
    ...over,
  };
}

describe('buildBranchStats', () => {
  it('returns zeros, not NaN, for empty input', () => {
    const s = buildBranchStats(raw(), range, today);
    expect(s.activeMembers).toBe(0);
    expect(s.avgDailyVisitors).toBe(0);
    expect(s.avgVisitsPerActiveMember).toBe(0);
    expect(s.leadConversionPct).toBe(0);
    expect(s.peakDay).toBeNull();
    expect(s.mrrCents).toBe(0);
    expect(s.dailyVisitors).toHaveLength(3);
    expect(s.visitsByHour).toHaveLength(24);
    expect(s.visitsByWeekday).toHaveLength(7);
  });

  it('counts distinct visitors per day', () => {
    const s = buildBranchStats(
      raw({
        arrivals: [arrival('a1', 'm1', '2026-06-01'), arrival('a2', 'm1', '2026-06-01', 17), arrival('a3', 'm2', '2026-06-01'), arrival('a4', 'm1', '2026-06-02')],
      }),
      range,
      today
    );
    expect(s.dailyVisitors).toEqual([
      { date: '2026-06-01', value: 2 },
      { date: '2026-06-02', value: 1 },
      { date: '2026-06-03', value: 0 },
    ]);
    expect(s.peakDay).toEqual({ date: '2026-06-01', value: 2 });
    expect(s.visitsByHour[9]).toBe(3);
    expect(s.visitsByHour[17]).toBe(1);
  });

  it('ignores arrivals outside the range', () => {
    const s = buildBranchStats(raw({ arrivals: [arrival('a1', 'm1', '2026-05-30')] }), range, today);
    expect(s.dailyVisitors.every((d) => d.value === 0)).toBe(true);
  });

  it('excludes guest passes from members, MRR and growth', () => {
    const s = buildBranchStats(
      raw({
        memberships: [ms('m1', { joinedDate: '2026-06-02' }), ms('g1', { rateName: '1-Day Guest Pass', joinedDate: '2026-06-02', monthlyAmountCents: 1000 })],
      }),
      range,
      today
    );
    expect(s.activeMembers).toBe(1);
    expect(s.mrrCents).toBe(5000);
    expect(s.newJoins).toBe(1);
  });

  it('flags active members with no recent arrivals as at risk', () => {
    const s = buildBranchStats(
      raw({ memberships: [ms('m1'), ms('m2')], arrivals: [arrival('a1', 'm1', '2026-06-02')] }),
      range,
      today
    );
    expect(s.atRiskMembers).toBe(1);
  });

  it('computes net growth and lead conversion', () => {
    const lead = (id: string, status: 'won' | 'new') =>
      ({ id, name: id, phone: '', email: '', source: 'walk_in', status, notes: '', createdAt: '', updatedAt: '' }) as BranchRaw['leads'][number];
    const s = buildBranchStats(
      raw({
        memberships: [ms('m1', { joinedDate: '2026-06-01' }), ms('m2', { cancelEffectiveDate: '2026-06-02', status: 'cancelled' })],
        leads: [lead('l1', 'won'), lead('l2', 'new')],
      }),
      range,
      today
    );
    expect(s.newJoins).toBe(1);
    expect(s.cancellations).toBe(1);
    expect(s.netGrowth).toBe(0);
    expect(s.leadConversionPct).toBe(50);
  });
});
