import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED } from '@/protivity/seed';
import { normalizeAppConfig, type AppConfig, type ConfigAuditEntry } from '@/domain/appConfig';
import { normalizePricing } from '@/domain/lessonPricing';
import { personaForRole } from '@/domain/staffCapabilities';
import { generateMembershipId } from '@/domain/householdAccess';
import type {
  ArrivalRecord,
  EnrollmentCampaign,
  Lead,
  MemberContact,
  Announcement,
  AppNotification,
  CancelRequest,
  ChildWatchAuditEntry,
  ChildWatchAuthorizedPickup,
  ChildWatchHeadcount,
  ChildWatchIncident,
  ChildWatchShift,
  ChildWatchVisit,
  ClassForumPost,
  ClassRegistration,
  ComplaintSuggestion,
  Donation,
  ForumReply,
  ForumTopic,
  LessonPricing,
  LessonSlot,
  TrainerAvailability,
  SwimClassEnrollment,
  Member,
  Membership,
  Message,
  NotificationPreferences,
  PrivateLesson,
  SavedClass,
  ScheduleItem,
  SessionRequest,
  Staff,
  SupportTicket,
  Survey,
  SurveyResponse,
  Thread,
  TrainerAssignment,
  ClientFitnessGoal,
  ClientWorkoutLog,
  UserForumInterests,
  StaffRole,
  UserRole,
} from '@/domain/types';

import { currentWeekMonday, easternNowMinutes, getDemoToday, weeksSinceAnchor } from '@/domain/demoClock';
import { generateActivity } from '@/protivity/liveActivity';
import { shiftSeedDates } from '@/domain/seedDateShift';

const STORAGE_KEY = '@ymca/demo-state';

/** Directors were seeded as a plain trainer / front desk account before they had their own roles. */
const DIRECTOR_ROLE_UPGRADES: Record<string, { legacyStaffRole: StaffRole; legacyRole: UserRole; role: StaffRole & UserRole }> = {
  'staff-celine': { legacyStaffRole: 'trainer', legacyRole: 'trainer', role: 'wellness_director' },
  'staff-sarah': { legacyStaffRole: 'trainer', legacyRole: 'trainer', role: 'swim_instructor' },
  'staff-elena': { legacyStaffRole: 'trainer', legacyRole: 'trainer', role: 'swim_instructor' },
  'staff-desk': { legacyStaffRole: 'desk', legacyRole: 'staff', role: 'membership_director' },
};

export type DemoState = {
  members: Member[];
  staff: Staff[];
  memberships: Membership[];
  schedules: ScheduleItem[];
  savedClasses: SavedClass[];
  classRegistrations: ClassRegistration[];
  lessonSlots: LessonSlot[];
  /** Weekly availability per trainer; expanded into bookable windows on demand. */
  trainerAvailability: Record<string, TrainerAvailability>;
  sessionRequests: SessionRequest[];
  privateLessons: PrivateLesson[];
  assignments: TrainerAssignment[];
  threads: Thread[];
  messages: Message[];
  cancelRequests: CancelRequest[];
  announcements: Announcement[];
  notifications: AppNotification[];
  donations: Donation[];
  credentials: { email: string; password: string; userId: string; role: UserRole }[];
  classForumPosts: ClassForumPost[];
  forumTopics: ForumTopic[];
  forumReplies: ForumReply[];
  forumInterests?: Record<string, UserForumInterests>;
  notificationPreferences: Record<string, NotificationPreferences>;
  supportTickets: SupportTicket[];
  complaintsSuggestions: ComplaintSuggestion[];
  workoutLogs: ClientWorkoutLog[];
  clientGoals: Record<string, ClientFitnessGoal>;
  surveys: Survey[];
  surveyResponses: SurveyResponse[];
  lessonPricing: LessonPricing;
  swimEnrollments: SwimClassEnrollment[];
  childWatchVisits: ChildWatchVisit[];
  childWatchAuthorizedPickups: ChildWatchAuthorizedPickup[];
  childWatchIncidents: ChildWatchIncident[];
  childWatchHeadcounts: ChildWatchHeadcount[];
  childWatchShifts: ChildWatchShift[];
  childWatchAudit: ChildWatchAuditEntry[];
  arrivals: ArrivalRecord[];
  memberContacts: MemberContact[];
  leads: Lead[];
  enrollmentCampaigns: EnrollmentCampaign[];
  appConfig: AppConfig;
  configAudit: ConfigAuditEntry[];
  schemaVersion?: number;
  /** Monday of the week the stored dates are aligned to (see seedDateShift.ts). */
  seedWeekAnchor?: string;
};

