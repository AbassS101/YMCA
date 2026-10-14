import { YMCA_MEMBERSHIP_PLANS, type Member, type MembershipPlan } from '@/domain/types';

export type AgeBand = 'child' | 'teen' | 'adult';
export type AccessStatus = 'allowed' | 'needs_orientation' | 'not_allowed';
export type AccessEntry = { status: AccessStatus; reason: string };
export type FacilityKey = 'gym' | 'pool' | 'groupEx' | 'swimLessons' | 'childWatch' | 'pickleball';
export type FacilityAccess = Record<FacilityKey, AccessEntry>;

export const FACILITY_LABELS: Record<FacilityKey, string> = {
  gym: 'Gym',
  pool: 'Pool',
  groupEx: 'Group classes',
  swimLessons: 'Swim lessons',
  childWatch: 'Child Watch',
  pickleball: 'Pickleball',
};

export const CHILD_MAX_AGE = 12;
export const TEEN_MIN_AGE = 13;
export const ADULT_MIN_AGE = 18;

export const YOUTH_PLAN_IDS = ['youth', 'youth-oney', 'pickleball-youth'];

/** Whole years between birthDate (YYYY-MM-DD) and today (YYYY-MM-DD or Date). */
export function ageOn(birthDate: string, today: string | Date): number {
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number);
  const t = typeof today === 'string' ? new Date(`${today.slice(0, 10)}T12:00:00`) : today;
  let age = t.getFullYear() - by;
  const m = t.getMonth() + 1;
  if (m < bm || (m === bm && t.getDate() < bd)) age -= 1;
  return age;
}

export function ageBandForAge(age: number): AgeBand {
  if (age < TEEN_MIN_AGE) return 'child';
  if (age < ADULT_MIN_AGE) return 'teen';
  return 'adult';
}

export function ageBand(birthDate: string, today: string | Date): AgeBand {
  return ageBandForAge(ageOn(birthDate, today));
}

export function findPlan(idOrName: string | undefined): MembershipPlan | undefined {
  if (!idOrName) return undefined;
  const lower = idOrName.toLowerCase();
  return YMCA_MEMBERSHIP_PLANS.find((p) => p.id === idOrName || p.name.toLowerCase() === lower);
}

export function isFamilyPlan(plan: MembershipPlan | undefined): boolean {
  return Boolean(plan && ((plan.maxAdults ?? 1) > 1 || plan.allowsDependents));
}

export function isPickleballOnly(planIdOrName?: string): boolean {
  return /pickleball/i.test(planIdOrName ?? '');
}

export type SoloCheck = { ok: true } | { ok: false; reason: string };

/** Can this person buy / hold a membership on their own (not as part of a household)? */
export function canHoldSoloMembership(birthDate: string, planId: string, today: string | Date): SoloCheck {
  const age = ageOn(birthDate, today);
  const plan = findPlan(planId);
  if (!plan) return { ok: false, reason: 'Unknown membership plan.' };
  if (age < TEEN_MIN_AGE) {
    return { ok: false, reason: 'Children under 13 must be added to a family plan.' };
  }
  if (isFamilyPlan(plan)) {
    return age >= ADULT_MIN_AGE
      ? { ok: true }
      : { ok: false, reason: 'The person who buys a family plan must be 18 or older.' };
  }
  const isYouth = YOUTH_PLAN_IDS.includes(plan.id);
  if (age < ADULT_MIN_AGE) {
    return isYouth ? { ok: true } : { ok: false, reason: `Ages 13 to 17 need a Youth plan, not ${plan.name}.` };
  }
  if (isYouth) return { ok: false, reason: `${plan.name} is for ages 13 to 17.` };
  if (plan.id.startsWith('senior')) {
    return age >= 65 ? { ok: true } : { ok: false, reason: `${plan.name} is for ages 65 and up.` };
  }
  if (plan.id.startsWith('young-adult')) {
    return age <= 22 ? { ok: true } : { ok: false, reason: 'Young Adult is for ages 18 to 22.' };
  }
  if (plan.id === 'adult' || plan.id === 'adult-oney') {
    return age >= 23 && age <= 64 ? { ok: true } : { ok: false, reason: 'Adult is for ages 23 to 64.' };
  }
  return { ok: true };
}

export type HouseholdPerson = { birthDate: string };

