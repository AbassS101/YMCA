jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultAppConfig, fillTemplate, swimClassCapacity } from '@/domain/appConfig';
import { AQUATICS_CLASSES } from '@/domain/aquaticsGuideData';
import { welcomeCallScript } from '@/domain/callScripts';
import {
  childWatchAgesLine,
  childWatchCutoffLine,
  childWatchIntro,
  describeHoursLines,
  formatLimit,
} from '@/domain/childWatch';
import { getDemoToday } from '@/domain/demoClock';
import { deskAlertsFor } from '@/domain/deskAlerts';
import { canHoldSoloMembership, findPlan, validateHousehold } from '@/domain/householdAccess';
import type { Member, Membership } from '@/domain/types';
import {
  formatWellnessPrice,
  largestWellnessSavings,
  lowestWellnessRate,
  wellnessRateHighlights,
} from '@/domain/wellnessPrograms';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { childWatchRepo } from '@/repositories/childWatchRepo';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';

const api = new MockProtivityAdapter();
const IT = 'staff-itadmin';
const ADMIN = 'staff-admin';

const buyer = (planId: string, over: Partial<Parameters<typeof api.buyMembership>[0]> = {}) => ({
  name: 'New Person',
  email: `new-${planId}-${Math.random().toString(36).slice(2, 7)}@example.com`,
  phone: '(301) 555-0100',
  address: '1 Main St',
  planId,
  payment: { brand: 'Visa', last4: '4242' },
  birthDate: '1990-01-01',
  ...over,
});