const CURRENT_SCHEMA_VERSION = 10;

type LegacyChildProfile = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  allergies?: string;
  notes?: string;
};

/**
 * Households. Legacy Child Watch profiles (persisted `childProfiles`) become dependent Members
 * (same id, so past visits stay valid) and the demo family's extra adults are restored from the
 * seed. Runs once: the legacy array is dropped from the returned state.
 */
function migrateHouseholds(
  raw: DemoState & { childProfiles?: LegacyChildProfile[] },
  seed: DemoState,
  members: Member[],
  memberships: Membership[],
  credentials: DemoState['credentials']
): { members: Member[]; memberships: Membership[]; credentials: DemoState['credentials'] } {
  if (!Array.isArray(raw.childProfiles)) return { members, memberships, credentials };
  const nextMembers = members.map((m) => ({ ...m }));
  let nextMemberships = memberships;
  const taken = new Set(nextMembers.map((m) => m.membershipId));
  const legacy = raw.childProfiles;
  const parentIds = new Set(legacy.map((c) => c.memberId));

  for (const parentId of parentIds) {
    const parent = nextMembers.find((m) => m.id === parentId);
    if (!parent) continue;
    const seedParent = seed.members.find((m) => m.id === parentId);
    const seedMembership = seed.memberships.find((m) => m.memberId === parentId);
    // Demo family: a plain Adult plan can't hold children, so move it to the seeded Family plan.
    if (seedParent && seedParent.householdRole === 'primary' && !parent.householdId) {
      parent.type = seedParent.type;
      parent.birthDate = parent.birthDate ?? seedParent.birthDate;
      if (seedMembership) {
        nextMemberships = nextMemberships.map((m) =>
          m.memberId === parentId
            ? { ...m, rateName: seedMembership.rateName, monthlyAmountCents: seedMembership.monthlyAmountCents }
            : m
        );
      }
    }
    parent.householdId = parentId;
    parent.householdRole = 'primary';
    parent.hasLogin = true;
  }

  for (const c of legacy) {
    if (nextMembers.some((m) => m.id === c.id)) continue;
    const parent = nextMembers.find((m) => m.id === c.memberId);
    if (!parent) continue;
    const seeded = seed.members.find((m) => m.id === c.id);
    const membershipId =
      seeded?.membershipId && !taken.has(seeded.membershipId) ? seeded.membershipId : generateMembershipId(taken);
    taken.add(membershipId);
    nextMembers.push({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: '',
      phone: parent.phone,
      address: parent.address,
      membershipId,
      homeBranchId: parent.homeBranchId,
      type: parent.type,
      status: parent.status,
      birthDate: c.birthDate,
      allergies: c.allergies,
      notes: c.notes,
      householdId: parent.id,
      householdRole: 'dependent',
      hasLogin: false,
    });
  }

  // Restore the seeded demo household members (second adult, teen) when their primary exists.
  const nextCreds = [...credentials];
  for (const s of seed.members) {
    if (!s.householdId || s.householdRole === 'primary') continue;
    if (nextMembers.some((m) => m.id === s.id)) continue;
    if (!nextMembers.some((m) => m.id === s.householdId)) continue;
    if (taken.has(s.membershipId)) continue;
    taken.add(s.membershipId);
    nextMembers.push({ ...s });
    const cred = seed.credentials.find((c) => c.userId === s.id);
    if (cred && !nextCreds.some((c) => c.email === cred.email)) nextCreds.push(cred);
  }
  return { members: nextMembers, memberships: nextMemberships, credentials: nextCreds };
}

const REPEAT_WEEKS_AHEAD = 8;

/**
 * The seed authors one week of classes; repeat the recurring ones for the following weeks so the
 * schedule views never run out of classes.
 */
