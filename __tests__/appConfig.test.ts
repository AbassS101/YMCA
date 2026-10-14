jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_CONFIG_SECTIONS,
  defaultAppConfig,
  normalizeAppConfig,
  type AppConfigSection,
} from '@/domain/appConfig';
import { DEFAULT_CHILD_WATCH_RULES, getStatusAt, validateSignIn } from '@/domain/childWatch';
import { canHoldSoloMembership, findPlan, validateHousehold } from '@/domain/householdAccess';
import { SWIM_CLASS_CAPACITY } from '@/domain/lessonPricing';
import { shiftSeedDates } from '@/domain/seedDateShift';
import { canEditConfigSection, type ConfigSection } from '@/domain/staffCapabilities';
import { YMCA_DONATION_TIERS, YMCA_MEMBERSHIP_PLANS } from '@/domain/types';
import { WELLNESS_TRAINING_PROGRAMS } from '@/domain/wellnessPrograms';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { configRepo } from '@/repositories/configRepo';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';

const api = new MockProtivityAdapter();
const IT = 'staff-itadmin';
const ADMIN = 'staff-admin';
const WELLNESS = 'staff-celine';
const AQUATICS = 'staff-alek';
const MEMBERSHIP = 'staff-desk';
const FRONT_DESK = 'staff-frontdesk';

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

describe('defaults', () => {
  it('match the existing constants', () => {
    const d = defaultAppConfig();
    expect(d.membershipPlans.map(({ active, ...p }) => p)).toEqual(YMCA_MEMBERSHIP_PLANS);
    expect(d.membershipPlans.every((p) => p.active)).toBe(true);
    expect(d.childWatch).toEqual(DEFAULT_CHILD_WATCH_RULES);
    expect(d.donations.tiers).toEqual(YMCA_DONATION_TIERS);
    expect(d.wellnessPackages).toEqual(WELLNESS_TRAINING_PROGRAMS);
    expect(d.swimClasses.capacity).toBe(SWIM_CLASS_CAPACITY);
    expect(d.guestPasses.complimentaryPassesPerYear).toBe(2);
  });

  it('are a fresh copy each call', () => {
    const d = defaultAppConfig();
    d.membershipPlans[0].monthlyAmountCents = 1;
    d.childWatch.hours[1][0].open = '01:00';
    expect(defaultAppConfig().membershipPlans[0].monthlyAmountCents).toBe(YMCA_MEMBERSHIP_PLANS[0].monthlyAmountCents);
    expect(DEFAULT_CHILD_WATCH_RULES.hours[1][0].open).toBe('09:00');
  });
});

describe('normalizeAppConfig', () => {
  it('returns the defaults for nothing', () => {
    expect(normalizeAppConfig(undefined)).toEqual(defaultAppConfig());
    expect(normalizeAppConfig(null)).toEqual(defaultAppConfig());
  });

  it('merges saved values over the defaults and ignores wrong-typed ones', () => {
    const merged = normalizeAppConfig({
      branding: { phone: '(301) 000-0000' },
      thresholds: { staleCancelDays: 'soon' as unknown as number },
      swimClasses: { overrides: { 'class-a': { capacity: 4 } } },
    });
    expect(merged.branding.phone).toBe('(301) 000-0000');
    expect(merged.branding.branchName).toBe(defaultAppConfig().branding.branchName);
    expect(merged.thresholds.staleCancelDays).toBe(7);
    expect(merged.swimClasses.overrides['class-a'].capacity).toBe(4);
    expect(merged.swimClasses.capacity).toBe(SWIM_CLASS_CAPACITY);
  });

  it('merges plans by id: edits win, missing defaults return, new plans are kept', () => {
    const merged = normalizeAppConfig({
      membershipPlans: [
        { id: 'adult', monthlyAmountCents: 9500 } as never,
        { ...defaultAppConfig().membershipPlans[0], id: 'summer', name: 'Summer' },
      ],
    });
    expect(merged.membershipPlans.find((p) => p.id === 'adult')?.monthlyAmountCents).toBe(9500);
    expect(merged.membershipPlans.find((p) => p.id === 'adult')?.name).toBe('Adult');
    expect(merged.membershipPlans.some((p) => p.id === 'youth')).toBe(true);
    expect(merged.membershipPlans.at(-1)?.id).toBe('summer');
  });
});

