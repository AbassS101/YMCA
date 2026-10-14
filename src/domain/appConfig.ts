import { DEFAULT_CHILD_WATCH_RULES, type ChildWatchRules } from '@/domain/childWatch';
import { NEW_MEMBER_DAYS } from '@/domain/deskAlerts';
import { SWIM_CLASS_CAPACITY } from '@/domain/lessonPricing';
import type { ConfigSection } from '@/domain/staffCapabilities';
import {
  YMCA_COMMUNITY_FUNDS,
  YMCA_DONATION_TIERS,
  YMCA_MEMBERSHIP_PLANS,
  type DonationImpactTier,
  type MembershipPlan,
} from '@/domain/types';
import { WELLNESS_CONTACT_INFO, WELLNESS_TRAINING_PROGRAMS, type WellnessTrainingProgram } from '@/domain/wellnessPrograms';

/** A membership plan as managed in-app. Plan ids never change; retire a plan with `active: false`. */
export type AppConfigPlan = MembershipPlan & {
  active: boolean;
  minAge?: number;
  maxAge?: number;
  /** Former names, so older records that still carry them resolve to this plan. */
  legacyNames?: string[];
};

export type GuestPassConfig = {
  complimentaryPassesPerYear: number;
  dayPassAdultCents: number;
  dayPassYouthSeniorCents: number;
  conversionWindowHours: number;
  validUntilLabel: string;
};

export type DonationsConfig = {
  tiers: DonationImpactTier[];
  funds: { id: string; name: string }[];
  /** Smallest gift a member can make. */
  minimumGiftCents: number;
  /** Monthly add-on amounts offered when joining. */
  roundUpOptionsCents: number[];
};

export type SwimClassConfig = {
  /** Default max participants per class. */
  capacity: number;
  /** AquaticsClassOffering ids hidden from booking. */
  hidden: string[];
  /** Per-class capacity overrides, keyed by AquaticsClassOffering id. */
  overrides: Record<string, { capacity: number }>;
};

export type BrandingConfig = {
  branchName: string;
  address: string;
  phone: string;
  hoursWeekday: string;
  hoursWeekend: string;
  wellnessEmail: string;
};

export type ThresholdsConfig = {
  staleCancelDays: number;
  /** 0-1: classes at or above this fill ratio are flagged as full. */
  fullClassRatio: number;
  newMemberDays: number;
};

export type FeatureToggles = {
  guestPasses: boolean;
  donations: boolean;
  childWatch: boolean;
  lessonBooking: boolean;
  swimClassEnrollment: boolean;
  communityForum: boolean;
  sessionRequests: boolean;
};

/** Words used in "<feature> is turned off" messages. */
export const FEATURE_TOGGLE_LABELS: Record<keyof FeatureToggles, string> = {
  guestPasses: 'Guest passes',
  donations: 'Donations',
  childWatch: 'Child Watch',
  lessonBooking: 'Lesson booking',
  swimClassEnrollment: 'Swim class enrollment',
  communityForum: 'The community forum',
  sessionRequests: 'Session requests',
};

/** Message templates; `{placeholders}` are filled in where they are used. */
export type TemplatesConfig = {
  welcomeCall: string;
  guestPassShare: string;
};

/**
 * Business settings edited in-app. Lesson pricing (`state.lessonPricing`) and enrollment campaigns
 * (`state.enrollmentCampaigns`) keep their own storage; the config service presents them as sections.
 * New sections (e.g. a role permission matrix) are added here and in `normalizeAppConfig`.
 */
export type AppConfig = {
  membershipPlans: AppConfigPlan[];
  childWatch: ChildWatchRules;
  guestPasses: GuestPassConfig;
  donations: DonationsConfig;
  wellnessPackages: WellnessTrainingProgram[];
  swimClasses: SwimClassConfig;
  branding: BrandingConfig;
  thresholds: ThresholdsConfig;
  featureToggles: FeatureToggles;
  templates: TemplatesConfig;
};

export type AppConfigSection = keyof AppConfig;