function extendToNextWeek(state: DemoState): void {
  const baseSchedules = state.schedules.filter((s) => s.category !== 'event' && !/-w\d+$/.test(s.id));
  const baseSlots = state.lessonSlots.filter((s) => !/-w\d+$/.test(s.id));
  const taken = new Set(state.schedules.map((s) => s.id));
  const takenSlots = new Set(state.lessonSlots.map((s) => s.id));

  for (let week = 1; week <= REPEAT_WEEKS_AHEAD; week++) {
    const suffix = `-w${week + 1}`;
    const nextWeek = shiftSeedDates(baseSchedules, week).map((s) => ({ ...s, id: `${s.id}${suffix}` }));
    state.schedules = [...state.schedules, ...nextWeek.filter((s) => !taken.has(s.id))];
    const nextSlots = shiftSeedDates(baseSlots, week).map((s) => ({ ...s, id: `${s.id}${suffix}` }));
    state.lessonSlots = [...state.lessonSlots, ...nextSlots.filter((s) => !takenSlots.has(s.id))];
  }
}

/** Fills in recent gym check-ins and Child Watch visits so the branch looks busy and live. */
function topUpActivity(state: DemoState): DemoState {
  const { arrivals, visits } = generateActivity({
    today: getDemoToday(),
    nowMinutes: easternNowMinutes(),
    members: state.members,
  });
  const arrivalIds = new Set(state.arrivals.map((a) => a.id));
  const arrivedKeys = new Set(state.arrivals.map((a) => `${a.memberId}|${a.date}`));
  const addArrivals = arrivals.filter((a) => !arrivalIds.has(a.id) && !arrivedKeys.has(`${a.memberId}|${a.date}`));
  const visitIds = new Set(state.childWatchVisits.map((v) => v.id));
  const visitKeys = new Set(state.childWatchVisits.map((v) => `${v.childId}|${v.signedInAt.slice(0, 10)}`));
  const addVisits = visits.filter((v) => !visitIds.has(v.id) && !visitKeys.has(`${v.childId}|${v.signedInAt.slice(0, 10)}`));
  if (addArrivals.length === 0 && addVisits.length === 0) return state;
  return {
    ...state,
    arrivals: [...state.arrivals, ...addArrivals],
    childWatchVisits: [...state.childWatchVisits, ...addVisits],
  };
}

function cloneSeed(): DemoState {
  const cloned = shiftSeedDates(JSON.parse(JSON.stringify(SEED)) as DemoState, weeksSinceAnchor());
  cloned.schemaVersion = CURRENT_SCHEMA_VERSION;
  cloned.seedWeekAnchor = currentWeekMonday();
  extendToNextWeek(cloned);
  return cloned;
}