describe('domain functions take optional config', () => {
  it('findPlan, canHoldSoloMembership and validateHousehold default to the constants', () => {
    expect(findPlan('Adult')?.id).toBe('adult');
    expect(canHoldSoloMembership('1990-01-01', 'adult', '2026-10-14').ok).toBe(true);
    expect(validateHousehold('adult', [{ birthDate: '1990-01-01' }], '2026-10-14').ok).toBe(true);
  });

  it('use a supplied plan list, including legacy names', () => {
    const plans = [{ ...defaultAppConfig().membershipPlans[2], id: 'standard', name: 'Standard', legacyNames: ['Adult'] }];
    expect(findPlan('Adult', plans)?.id).toBe('standard');
    expect(findPlan('youth', plans)).toBeUndefined();
    expect(canHoldSoloMembership('1990-01-01', 'youth', '2026-10-14', plans)).toEqual({
      ok: false,
      reason: 'Unknown membership plan.',
    });
    expect(validateHousehold('youth', [{ birthDate: '1990-01-01' }], '2026-10-14', plans).ok).toBe(false);
  });

  it('childWatch status and sign-in follow supplied rules', () => {
    const monday10 = new Date('2026-10-12T10:00:00');
    expect(getStatusAt(monday10).state).toBe('open');
    const closedMondays = {
      ...DEFAULT_CHILD_WATCH_RULES,
      hours: DEFAULT_CHILD_WATCH_RULES.hours.map((d, i) => (i === 1 ? [] : d)),
    };
    expect(getStatusAt(monday10, closedMondays).state).toBe('closed');
    const child = { id: 'c', firstName: 'Kid', birthDate: '2024-01-01' } as never;
    const check = validateSignIn(
      { now: monday10, child, visits: [], parentCheckedInAtDesk: true },
      { ...DEFAULT_CHILD_WATCH_RULES, roomCapacity: 0 }
    );
    expect(check).toEqual({ ok: false, reason: 'Child Watch is at capacity right now.' });
  });
});

describe('role gating per section', () => {
  const allow = (role: string | undefined, section: ConfigSection) => canEditConfigSection(role, section);
  const ALL_SECTIONS = [...APP_CONFIG_SECTIONS, 'lessonPricing', 'campaigns'] as ConfigSection[];

  it('IT edits every section', () => {
    for (const s of ALL_SECTIONS) expect(allow('it_admin', s)).toBe(true);
  });

  it('Staff Admin edits business sections but not system ones', () => {
    expect(allow('staff_admin', 'membershipPlans')).toBe(true);
    expect(allow('admin', 'childWatch')).toBe(true);
    expect(allow('staff_admin', 'campaigns')).toBe(true);
    for (const s of ['branding', 'thresholds', 'featureToggles'] as ConfigSection[]) {
      expect(allow('staff_admin', s)).toBe(false);
    }
  });

  it('directors edit only their own section', () => {
    expect(allow('membership_director', 'campaigns')).toBe(true);
    expect(allow('membership_director', 'membershipPlans')).toBe(false);
    expect(allow('aquatics_director', 'swimClasses')).toBe(true);
    expect(allow('aquatics_director', 'lessonPricing')).toBe(true);
    expect(allow('aquatics_director', 'campaigns')).toBe(false);
    expect(allow('wellness_director', 'wellnessPackages')).toBe(true);
    expect(allow('wellness_director', 'membershipPlans')).toBe(false);
    expect(allow('wellness_director', 'branding')).toBe(false);
  });

  it('nobody else edits anything', () => {
    for (const role of ['trainer', 'swim_instructor', 'desk', 'staff', 'member', 'guest', undefined]) {
      for (const s of ALL_SECTIONS) expect(allow(role, s)).toBe(false);
    }
  });
});

