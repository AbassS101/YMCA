import { cohortRetention, isActiveOn, monthlyRetention, monthsInRange, pct } from '@/domain/stats/retention';
import type { Membership } from '@/domain/types';

function ms(over: Partial<Membership> = {}): Membership {
  return {
    memberId: 'm1',
    rateName: 'Individual',
    monthlyAmountCents: 5000,
    nextBillingDate: '2026-07-01',
    paymentBrand: 'visa',
    paymentLast4: '4242',
    ...over,
  };
}

describe('isActiveOn', () => {
  it('is active on the join day and not before', () => {
    const m = ms({ joinedDate: '2026-03-10' });
    expect(isActiveOn(m, '2026-03-09')).toBe(false);
    expect(isActiveOn(m, '2026-03-10')).toBe(true);
  });

  it('is inactive on the cancel effective day', () => {
    const m = ms({ joinedDate: '2026-01-01', cancelEffectiveDate: '2026-03-10' });
    expect(isActiveOn(m, '2026-03-09')).toBe(true);
    expect(isActiveOn(m, '2026-03-10')).toBe(false);
  });
});

describe('monthlyRetention', () => {
  it('returns 0% with no NaN for an empty month', () => {
    const [row] = monthlyRetention([], ['2026-02']);
    expect(row).toMatchObject({ startActive: 0, retained: 0, retentionPct: 0, churnPct: 0, newJoins: 0 });
    expect(Number.isNaN(row.retentionPct)).toBe(false);
  });

  it('counts retained, churned and new joins', () => {
    const rows = monthlyRetention(
      [
        ms({ memberId: 'a', joinedDate: '2025-01-01' }),
        ms({ memberId: 'b', joinedDate: '2025-01-01', cancelEffectiveDate: '2026-02-15' }),
        ms({ memberId: 'c', joinedDate: '2026-02-10' }),
      ],
      ['2026-02']
    );
    expect(rows[0]).toMatchObject({ startActive: 2, endActive: 2, retained: 1, churned: 1, retentionPct: 50, churnPct: 50, newJoins: 1 });
  });

  it('excludes guest passes', () => {
    const rows = monthlyRetention([ms({ rateName: '1-Day Guest Pass', joinedDate: '2025-01-01' })], ['2026-02']);
    expect(rows[0].startActive).toBe(0);
  });
});

describe('cohortRetention', () => {
  it('returns null milestones for an immature cohort', () => {
    const [row] = cohortRetention([ms({ joinedDate: '2026-05-10' })], '2026-05-20');
    expect(row).toMatchObject({ cohort: '2026-05', size: 1, d30Pct: null, d90Pct: null, d365Pct: null });
  });

  it('computes milestones once the cohort is old enough', () => {
    const rows = cohortRetention(
      [
        ms({ memberId: 'a', joinedDate: '2025-01-10' }),
        ms({ memberId: 'b', joinedDate: '2025-01-10', cancelEffectiveDate: '2025-01-20' }),
      ],
      '2026-06-01'
    );
    expect(rows[0]).toMatchObject({ size: 2, d30Pct: 50, d90Pct: 50, d365Pct: 50 });
  });

  it('skips memberships without a join date', () => {
    expect(cohortRetention([ms()], '2026-06-01')).toEqual([]);
  });
});

describe('helpers', () => {
  it('pct never divides by zero', () => {
    expect(pct(1, 0)).toBe(0);
    expect(pct(1, 3)).toBe(33.3);
  });

  it('monthsInRange spans year boundaries', () => {
    expect(monthsInRange('2025-11-15', '2026-01-02')).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});