function migrateState(raw: DemoState): DemoState {
  const seed = cloneSeed();
  const seedScheduleMap = new Map(seed.schedules.map((s) => [s.id, s]));

  // Child Watch is no longer a class; drop legacy persisted entries.
  let schedules = raw.schedules?.filter((s) => (s.category as string) !== 'childWatch');
  if (!schedules || schedules.length === 0) {
    schedules = seed.schedules;
  } else {
    const existingIds = new Set(schedules.map((s) => s.id));
    const missingSeed = seed.schedules.filter((s) => !existingIds.has(s.id));
    schedules = [...schedules, ...missingSeed].map((item) => {
      const seedMatch = seedScheduleMap.get(item.id);
      return {
        ...item,
        priceCents: item.priceCents ?? seedMatch?.priceCents ?? 0,
        seniorFriendly: item.seniorFriendly ?? seedMatch?.seniorFriendly ?? false,
        isSpecialEvent: item.isSpecialEvent ?? seedMatch?.isSpecialEvent ?? false,
        registrationRequired:
          seedMatch !== undefined
            ? Boolean(seedMatch.registrationRequired)
            : Boolean(item.registrationRequired),
        shortSummary: item.shortSummary ?? seedMatch?.shortSummary,
        description: item.description ?? seedMatch?.description,
        capacity: item.capacity ?? seedMatch?.capacity ?? 20,
      };
    });
  }

  let mergedStaff = raw.staff ?? seed.staff;
  if (!mergedStaff.some((s) => s.id === 'staff-admin')) {
    const adminStaff = seed.staff.find((s) => s.id === 'staff-admin');
    if (adminStaff) {
      mergedStaff = [adminStaff, ...mergedStaff];
    }
  }
  if (!mergedStaff.some((s) => s.id === 'staff-itadmin')) {
    const itStaff = seed.staff.find((s) => s.id === 'staff-itadmin');
    if (itStaff) {
      mergedStaff = [itStaff, ...mergedStaff];
    }
  }
  if (!mergedStaff.some((s) => s.id === 'staff-alek')) {
    const alekStaff = seed.staff.find((s) => s.id === 'staff-alek');
    if (alekStaff) {
      mergedStaff = [...mergedStaff, alekStaff];
    }
  }
  if (!mergedStaff.some((s) => s.id === 'staff-celine')) {
    const celineStaff = seed.staff.find((s) => s.id === 'staff-celine');
    if (celineStaff) {
      mergedStaff = [...mergedStaff, celineStaff];
    }
  }
  mergedStaff = mergedStaff.map((s) => {
    const upgrade = DIRECTOR_ROLE_UPGRADES[s.id];
    return upgrade && s.staffRole === upgrade.legacyStaffRole ? { ...s, staffRole: upgrade.role } : s;
  });

  // Repair persisted staff: restore any missing trainers / instructors / directors from the seed,
  // and fix records whose role is missing or no longer valid (they would vanish from team lists).
  const COACH_ROLES = new Set<StaffRole>(['trainer', 'swim_instructor', 'wellness_director', 'aquatics_director']);
  mergedStaff = mergedStaff.map((s) => {
    const seeded = seed.staff.find((x) => x.id === s.id);
    if (seeded && (!s.staffRole || personaForRole(s.staffRole) === null)) {
      return { ...s, staffRole: seeded.staffRole };
    }
    return s;
  });
  for (const seeded of seed.staff) {
    if (seeded.staffRole && COACH_ROLES.has(seeded.staffRole) && !mergedStaff.some((s) => s.id === seeded.id)) {
      mergedStaff = [...mergedStaff, seeded];
    }
  }

  // Replace legacy persisted names/labels with the current seed values.
  const LEGACY_NAMES = new Set<string>();
  mergedStaff = mergedStaff.map((s) => {
    const seeded = seed.staff.find((x) => x.id === s.id);
    if (!seeded) return s;
    const next = { ...s };
    if (LEGACY_NAMES.has(s.name)) next.name = seeded.name;
    // One-time sync so persisted demo accounts match the names shown in the role switcher.
    if ((raw.schemaVersion ?? 0) < 7) {
      next.name = seeded.name;
      next.roleLabel = seeded.roleLabel;
    }
    if (s.roleLabel.includes('Incharge of') || s.roleLabel.includes('Senior Mobility')) next.roleLabel = seeded.roleLabel;
    if (seeded.staffRole === 'swim_instructor') next.lessonTypes = seeded.lessonTypes;
    return next;
  });

  mergedStaff = mergedStaff.map((s) => ({
    ...s,
    lessonTypes: s.lessonTypes ?? seed.staff.find((x) => x.id === s.id)?.lessonTypes,
  }));

  const rawSlots = raw.lessonSlots ?? seed.lessonSlots;
  const slotIds = new Set(rawSlots.map((s) => s.id));
  const mergedSlots = [...rawSlots, ...seed.lessonSlots.filter((s) => !slotIds.has(s.id))];

  // Add the Front Desk Membership Rep demo account to persisted state.
  if (!mergedStaff.some((s) => s.id === 'staff-frontdesk')) {
    const rep = seed.staff.find((s) => s.id === 'staff-frontdesk');
    if (rep) mergedStaff = [...mergedStaff, rep];
  }

  if (!mergedStaff.some((s) => s.id === 'staff-maint')) {
    const maint = seed.staff.find((s) => s.id === 'staff-maint');
    if (maint) mergedStaff = [...mergedStaff, maint];
  }

  let mergedMembers = raw.members ?? seed.members;
  if ((raw.schemaVersion ?? 0) < 8) {
    for (const id of ['member-riley', 'member-sam', 'member-nora']) {
      const m = seed.members.find((x) => x.id === id);
      if (m && !mergedMembers.some((x) => x.id === id)) mergedMembers = [...mergedMembers, m];
    }
  }
  if ((raw.schemaVersion ?? 0) < 7) {
    mergedMembers = mergedMembers.map((m) => {
      const seeded = seed.members.find((x) => x.id === m.id);
      return seeded ? { ...m, name: seeded.name } : m;
    });
  }
  if (!mergedMembers.some((m) => m.id === 'guest-taylor')) {
    const guestMember = seed.members.find((m) => m.id === 'guest-taylor');
    if (guestMember) {
      mergedMembers = [...mergedMembers, guestMember];
    }
  }

  let mergedMemberships = raw.memberships ?? seed.memberships;
  if (!mergedMemberships.some((m) => m.memberId === 'guest-taylor')) {
    const guestMembership = seed.memberships.find((m) => m.memberId === 'guest-taylor');
    if (guestMembership) {
      mergedMemberships = [...mergedMemberships, guestMembership];
    }
  }

  if ((raw.schemaVersion ?? 0) < 8) {
    for (const id of ['member-riley', 'member-sam', 'member-nora']) {
      const ms = seed.memberships.find((x) => x.memberId === id);
      if (ms && !mergedMemberships.some((x) => x.memberId === id)) mergedMemberships = [...mergedMemberships, ms];
    }
  }

  let mergedCreds = (raw.credentials ?? seed.credentials).map((c) => {
    const seedCred = seed.credentials.find((sc) => sc.email === c.email);
    const upgrade = DIRECTOR_ROLE_UPGRADES[c.userId];
    if (upgrade && c.role === upgrade.legacyRole) {
      return { ...c, role: upgrade.role };
    }
    return seedCred ? { ...c, role: c.role ?? seedCred.role } : c;
  });
  if (!mergedCreds.some((c) => c.email === 'admin@silverspring.ymca')) {
    const adminCred = seed.credentials.find((c) => c.email === 'admin@silverspring.ymca');
    if (adminCred) {
      mergedCreds = [adminCred, ...mergedCreds];
    }
  }
  if (!mergedCreds.some((c) => c.email === 'itadmin@silverspring.ymca')) {
    const itCred = seed.credentials.find((c) => c.email === 'itadmin@silverspring.ymca');
    if (itCred) {
      mergedCreds = [itCred, ...mergedCreds];
    }
  }
  if (!mergedCreds.some((c) => c.email === 'aquatics@silverspring.ymca')) {
    const alekCred = seed.credentials.find((c) => c.email === 'aquatics@silverspring.ymca');
    if (alekCred) mergedCreds = [...mergedCreds, alekCred];
  }
  if (!mergedCreds.some((c) => c.email === 'celine@silverspring.ymca')) {
    const celineCred = seed.credentials.find((c) => c.email === 'celine@silverspring.ymca');
    if (celineCred) {
      mergedCreds = [...mergedCreds, celineCred];
    }
  }
  if (!mergedCreds.some((c) => c.email === 'frontdesk@silverspring.ymca')) {
    const repCred = seed.credentials.find((c) => c.email === 'frontdesk@silverspring.ymca');
    if (repCred) mergedCreds = [...mergedCreds, repCred];
  }
  if (!mergedCreds.some((c) => c.email === 'maintenance@silverspring.ymca')) {
    const maintCred = seed.credentials.find((c) => c.email === 'maintenance@silverspring.ymca');
    if (maintCred) mergedCreds = [...mergedCreds, maintCred];
  }
  if (!mergedCreds.some((c) => c.email === 'guest@silverspring.ymca')) {
    const guestCred = seed.credentials.find((c) => c.email === 'guest@silverspring.ymca');
    if (guestCred) {
      mergedCreds = [...mergedCreds, guestCred];
    }
  }

  const forumReplies = raw.forumReplies ?? seed.forumReplies ?? [];
  const forumInterests = raw.forumInterests ?? seed.forumInterests ?? {};
  const rawTopics = raw.forumTopics ?? seed.forumTopics ?? [];

  const forumTopics = rawTopics.map((topic) => {
    const seedTopic = seed.forumTopics.find((st) => st.id === topic.id);
    const topicReplies = forumReplies
      .filter((r) => r.topicId === topic.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const participantSet = new Set<string>(topic.participantIds ?? seedTopic?.participantIds ?? []);
    const lastChattedAtBy: Record<string, string> = {
      ...(seedTopic?.lastChattedAtBy ?? {}),
      ...(topic.lastChattedAtBy ?? {}),
    };

    for (const r of topicReplies) {
      participantSet.add(r.authorId);
      const prev = lastChattedAtBy[r.authorId];
      if (!prev || r.createdAt > prev) {
        lastChattedAtBy[r.authorId] = r.createdAt;
      }
    }

    const interestedSet = new Set<string>(topic.interestedBy ?? seedTopic?.interestedBy ?? []);
    for (const [uid, prefs] of Object.entries(forumInterests)) {
      if (prefs?.topicIds?.includes(topic.id)) {
        interestedSet.add(uid);
      }
    }

    return {
      ...topic,
      interestedBy: Array.from(interestedSet),
      participantIds: Array.from(participantSet),
      lastChattedAtBy,
    };
  });

  const scheduleById = new Map(schedules.map((s) => [s.id, s]));
  let cleanedRegistrations = raw.classRegistrations ?? [];
  if ((raw.schemaVersion ?? 0) < 4) {
    cleanedRegistrations = cleanedRegistrations.filter((reg) => {
      const sched = scheduleById.get(reg.scheduleItemId);
      if (!sched) return false;
      return Boolean(sched.registrationRequired) || Boolean(sched.isSpecialEvent) || sched.category === 'event';
    });
  }

  const households = migrateHouseholds(raw, seed, mergedMembers, mergedMemberships, mergedCreds);
  mergedMembers = households.members;
  mergedMemberships = households.memberships;
  mergedCreds = households.credentials;

  const migrated: DemoState & { childProfiles?: unknown } = {
    ...seed,
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    members: mergedMembers,
    memberships: mergedMemberships,
    staff: mergedStaff,
    schedules,
    classRegistrations: cleanedRegistrations,
    lessonSlots: mergedSlots,
    trainerAvailability: raw.trainerAvailability ?? seed.trainerAvailability,
    sessionRequests: raw.sessionRequests ?? seed.sessionRequests,
    privateLessons: raw.privateLessons ?? [],
    announcements: raw.announcements ?? seed.announcements,
    notifications: raw.notifications ?? seed.notifications,
    donations: raw.donations ?? seed.donations,
    credentials: mergedCreds,
    classForumPosts: raw.classForumPosts ?? seed.classForumPosts ?? [],
    forumTopics,
    forumReplies,
    forumInterests,
    notificationPreferences: raw.notificationPreferences ?? seed.notificationPreferences ?? {},
    supportTickets: raw.supportTickets ?? seed.supportTickets ?? [],
    complaintsSuggestions: raw.complaintsSuggestions ?? seed.complaintsSuggestions ?? [],
    workoutLogs: raw.workoutLogs ?? seed.workoutLogs ?? [],
    clientGoals: raw.clientGoals ?? seed.clientGoals ?? {},
    surveys: raw.surveys ?? seed.surveys ?? [],
    surveyResponses: raw.surveyResponses ?? seed.surveyResponses ?? [],
    lessonPricing: normalizePricing(raw.lessonPricing),
    swimEnrollments: raw.swimEnrollments ?? [],
    childWatchVisits: raw.childWatchVisits ?? [],
    childWatchAuthorizedPickups: raw.childWatchAuthorizedPickups ?? seed.childWatchAuthorizedPickups ?? [],
    childWatchIncidents: raw.childWatchIncidents ?? seed.childWatchIncidents ?? [],
    childWatchHeadcounts: raw.childWatchHeadcounts ?? seed.childWatchHeadcounts ?? [],
    childWatchShifts: raw.childWatchShifts ?? seed.childWatchShifts ?? [],
    childWatchAudit: raw.childWatchAudit ?? seed.childWatchAudit ?? [],
    arrivals: raw.arrivals ?? [],
    memberContacts: raw.memberContacts ?? seed.memberContacts,
    leads: raw.leads ?? seed.leads,
    enrollmentCampaigns: raw.enrollmentCampaigns ?? seed.enrollmentCampaigns,
    appConfig: normalizeAppConfig(raw.appConfig),
    configAudit: raw.configAudit ?? [],
  };
  delete migrated.childProfiles;
  return migrated;
}

/*
 * In-memory cache.
 * Every adapter call does load -> modify -> save, and screens fire dozens of calls at once (e.g.
 * one roster lookup per class). Re-reading AsyncStorage and re-running the full migration blocked
 * the JS thread and made every tap feel slow. We migrate once per launch and keep the state in
 * memory, with debounced background writes to disk.
 *
 * Callers mutate what they load (and hand those objects to React state), so each load must stay
 * isolated: loadStore returns a lazy view that deep-copies a collection only when a call first
 * touches it, and saveStore merges just the touched collections back into the cache.
 * Jest tests manipulate AsyncStorage directly, so the cache is bypassed there
 * (set YMCA_FORCE_CACHE=1 to exercise it).
 */
const CACHE_ENABLED =
  (typeof process !== 'undefined' && process.env?.YMCA_FORCE_CACHE === '1') ||
  !(typeof process !== 'undefined' && process.env?.JEST_WORKER_ID);
/** How often the cached state gets fresh "live" check-ins / week alignment. */
const LIVE_REFRESH_MS = 60_000;
/** Coalesce rapid saves into one disk write. */
const PERSIST_DEBOUNCE_MS = 500;

let cachedState: DemoState | null = null;
let cachedAt = 0;
let initialLoad: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight: Promise<void> | null = null;

function setCache(state: DemoState) {
  cachedState = state;
  cachedAt = Date.now();
}

async function flushPersist(): Promise<void> {
  persistTimer = null;
  if (persistInFlight) await persistInFlight;
  if (!cachedState) return;
  persistInFlight = (async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
    } catch (err) {
      console.warn('[demoStore] Failed to persist state', err);
    }
  })();
  await persistInFlight;
  persistInFlight = null;
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => void flushPersist(), PERSIST_DEBOUNCE_MS);
}