describe('updateAppConfig', () => {
  it('lets Staff Admin change a plan price and keeps existing member rates', async () => {
    const before = await loadStore();
    const jordan = before.memberships.find((m) => m.memberId === 'member-jordan')!;
    const plans = (await configRepo.get(api)).membershipPlans.map((p) =>
      p.id === 'family-2' ? { ...p, monthlyAmountCents: 12900 } : p
    );
    const next = await configRepo.update(api, 'membershipPlans', plans, ADMIN);
    expect(next.membershipPlans.find((p) => p.id === 'family-2')?.monthlyAmountCents).toBe(12900);
    expect((await configRepo.get(api)).membershipPlans.find((p) => p.id === 'family-2')?.monthlyAmountCents).toBe(12900);
    const after = await loadStore();
    expect(after.memberships.find((m) => m.memberId === 'member-jordan')?.monthlyAmountCents).toBe(
      jordan.monthlyAmountCents
    );
  });

  it('merges object sections key by key', async () => {
    const next = await api.updateAppConfig('guestPasses', { dayPassAdultCents: 2000 }, ADMIN);
    expect(next.guestPasses.dayPassAdultCents).toBe(2000);
    expect(next.guestPasses.dayPassYouthSeniorCents).toBe(1000);
  });

  it('requires a requester, even where other calls skip the check', async () => {
    const patch = { dayPassAdultCents: 1 };
    await expect(api.updateAppConfig('guestPasses', patch, undefined as unknown as string)).rejects.toThrow(
      /Sign in as staff/
    );
    await expect(api.resetAppConfigSection('guestPasses', '')).rejects.toThrow(/Sign in as staff/);
    await expect(api.listConfigAudit(undefined as unknown as string)).rejects.toThrow(/Sign in as staff/);
    await expect(api.updateAppConfig('guestPasses', patch, 'nobody')).rejects.toThrow(/not permitted/);
    await expect(api.updateAppConfig('guestPasses', patch, 'member-jordan')).rejects.toThrow(/not permitted/);
  });

  it('gates sections by role', async () => {
    const phone = { phone: '(301) 111-1111' };
    await expect(api.updateAppConfig('branding', phone, ADMIN)).rejects.toThrow(/not permitted/);
    await expect(api.updateAppConfig('branding', phone, IT)).resolves.toBeDefined();
    await expect(api.updateAppConfig('guestPasses', { dayPassAdultCents: 1 }, WELLNESS)).rejects.toThrow(/not permitted/);
    await expect(api.updateAppConfig('guestPasses', { dayPassAdultCents: 1 }, FRONT_DESK)).rejects.toThrow(/not permitted/);
    await expect(api.updateAppConfig('swimClasses', { capacity: 10 }, AQUATICS)).resolves.toBeDefined();
    await expect(api.updateAppConfig('swimClasses', { capacity: 10 }, MEMBERSHIP)).rejects.toThrow(/not permitted/);
    const wellness = defaultAppConfig().wellnessPackages;
    await expect(api.updateAppConfig('wellnessPackages', wellness, WELLNESS)).resolves.toBeDefined();
    await expect(api.updateAppConfig('wellnessPackages', wellness, AQUATICS)).rejects.toThrow(/not permitted/);
  });

  it('validates input', async () => {
    const plans = defaultAppConfig().membershipPlans;
    const withPlan = (patch: object) => plans.map((p) => (p.id === 'adult' ? { ...p, ...patch } : p));
    await expect(api.updateAppConfig('membershipPlans', withPlan({ monthlyAmountCents: -1 }), IT)).rejects.toThrow(/prices/);
    await expect(api.updateAppConfig('membershipPlans', withPlan({ monthlyAmountCents: 89.5 }), IT)).rejects.toThrow(/prices/);
    await expect(api.updateAppConfig('membershipPlans', withPlan({ name: ' ' }), IT)).rejects.toThrow(/name/);
    await expect(api.updateAppConfig('membershipPlans', withPlan({ minAge: 30, maxAge: 20 }), IT)).rejects.toThrow(/age/);
    await expect(api.updateAppConfig('guestPasses', { dayPassAdultCents: -5 }, IT)).rejects.toThrow(/cents/);
    await expect(api.updateAppConfig('swimClasses', { capacity: 0 }, IT)).rejects.toThrow(/capacity/);
    await expect(api.updateAppConfig('thresholds', { fullClassRatio: 2 }, IT)).rejects.toThrow(/ratio/);
    await expect(api.updateAppConfig('branding', { phone: '' }, IT)).rejects.toThrow(/branding/);
    await expect(
      api.updateAppConfig('childWatch', { hours: [[], [{ open: '12:00', close: '09:00' }], [], [], [], [], []] }, IT)
    ).rejects.toThrow(/opening before closing/);
    await expect(api.updateAppConfig('lessonPricing' as AppConfigSection, {} as never, IT)).rejects.toThrow(/Unknown/);
  });

  it('keeps plan ids immutable and never deletes a plan', async () => {
    const plans = defaultAppConfig().membershipPlans;
    await expect(api.updateAppConfig('membershipPlans', plans.filter((p) => p.id !== 'adult'), IT)).rejects.toThrow(
      /inactive instead/
    );
    await expect(
      api.updateAppConfig('membershipPlans', plans.map((p) => (p.id === 'adult' ? { ...p, id: 'grown-up' } : p)), IT)
    ).rejects.toThrow(/inactive instead/);
    const retired = await api.updateAppConfig(
      'membershipPlans',
      plans.map((p) => (p.id === 'adult' ? { ...p, active: false } : p)),
      IT
    );
    expect(retired.membershipPlans.find((p) => p.id === 'adult')?.active).toBe(false);
    expect(retired.membershipPlans).toHaveLength(plans.length);
  });

  it('resets one section to its defaults', async () => {
    await api.updateAppConfig('guestPasses', { dayPassAdultCents: 2000 }, ADMIN);
    const next = await api.resetAppConfigSection('guestPasses', ADMIN);
    expect(next.guestPasses).toEqual(defaultAppConfig().guestPasses);
    await expect(api.resetAppConfigSection('thresholds', ADMIN)).rejects.toThrow(/not permitted/);
  });
});

