import type { ChildWatchRules } from '@/domain/childWatch';
import { buildChildWatchStats, hourlyForecast } from '@/domain/stats/childWatchStats';
import type { ChildWatchIncident, ChildWatchVisit } from '@/domain/types';
import type { ChildWatchRaw } from '@/repositories/statsRepo';

// 2026-06-01 is a Monday.
const at = (day: number, h: number, m = 0) => new Date(2026, 5, day, h, m).toISOString();

const hours: ChildWatchRules['hours'] = [[], [{ open: '09:00', close: '10:00' }], [], [], [], [], []];
const rules = {
  hours,
  maxMinutesPerDay: 120,
  roomCapacity: 10,
  ratios: [{ maxAgeMonths: 200, childrenPerStaff: 2 }],
} as unknown as ChildWatchRules;

function visit(id: string, childId: string, signedInAt: string, signedOutAt?: string): ChildWatchVisit {
  return { id, childId, memberId: 'h1', signedInAt, signedOutAt, signedInBy: 's1', pickupCode: '' };
}

function raw(over: Partial<ChildWatchRaw> = {}): ChildWatchRaw {
  return { visits: [], incidents: [], headcounts: [], shifts: [], children: [], pendingPickups: [], ...over };
}

const range = { from: '2026-06-01', to: '2026-06-01' };

describe('buildChildWatchStats', () => {
  it('returns zeros for empty input', () => {
    const s = buildChildWatchStats(raw(), rules, range);
    expect(s.uniqueChildren).toBe(0);
    expect(s.ratioViolationMinutes).toBe(0);
    expect(s.childrenPerStaffHour).toBe(0);
    expect(s.parentAckPct).toBe(0);
    expect(s.capacityUtilizationPct).toBe(0);
  });

  it('counts ratio violation minutes against fixed shifts', () => {
    const s = buildChildWatchStats(
      raw({
        visits: [visit('v1', 'c1', at(1, 9), at(1, 10)), visit('v2', 'c2', at(1, 9), at(1, 10))],
        shifts: [{ id: 'sh1', staffId: 's1', date: '2026-06-01', start: '09:00', end: '09:30' }],
      }),
      rules,
      range
    );
    // Two kids need one staff; coverage ends at 09:30, so 30 uncovered minutes remain.
    expect(s.ratioViolationMinutes).toBe(30);
    expect(s.staffHours).toBe(0.5);
    expect(s.uniqueChildren).toBe(2);
  });

  it('has no violations when staff cover the whole stay', () => {
    const s = buildChildWatchStats(
      raw({
        visits: [visit('v1', 'c1', at(1, 9), at(1, 10))],
        shifts: [{ id: 'sh1', staffId: 's1', date: '2026-06-01', start: '09:00', end: '10:00' }],
      }),
      rules,
      range
    );
    expect(s.ratioViolationMinutes).toBe(0);
  });

  it('reports parentAckPct as 0 when no parent was notified', () => {
    const incident = { id: 'i1', childId: 'c1', householdId: 'h1', type: 'injury', severity: 'low', at: at(1, 9, 30), status: 'open' } as ChildWatchIncident;
    const s = buildChildWatchStats(raw({ incidents: [incident] }), rules, range);
    expect(s.parentAckPct).toBe(0);
    expect(s.incidentsBySeverity).toEqual({ low: 1, medium: 0, high: 0 });
  });

  it('computes parentAckPct from notified incidents', () => {
    const base = { childId: 'c1', householdId: 'h1', type: 'injury', severity: 'low', at: at(1, 9, 30), status: 'open' };
    const s = buildChildWatchStats(
      raw({
        incidents: [
          { ...base, id: 'i1', parentNotifiedAt: at(1, 9, 31), parentAcknowledgedAt: at(1, 9, 40) },
          { ...base, id: 'i2', parentNotifiedAt: at(1, 9, 31) },
        ] as ChildWatchIncident[],
      }),
      rules,
      range
    );
    expect(s.parentAckPct).toBe(50);
  });
});

describe('hourlyForecast', () => {
  const ratios = rules.ratios;
  const today = '2026-06-08'; // Monday; prior Mondays are 06-01, 05-25, 05-18, 05-11

  it('averages over the last four same weekdays', () => {
    const visits = [
      visit('v1', 'c1', new Date(2026, 5, 1, 10).toISOString(), new Date(2026, 5, 1, 11).toISOString()),
      visit('v2', 'c1', new Date(2026, 4, 25, 10).toISOString(), new Date(2026, 4, 25, 11).toISOString()),
    ];
    const f = hourlyForecast(visits, new Map(), ratios, 1, today);
    expect(f).toHaveLength(24);
    expect(f[10]).toEqual({ hour: 10, expectedKids: 0.5, staffNeeded: 1 });
    expect(f[3]).toEqual({ hour: 3, expectedKids: 0, staffNeeded: 0 });
  });

  it('ignores visits on other weekdays', () => {
    const tuesday = visit('v1', 'c1', new Date(2026, 5, 2, 10).toISOString(), new Date(2026, 5, 2, 11).toISOString());
    expect(hourlyForecast([tuesday], new Map(), ratios, 1, today)[10].expectedKids).toBe(0);
  });
});