function alignToCurrentWeek(state: DemoState): DemoState {
  const weeks = Math.round(
    (Date.parse(currentWeekMonday()) - Date.parse(state.seedWeekAnchor ?? currentWeekMonday())) / (7 * 86_400_000)
  );
  const aligned = weeks > 0 ? shiftSeedDates(state, weeks) : state;
  aligned.seedWeekAnchor = currentWeekMonday();
  return aligned;
}

const views = new WeakMap<object, Record<string, unknown>>();

function cloneValue<T>(v: T): T {
  return v !== null && typeof v === 'object' ? (JSON.parse(JSON.stringify(v)) as T) : v;
}

/** Lazy, isolated copy of `base`: top-level collections are deep-copied on first access. */
function makeView(base: DemoState): DemoState {
  const touched: Record<string, unknown> = {};
  const baseRec = base as unknown as Record<string, unknown>;
  const view: DemoState = new Proxy({} as DemoState, {
    get(_t, key) {
      if (typeof key !== 'string') return undefined;
      if (key in touched) return touched[key];
      if (!(key in baseRec)) return undefined;
      touched[key] = cloneValue(baseRec[key]);
      return touched[key];
    },
    set(_t, key, value) {
      touched[key as string] = value;
      return true;
    },
    has(_t, key) {
      return key in touched || key in baseRec;
    },
    ownKeys() {
      return Array.from(new Set([...Object.keys(baseRec), ...Object.keys(touched)]));
    },
    getOwnPropertyDescriptor(_t, key) {
      if (typeof key !== 'string' || !(key in touched || key in baseRec)) return undefined;
      return {
        enumerable: true,
        configurable: true,
        writable: true,
        value: (view as unknown as Record<string, unknown>)[key],
      };
    },
  });
  views.set(view, touched);
  return view;
}