/** List sections are sent whole (every existing id included); object sections merge key by key. */
export type AppConfigPatch<S extends AppConfigSection> = AppConfig[S] extends unknown[]
  ? AppConfig[S]
  : Partial<AppConfig[S]>;

export type AppConfigInput = { [S in AppConfigSection]?: AppConfigPatch<S> };

export const APP_CONFIG_SECTIONS: readonly AppConfigSection[] = [
  'membershipPlans',
  'childWatch',
  'guestPasses',
  'donations',
  'wellnessPackages',
  'swimClasses',
  'branding',
  'thresholds',
  'featureToggles',
  'templates',
];

export const CONFIG_SECTION_LABELS: Record<ConfigSection, string> = {
  membershipPlans: 'membership plans',
  childWatch: 'Child Watch rules',
  guestPasses: 'guest passes',
  donations: 'donations',
  wellnessPackages: 'wellness packages',
  swimClasses: 'swim classes',
  lessonPricing: 'lesson pricing',
  campaigns: 'enrollment campaigns',
  templates: 'templates',
  branding: 'branding',
  thresholds: 'thresholds',
  featureToggles: 'feature toggles',
};

export type ConfigAuditEntry = {
  id: string;
  at: string; // ISO
  byId: string;
  byName: string;
  byRole: string;
  section: ConfigSection;
  summary: string;
  before: unknown;
  after: unknown;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function defaultAppConfig(): AppConfig {
  return {
    membershipPlans: YMCA_MEMBERSHIP_PLANS.map((p) => ({ ...clone(p), active: true })),
    childWatch: clone(DEFAULT_CHILD_WATCH_RULES),
    guestPasses: {
      complimentaryPassesPerYear: 2,
      dayPassAdultCents: 1500,
      dayPassYouthSeniorCents: 1000,
      conversionWindowHours: 48,
      validUntilLabel: 'Valid Today until 10:00 PM',
    },
    donations: {
      tiers: clone(YMCA_DONATION_TIERS),
      funds: YMCA_COMMUNITY_FUNDS.map((f) => ({ id: f.id, name: f.name })),
      minimumGiftCents: 500,
      roundUpOptionsCents: [500, 1000, 2500],
    },
    wellnessPackages: clone(WELLNESS_TRAINING_PROGRAMS),
    swimClasses: { capacity: SWIM_CLASS_CAPACITY, hidden: [], overrides: {} },
    branding: {
      branchName: 'YMCA Silver Spring',
      address: '9800 Hastings Drive, Silver Spring, MD 20901',
      phone: '(301) 585-2120',
      hoursWeekday: 'Mon–Fri 5:30 AM – 10:00 PM',
      hoursWeekend: 'Sat 7:00 AM – 8:00 PM · Sun 8:00 AM – 8:00 PM',
      wellnessEmail: WELLNESS_CONTACT_INFO.email,
    },
    thresholds: { staleCancelDays: 7, fullClassRatio: 0.9, newMemberDays: NEW_MEMBER_DAYS },
    featureToggles: {
      guestPasses: true,
      donations: true,
      childWatch: true,
      lessonBooking: true,
      swimClassEnrollment: true,
      communityForum: true,
      sessionRequests: true,
    },
    templates: {
      welcomeCall:
        'Hi {firstName}, this is {repName} from the YMCA Silver Spring. I am calling to see how your first weeks are going and whether I can help with classes, trainers, or anything else.',
      guestPassShare:
        "Hi {guestName}! I've sent you a complimentary 1-Day Guest Pass to the YMCA Silver Spring. Your Pass Code is {passCode}. Present this pass code at the YMCA Silver Spring Member Services desk (9800 Hastings Drive, Silver Spring, MD)!",
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Saved values win over defaults key by key; lists are replaced whole; wrong-typed values are ignored. */
function deepMerge<T>(base: T, saved: unknown): T {
  if (Array.isArray(base)) return clone(Array.isArray(saved) ? saved : base) as T;
  if (isPlainObject(base)) {
    if (!isPlainObject(saved)) return clone(base);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) out[key] = deepMerge(base[key], saved[key]);
    // Keyed records (e.g. per-class overrides) start empty, so keep every saved key.
    for (const key of Object.keys(saved)) if (!(key in base)) out[key] = clone(saved[key]);
    return out as T;
  }
  return (saved !== undefined && typeof saved === typeof base ? saved : base) as T;
}

/** Defaults first (so new default entries still appear), saved entries merged on top by id, extras appended. */
function mergeById<T extends { id: string }>(defaults: T[], saved: unknown): T[] {
  const savedList = (Array.isArray(saved) ? saved : []).filter(
    (item): item is T => isPlainObject(item) && typeof item.id === 'string'
  );
  const savedById = new Map(savedList.map((s) => [s.id, s]));
  const known = new Set(defaults.map((d) => d.id));
  return [
    ...defaults.map((d) => ({ ...clone(d), ...clone(savedById.get(d.id) ?? {}) })),
    ...savedList.filter((s) => !known.has(s.id)).map((s) => clone(s)),
  ];
}

/** Deep-merges saved values over the defaults (pattern like normalizePricing). */
export function normalizeAppConfig(raw?: AppConfigInput | null): AppConfig {
  const d = defaultAppConfig();
  return {
    membershipPlans: mergeById(d.membershipPlans, raw?.membershipPlans),
    childWatch: deepMerge(d.childWatch, raw?.childWatch),
    guestPasses: deepMerge(d.guestPasses, raw?.guestPasses),
    donations: deepMerge(d.donations, raw?.donations),
    wellnessPackages: mergeById(d.wellnessPackages, raw?.wellnessPackages),
    swimClasses: deepMerge(d.swimClasses, raw?.swimClasses),
    branding: deepMerge(d.branding, raw?.branding),
    thresholds: deepMerge(d.thresholds, raw?.thresholds),
    featureToggles: deepMerge(d.featureToggles, raw?.featureToggles),
    templates: deepMerge(d.templates, raw?.templates),
  };
}

/**
 * The defaults for one section. Entries that existing data may reference are kept (custom plans, funds and
 * wellness programs are never deleted), and a renamed default plan keeps its current name as a former name.
 */
export function defaultsForReset<S extends AppConfigSection>(current: AppConfig, section: S): AppConfig[S] {
  const defaults = defaultAppConfig();
  const extras = <T extends { id: string }>(base: T[], saved: T[]): T[] => {
    const known = new Set(base.map((b) => b.id));
    return saved.filter((s) => !known.has(s.id));
  };
  if (section === 'membershipPlans') {
    const saved = current.membershipPlans;
    const byId = new Map(saved.map((p) => [p.id, p]));
    const reset = defaults.membershipPlans.map((p) => {
      const was = byId.get(p.id);
      const former = [...(was?.legacyNames ?? []), ...(was ? [was.name] : [])];
      const names = [...new Set([...(p.legacyNames ?? []), ...former])].filter(
        (n) => n.trim().toLowerCase() !== p.name.toLowerCase()
      );
      return names.length > 0 ? { ...p, legacyNames: names } : p;
    });
    return [...reset, ...clone(extras(defaults.membershipPlans, saved))] as AppConfig[S];
  }
  if (section === 'donations') {
    const funds = [...defaults.donations.funds, ...clone(extras(defaults.donations.funds, current.donations.funds))];
    return { ...defaults.donations, funds } as AppConfig[S];
  }
  if (section === 'wellnessPackages') {
    return [...defaults.wellnessPackages, ...clone(extras(defaults.wellnessPackages, current.wellnessPackages))] as AppConfig[S];
  }
  return defaults[section];
}

/** Max participants for a swim class: its own override, else the default. */
export function swimClassCapacity(swim: SwimClassConfig, classId: string): number {
  return swim.overrides[classId]?.capacity ?? swim.capacity;
}

/** Fills `{placeholders}` in a template; unknown placeholders are left as written. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)}/g, (whole, key: string) => values[key] ?? whole);
}

const isCents = (v: unknown): boolean => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isPositiveInt = (v: unknown): boolean => typeof v === 'number' && Number.isInteger(v) && v > 0;
const isText = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
const isMoney = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function duplicate(values: string[]): string | undefined {
  const seen = new Set<string>();
  return values.find((v) => (seen.has(v) ? true : (seen.add(v), false)));
}

function validatePlans(next: AppConfigPlan[], current: AppConfigPlan[]): string | null {
  const ids = next.map((p) => p.id);
  if (ids.some((id) => !isText(id))) return 'Every membership plan needs an id.';
  if (duplicate(ids)) return `Plan id "${duplicate(ids)}" is used twice.`;
  const missing = current.find((p) => !ids.includes(p.id));
  if (missing) return `${missing.name} cannot be deleted or have its id changed. Mark it inactive instead.`;
  const nameKey = next.map((p) => String(p.name ?? '').trim().toLowerCase());
  if (nameKey.some((n) => !n)) return 'Every membership plan needs a name.';
  if (duplicate(nameKey)) return 'Two membership plans cannot share a name.';
  for (const p of next) {
    const own = [String(p.name).trim().toLowerCase(), String(p.id).toLowerCase()];
    const clash = next.some(
      (q) => q !== p && (q.legacyNames ?? []).some((n) => own.includes(String(n).trim().toLowerCase()))
    );
    if (clash) return `${p.name} is already a former name of another plan.`;
  }
  for (const p of next) {
    if (!isCents(p.monthlyAmountCents) || !isCents(p.enrollmentFeeCents)) {
      return `${p.name}: prices must be whole cents of zero or more.`;
    }
    if (typeof p.active !== 'boolean') return `${p.name}: set whether the plan is active.`;
    for (const age of [p.minAge, p.maxAge]) {
      if (age !== undefined && !isCents(age)) return `${p.name}: ages must be whole numbers of zero or more.`;
    }
    if (p.minAge !== undefined && p.maxAge !== undefined && p.minAge > p.maxAge) {
      return `${p.name}: minimum age cannot be above the maximum age.`;
    }
  }
  return null;
}

function validateChildWatch(c: ChildWatchRules): string | null {
  if (!Array.isArray(c.hours) || c.hours.length !== 7) return 'Child Watch hours need one entry for each day of the week.';
  for (const day of c.hours) {
    for (const w of day) {
      if (!CLOCK.test(w?.open) || !CLOCK.test(w?.close) || w.open >= w.close) {
        return 'Child Watch hours must be HH:MM with opening before closing.';
      }
    }
  }
  if (!isCents(c.signInCutoffMin)) return 'Sign-in cutoff must be zero or more minutes.';
  if (!isPositiveInt(c.maxMinutesPerDay)) return 'Daily limit must be a whole number of minutes above zero.';
  if (!isCents(c.minAgeWeeks)) return 'Minimum age must be zero or more weeks.';
  if (!isPositiveInt(c.roomCapacity)) return 'Room capacity must be a whole number above zero.';
  if (!isText(c.intro) || !isText(c.note)) return 'Child Watch needs introduction and note text.';
  if (typeof c.contactText !== 'string' || typeof c.contactEmail !== 'string') return 'Contact details must be text.';
  if (c.contactEmail.trim() !== '' && !c.contactEmail.includes('@')) return 'Enter a valid contact email address.';
  if (!Array.isArray(c.ratios) || c.ratios.length === 0) return 'Child Watch needs at least one staffing ratio.';
  for (let i = 0; i < c.ratios.length; i++) {
    const r = c.ratios[i];
    if (!isPositiveInt(r?.maxAgeMonths) || !isPositiveInt(r?.childrenPerStaff)) {
      return 'Staffing ratios need a whole number of months and children per staff above zero.';
    }
    if (i > 0 && r.maxAgeMonths <= c.ratios[i - 1].maxAgeMonths) return 'Staffing ratios must be sorted by age, youngest first.';
  }
  if (typeof c.enforceRatios !== 'boolean') return 'Enforce ratios must be on or off.';
  if (!Number.isInteger(c.pickupCodeLength) || c.pickupCodeLength < 4 || c.pickupCodeLength > 8) {
    return 'Pickup code length must be between 4 and 8 digits.';
  }
  if (!isPositiveInt(c.maxCodeAttempts)) return 'Allowed code attempts must be a whole number of 1 or more.';
  if (typeof c.allowMemberSelfSignOut !== 'boolean' || typeof c.requireIdForNonHouseholdPickup !== 'boolean') {
    return 'Pickup options must be on or off.';
  }
  if (!isPositiveInt(c.headcountIntervalMin)) return 'Headcount interval must be a whole number of minutes above zero.';
  return null;
}

function validateGuestPasses(g: GuestPassConfig): string | null {
  if (!isCents(g.complimentaryPassesPerYear)) return 'Complimentary passes must be a whole number of zero or more.';
  if (!isCents(g.dayPassAdultCents) || !isCents(g.dayPassYouthSeniorCents)) {
    return 'Day pass prices must be whole cents of zero or more.';
  }
  if (!isCents(g.conversionWindowHours)) return 'Conversion window must be zero or more hours.';
  return isText(g.validUntilLabel) ? null : 'Enter the guest pass validity text.';
}

function validateDonations(d: DonationsConfig): string | null {
  if (!Array.isArray(d.tiers) || !Array.isArray(d.funds)) return 'Donations need tiers and funds.';
  if (d.funds.length === 0) return 'Add at least one fund.';
  for (const t of d.tiers) {
    if (!isPositiveInt(t.amountCents)) return 'Donation tier amounts must be whole cents above zero.';
    if (!isText(t.title)) return 'Every donation tier needs a title.';
  }
  if (!isPositiveInt(d.minimumGiftCents)) return 'Minimum gift must be whole cents above zero.';
  if (!Array.isArray(d.roundUpOptionsCents) || !d.roundUpOptionsCents.every(isPositiveInt)) {
    return 'Membership add-on amounts must be whole cents above zero.';
  }
  if (d.funds.some((f) => !isText(f.id) || !isText(f.name))) return 'Every fund needs an id and a name.';
  return duplicate(d.funds.map((f) => f.id)) ? 'Two funds cannot share an id.' : null;
}

function validateWellness(next: WellnessTrainingProgram[], current: WellnessTrainingProgram[]): string | null {
  const ids = next.map((p) => p.id);
  if (ids.some((id) => !isText(id))) return 'Every wellness program needs an id.';
  if (duplicate(ids)) return `Program id "${duplicate(ids)}" is used twice.`;
  const missing = current.find((p) => !ids.includes(p.id));
  if (missing) return `${missing.title} cannot be deleted or have its id changed.`;
  for (const p of next) {
    if (!isText(p.title)) return 'Every wellness program needs a title.';
    if (!Array.isArray(p.tiers) || p.tiers.length === 0) return `${p.title}: add at least one package.`;
    for (const t of p.tiers) {
      if (!isPositiveInt(t.sessions)) return `${p.title}: sessions must be a whole number above zero.`;
      // The wellness rate card is kept in dollars (unlike plans and lessons, which are cents).
      const prices = [
        t.branchMemberPrice,
        t.communityMemberPrice,
        t.branchMemberPerSession,
        t.communityMemberPerSession,
      ];
      if (!prices.every(isMoney)) return `${p.title}: prices must be zero or more.`;
    }
  }
  return null;
}

function validateSwimClasses(s: SwimClassConfig): string | null {
  if (!isPositiveInt(s.capacity)) return 'Swim class capacity must be a whole number above zero.';
  if (!Array.isArray(s.hidden) || s.hidden.some((id) => typeof id !== 'string')) return 'Hidden classes must be a list of ids.';
  const bad = Object.values(s.overrides ?? {}).some((o) => !isPositiveInt(o?.capacity));
  return bad ? 'Class capacities must be whole numbers above zero.' : null;
}

function validateTextFields(obj: object, label: string): string | null {
  return Object.values(obj).every(isText) ? null : `Every ${label} field needs a value.`;
}

function validateThresholds(t: ThresholdsConfig): string | null {
  if (!isCents(t.staleCancelDays) || !isCents(t.newMemberDays)) return 'Day counts must be whole numbers of zero or more.';
  const ratio = t.fullClassRatio;
  return typeof ratio === 'number' && ratio > 0 && ratio <= 1 ? null : 'Full-class ratio must be above 0 and at most 1.';
}

/** Returns a user-facing problem with the candidate section, or null when it is valid. */
export function validateAppConfigSection<S extends AppConfigSection>(
  section: S,
  next: AppConfig[S],
  current: AppConfig[S]
): string | null {
  switch (section) {
    case 'membershipPlans':
      return validatePlans(next as AppConfigPlan[], current as AppConfigPlan[]);
    case 'childWatch':
      return validateChildWatch(next as ChildWatchRules);
    case 'guestPasses':
      return validateGuestPasses(next as GuestPassConfig);
    case 'donations':
      return validateDonations(next as DonationsConfig);
    case 'wellnessPackages':
      return validateWellness(next as WellnessTrainingProgram[], current as WellnessTrainingProgram[]);
    case 'swimClasses':
      return validateSwimClasses(next as SwimClassConfig);
    case 'branding':
      return validateTextFields(next as BrandingConfig, 'branding');
    case 'thresholds':
      return validateThresholds(next as ThresholdsConfig);
    case 'featureToggles':
      return Object.values(next as FeatureToggles).every((v) => typeof v === 'boolean')
        ? null
        : 'Every feature toggle must be on or off.';
    case 'templates':
      return validateTextFields(next as TemplatesConfig, 'template');
    default:
      return 'Unknown settings section.';
  }
}

/**
 * Builds and validates the candidate for one section. List sections must come back whole (entries
 * are merged onto the existing entry with the same id); object sections merge key by key.
 * Throws with a user-facing message when the result is invalid.
 */
export function applyConfigPatch<S extends AppConfigSection>(
  current: AppConfig,
  section: S,
  patch: AppConfigPatch<S>
): AppConfig[S] {
  if (!APP_CONFIG_SECTIONS.includes(section)) throw new Error('Unknown settings section.');
  const before = current[section];
  let candidate: unknown;
  if (Array.isArray(before)) {
    if (!Array.isArray(patch)) throw new Error(`Send the full list of ${CONFIG_SECTION_LABELS[section]}.`);
    const existing = new Map((before as { id: string }[]).map((e) => [e.id, e]));
    candidate = (patch as { id: string }[]).map((e) => ({ ...clone(existing.get(e?.id) ?? {}), ...e }));
  } else {
    if (!isPlainObject(patch)) throw new Error('Nothing to update.');
    candidate = { ...clone(before), ...patch };
  }
  const problem = validateAppConfigSection(section, candidate as AppConfig[S], before);
  if (problem) throw new Error(problem);
  return normalizeAppConfig({ ...current, [section]: candidate } as AppConfigInput)[section];
}

function changedNames(before: unknown, after: unknown): string[] {
  if (Array.isArray(after)) {
    const prev = new Map(
      (Array.isArray(before) ? before : []).map((e: { id?: string }) => [e?.id, JSON.stringify(e)])
    );
    return (after as { id?: string; name?: string; title?: string }[])
      .filter((e) => prev.get(e.id) !== JSON.stringify(e))
      .map((e) => e.name ?? e.title ?? String(e.id));
  }
  if (isPlainObject(after)) {
    const prev = isPlainObject(before) ? before : {};
    return Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(prev[k]));
  }
  return [];
}

/** One-line audit summary, e.g. "Updated membership plans: Adult, Family I". */
export function describeConfigChange(section: ConfigSection, before: unknown, after: unknown): string {
  const names = changedNames(before, after);
  const label = CONFIG_SECTION_LABELS[section];
  return names.length > 0 ? `Updated ${label}: ${names.join(', ')}` : `Updated ${label}`;
}
