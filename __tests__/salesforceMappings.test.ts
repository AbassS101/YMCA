import { buildExport, EXPORT_DEFS, exportsForScopes, type ExportData, type ExportKey } from '@/export/salesforceMappings';
import type { ChildWatchStats } from '@/domain/stats/childWatchStats';
import type { ChildWatchIncident, ChildWatchVisit } from '@/domain/types';
import type { ChildWatchRaw } from '@/repositories/statsRepo';

const range = { from: '2026-06-01', to: '2026-06-02' };

const visit = {
  id: 'v1',
  childId: 'c1',
  memberId: 'h1',
  signedInAt: new Date(2026, 5, 1, 9).toISOString(),
  signedOutAt: new Date(2026, 5, 1, 10).toISOString(),
  signedInBy: 's1',
  pickupCode: 'PICKCODE-4821',
  pickupCodeHash: 'HASHVALUE-9f8e7d',
  verification: 'code',
  dropOffNotes: 'NOTE-peanut-allergy-secret',
  emergencyPhone: '555-0199-EMERGENCY',
  pickedUpByName: 'GUARDIANNAME Zed',
} as ChildWatchVisit;

const incident = {
  id: 'i1',
  childId: 'c1',
  householdId: 'h1',
  type: 'injury',
  severity: 'low',
  description: 'DESCRIPTION-secret-text',
  actionTaken: 'ACTIONTAKEN-secret-text',
  reportedByStaffId: 's1',
  at: new Date(2026, 5, 1, 9, 30).toISOString(),
  status: 'open',
  reviewNote: 'REVIEWNOTE-secret',
} as ChildWatchIncident;

const cwRaw: ChildWatchRaw = {
  visits: [visit],
  incidents: [incident],
  headcounts: [],
  shifts: [{ id: 'sh1', staffId: 's1', date: '2026-06-01', start: '09:00', end: '11:00' }],
  children: [{ id: 'c1', birthDate: '2022-01-01' }],
  pendingPickups: [],
};

const data: ExportData = {
  childWatch: {
    raw: cwRaw,
    stats: {
      visitsPerDay: [{ date: '2026-06-01', visits: 1 }],
      peakOccupancy: 1,
      overLimitStays: 0,
      ratioViolationMinutes: 0,
    } as unknown as ChildWatchStats,
  },
};

const FORBIDDEN = [
  'PICKCODE-4821',
  'HASHVALUE-9f8e7d',
  'NOTE-peanut-allergy-secret',
  '555-0199-EMERGENCY',
  'GUARDIANNAME',
  'DESCRIPTION-secret-text',
  'ACTIONTAKEN-secret-text',
  'REVIEWNOTE-secret',
];

describe('Child Watch exports', () => {
  for (const key of ['childWatchVisits', 'childWatchIncidents', 'childWatchDaily'] as ExportKey[]) {
    it(`${key} contains no names, codes, phones or free text`, () => {
      const { csv, rowCount } = buildExport(key, data, range);
      expect(rowCount).toBeGreaterThan(0);
      for (const secret of FORBIDDEN) expect(csv).not.toContain(secret);
    });
  }

  it('identifies children and households by id only', () => {
    const { csv } = buildExport('childWatchVisits', data, range);
    expect(csv).toContain('v1');
    expect(csv).toContain('c1');
    expect(csv).toContain('h1');
  });

  it('builds filenames from key and range', () => {
    expect(buildExport('childWatchVisits', data, range).filename).toBe('ymca-silver-spring_childWatchVisits_2026-06-01_2026-06-02.csv');
  });

  it('never marks Child Watch exports as PII', () => {
    expect(EXPORT_DEFS.childWatchVisits.containsPII).toBe(false);
    expect(EXPORT_DEFS.contacts.containsPII).toBe(true);
  });
});

describe('exportsForScopes', () => {
  it('keeps member exports out of the Child Watch scope', () => {
    const keys = exportsForScopes(['childWatch']);
    expect(keys).toEqual(['childWatchVisits', 'childWatchIncidents', 'childWatchDaily']);
    expect(keys).not.toContain('contacts');
  });

  it('gives branch and membership the member exports', () => {
    expect(exportsForScopes(['branch'])).toEqual(expect.arrayContaining(['contacts', 'leads', 'donations', 'dailyStats']));
    expect(exportsForScopes(['membership'])).toEqual(expect.arrayContaining(['contacts', 'monthlyRetention', 'departmentDaily']));
  });

  it('gives admins every export and nobody nothing', () => {
    expect(exportsForScopes(['branch', 'childWatch', 'aquatics', 'wellness', 'membership'])).toHaveLength(Object.keys(EXPORT_DEFS).length);
    expect(exportsForScopes([])).toEqual([]);
  });
});