describe('audit log', () => {
  it('records who changed what, newest first', async () => {
    await api.updateAppConfig('guestPasses', { dayPassAdultCents: 2000 }, ADMIN);
    await api.updateAppConfig('branding', { phone: '(301) 111-1111' }, IT);
    const log = await api.listConfigAudit(IT);
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ section: 'branding', byId: IT, byRole: 'it_admin' });
    expect(log[1]).toMatchObject({
      section: 'guestPasses',
      byId: ADMIN,
      summary: 'Updated guest passes: dayPassAdultCents',
    });
    expect((log[1].before as { dayPassAdultCents: number }).dayPassAdultCents).toBe(1500);
    expect((log[1].after as { dayPassAdultCents: number }).dayPassAdultCents).toBe(2000);
    expect(log[1].byName).toBeTruthy();
  });

  it('does not log failed or unchanged saves', async () => {
    await expect(api.updateAppConfig('guestPasses', { dayPassAdultCents: -1 }, ADMIN)).rejects.toThrow();
    await expect(api.updateAppConfig('branding', { phone: 'x' }, ADMIN)).rejects.toThrow();
    await api.updateAppConfig('guestPasses', { dayPassAdultCents: 1500 }, ADMIN);
    expect(await api.listConfigAudit(IT)).toHaveLength(0);
  });

  it('logs resets, lesson pricing and campaign changes', async () => {
    await api.updateAppConfig('guestPasses', { dayPassAdultCents: 2000 }, ADMIN);
    await api.resetAppConfigSection('guestPasses', ADMIN);
    await api.updateLessonPricing({ training: { 30: 4000, 60: 6000 } }, AQUATICS);
    const created = await api.saveCampaign(
      {
        name: 'Winter Deal',
        description: '',
        startDate: '2026-12-01',
        endDate: '2026-12-31',
        waiveEnrollmentFee: true,
        active: true,
      },
      MEMBERSHIP
    );
    await api.saveCampaign({ ...created, name: 'Winter Deal 2' }, MEMBERSHIP);
    await api.deleteCampaign(created.id, MEMBERSHIP);
    const log = await api.listConfigAudit(ADMIN);
    expect(log.map((e) => e.section)).toEqual([
      'campaigns',
      'campaigns',
      'campaigns',
      'lessonPricing',
      'guestPasses',
      'guestPasses',
    ]);
    expect(log[0].summary).toBe('Deleted campaign "Winter Deal 2"');
    expect(log[2].summary).toBe('Created campaign "Winter Deal"');
    expect(log[4].summary).toBe('Reset guest passes to defaults');
  });

  it('is only visible to roles with viewConfigAudit', async () => {
    await expect(api.listConfigAudit(AQUATICS)).rejects.toThrow(/not permitted/);
    await expect(api.listConfigAudit(WELLNESS)).rejects.toThrow(/not permitted/);
    await expect(api.listConfigAudit(FRONT_DESK)).rejects.toThrow(/not permitted/);
    await expect(api.listConfigAudit(ADMIN)).resolves.toEqual([]);
  });
});