/** `people` includes the primary. */
export function validateHousehold(
  planIdOrName: string,
  people: HouseholdPerson[],
  today: string | Date
): SoloCheck {
  const plan = findPlan(planIdOrName);
  if (!plan) return { ok: false, reason: 'Unknown membership plan.' };
  const ages = people.map((p) => ageOn(p.birthDate, today));
  const adults = ages.filter((a) => a >= ADULT_MIN_AGE).length;
  const dependents = ages.length - adults;
  const maxAdults = plan.maxAdults ?? 1;

  if (!isFamilyPlan(plan)) {
    return ages.length > 1
      ? { ok: false, reason: `${plan.name} covers one person. Choose a Family plan to add others.` }
      : { ok: true };
  }
  if (adults < 1) return { ok: false, reason: 'A family plan needs at least one adult (18+).' };
  if (adults > maxAdults) {
    return maxAdults === 1
      ? { ok: false, reason: `${plan.name} covers 1 adult. Upgrade to Family II to add a second adult.` }
      : { ok: false, reason: `${plan.name} covers up to ${maxAdults} adults.` };
  }
  if (dependents > 0 && !plan.allowsDependents) {
    return { ok: false, reason: `${plan.name} does not include children. Choose a Family I or II plan.` };
  }
  if (plan.id.startsWith('senior-family') && ages.some((a) => a < 65)) {
    return { ok: false, reason: 'Senior Family is for adults ages 65 and up.' };
  }
  return { ok: true };
}

const allow = (reason: string): AccessEntry => ({ status: 'allowed', reason });
const deny = (reason: string): AccessEntry => ({ status: 'not_allowed', reason });

export function facilityAccess(
  member: Pick<Member, 'birthDate' | 'gymOrientation' | 'type' | 'status'>,
  today: string | Date
): FacilityAccess {
  if (member.status !== 'active') {
    const off = deny('Membership is not active.');
    return { gym: off, pool: off, groupEx: off, swimLessons: off, childWatch: off, pickleball: off };
  }
  const band: AgeBand = member.birthDate ? ageBand(member.birthDate, today) : 'adult';
  const pickleOnly = isPickleballOnly(member.type);

  if (pickleOnly) {
    const no = deny('Pickleball-only membership.');
    return {
      gym: no,
      pool: no,
      groupEx: no,
      swimLessons: no,
      childWatch: no,
      pickleball: allow('Included with your plan.'),
    };
  }

  if (band === 'child') {
    return {
      gym: deny('Gym use starts at age 13, after a trainer orientation.'),
      pool: allow('Included on the family plan.'),
      groupEx: allow('Included on the family plan.'),
      swimLessons: allow('Can take swim lessons and classes.'),
      childWatch: allow('Child Watch while a parent is in the building.'),
      pickleball: allow('Included on the family plan.'),
    };
  }
  if (band === 'teen') {
    const gym: AccessEntry = member.gymOrientation
      ? allow(`Orientation completed ${member.gymOrientation.completedAt.slice(0, 10)}.`)
      : { status: 'needs_orientation', reason: 'Complete a gym orientation with a trainer first.' };
    return {
      gym,
      pool: allow('Included with membership.'),
      groupEx: allow('Included with membership.'),
      swimLessons: allow('Can take swim lessons and classes.'),
      childWatch: deny('Child Watch is for children under 13.'),
      pickleball: allow('Included with membership.'),
    };
  }
  return {
    gym: allow('Included with membership.'),
    pool: allow('Included with membership.'),
    groupEx: allow('Included with membership.'),
    swimLessons: allow('Can take swim lessons and classes.'),
    childWatch: deny('Child Watch is for children under 13.'),
    pickleball: allow('Included with membership.'),
  };
}

/** One-line summary shown at check-in. */
export function accessSummary(
  member: Pick<Member, 'birthDate' | 'gymOrientation' | 'type' | 'status'>,
  today: string | Date
): string {
  if (member.status !== 'active') return 'Membership is not active.';
  if (isPickleballOnly(member.type)) return 'Pickleball courts only.';
  const band: AgeBand = member.birthDate ? ageBand(member.birthDate, today) : 'adult';
  if (band === 'child') return 'Under 13: pool, lessons and Child Watch only (no gym).';
  if (band === 'teen') {
    return member.gymOrientation
      ? 'Teen: full access, gym orientation done.'
      : 'Teen: gym locked until trainer orientation.';
  }
  return 'Full access for this plan.';
}

export function bandLabel(band: AgeBand): string {
  return band === 'child' ? 'Child (under 13)' : band === 'teen' ? 'Teen (13-17)' : 'Adult';
}

export function generateMembershipId(taken: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const id = String(Math.floor(100000 + Math.random() * 900000));
    if (!taken.has(id)) return id;
  }
  return String(Date.now()).slice(-8);
}