async function resetToSeed(): Promise<DemoState> {
  const state = topUpActivity(cloneSeed());
  if (CACHE_ENABLED) {
    setCache(state);
    schedulePersist();
  } else {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

export async function resetStore(): Promise<DemoState> {
  const state = await resetToSeed();
  return CACHE_ENABLED ? makeView(state) : state;
}

export async function saveStore(state: DemoState): Promise<void> {
  if (!CACHE_ENABLED) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  const touched = views.get(state);
  if (touched && cachedState) {
    cachedState = { ...cachedState, ...touched } as DemoState;
  } else {
    cachedState = state;
  }
  schedulePersist();
}

export async function loadStore(): Promise<DemoState> {
  if (!CACHE_ENABLED) return loadStoreFromDisk();

  if (cachedState === null) {
    if (!initialLoad) {
      initialLoad = loadStoreFromDisk()
        .then((state) => {
          // A save may have landed while we were reading; never clobber newer state.
          if (cachedState === null) setCache(state);
        })
        .finally(() => {
          initialLoad = null;
        });
    }
    await initialLoad;
  } else if (Date.now() - cachedAt > LIVE_REFRESH_MS) {
    setCache(topUpActivity(alignToCurrentWeek(cachedState)));
    schedulePersist();
  }

  return makeView(cachedState as DemoState);
}

async function loadStoreFromDisk(): Promise<DemoState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw == null) {
    return resetToSeed();
  }
  const parsed = JSON.parse(raw) as DemoState;
  // Older installs hold the previous, much smaller sample data set: replace it once.
  if ((parsed.schemaVersion ?? 0) < CURRENT_SCHEMA_VERSION) {
    return resetToSeed();
  }
  // Keep stored dates aligned with the current calendar week.
  return topUpActivity(migrateState(alignToCurrentWeek(parsed)));
}