describe('lesson pricing requester', () => {
  it('stays optional but is checked when given', async () => {
    const prices = (thirty: number) => ({ training: { 30: thirty, 60: 6000 } as const });
    await expect(api.updateLessonPricing(prices(4000))).resolves.toBeDefined();
    await expect(api.updateLessonPricing(prices(4100), IT)).resolves.toBeDefined();
    await expect(api.updateLessonPricing(prices(4200), MEMBERSHIP)).rejects.toThrow(/not permitted/);
    await expect(api.updateLessonPricing(prices(4200), 'member-jordan')).rejects.toThrow(/not permitted/);
    const log = await api.listConfigAudit(IT);
    expect(log.map((e) => e.byId)).toEqual([IT, 'system']);
  });
});

describe('storage', () => {
  it('seeds appConfig and an empty audit log', async () => {
    const state = await loadStore();
    expect(state.appConfig).toEqual(defaultAppConfig());
    expect(state.configAudit).toEqual([]);
  });

  it('migrates an old saved state without appConfig cleanly', async () => {
    const legacy = (await loadStore()) as unknown as Record<string, unknown>;
    delete legacy.appConfig;
    delete legacy.configAudit;
    await AsyncStorage.setItem('@ymca/demo-state', JSON.stringify(legacy));
    const migrated = await loadStore();
    expect(migrated.appConfig).toEqual(defaultAppConfig());
    expect(migrated.configAudit).toEqual([]);
    expect(migrated.members.length).toBeGreaterThan(0);
  });

  it('fills sections missing from a saved partial config', async () => {
    const state = await loadStore();
    await saveStore({ ...state, appConfig: { branding: { phone: '(301) 222-2222' } } as never });
    const migrated = await loadStore();
    expect(migrated.appConfig.branding.phone).toBe('(301) 222-2222');
    expect(migrated.appConfig.branding.branchName).toBe('YMCA Silver Spring');
    expect(migrated.appConfig.membershipPlans).toHaveLength(YMCA_MEMBERSHIP_PLANS.length);
  });

  it('does not shift appConfig or configAudit dates with the demo week', () => {
    const input = {
      campaignDate: '2026-10-01',
      appConfig: { note: '2026-10-01', nested: { at: '2026-10-01T09:00:00-04:00' } },
      configAudit: [{ at: '2026-10-01T09:00:00-04:00', before: { startDate: '2026-10-01' } }],
    };
    const shifted = shiftSeedDates(input, 2);
    expect(shifted.campaignDate).toBe('2026-10-15');
    expect(shifted.appConfig).toEqual(input.appConfig);
    expect(shifted.configAudit).toEqual(input.configAudit);
  });
});