async function editPlans(patch: (p: ReturnType<typeof defaultAppConfig>['membershipPlans'][number]) => object) {
  const plans = (await api.getAppConfig()).membershipPlans.map((p) => ({ ...p, ...patch(p) }));
  return api.updateAppConfig('membershipPlans', plans, ADMIN);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

describe('membership plans read from config', () => {
  it('gives new signups the edited price while existing members keep theirs', async () => {
    const before = await loadStore();
    const existing = before.memberships.filter((m) => m.rateName === 'Adult');
    expect(existing.length).toBeGreaterThan(0);
    const jordanCents = before.memberships.find((m) => m.memberId === 'member-jordan')!.monthlyAmountCents;

    await editPlans((p) => (p.id === 'adult' || p.id === 'family-2' ? { monthlyAmountCents: 9900 } : {}));

    const bought = await api.buyMembership(buyer('adult'));
    expect(bought.membership.monthlyAmountCents).toBe(9900);
    const created = await api.createMemberAdmin({
      name: 'Walk In',
      email: 'walkin@example.com',
      phone: '1',
      planId: 'Adult',
    });
    expect(created.membership.monthlyAmountCents).toBe(9900);

    const after = await loadStore();
    for (const m of existing) {
      expect(after.memberships.find((x) => x.memberId === m.memberId)?.monthlyAmountCents).toBe(m.monthlyAmountCents);
    }
    expect(after.memberships.find((m) => m.memberId === 'member-jordan')?.monthlyAmountCents).toBe(jordanCents);
  });

  it('does not let an inactive plan be bought, but still resolves it for existing members', async () => {
    await editPlans((p) => (p.id === 'adult' || p.id === 'family-2' ? { active: false } : {}));

    await expect(api.buyMembership(buyer('adult'))).rejects.toThrow(/no longer offered/);
    await expect(api.buyMembership(buyer('Adult'))).rejects.toThrow(/no longer offered/);
    await expect(
      api.createMemberAdmin({ name: 'Walk In', email: 'walkin2@example.com', phone: '1', planId: 'adult' })
    ).rejects.toThrow(/no longer offered/);
    await expect(api.buyMembership(buyer('young-adult', { birthDate: '2006-01-01' }))).resolves.toBeDefined();

    // Jordan is on Family II (now retired): the plan still resolves, so household rules still apply.
    const teen = await api.addHouseholdMember('member-jordan', { name: 'Kai Doe', birthDate: '2010-02-02' });
    expect(teen.type).toBe('Family II');
    await expect(
      api.addHouseholdMember('member-jordan', { name: 'Third Adult', birthDate: '1970-01-01' })
    ).rejects.toThrow(/adults/);
    const plans = (await api.getAppConfig()).membershipPlans;
    expect(findPlan('Family II', plans)).toMatchObject({ id: 'family-2', active: false });
  });

  it('does not let members or staff switch onto an inactive plan, unless already on it', async () => {
    const state = await loadStore();
    const adultMember = state.memberships.find((m) => m.rateName === 'Adult')!;
    await editPlans((p) => (p.id === 'adult' || p.id === 'senior-adult' ? { active: false } : {}));

    await expect(api.changeMembership('member-jordan-spouse', 'Adult', 8900)).rejects.toThrow(/primary/);
    await expect(api.scheduleMembershipChange('member-jordan', 'Adult', 8900, '2026-10-20')).rejects.toThrow(
      /no longer offered/
    );
    await expect(api.changeMembership(adultMember.memberId, 'Adult', adultMember.monthlyAmountCents, ADMIN)).resolves.toBeDefined();
    await expect(api.changeMembership(adultMember.memberId, 'Youth', 3000, ADMIN)).resolves.toBeDefined();
    await expect(api.changeMembership(adultMember.memberId, 'Adult', 8900, ADMIN)).rejects.toThrow(/no longer offered/);
  });

  it('finds plans by id, then name, then legacy name', async () => {
    const plans = (await api.getAppConfig()).membershipPlans.map((p) =>
      p.id === 'adult' ? { ...p, legacyNames: ['Grown Up'] } : p
    );
    await api.updateAppConfig('membershipPlans', plans, ADMIN);
    const cfg = (await api.getAppConfig()).membershipPlans;
    expect(findPlan('adult', cfg)?.id).toBe('adult');
    expect(findPlan('ADULT', cfg)?.id).toBe('adult');
    expect(findPlan('grown up', cfg)?.id).toBe('adult');
    expect(findPlan('Nope', cfg)).toBeUndefined();
  });

  it('enforces a plan minimum and maximum age on top of the built-in rules', async () => {
    const base = defaultAppConfig().membershipPlans;
    const plans = base.map((p) => (p.id === 'adult' ? { ...p, minAge: 30, maxAge: 40 } : p));
    const today = '2026-09-14';
    expect(canHoldSoloMembership('1990-01-01', 'adult', today, plans).ok).toBe(true); // 36
    const young = canHoldSoloMembership('2001-01-01', 'adult', today, plans); // 25: fine for the built-in 23-64 rule
    expect(young).toEqual({ ok: false, reason: 'Adult is for ages 30 to 40.' });
    expect(canHoldSoloMembership('2001-01-01', 'adult', today, base).ok).toBe(true);
    expect(canHoldSoloMembership('1970-01-01', 'adult', today, plans).ok).toBe(false); // 56
    // The built-in rule still applies as well.
    expect(canHoldSoloMembership('2011-05-05', 'adult', today, plans).ok).toBe(false);
    // Only one limit set.
    const minOnly = base.map((p) => (p.id === 'adult' ? { ...p, minAge: 30 } : p));
    expect(canHoldSoloMembership('2001-01-01', 'adult', today, minOnly)).toEqual({
      ok: false,
      reason: 'Adult is for ages 30 and up.',
    });
    const maxOnly = base.map((p) => (p.id === 'adult' ? { ...p, maxAge: 30 } : p));
    expect(canHoldSoloMembership('1970-01-01', 'adult', today, maxOnly)).toEqual({
      ok: false,
      reason: 'Adult is for ages 30 and under.',
    });
    // Single-person validation and family adults honour the limits too.
    expect(validateHousehold('adult', [{ birthDate: '2001-01-01' }], today, plans).ok).toBe(false);
    const familyPlans = base.map((p) => (p.id === 'family-1' ? { ...p, minAge: 30 } : p));
    expect(validateHousehold('family-1', [{ birthDate: '1990-01-01' }, { birthDate: '2015-01-01' }], today, familyPlans).ok).toBe(true);
    expect(validateHousehold('family-1', [{ birthDate: '2001-01-01' }, { birthDate: '2015-01-01' }], today, familyPlans).ok).toBe(false);
  });

  it('applies the plan age limits when buying', async () => {
    await editPlans((p) => (p.id === 'adult' ? { minAge: 30 } : {}));
    await expect(api.buyMembership(buyer('adult', { birthDate: '2001-01-01' }))).rejects.toThrow(/ages 30 and up/);
    await expect(api.buyMembership(buyer('adult', { birthDate: '1990-01-01' }))).resolves.toBeDefined();
  });
});

describe('Child Watch reads its rules from config', () => {
  const at3am = () => new Date(`${getDemoToday()}T03:00:00`);
  const allDay = Array.from({ length: 7 }, () => [{ open: '00:00', close: '23:59' }]);

  it('uses the configured hours', async () => {
    await expect(childWatchRepo.signIn('child-jordan-1', 'member-jordan', at3am())).rejects.toThrow(/closed/);
    await api.updateAppConfig('childWatch', { hours: allDay }, ADMIN);
    const visit = await childWatchRepo.signIn('child-jordan-1', 'member-jordan', at3am());
    expect(visit.childId).toBe('child-jordan-1');
  });

  it('uses the configured sign-in cutoff, minimum age and room capacity', async () => {
    await api.updateAppConfig('childWatch', { hours: allDay, signInCutoffMin: 2000 }, ADMIN);
    await expect(childWatchRepo.signIn('child-jordan-1', 'member-jordan', at3am())).rejects.toThrow(/2000 minutes/);

    await api.updateAppConfig('childWatch', { signInCutoffMin: 0, minAgeWeeks: 5000 }, ADMIN);
    await expect(childWatchRepo.signIn('child-jordan-1', 'member-jordan', at3am())).rejects.toThrow(/5000 weeks/);

    // The demo store tops up live Child Watch visits for the current time of day; start with an empty room.
    const state = await loadStore();
    await saveStore({ ...state, childWatchVisits: [] });
    await api.updateAppConfig('childWatch', { minAgeWeeks: 6 }, ADMIN);
    await childWatchRepo.signIn('child-jordan-1', 'member-jordan', at3am());
    await api.updateAppConfig('childWatch', { roomCapacity: 1 }, ADMIN);
    await expect(childWatchRepo.signIn('child-jordan-2', 'member-jordan', at3am())).rejects.toThrow(/capacity/);
  });

  it('uses the configured daily limit', async () => {
    await api.updateAppConfig('childWatch', { hours: allDay, maxMinutesPerDay: 30 }, ADMIN);
    const visit = await childWatchRepo.signIn('child-jordan-1', 'member-jordan', at3am());
    await childWatchRepo.signOut(visit.id, 'member-jordan', { now: new Date(at3am().getTime() + 45 * 60000) });
    const again = new Date(at3am().getTime() + 60 * 60000);
    await expect(childWatchRepo.signIn('child-jordan-1', 'member-jordan', again)).rejects.toThrow(/maximum of 30 minutes/);
  });

  it('builds the member info text from the rules', () => {
    const rules = defaultAppConfig().childWatch;
    expect(describeHoursLines(rules.hours)).toEqual([
      { text: 'Monday – Friday: 9 am-12 pm, 4 pm-8 pm', closed: false },
      { text: 'Saturday – 9 am-12 pm', closed: false },
      { text: 'Sunday – Closed', closed: true },
    ]);
    expect(childWatchAgesLine(rules)).toBe('CHILD WATCH: (6 weeks and up)');
    expect(childWatchCutoffLine(rules)).toBe('Sign in cut off is 30 minutes prior to closing time.');
    expect(childWatchIntro(rules)).toContain('a maximum of 2 hours per day.');
    expect(childWatchIntro({ ...rules, maxMinutesPerDay: 90, intro: 'Up to {maxTime}.' })).toBe('Up to 90 minutes.');
    expect(formatLimit(60)).toBe('1 hour');
    const split = rules.hours.map((d, i) => (i === 3 ? [{ open: '10:30', close: '13:00' }] : d));
    expect(describeHoursLines(split).map((l) => l.text)).toEqual([
      'Monday – Tuesday: 9 am-12 pm, 4 pm-8 pm',
      'Wednesday – 10:30 am-1 pm',
      'Thursday – Friday: 9 am-12 pm, 4 pm-8 pm',
      'Saturday – 9 am-12 pm',
      'Sunday – Closed',
    ]);
  });

  it('stores and validates the info and contact fields', async () => {
    const saved = await api.updateAppConfig('childWatch', { contactEmail: 'cw@example.org', contactText: 'Ask: ' }, ADMIN);
    expect(saved.childWatch.contactEmail).toBe('cw@example.org');
    await expect(api.updateAppConfig('childWatch', { contactEmail: 'nope' }, ADMIN)).rejects.toThrow(/email/);
    await expect(api.updateAppConfig('childWatch', { intro: ' ' }, ADMIN)).rejects.toThrow(/introduction/);
    const cleared = await api.updateAppConfig('childWatch', { contactEmail: '', contactText: '' }, ADMIN);
    expect(cleared.childWatch.contactEmail).toBe('');
  });
});

describe('feature toggles block the matching actions', () => {
  const donation = {
    memberId: 'member-jordan',
    donorName: 'Jordan Hale',
    donorEmail: 'jordan@example.com',
    amountCents: 2500,
    frequency: 'one-time' as const,
    designation: 'Aquatics',
    paymentBrand: 'Visa',
    paymentLast4: '4242',
  };

  it('donations', async () => {
    await expect(api.createDonation(donation)).resolves.toBeDefined();
    await api.updateAppConfig('featureToggles', { donations: false }, IT);
    await expect(api.createDonation(donation)).rejects.toThrow(/Donations: this feature is turned off/);
    // The monthly add-on when joining is a donation too.
    await expect(api.buyMembership(buyer('adult', { donationCents: 500 }))).rejects.toThrow(/turned off/);
    await expect(api.buyMembership(buyer('adult'))).resolves.toBeDefined();
    await api.updateAppConfig('featureToggles', { donations: true }, IT);
    await expect(api.createDonation(donation)).resolves.toBeDefined();
  });

  it('swim class enrollment', async () => {
    await api.updateAppConfig('featureToggles', { swimClassEnrollment: false }, IT);
    await expect(api.enrollInSwimClass('member-jordan', 'class-sat-04')).rejects.toThrow(/turned off/);
    await api.updateAppConfig('featureToggles', { swimClassEnrollment: true }, IT);
    await expect(api.enrollInSwimClass('member-jordan', 'class-sat-04')).resolves.toBeDefined();
  });

  it('session requests and lesson booking', async () => {
    const request = {
      staffId: 'staff-alek',
      lessonType: 'swim' as const,
      durationMin: 30 as const,
      start: '2026-09-17T10:00:00-04:00',
      paymentTiming: 'before' as const,
      swimmerName: 'Mia',
    };
    await api.updateAppConfig('featureToggles', { sessionRequests: false, lessonBooking: false }, IT);
    await expect(api.createSessionRequest('member-jordan', request)).rejects.toThrow(/Session requests: this feature/);
    await expect(api.bookPrivateLesson('member-jordan', 'slot-elena-wed-0900')).rejects.toThrow(/Lesson booking: this feature/);
    await api.updateAppConfig('featureToggles', { sessionRequests: true, lessonBooking: true }, IT);
    await expect(api.createSessionRequest('member-jordan', request)).resolves.toBeDefined();
    await expect(api.bookPrivateLesson('member-jordan', 'slot-elena-wed-0900')).resolves.toBeDefined();
  });

  it('community forum', async () => {
    const topic = {
      title: 'Hello',
      content: 'Anyone swimming today?',
      category: 'general' as const,
      authorId: 'member-jordan',
      authorName: 'Jordan Hale',
      authorRole: 'member',
    };
    await api.updateAppConfig('featureToggles', { communityForum: false }, IT);
    await expect(api.createForumTopic(topic)).rejects.toThrow(/community forum: this feature/);
    await api.updateAppConfig('featureToggles', { communityForum: true }, IT);
    await expect(api.createForumTopic(topic)).resolves.toBeDefined();
  });

  it('Child Watch sign-in', async () => {
    const allDay = Array.from({ length: 7 }, () => [{ open: '00:00', close: '23:59' }]);
    await api.updateAppConfig('childWatch', { hours: allDay }, IT);
    const now = new Date(`${getDemoToday()}T03:00:00`);
    await api.updateAppConfig('featureToggles', { childWatch: false }, IT);
    await expect(childWatchRepo.signIn('child-jordan-1', 'member-jordan', now)).rejects.toThrow(/Child Watch: this feature/);
    await api.updateAppConfig('featureToggles', { childWatch: true }, IT);
    await expect(childWatchRepo.signIn('child-jordan-1', 'member-jordan', now)).resolves.toBeDefined();
  });
});

describe('donation settings', () => {
  const gift = (amountCents: number) => ({
    memberId: 'member-jordan',
    donorName: 'Jordan Hale',
    donorEmail: 'jordan@example.com',
    amountCents,
    frequency: 'one-time' as const,
    designation: 'Aquatics',
    paymentBrand: 'Visa',
    paymentLast4: '4242',
  });

  it('enforces the configured minimum gift', async () => {
    await expect(api.createDonation(gift(100))).rejects.toThrow(/minimum gift is \$5\.00/);
    await api.updateAppConfig('donations', { minimumGiftCents: 1000 }, ADMIN);
    await expect(api.createDonation(gift(500))).rejects.toThrow(/minimum gift is \$10\.00/);
    await expect(api.createDonation(gift(1000))).resolves.toBeDefined();
  });

  it('validates the minimum gift, add-on options and funds', async () => {
    await expect(api.updateAppConfig('donations', { minimumGiftCents: 0 }, ADMIN)).rejects.toThrow(/Minimum gift/);
    await expect(api.updateAppConfig('donations', { roundUpOptionsCents: [500, -1] }, ADMIN)).rejects.toThrow(/add-on/);
    await expect(api.updateAppConfig('donations', { funds: [] }, ADMIN)).rejects.toThrow(/at least one fund/);
    const next = await api.updateAppConfig('donations', { roundUpOptionsCents: [300, 600] }, ADMIN);
    expect(next.donations.roundUpOptionsCents).toEqual([300, 600]);
  });
});

describe('swim class capacity and hidden classes', () => {
  // A paid class nobody is enrolled in yet.
  const emptyClassId = async () => {
    const state = await loadStore();
    return AQUATICS_CLASSES.find(
      (c) => !c.isFree && !state.swimEnrollments.some((e) => e.classId === c.id && e.status === 'enrolled')
    )!.id;
  };

  it('uses the configured default capacity', async () => {
    const id = await emptyClassId();
    await api.updateAppConfig('swimClasses', { capacity: 1 }, IT);
    await api.enrollInSwimClass('member-jordan', id);
    await expect(api.enrollInSwimClass('guest-taylor', id)).rejects.toThrow(/Class is full/);
  });

  it('prefers a per-class override', async () => {
    const id = await emptyClassId();
    const cfg = await api.updateAppConfig('swimClasses', { capacity: 8, overrides: { [id]: { capacity: 1 } } }, IT);
    expect(swimClassCapacity(cfg.swimClasses, id)).toBe(1);
    expect(swimClassCapacity(cfg.swimClasses, 'some-other-class')).toBe(8);
    await api.enrollInSwimClass('member-jordan', id);
    await expect(api.enrollInSwimClass('guest-taylor', id)).rejects.toThrow(/Class is full/);
  });

  it('refuses to enroll in a hidden class', async () => {
    const id = await emptyClassId();
    await api.updateAppConfig('swimClasses', { hidden: [id] }, IT);
    await expect(api.enrollInSwimClass('member-jordan', id)).rejects.toThrow(/not found/);
  });
});

describe('thresholds', () => {
  const member = { id: 'm', status: 'active', type: 'Adult' } as Member;
  const membership = { memberId: 'm', joinedDate: '2026-09-04' } as Membership; // 10 days before the demo day

  it('flag a new member by the configured number of days', async () => {
    const today = getDemoToday();
    const config = await api.getAppConfig();
    expect(deskAlertsFor(member, membership, today, config.thresholds.newMemberDays).map((a) => a.kind)).toEqual(['new_member']);
    const stricter = await api.updateAppConfig('thresholds', { newMemberDays: 3 }, IT);
    expect(stricter.thresholds.newMemberDays).toBe(3);
    expect(deskAlertsFor(member, membership, today, stricter.thresholds.newMemberDays)).toEqual([]);
    // The argument is optional and defaults to the built-in 14 days.
    expect(deskAlertsFor(member, membership, today).map((a) => a.kind)).toEqual(['new_member']);
  });

  it('are stored for the dashboards to read', async () => {
    const next = await api.updateAppConfig('thresholds', { staleCancelDays: 3, fullClassRatio: 0.5 }, IT);
    expect(next.thresholds).toMatchObject({ staleCancelDays: 3, fullClassRatio: 0.5 });
    expect((await api.getAppConfig()).thresholds.staleCancelDays).toBe(3);
  });
});

describe('wellness rate card and templates', () => {
  it('derives the price copy from the rate card', async () => {
    const programs = defaultAppConfig().wellnessPackages;
    expect(lowestWellnessRate(programs)).toBe(35);
    expect(largestWellnessSavings(programs)).toBe(180);
    expect(wellnessRateHighlights(programs)).toEqual([
      'Personal 60-Min ($60/session; 12-pack at $50/session saving $120+)',
      'Personal 30-Min Express ($35/session) for focused conditioning',
      'Partner Wellness Training ($45/person/session) - workout with a friend',
    ]);
    const edited = programs.map((p) =>
      p.id === 'personal-30'
        ? { ...p, tiers: p.tiers.map((t) => ({ ...t, branchMemberPerSession: 30 })) }
        : p
    );
    expect(formatWellnessPrice(lowestWellnessRate(edited))).toBe('$30');
    expect(wellnessRateHighlights(edited)[1]).toContain('$30/session');
  });

  it('fills templates', () => {
    const t = defaultAppConfig().templates;
    expect(fillTemplate(t.guestPassShare, { guestName: 'Sam', passCode: 'SS-GUEST-1' })).toMatch(
      /^Hi Sam! .*Your Pass Code is SS-GUEST-1\./
    );
    expect(fillTemplate('Hi {who} {unknown}', { who: 'Sam' })).toBe('Hi Sam {unknown}');
    expect(welcomeCallScript({ memberName: 'Jordan Hale', repName: 'Liz' })).toMatch(/^Hi Jordan, this is Liz from/);
    expect(welcomeCallScript({ memberName: 'Jordan Hale', repName: 'Liz' }, 'Hello {firstName} from {repName}')).toBe(
      'Hello Jordan from Liz'
    );
  });
});
