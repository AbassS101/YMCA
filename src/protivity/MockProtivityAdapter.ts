import { canManageAnnouncement } from '@/domain/announcementAccess';
import {
  APP_CONFIG_SECTIONS,
  applyConfigPatch,
  CONFIG_SECTION_LABELS,
  defaultsForReset,
  describeConfigChange,
  FEATURE_TOGGLE_LABELS,
  normalizeAppConfig,
  swimClassCapacity,
  type AppConfig,
  type AppConfigPatch,
  type AppConfigPlan,
  type AppConfigSection,
  type ConfigAuditEntry,
  type FeatureToggles,
} from '@/domain/appConfig';
import { computeCancelDates } from '@/domain/cancelDates';
import { canManageTrainerAvailability, canViewTrainerAvailability, isCoachStaff } from '@/domain/availabilityAccess';
import { addDaysToDate, demoNowIso, getDemoToday } from '@/domain/demoClock';
import { AQUATICS_CLASSES } from '@/domain/aquaticsGuideData';
import {
  lessonPriceCents,
  normalizePricing,
  pricingTierFor,
  swimClassPriceCents,
} from '@/domain/lessonPricing';
import { activeCampaignFor } from '@/domain/enrollmentCampaigns';
import {
  availableAt,
  busyIntervals,
  overlaps,
  sessionLengthsFor,
  type Interval,
} from '@/domain/sessionAvailability';
import {
  expandAvailability,
  findConflicts,
  normalizeAvailability,
  validateAvailability,
} from '@/domain/trainerAvailability';
import { canInstantBook, canTransition, canViewSessionRequest } from '@/domain/sessionRequests';
import {
  canEditConfigSection,
  hasCapability,
  isStaffRole,
  type ConfigSection,
  type StaffCapability,
} from '@/domain/staffCapabilities';
import {
  ageOn,
  canHoldSoloMembership,
  findPlan,
  generateMembershipId,
  isFamilyPlan,
  validateHousehold,
} from '@/domain/householdAccess';
import {
  effectiveEnrollmentFeeCents,
  filterProfanity,
  isAdminRole,
  type ArrivalRecord,
  type ArrivalResult,
  type BillingIssueRow,
  type ArrivalSource,
  type EnrollmentCampaign,
  type HouseholdMemberInput,
  type HouseholdView,
  type Lead,
  type MemberContact,
  type Announcement,
  type AppNotification,
  type AttendanceStatus,
  type CancelRequest,
  type ClassForumPost,
  type ClassRegistration,
  type ClientFitnessGoal,
  type ClientWorkoutLog,
  type ComplaintSuggestion,
  type FeedbackDepartment,
  type Donation,
  type FeedbackStatus,
  type ForumContentReportInput,
  type ForumReply,
  type ForumTopic,
  type ForumTopicCategory,
  type BookLessonOptions,
  type AvailabilityConflict,
  type BookableTime,
  type TrainerAvailability,
  type TrainerAvailabilityInput,
  type CreateSessionRequestInput,
  type LessonType,
  type SessionRequest,
  type SessionRequestAction,
  type SessionRequestFilter,
  type SessionRequestResponse,
  type LessonPricing,
  type SwimClassEnrollment,
  type LessonSlot,
  type Member,
  type Membership,
  type Message,
  type NotificationPreferences,
  type PrivateLesson,
  type ScheduleCategory,
  type ScheduleItem,
  type Staff,
  type StaffRole,
  type SupportTicket,
  type Survey,
  type SurveyResponse,
  type Thread,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
  type UserForumInterests,
  type ChildProfile,
  type ChildWatchAuditAction,
  type ChildWatchAuditEntry,
  type ChildWatchAuthorizedPickup,
  type ChildWatchDropOffResult,
  type ChildWatchHeadcount,
  type ChildWatchIncident,
  type ChildWatchIncidentType,
  type ChildWatchShift,
  type ChildWatchVisit,
  type UserRole,
} from '@/domain/types';
import { loadStore, saveStore, type DemoState } from '@/storage/demoStore';
import { ageInWeeks, demoNow, formatLimit, validateSignIn } from '@/domain/childWatch';
import { generatePickupCode, hashPickupCode, isGuardianOf, redactVisit, validatePickup } from '@/domain/childWatchSecurity';
import { staffOnDutyAt } from '@/domain/childWatchStaffing';
import type { ChildWatchAuditFilter, ProtivityPort } from '@/protivity/ProtivityPort';

/** Calendar day from seeded ISO datetimes (YYYY-MM-DD), TZ-independent. */
function scheduleCalendarDay(isoStart: string): string {
  return isoStart.slice(0, 10);
}

function configOf(state: DemoState): AppConfig {
  return normalizeAppConfig(state.appConfig);
}

/** Throws when a feature has been turned off in the Admin Control Center. */
function assertFeatureOn(state: DemoState, feature: keyof FeatureToggles): void {
  if (!configOf(state).featureToggles[feature]) {
    throw new Error(`${FEATURE_TOGGLE_LABELS[feature]}: this feature is turned off right now.`);
  }
}

/** The configured plan a new signup lands on. Retired plans cannot be bought; unknown ids fall back to the first offered plan. */
function planForSignup(state: DemoState, planIdOrName: string): AppConfigPlan {
  const plans = configOf(state).membershipPlans;
  const plan = findPlan(planIdOrName, plans) ?? plans.find((p) => p.active) ?? plans[0];
  if (!plan.active) throw new Error(`${plan.name} is no longer offered.`);
  return plan;
}

/** A retired plan cannot be switched to, unless the member is already on it. */
function assertPlanOffered(plans: AppConfigPlan[], planName: string, currentRateName: string): void {
  const target = findPlan(planName, plans);
  if (target && !target.active && findPlan(currentRateName, plans)?.id !== target.id) {
    throw new Error(`${target.name} is no longer offered.`);
  }
}

function resolveCampaign(state: DemoState, planId: string, campaignId?: string): EnrollmentCampaign | null {
  const campaigns = state.enrollmentCampaigns ?? [];
  if (campaignId) {
    const picked = campaigns.find((c) => c.id === campaignId);
    if (picked && picked.active) return picked;
  }
  return activeCampaignFor(getDemoToday(), planId, campaigns);
}

function buildHouseholdMember(state: DemoState, primary: Member, input: HouseholdMemberInput): Member {
  const name = input.name.trim();
  if (!name) throw new Error('Enter a name for the family member.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) || Number.isNaN(Date.parse(input.birthDate))) {
    throw new Error('Enter a valid birth date (YYYY-MM-DD).');
  }
  const today = getDemoToday();
  if (input.birthDate > today) throw new Error('Birth date cannot be in the future.');
  const age = ageOn(input.birthDate, today);
  const email = (input.email ?? '').trim().toLowerCase();
  const wantsLogin = age >= 13 && email.length > 0;
  if (wantsLogin) {
    if (!email.includes('@') || !email.includes('.')) throw new Error(`Enter a valid email for ${name}.`);
    if (
      state.members.some((m) => m.email.toLowerCase() === email) ||
      state.credentials.some((c) => c.email.toLowerCase() === email)
    ) {
      throw new Error(`${email} already has an account.`);
    }
  }
  const id = `member-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const member: Member = {
    id,
    name,
    email: wantsLogin ? email : '',
    phone: primary.phone,
    address: primary.address,
    membershipId: generateMembershipId(new Set(state.members.map((m) => m.membershipId))),
    homeBranchId: primary.homeBranchId,
    type: primary.type,
    status: primary.status,
    birthDate: input.birthDate,
    allergies: input.allergies?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    householdId: primary.id,
    householdRole: age >= 18 ? 'adult' : 'dependent',
    hasLogin: wantsLogin,
  };
  state.members.push(member);
  if (wantsLogin) {
    state.credentials.push({ email, password: 'ymca-demo', userId: id, role: 'member' });
    state.notifications.unshift({
      id: `notif-household-${id}`,
      userId: id,
      title: `Welcome to the ${primary.type} plan, ${name.split(' ')[0]}!`,
      body: `${primary.name} added you to their family membership. Sign in with ${email} (temporary password: ymca-demo) and use your own barcode #${member.membershipId} at the desk.`,
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/home',
    });
  }
  return member;
}

/** Match a typed/picked participant name to someone on the member's household. */
function participantIdFor(state: DemoState, memberId: string, name?: string): string | undefined {
  const wanted = name?.trim().toLowerCase();
  if (!wanted) return undefined;
  const primaryId = state.members.find((m) => m.id === memberId)?.householdId ?? memberId;
  return householdMembersOf(state, primaryId).find((m) => m.name.toLowerCase() === wanted)?.id;
}

/** The paying (primary) member id for any member of a household; standalone members are their own primary. */
function householdPrimaryId(state: DemoState, memberId: string): string {
  return state.members.find((m) => m.id === memberId)?.householdId ?? memberId;
}

/** Primary first, then everyone else in the household. Standalone members return just themselves. */
function householdMembersOf(state: DemoState, primaryId: string): Member[] {
  const primary = state.members.find((m) => m.id === primaryId);
  const others = state.members.filter((m) => m.householdId === primaryId && m.id !== primaryId);
  return primary ? [primary, ...others] : others;
}

function assertPrimary(state: DemoState, memberId: string, action: string): void {
  const primaryId = householdPrimaryId(state, memberId);
  if (primaryId !== memberId) {
    const primary = state.members.find((m) => m.id === primaryId);
    throw new Error(`Only the primary member${primary ? ` (${primary.name})` : ''} can ${action}.`);
  }
}

function setHouseholdStatus(state: DemoState, primaryId: string, status: Member['status']): void {
  for (const m of householdMembersOf(state, primaryId)) m.status = status;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function defaultNotificationPreferences(userId: string): NotificationPreferences {
  const isStaff = userId.startsWith('staff') || userId.startsWith('trainer');
  return {
    userId,
    mentions: true,
    topicReplies: true,
    interestedTopicActivity: true,
    chattedTopicReplies: true,
    classForumAlerts: true,
    staffInquiries: isStaff,
    announcements: true,
    events: true,
    directMessages: true,
    clientArrivals: true,
    emailDigest: isStaff ? 'instant' : 'daily',
    pushEnabled: true,
    inAppBannerEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };
}

function defaultForumInterests(userId: string): UserForumInterests {
  return {
    userId,
    categories: [],
    topicIds: [],
    classIds: [],
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMentionsFromText(
  text: string,
  state: DemoState
): {
  allIds: string[];
  allNames: string[];
  staffIds: string[];
  staffNames: string[];
} {
  if (!text || !text.includes('@')) {
    return { allIds: [], allNames: [], staffIds: [], staffNames: [] };
  }

  type Candidate = {
    id: string;
    name: string;
    isStaff: boolean;
    aliases: string[];
  };

  const candidates: Candidate[] = [
    {
      id: 'staff-all',
      name: 'All Staff Desk',
      isStaff: true,
      aliases: ['all staff desk', 'all staff', 'staff desk', 'staff-all'],
    },
  ];

  const seenIds = new Set<string>(['staff-all']);

  for (const s of state.staff ?? []) {
    if (seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    const first = s.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    const compact = s.name.replace(/\s+/g, '').toLowerCase();
    candidates.push({
      id: s.id,
      name: s.name,
      isStaff: true,
      aliases: Array.from(new Set([s.name.toLowerCase(), compact, s.id.toLowerCase(), first].filter(Boolean))),
    });
  }

  for (const m of state.members ?? []) {
    if (seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    const first = m.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    const compact = m.name.replace(/\s+/g, '').toLowerCase();
    candidates.push({
      id: m.id,
      name: m.name,
      isStaff: false,
      aliases: Array.from(new Set([m.name.toLowerCase(), compact, m.id.toLowerCase(), first].filter(Boolean))),
    });
  }

  // Also include any authors from existing forum topics/replies/class posts
  const extraAuthors: { id: string; name: string; role: string }[] = [];
  for (const t of state.forumTopics ?? []) {
    extraAuthors.push({ id: t.authorId, name: t.authorName, role: String(t.authorRole) });
  }
  for (const r of state.forumReplies ?? []) {
    extraAuthors.push({ id: r.authorId, name: r.authorName, role: String(r.authorRole) });
  }
  for (const p of state.classForumPosts ?? []) {
    extraAuthors.push({ id: p.authorId, name: p.authorName, role: String(p.authorRole) });
  }
  for (const a of extraAuthors) {
    if (!a.id || !a.name || seenIds.has(a.id)) continue;
    seenIds.add(a.id);
    const first = a.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    const compact = a.name.replace(/\s+/g, '').toLowerCase();
    const isStaff = a.id.startsWith('staff') || a.role !== 'member';
    candidates.push({
      id: a.id,
      name: a.name,
      isStaff,
      aliases: Array.from(new Set([a.name.toLowerCase(), compact, a.id.toLowerCase(), first].filter(Boolean))),
    });
  }

  const allIds: string[] = [];
  const allNames: string[] = [];
  const staffIds: string[] = [];
  const staffNames: string[] = [];

  for (const cand of candidates) {
    const matched = cand.aliases.some((alias) => {
      const pattern = new RegExp(`(?:^|\\s)@${escapeRegex(alias)}(?=$|\\s|[.,!?:;\\)\\]])`, 'i');
      return pattern.test(text);
    });
    if (matched) {
      allIds.push(cand.id);
      allNames.push(cand.name);
      if (cand.isStaff) {
        staffIds.push(cand.id);
        staffNames.push(cand.name);
      }
    }
  }

  return { allIds, allNames, staffIds, staffNames };
}

function credentialRoleForStaffRole(staffRole?: StaffRole): UserRole {
  switch (staffRole) {
    case 'it_admin':
    case 'staff_admin':
    case 'admin':
    case 'trainer':
    case 'swim_instructor':
    case 'wellness_director':
    case 'aquatics_director':
    case 'membership_director':
    case 'child_watch_supervisor':
    case 'child_watch_director':
    case 'maintenance':
      return staffRole;
    default:
      return 'staff';
  }
}

function requesterRole(state: DemoState, requesterUserId: string): UserRole | StaffRole | undefined {
  return (
    state.credentials.find((c) => c.userId === requesterUserId)?.role ??
    state.staff.find((s) => s.id === requesterUserId)?.staffRole
  );
}

/** Member self-service calls omit the requester; staff calls must pass it so the role can be checked. */
function assertStaffCapability(
  state: DemoState,
  requesterUserId: string | undefined,
  capability: StaffCapability,
  action: string
): void {
  if (requesterUserId === undefined) return;
  if (!hasCapability(requesterRole(state, requesterUserId), capability)) {
    throw new Error(`Your staff role is not permitted to ${action}.`);
  }
}

/** Unlike assertStaffCapability, config changes always need a requester: there is no member path. */
function assertConfigSectionAccess(
  state: DemoState,
  requesterUserId: string | undefined,
  section: ConfigSection
): void {
  if (!requesterUserId) throw new Error('Sign in as staff to change settings.');
  if (!canEditConfigSection(requesterRole(state, requesterUserId), section)) {
    throw new Error(`Your staff role is not permitted to change ${CONFIG_SECTION_LABELS[section]}.`);
  }
}

const CONFIG_AUDIT_LIMIT = 200;

/** Adds a change log entry (newest first, keeping the newest 200). Skips no-op saves. A missing requester is logged as System. */
function recordConfigAudit(
  state: DemoState,
  requesterUserId: string | undefined,
  section: ConfigSection,
  before: unknown,
  after: unknown,
  summary?: string
): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  const staff = requesterUserId ? state.staff.find((s) => s.id === requesterUserId) : undefined;
  const log = state.configAudit ?? (state.configAudit = []);
  log.unshift({
    id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: demoNowIso(),
    byId: requesterUserId ?? 'system',
    byName: staff?.name ?? (requesterUserId ? 'Staff' : 'System'),
    byRole: requesterUserId ? requesterRole(state, requesterUserId) ?? '' : 'system',
    section,
    summary: summary ?? describeConfigChange(section, before, after),
    before,
    after,
  });
  if (log.length > CONFIG_AUDIT_LIMIT) log.length = CONFIG_AUDIT_LIMIT;
}

const COACH_STAFF_ROLES = new Set<string>(['trainer', 'swim_instructor', 'wellness_director', 'aquatics_director']);

function offersLessonType(s: Staff, t: LessonType): boolean {
  const types: LessonType[] =
    s.lessonTypes ?? (s.staffRole === 'swim_instructor' || s.staffRole === 'aquatics_director' ? ['swim'] : ['training']);
  return COACH_STAFF_ROLES.has(s.staffRole ?? '') && types.includes(t);
}

function staffBusy(state: DemoState, staffId: string, excludeRequestId?: string): Interval[] {
  return busyIntervals(
    state.privateLessons.filter((l) => l.staffId === staffId),
    (state.sessionRequests ?? []).filter((r) => r.staffId === staffId && r.id !== excludeRequestId)
  );
}

function memberBusy(state: DemoState, memberId: string, excludeRequestId?: string): Interval[] {
  const regs = state.classRegistrations
    .filter((r) => r.memberId === memberId && r.status === 'registered')
    .map((r) => state.schedules.find((s) => s.id === r.scheduleItemId))
    .filter((s): s is ScheduleItem => Boolean(s))
    .map((s) => ({ start: s.start, end: s.end }));
  return [
    ...regs,
    ...busyIntervals(
      state.privateLessons.filter((l) => l.memberId === memberId),
      (state.sessionRequests ?? []).filter((r) => r.memberId === memberId && r.id !== excludeRequestId)
    ),
  ];
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

/** Weekly availability expanded for the dates, merged with the trainer's one-off lesson slots. */
function windowsFor(state: DemoState, staffId: string, fromDate: string, toDate: string): LessonSlot[] {
  const staff = state.staff.find((s) => s.id === staffId);
  const weekly = expandAvailability(state.trainerAvailability?.[staffId], staff?.homeBranchId ?? '', fromDate, toDate);
  const oneOff = state.lessonSlots.filter((w) => {
    const day = scheduleCalendarDay(w.start);
    return w.staffId === staffId && day >= fromDate && day <= toDate;
  });
  return [...weekly, ...oneOff];
}

/** The window that fully contains the interval, if any (checks the days either side for UTC/Eastern drift). */
function windowContaining(state: DemoState, staffId: string, iv: Interval): LessonSlot | undefined {
  const s = new Date(iv.start).getTime();
  const e = new Date(iv.end).getTime();
  const day = iv.start.slice(0, 10);
  return windowsFor(state, staffId, addDaysToDate(day, -1), addDaysToDate(day, 1)).find(
    (w) => new Date(w.start).getTime() <= s && new Date(w.end).getTime() >= e
  );
}

function isInsideWindow(state: DemoState, staffId: string, iv: Interval): boolean {
  return Boolean(windowContaining(state, staffId, iv));
}

/** Throws unless the requester may manage this trainer's availability and session requests. */
function assertCanManageAvailability(state: DemoState, requesterUserId: string, staffId: string): Staff {
  const target = state.staff.find((s) => s.id === staffId);
  if (!target) throw new Error(`Staff member not found: ${staffId}`);
  if (!canManageTrainerAvailability(requesterRole(state, requesterUserId), requesterUserId, target)) {
    throw new Error('Your staff role is not permitted to manage this trainer\u2019s availability.');
  }
  return target;
}

/** Throws unless the requester may see this trainer's full hours (read-only unless they can also manage). */
function assertCanViewAvailability(state: DemoState, requesterUserId: string, staffId: string): Staff {
  const target = state.staff.find((s) => s.id === staffId);
  if (!target) throw new Error(`Staff member not found: ${staffId}`);
  if (!isCoachStaff(target) || !canViewTrainerAvailability(requesterRole(state, requesterUserId), requesterUserId, target)) {
    throw new Error('Your staff role is not permitted to view this trainer’s availability.');
  }
  return target;
}

/** Declines every other open request that overlaps a time that was just booked for the same trainer. */
function declineOverlappingRequests(state: DemoState, accepted: SessionRequest): void {
  for (const other of state.sessionRequests ?? []) {
    if (other.id === accepted.id || other.staffId !== accepted.staffId) continue;
    if (other.status !== 'pending' && other.status !== 'countered') continue;
    if (!overlaps(other, accepted)) continue;
    other.status = 'declined';
    pushRequestEvent(state, other, accepted.staffId, 'declined', { note: 'That time was booked by another member.' });
    notifyUser(
      state,
      other.memberId,
      'Session declined',
      `${other.staffName ?? 'Your instructor'} is no longer available ${describeWhen(other.start)}. Pick another time.`,
      '/(member)/(tabs)/schedules'
    );
  }
}

function assertTimeFree(state: DemoState, req: SessionRequest, iv: Interval): void {
  if (staffBusy(state, req.staffId, req.id).some((b) => overlaps(iv, b))) {
    throw new Error('That time is no longer available with this instructor.');
  }
  if (memberBusy(state, req.memberId, req.id).some((b) => overlaps(iv, b))) {
    throw new Error('The member already has something scheduled at that time.');
  }
}

function notifyUser(state: DemoState, userId: string, title: string, body: string, link?: string): void {
  state.notifications.unshift({
    id: `notif-sreq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    title,
    body,
    type: 'general',
    createdAt: new Date().toISOString(),
    read: false,
    link,
  });
}

function pushRequestEvent(
  state: DemoState,
  req: SessionRequest,
  byId: string,
  action: SessionRequestAction,
  extra: { start?: string; end?: string; note?: string } = {}
): void {
  const staff = state.staff.find((s) => s.id === byId);
  const member = state.members.find((m) => m.id === byId);
  req.history.push({
    at: new Date().toISOString(),
    byId,
    byName: staff?.name ?? member?.name ?? byId,
    byRole: staff?.staffRole ?? 'member',
    action,
    ...extra,
  });
}

function describeWhen(iso: string): string {
  return `${new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(
    iso
  ).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

/** Turns a request into a booked lesson. "Pay before" charges now; "pay after" leaves the balance due. */
function confirmSessionRequest(state: DemoState, req: SessionRequest): PrivateLesson {
  const priceCents = lessonPriceCents(state.lessonPricing, req.lessonType, req.durationMin);
  const membership = state.memberships.find((m) => m.memberId === req.memberId);
  const payNow = req.paymentTiming === 'before';
  const lesson: PrivateLesson = {
    id: `lesson-req-${req.id}`,
    memberId: req.memberId,
    staffId: req.staffId,
    slotId: `req-${req.id}`,
    start: req.start,
    end: req.end,
    location: req.location,
    status: 'booked',
    lessonType: req.lessonType,
    durationMin: req.durationMin,
    paidAmountCents: payNow ? priceCents : 0,
    paymentLast4: payNow && priceCents > 0 ? membership?.paymentLast4 : undefined,
    paymentTiming: req.paymentTiming,
    paymentStatus: payNow ? 'paid' : 'due',
    swimmerName: req.swimmerName,
    stageCode: req.stageCode,
    participantMemberId: req.participantMemberId,
    notes: req.notes,
    requestId: req.id,
  };
  const old = req.replacesLessonId
    ? state.privateLessons.find((l) => l.id === req.replacesLessonId && l.status === 'booked')
    : undefined;
  if (old) {
    old.status = 'cancelled';
    lesson.paidAmountCents = old.paidAmountCents;
    lesson.paymentLast4 = old.paymentLast4;
    lesson.paymentTiming = old.paymentTiming ?? lesson.paymentTiming;
    lesson.paymentStatus = old.paymentStatus ?? (old.paidAmountCents ? 'paid' : lesson.paymentStatus);
  }
  state.privateLessons = state.privateLessons.filter((l) => l.id !== lesson.id);
  state.privateLessons.push(lesson);
  req.status = 'accepted';
  req.lessonId = lesson.id;
  declineOverlappingRequests(state, req);
  return lesson;
}

function toggleReactionMap(
  current: Record<string, string[]> | undefined,
  emoji: string,
  userId: string
): Record<string, string[]> {
  const next: Record<string, string[]> = { ...(current ?? {}) };
  const users = next[emoji] ?? [];
  const updated = users.includes(userId) ? users.filter((u) => u !== userId) : [...users, userId];
  if (updated.length === 0) delete next[emoji];
  else next[emoji] = updated;
  return next;
}

// --- Child Watch helpers ------------------------------------------------------------------------

const CHILD_WATCH_AUDIT_LIMIT = 500;

type ChildWatchActor =
  | { kind: 'staff'; id: string; role: string; canRunRoom: boolean; canManage: boolean }
  | { kind: 'member'; id: string; member: Member };

/** Staff are told apart from members by role; anyone else must be a real member record. */
function childWatchActor(state: DemoState, requesterUserId: string | undefined): ChildWatchActor {
  if (!requesterUserId) throw new Error('Sign in to use Child Watch.');
  const role = requesterRole(state, requesterUserId);
  if (isStaffRole(role)) {
    return {
      kind: 'staff',
      id: requesterUserId,
      role: String(role),
      canRunRoom: hasCapability(role, 'runChildWatchRoom'),
      canManage: hasCapability(role, 'manageChildWatchProgram'),
    };
  }
  const member = state.members.find((m) => m.id === requesterUserId);
  if (!member) throw new Error('Sign in to use Child Watch.');
  return { kind: 'member', id: member.id, member };
}

function requireChildWatchRoom(actor: ChildWatchActor, action: string): asserts actor is Extract<ChildWatchActor, { kind: 'staff' }> {
  if (actor.kind !== 'staff' || !actor.canRunRoom) throw new Error(`Your staff role is not permitted to ${action}.`);
}

function requireChildWatchProgram(actor: ChildWatchActor, action: string): asserts actor is Extract<ChildWatchActor, { kind: 'staff' }> {
  if (actor.kind !== 'staff' || !actor.canManage) throw new Error(`Your staff role is not permitted to ${action}.`);
}

function householdKeyOf(m: Member): string {
  return m.householdId ?? m.id;
}

function childWatchChild(state: DemoState, childId: string): Member {
  const child = state.members.find((m) => m.id === childId);
  if (!child) throw new Error('Child not found.');
  return child;
}

function isChildWatchGuardian(actor: ChildWatchActor, childMember: Member): boolean {
  return actor.kind === 'member' && isGuardianOf(actor.member, childMember, getDemoToday());
}

/** A member may act on a household only as an adult in it. */
function isHouseholdAdult(actor: ChildWatchActor, householdId: string): boolean {
  return (
    actor.kind === 'member' &&
    householdKeyOf(actor.member) === householdId &&
    Boolean(actor.member.birthDate) &&
    ageOn(actor.member.birthDate as string, getDemoToday()) >= 18
  );
}

function childWatchNowIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

function recordChildWatchAudit(
  state: DemoState,
  actor: ChildWatchActor,
  action: ChildWatchAuditAction,
  detail: string,
  refs: { visitId?: string; childId?: string } = {},
  now?: Date
): void {
  const log = state.childWatchAudit ?? (state.childWatchAudit = []);
  log.unshift({
    id: `cwa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: childWatchNowIso(now),
    actorId: actor.id,
    actorRole: actor.kind === 'staff' ? actor.role : 'member',
    action,
    ...refs,
    detail,
  });
  if (log.length > CHILD_WATCH_AUDIT_LIMIT) log.length = CHILD_WATCH_AUDIT_LIMIT;
}

function childWatchLocalDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function childWatchAgeMonths(birthDate: string | undefined, now: Date): number {
  return birthDate ? Math.floor(ageInWeeks(birthDate, now) / 4.345) : 0;
}

export class MockProtivityAdapter implements ProtivityPort {
  async login(email: string, password: string): Promise<{ userId: string; role: UserRole }> {
    const state = await loadStore();
    const cred = state.credentials.find(
      (c) => c.email === email && c.password === password
    );
    if (!cred) {
      throw new Error('Invalid credentials');
    }
    return { userId: cred.userId, role: cred.role };
  }

  async getMember(id: string): Promise<Member> {
    const state = await loadStore();
    const member = state.members.find((m) => m.id === id);
    if (!member) {
      throw new Error(`Member not found: ${id}`);
    }
    return member;
  }

  async updateMemberProfile(
    memberId: string,
    updates: { name?: string; phone?: string; avatarUrl?: string }
  ): Promise<Member> {
    const state = await loadStore();
    const idx = state.members.findIndex((m) => m.id === memberId);
    if (idx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const updated: Member = {
      ...state.members[idx],
      ...(updates.name != null && updates.name.trim() !== ''
        ? { name: updates.name.trim() }
        : {}),
      ...(updates.phone != null && updates.phone.trim() !== ''
        ? { phone: updates.phone.trim() }
        : {}),
      ...(updates.avatarUrl !== undefined
        ? { avatarUrl: updates.avatarUrl }
        : {}),
    };
    state.members[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async getStaff(id: string): Promise<Staff> {
    const state = await loadStore();
    const staff = state.staff.find((s) => s.id === id);
    if (!staff) {
      throw new Error(`Staff not found: ${id}`);
    }
    return staff;
  }

  async getMembership(memberId: string): Promise<Membership> {
    const state = await loadStore();
    const billingId = householdPrimaryId(state, memberId);
    const membership = state.memberships.find((m) => m.memberId === billingId);
    if (!membership) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    return membership;
  }

  async getSchedules(q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]> {
    const state = await loadStore();
    return state.schedules.filter((item) => {
      if (item.branchId !== q.branchId) {
        return false;
      }
      const day = scheduleCalendarDay(item.start);
      if (day < q.from || day > q.to) {
        return false;
      }
      if (q.category != null) {
        if (q.category === 'seniors') {
          if (item.category !== 'seniors' && !item.seniorFriendly) {
            return false;
          }
        } else if (item.category !== q.category) {
          return false;
        }
      }
      return true;
    });
  }

  async getStaffDay(staffId: string, date: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    return state.schedules.filter(
      (item) => item.staffId === staffId && scheduleCalendarDay(item.start) === date
    );
  }

  async listAssignedMembers(staffId: string): Promise<Member[]> {
    const state = await loadStore();
    const memberIds = state.assignments
      .filter((a) => a.staffId === staffId)
      .map((a) => a.memberId);
    return state.members.filter((m) => memberIds.includes(m.id));
  }

  async getAssignedTrainer(memberId: string): Promise<Staff | null> {
    const state = await loadStore();
    const assignment = state.assignments.find((a) => a.memberId === memberId);
    if (!assignment) {
      return null;
    }
    return state.staff.find((s) => s.id === assignment.staffId) ?? null;
  }

  async setAssignedTrainer(memberId: string, staffId: string): Promise<void> {
    const state = await loadStore();
    const idx = state.assignments.findIndex((a) => a.memberId === memberId);
    if (idx !== -1) {
      state.assignments[idx].staffId = staffId;
    } else {
      state.assignments.push({ memberId, staffId });
    }
    await saveStore(state);
  }

  async listStaff(branchId?: string): Promise<Staff[]> {
    const state = await loadStore();
    if (branchId) {
      return state.staff.filter((s) => s.homeBranchId === branchId);
    }
    return state.staff;
  }

  async updatePaymentMethod(
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership> {
    const state = await loadStore();
    assertPrimary(state, memberId, 'update the payment method');
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const updated: Membership = {
      ...state.memberships[idx],
      paymentBrand: payment.brand,
      paymentLast4: payment.last4,
    };
    state.memberships[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async changeMembership(
    memberId: string,
    planName: string,
    monthlyAmountCents: number,
    requesterUserId?: string
  ): Promise<Membership> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'changePlans', 'change membership plans');
    assertPrimary(state, memberId, 'change the membership plan');
    const membershipIdx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (membershipIdx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    {
      const plans = configOf(state).membershipPlans;
      assertPlanOffered(plans, planName, state.memberships[membershipIdx].rateName);
      const people = householdMembersOf(state, memberId);
      // Unknown / custom plan names set by staff are allowed; known plans must fit the household.
      if (people.length > 1 && findPlan(planName, plans)) {
        const check = validateHousehold(
          planName,
          people.map((p) => ({ birthDate: p.birthDate ?? '1980-01-01' })),
          getDemoToday(),
          plans
        );
        if (!check.ok) throw new Error(check.reason);
      }
    }

    const updatedMembership: Membership = {
      ...state.memberships[membershipIdx],
      rateName: planName,
      monthlyAmountCents,
    };
    state.memberships[membershipIdx] = updatedMembership;
    state.members[memberIdx] = {
      ...state.members[memberIdx],
      type: planName,
    };
    for (const dep of householdMembersOf(state, memberId)) dep.type = planName;

    await saveStore(state);
    return updatedMembership;
  }

  async submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest> {
    const state = await loadStore();
    assertPrimary(state, memberId, 'cancel the membership');
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const member = state.members[memberIdx];
    const existing = state.cancelRequests.some((r) => r.memberId === memberId);
    if (member.status === 'cancel_pending' || existing) {
      throw new Error('Cancel notice already submitted');
    }

    const membershipIdx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (membershipIdx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const membership = state.memberships[membershipIdx];
    const dates = computeCancelDates({
      nextBillingDate: membership.nextBillingDate,
      requestedAt: input.requestedAt,
      previousBillingDate: membership.lastBillDate,
    });

    const cancelRequest: CancelRequest = {
      id: `cancel-${memberId}`,
      memberId,
      reason: input.reason,
      requestedAt: input.requestedAt,
      lastBillDate: dates.lastBillDate,
      accessThrough: dates.accessThrough,
      status: 'submitted',
    };

    state.cancelRequests.push(cancelRequest);
    state.members[memberIdx] = { ...member, status: 'cancel_pending' };
    setHouseholdStatus(state, memberId, 'cancel_pending');
    state.memberships[membershipIdx] = {
      ...membership,
      lastBillDate: dates.lastBillDate,
      cancelEffectiveDate: dates.accessThrough,
    };
    await saveStore(state);
    return cancelRequest;
  }

  async approveCancelRequest(memberId: string, requesterUserId: string): Promise<CancelRequest> {
    const state = await loadStore();
    if (!hasCapability(requesterRole(state, requesterUserId), 'approveCancellations')) {
      throw new Error('Your staff role is not permitted to approve cancellations.');
    }
    const idx = state.cancelRequests.findIndex(
      (r) => r.memberId === memberId && r.status === 'submitted'
    );
    if (idx === -1) {
      throw new Error(`No pending cancel request for member: ${memberId}`);
    }
    const reviewer = state.staff.find((s) => s.id === requesterUserId);
    const approved: CancelRequest = {
      ...state.cancelRequests[idx],
      status: 'approved',
      reviewedById: requesterUserId,
      reviewedByName: reviewer?.name,
      reviewedAt: new Date().toISOString(),
    };
    state.cancelRequests[idx] = approved;

    state.notifications.unshift({
      id: `notif-cancel-approved-${Date.now()}`,
      userId: memberId,
      title: 'Cancellation Confirmed',
      body: `Your cancellation has been processed. You keep full access through ${approved.accessThrough}.`,
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return approved;
  }

  async listCancelRequests(branchId: string, from?: string, to?: string): Promise<CancelRequest[]> {
    const state = await loadStore();
    const branchMemberIds = new Set(
      state.members.filter((m) => m.homeBranchId === branchId).map((m) => m.id)
    );
    return state.cancelRequests
      .filter((r) => {
        if (!branchMemberIds.has(r.memberId)) return false;
        const day = r.requestedAt.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }

  async listPendingCancels(branchId: string): Promise<CancelRequest[]> {
    const state = await loadStore();
    const branchMemberIds = new Set(
      state.members.filter((m) => m.homeBranchId === branchId).map((m) => m.id)
    );
    return state.cancelRequests.filter(
      (r) => r.status === 'submitted' && branchMemberIds.has(r.memberId)
    );
  }

  async listMessages(threadId: string): Promise<Message[]> {
    const state = await loadStore();
    return state.messages.filter((m) => m.threadId === threadId);
  }

  async listThreads(userId: string): Promise<Thread[]> {
    const state = await loadStore();
    return state.threads.filter((t) => t.kind === 'group' ? t.participantIds?.includes(userId) : t.memberId === userId || t.staffId === userId);
  }

  async createStaffGroup(creatorId: string, name: string, staffIds: string[]): Promise<Thread> {
    const state = await loadStore();
    const participantIds = [...new Set([creatorId, ...staffIds])];
    const title = name.trim();
    if (!title || title.length > 80) throw new Error('Enter a group name of up to 80 characters.');
    if (participantIds.length < 3) throw new Error('Choose at least two other staff members.');
    if (participantIds.some((id) => !state.staff.some((s) => s.id === id))) {
      throw new Error('Group chats are for staff members only.');
    }
    const thread: Thread = {
      id: `group-${Date.now().toString(36)}-${state.threads.length + 1}`,
      kind: 'group', name: title, participantIds,
      memberId: creatorId, staffId: creatorId,
    };
    state.threads.push(thread);
    await saveStore(state);
    return thread;
  }

  async getOrCreateThread(memberId: string, staffId: string): Promise<Thread> {
    const state = await loadStore();
    const existing = state.threads.find(
      (t) => t.kind !== 'group' && (
        (t.memberId === memberId && t.staffId === staffId) ||
        // Staff-to-staff threads: reuse the same conversation whichever side starts it.
        (t.memberId === staffId &&
          t.staffId === memberId &&
          state.staff.some((s) => s.id === memberId)))
    );
    if (existing) {
      return existing;
    }
    const newThread: Thread = {
      id: `thread-${memberId}-${staffId}`,
      memberId,
      staffId,
    };
    state.threads.push(newThread);
    await saveStore(state);
    return newThread;
  }

  async sendMessage(input: {
    threadId: string;
    fromId: string;
    body: string;
    replyToId?: string;
    replyToAuthorName?: string;
    replyToExcerpt?: string;
  }): Promise<Message> {
    const state = await loadStore();
    const thread = state.threads.find((t) => t.id === input.threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${input.threadId}`);
    }
    const participants = thread.kind === 'group' ? thread.participantIds ?? [] : [thread.memberId, thread.staffId];
    if (!participants.includes(input.fromId)) throw new Error('Only participants can send messages.');
    const text = filterProfanity(input.body.trim());
    if (!text) throw new Error('Message cannot be empty.');
    const message: Message = {
      id: `msg-${Date.now().toString(36)}-${state.messages.length + 1}-${input.threadId}`,
      threadId: input.threadId,
      fromId: input.fromId,
      body: text,
      createdAt: new Date().toISOString(),
      replyToId: input.replyToId,
      replyToAuthorName: input.replyToAuthorName,
      replyToExcerpt: input.replyToExcerpt,
    };
    state.messages.push(message);
    await saveStore(state);
    return message;
  }

  async editMessage(messageId: string, userId: string, body: string): Promise<Message> {
    const state = await loadStore();
    const message = state.messages.find((m) => m.id === messageId);
    if (!message) throw new Error(`Message not found: ${messageId}`);
    if (message.fromId !== userId) throw new Error('Only the author can edit this message.');
    const text = filterProfanity(body.trim());
    if (!text) throw new Error('Message cannot be empty.');
    message.body = text;
    message.editedAt = new Date().toISOString();
    await saveStore(state);
    return message;
  }

  async toggleMessageReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Message> {
    const state = await loadStore();
    const message = state.messages.find((m) => m.id === messageId);
    if (!message) throw new Error(`Message not found: ${messageId}`);
    message.reactions = toggleReactionMap(message.reactions, emoji, userId);
    await saveStore(state);
    return message;
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const state = await loadStore();
    const idx = state.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) throw new Error(`Message not found: ${messageId}`);
    if (state.messages[idx].fromId !== userId) {
      throw new Error('Only the author can delete this message.');
    }
    state.messages.splice(idx, 1);
    await saveStore(state);
  }

  async registerForClass(
    memberId: string,
    scheduleItemId: string
  ): Promise<ClassRegistration> {
    const state = await loadStore();
    const item = state.schedules.find((s) => s.id === scheduleItemId);
    if (!item) {
      throw new Error(`Schedule item not found: ${scheduleItemId}`);
    }

    const activeForClass = state.classRegistrations.filter(
      (r) => r.scheduleItemId === scheduleItemId && r.status === 'registered'
    );
    if (activeForClass.length >= item.capacity) {
      throw new Error('Class is full');
    }

    const membership = state.memberships.find((m) => m.memberId === memberId);
    const paidAmountCents = item.priceCents ?? 0;
    const paymentLast4 = paidAmountCents > 0 ? membership?.paymentLast4 : undefined;
    const now = new Date().toISOString();

    const existingIdx = state.classRegistrations.findIndex(
      (r) => r.memberId === memberId && r.scheduleItemId === scheduleItemId
    );

    if (existingIdx !== -1) {
      const existing = state.classRegistrations[existingIdx];
      if (existing.status === 'registered') {
        throw new Error('Already registered for this class');
      }
      const reactivated: ClassRegistration = {
        ...existing,
        status: 'registered',
        paidAmountCents,
        paymentLast4,
        registeredAt: now,
      };
      state.classRegistrations[existingIdx] = reactivated;
      await saveStore(state);
      return reactivated;
    }

    const registration: ClassRegistration = {
      id: `reg-${memberId}-${scheduleItemId}`,
      memberId,
      scheduleItemId,
      status: 'registered',
      paidAmountCents,
      paymentLast4,
      registeredAt: now,
    };
    state.classRegistrations.push(registration);
    await saveStore(state);
    return registration;
  }

  async cancelClassRegistration(
    memberId: string,
    scheduleItemId: string
  ): Promise<ClassRegistration> {
    const state = await loadStore();
    const idx = state.classRegistrations.findIndex(
      (r) =>
        r.memberId === memberId &&
        r.scheduleItemId === scheduleItemId &&
        r.status === 'registered'
    );
    if (idx === -1) {
      throw new Error('No active registration found');
    }
    const updated: ClassRegistration = {
      ...state.classRegistrations[idx],
      status: 'cancelled',
    };
    state.classRegistrations[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async listMyRegistrations(memberId: string): Promise<ClassRegistration[]> {
    const state = await loadStore();
    return state.classRegistrations.filter(
      (r) => r.memberId === memberId && r.status === 'registered'
    );
  }

  async getClassRosterCounts(scheduleItemIds: string[]): Promise<Record<string, number>> {
    const state = await loadStore();
    const wanted = new Set(scheduleItemIds);
    const counts: Record<string, number> = {};
    for (const id of scheduleItemIds) counts[id] = 0;
    for (const r of state.classRegistrations) {
      if (r.status === 'registered' && wanted.has(r.scheduleItemId)) {
        counts[r.scheduleItemId] += 1;
      }
    }
    return counts;
  }

  async listClassRoster(scheduleItemId: string): Promise<Member[]> {
    const state = await loadStore();
    const memberIds = state.classRegistrations
      .filter((r) => r.scheduleItemId === scheduleItemId && r.status === 'registered')
      .map((r) => r.memberId);
    return state.members.filter((m) => memberIds.includes(m.id));
  }

  async listLessonSlots(
    staffId: string,
    from: string,
    to: string
  ): Promise<LessonSlot[]> {
    const state = await loadStore();
    const bookedSlotIds = new Set(
      state.privateLessons
        .filter((l) => l.status === 'booked')
        .map((l) => l.slotId)
    );
    return state.lessonSlots.filter((slot) => {
      if (slot.staffId !== staffId) {
        return false;
      }
      const day = scheduleCalendarDay(slot.start);
      if (day < from || day > to) {
        return false;
      }
      return !bookedSlotIds.has(slot.id);
    });
  }

  async bookPrivateLesson(
    memberId: string,
    slotId: string,
    options?: BookLessonOptions
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    assertFeatureOn(state, 'lessonBooking');
    const slot = state.lessonSlots.find((s) => s.id === slotId);
    if (!slot) {
      throw new Error(`Lesson slot not found: ${slotId}`);
    }
    const alreadyBooked = state.privateLessons.some(
      (l) => l.slotId === slotId && l.status === 'booked'
    );
    if (alreadyBooked) {
      throw new Error('This time slot is no longer available');
    }

    const lessonType = options?.lessonType ?? 'training';
    const durationMin = options?.durationMin ?? 60;
    const paidAmountCents =
      options?.carryOverPaidCents ??
      (options ? lessonPriceCents(state.lessonPricing, lessonType, durationMin) : 0);
    const membership = state.memberships.find((m) => m.memberId === memberId);

    const existingIdx = state.privateLessons.findIndex((l) => l.id === `lesson-${memberId}-${slotId}`);
    const slotStart = new Date(slot.start).getTime();
    const start = slot.start;
    const end = options
      ? new Date(slotStart + durationMin * 60000).toISOString()
      : slot.end;

    const lesson: PrivateLesson = {
      id: `lesson-${memberId}-${slotId}`,
      memberId,
      staffId: slot.staffId,
      slotId: slot.id,
      start,
      end: options ? end : slot.end,
      location: slot.location,
      status: 'booked',
      lessonType,
      durationMin,
      paidAmountCents,
      paymentLast4:
        paidAmountCents > 0
          ? options?.carryOverPaymentLast4 ?? membership?.paymentLast4
          : undefined,
      swimmerName: options?.swimmerName?.trim() || undefined,
      participantMemberId: participantIdFor(state, memberId, options?.swimmerName),
      stageCode: options?.stageCode,
      notes: options?.notes?.trim() || undefined,
    };
    if (existingIdx !== -1) {
      state.privateLessons[existingIdx] = lesson;
    } else {
      state.privateLessons.push(lesson);
    }
    await saveStore(state);
    return lesson;
  }

  async listBookableTimes(
    memberId: string,
    q: { lessonType: LessonType; durationMin: 30 | 60; from: string; to: string; staffId?: string }
  ): Promise<BookableTime[]> {
    const state = await loadStore();
    const staff = state.staff.filter(
      (s) =>
        offersLessonType(s, q.lessonType) &&
        (q.staffId === undefined || s.id === q.staffId) &&
        sessionLengthsFor(s).includes(q.durationMin)
    );
    const ids = new Set(staff.map((s) => s.id));
    const windows = [...ids].flatMap((id) => windowsFor(state, id, q.from, q.to));
    const busyByStaff: Record<string, Interval[]> = {};
    for (const s of staff) busyByStaff[s.id] = staffBusy(state, s.id);
    const times = availableAt(windows, busyByStaff, memberBusy(state, memberId), q.durationMin, {
      after: demoNowIso(),
      instantStaffIds: new Set(staff.filter((s) => canInstantBook(s, memberId)).map((s) => s.id)),
    });
    return times;
  }

  async createSessionRequest(memberId: string, input: CreateSessionRequestInput): Promise<SessionRequest> {
    const state = await loadStore();
    assertFeatureOn(state, 'sessionRequests');
    state.sessionRequests = state.sessionRequests ?? [];
    const staff = state.staff.find((s) => s.id === input.staffId);
    const member = state.members.find((m) => m.id === memberId);
    if (!staff || !offersLessonType(staff, input.lessonType)) {
      throw new Error('That instructor does not offer this lesson type.');
    }
    if (!sessionLengthsFor(staff).includes(input.durationMin)) {
      throw new Error(`${staff.name} does not offer ${input.durationMin} minute sessions.`);
    }
    const iv: Interval = { start: new Date(input.start).toISOString(), end: addMinutesIso(input.start, input.durationMin) };
    if (!isInsideWindow(state, staff.id, iv)) {
      throw new Error('That time is outside the instructor\u2019s availability.');
    }
    const req: SessionRequest = {
      id: `sreq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      memberId,
      memberName: member?.name,
      staffId: staff.id,
      staffName: staff.name,
      lessonType: input.lessonType,
      durationMin: input.durationMin,
      start: iv.start,
      end: iv.end,
      location: windowContaining(state, staff.id, iv)?.location ?? 'Facility',
      paymentTiming: input.paymentTiming,
      status: 'pending',
      swimmerName: input.swimmerName?.trim() || undefined,
      stageCode: input.stageCode,
      participantMemberId: input.participantMemberId,
      notes: input.notes?.trim() || undefined,
      replacesLessonId: input.replacesLessonId,
      createdAt: new Date().toISOString(),
      history: [],
    };
    const duplicate = state.sessionRequests.some(
      (r) => r.memberId === memberId && (r.status === 'pending' || r.status === 'countered') && overlaps(r, iv)
    );
    if (duplicate) throw new Error('You already have a request for that time.');
    assertTimeFree(state, req, iv);
    pushRequestEvent(state, req, memberId, 'requested', { start: req.start, end: req.end });
    if (canInstantBook(staff, memberId)) {
      confirmSessionRequest(state, req);
      pushRequestEvent(state, req, staff.id, 'auto_accepted', { start: req.start, end: req.end });
      notifyUser(
        state,
        staff.id,
        'Session booked',
        `${req.memberName ?? 'A member'} booked ${describeWhen(req.start)} (instant booking).`,
        '/(staff)/(tabs)/today'
      );
    } else {
      notifyUser(
        state,
        staff.id,
        'New session request',
        `${req.memberName ?? 'A member'} requested ${req.durationMin} min on ${describeWhen(req.start)}.`,
        '/(staff)/(tabs)/today'
      );
    }
    state.sessionRequests.unshift(req);
    await saveStore(state);
    return req;
  }

  async respondToSessionRequest(
    requestId: string,
    staffId: string,
    response: SessionRequestResponse
  ): Promise<SessionRequest> {
    const state = await loadStore();
    const req = (state.sessionRequests ?? []).find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.staffId !== staffId) {
      const target = state.staff.find((s) => s.id === req.staffId);
      const role = requesterRole(state, staffId);
      if (!target || !canManageTrainerAvailability(role, staffId, target) || !canViewSessionRequest(role, staffId, req)) {
        throw new Error('Only the requested instructor can respond.');
      }
    }
    if (!canTransition(req.status, response.action, 'staff')) {
      throw new Error('This request has already been answered.');
    }
    const link = '/(member)/(tabs)/schedules';
    if (response.action === 'accept') {
      assertTimeFree(state, req, req);
      confirmSessionRequest(state, req);
      pushRequestEvent(state, req, staffId, 'accepted', { note: response.note });
      notifyUser(state, req.memberId, 'Session confirmed', `${req.staffName ?? 'Your instructor'} accepted ${describeWhen(req.start)}.`, link);
    } else if (response.action === 'decline') {
      req.status = 'declined';
      pushRequestEvent(state, req, staffId, 'declined', { note: response.note });
      notifyUser(state, req.memberId, 'Session declined', `${req.staffName ?? 'Your instructor'} could not do ${describeWhen(req.start)}.${response.note ? ` "${response.note}"` : ''}`, link);
    } else {
      if (!response.start) throw new Error('Pick a new time to offer.');
      const duration = response.durationMin ?? req.durationMin;
      const iv: Interval = { start: new Date(response.start).toISOString(), end: addMinutesIso(response.start, duration) };
      assertTimeFree(state, req, iv);
      req.start = iv.start;
      req.end = iv.end;
      req.durationMin = duration;
      req.status = 'countered';
      pushRequestEvent(state, req, staffId, 'countered', { start: iv.start, end: iv.end, note: response.note });
      notifyUser(state, req.memberId, 'New time offered', `${req.staffName ?? 'Your instructor'} offered ${describeWhen(req.start)}. Open My Schedule to accept.`, link);
    }
    await saveStore(state);
    return req;
  }

  async respondToCounterOffer(
    requestId: string,
    memberId: string,
    decision: 'accept' | 'decline'
  ): Promise<SessionRequest> {
    const state = await loadStore();
    const req = (state.sessionRequests ?? []).find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.memberId !== memberId) throw new Error('This request belongs to another member.');
    const action = decision === 'accept' ? 'accept_counter' : 'decline_counter';
    if (!canTransition(req.status, action, 'member')) throw new Error('There is no offer to answer.');
    if (decision === 'accept') {
      assertTimeFree(state, req, req);
      confirmSessionRequest(state, req);
      pushRequestEvent(state, req, memberId, 'counter_accepted', { start: req.start, end: req.end });
      notifyUser(state, req.staffId, 'Offer accepted', `${req.memberName ?? 'A member'} accepted ${describeWhen(req.start)}.`, '/(staff)/(tabs)/today');
    } else {
      req.status = 'declined';
      pushRequestEvent(state, req, memberId, 'counter_declined');
      notifyUser(state, req.staffId, 'Offer declined', `${req.memberName ?? 'A member'} declined the new time.`, '/(staff)/(tabs)/today');
    }
    await saveStore(state);
    return req;
  }

  async cancelSessionRequest(requestId: string, userId: string): Promise<SessionRequest> {
    const state = await loadStore();
    const req = (state.sessionRequests ?? []).find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.memberId !== userId && req.staffId !== userId) throw new Error('Not your request.');
    if (!canTransition(req.status, 'cancel', 'member')) throw new Error('This request can no longer be cancelled.');
    if (req.lessonId) {
      const lesson = state.privateLessons.find((l) => l.id === req.lessonId);
      if (lesson) lesson.status = 'cancelled';
    }
    req.status = 'cancelled';
    pushRequestEvent(state, req, userId, 'cancelled');
    const other = userId === req.memberId ? req.staffId : req.memberId;
    notifyUser(state, other, 'Session cancelled', `The session on ${describeWhen(req.start)} was cancelled.`);
    await saveStore(state);
    return req;
  }

  async listSessionRequests(filter: SessionRequestFilter = {}): Promise<SessionRequest[]> {
    const state = await loadStore();
    const role = filter.viewerId ? requesterRole(state, filter.viewerId) : undefined;
    return (state.sessionRequests ?? [])
      .filter((r) => (filter.memberId ? r.memberId === filter.memberId : true))
      .filter((r) => (filter.staffId ? r.staffId === filter.staffId : true))
      .filter((r) => (filter.status ? filter.status.includes(r.status) : true))
      .filter((r) =>
        filter.viewerId ? canViewSessionRequest(role, filter.viewerId, r) : true
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async setInstantBooking(
    staffId: string,
    memberId: string,
    enabled: boolean,
    requesterUserId: string
  ): Promise<Staff> {
    const state = await loadStore();
    const idx = state.staff.findIndex((s) => s.id === staffId);
    if (idx === -1) throw new Error(`Staff member not found: ${staffId}`);
    const target = state.staff[idx];
    if (requesterUserId !== staffId) {
      if (!canManageTrainerAvailability(requesterRole(state, requesterUserId), requesterUserId, target)) {
        throw new Error('Your staff role is not permitted to change instant booking.');
      }
    }
    const current = new Set(target.instantBookMemberIds ?? []);
    if (enabled) current.add(memberId);
    else current.delete(memberId);
    const updated: Staff = { ...target, instantBookMemberIds: Array.from(current) };
    state.staff[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async getLessonPricing(): Promise<LessonPricing> {
    const state = await loadStore();
    return state.lessonPricing;
  }

  async updateLessonPricing(updates: Partial<LessonPricing>, requesterUserId: string): Promise<LessonPricing> {
    const state = await loadStore();
    assertConfigSectionAccess(state, requesterUserId, 'lessonPricing');
    const before = state.lessonPricing;
    const next = normalizePricing({ ...state.lessonPricing, ...updates });
    for (const key of ['training', 'swim'] as const) {
      for (const d of [30, 60] as const) {
        const v = next[key][d];
        if (!Number.isFinite(v) || v < 0) {
          throw new Error('Prices must be zero or greater');
        }
      }
    }
    state.lessonPricing = next;
    recordConfigAudit(state, requesterUserId, 'lessonPricing', before, next);
    await saveStore(state);
    return next;
  }

  async enrollInSwimClass(
    memberId: string,
    classId: string,
    participantName?: string
  ): Promise<SwimClassEnrollment> {
    const state = await loadStore();
    assertFeatureOn(state, 'swimClassEnrollment');
    const offering = AQUATICS_CLASSES.find((c) => c.id === classId);
    const swim = configOf(state).swimClasses;
    if (!offering || swim.hidden.includes(classId)) {
      throw new Error('Swim class not found');
    }
    const member = state.members.find((m) => m.id === memberId);
    const tier = pricingTierFor(member);
    const active = state.swimEnrollments.filter(
      (e) => e.classId === classId && e.status === 'enrolled'
    );
    if (active.some((e) => e.memberId === memberId)) {
      throw new Error('Already enrolled in this class');
    }
    if (active.length >= swimClassCapacity(swim, classId)) {
      throw new Error('Class is full');
    }
    const paidAmountCents = swimClassPriceCents(state.lessonPricing, offering, tier);
    const membership = state.memberships.find((m) => m.memberId === memberId);
    const enrollment: SwimClassEnrollment = {
      id: `swimenr-${memberId}-${classId}-${state.swimEnrollments.length + 1}`,
      memberId,
      classId,
      participantName: participantName?.trim() || member?.name || 'Member',
      participantMemberId: participantIdFor(state, memberId, participantName),
      paidAmountCents,
      paymentLast4: paidAmountCents > 0 ? membership?.paymentLast4 : undefined,
      pricingTier: tier,
      status: 'enrolled',
      enrolledAt: new Date().toISOString(),
    };
    state.swimEnrollments.push(enrollment);
    await saveStore(state);
    return enrollment;
  }

  async cancelSwimEnrollment(memberId: string, enrollmentId: string): Promise<SwimClassEnrollment> {
    const state = await loadStore();
    const idx = state.swimEnrollments.findIndex(
      (e) => e.id === enrollmentId && e.memberId === memberId && e.status === 'enrolled'
    );
    if (idx === -1) {
      throw new Error('No active enrollment found');
    }
    const updated: SwimClassEnrollment = { ...state.swimEnrollments[idx], status: 'cancelled' };
    state.swimEnrollments[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async listMySwimEnrollments(memberId: string): Promise<SwimClassEnrollment[]> {
    const state = await loadStore();
    return state.swimEnrollments.filter((e) => e.memberId === memberId && e.status === 'enrolled');
  }

  async listSwimClassEnrollments(classId: string): Promise<SwimClassEnrollment[]> {
    const state = await loadStore();
    return state.swimEnrollments.filter((e) => e.classId === classId && e.status === 'enrolled');
  }

  async cancelPrivateLesson(memberId: string, lessonId: string): Promise<PrivateLesson> {
    const state = await loadStore();
    const idx = state.privateLessons.findIndex(
      (l) => l.id === lessonId && l.memberId === memberId && l.status === 'booked'
    );
    if (idx === -1) {
      throw new Error('No active lesson found');
    }
    const updated: PrivateLesson = {
      ...state.privateLessons[idx],
      status: 'cancelled',
    };
    state.privateLessons[idx] = updated;
    const linked = updated.requestId
      ? (state.sessionRequests ?? []).find((r) => r.id === updated.requestId)
      : undefined;
    if (linked && linked.status === 'accepted') {
      linked.status = 'cancelled';
      pushRequestEvent(state, linked, memberId, 'cancelled');
    }
    await saveStore(state);
    return updated;
  }

  async listMyLessons(memberId: string): Promise<PrivateLesson[]> {
    const state = await loadStore();
    return state.privateLessons.filter(
      (l) => l.memberId === memberId && l.status === 'booked'
    );
  }

  async listStaffLessons(staffId: string, date: string): Promise<PrivateLesson[]> {
    const state = await loadStore();
    return state.privateLessons.filter(
      (l) =>
        l.staffId === staffId &&
        l.status !== 'cancelled' &&
        scheduleCalendarDay(l.start) === date
    );
  }

  async scheduleMembershipChange(
    memberId: string,
    planName: string,
    monthlyAmountCents: number,
    effectiveDate: string
  ): Promise<Membership> {
    const state = await loadStore();
    assertPrimary(state, memberId, 'schedule a plan change');
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    assertPlanOffered(configOf(state).membershipPlans, planName, state.memberships[idx].rateName);

    const updatedMembership: Membership = {
      ...state.memberships[idx],
      pendingChange: {
        planName,
        monthlyAmountCents,
        effectiveDate,
        requestedAt: getDemoToday(),
      },
    };
    state.memberships[idx] = updatedMembership;

    const notifId = `notif-change-${Date.now()}`;
    state.notifications.unshift({
      id: notifId,
      userId: memberId,
      title: 'Membership Change Scheduled',
      body: `Your plan change to ${planName} ($${(monthlyAmountCents / 100).toFixed(2)}/mo) has been scheduled to take effect on ${effectiveDate}.`,
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return updatedMembership;
  }

  async cancelScheduledChange(memberId: string): Promise<Membership> {
    const state = await loadStore();
    assertPrimary(state, memberId, 'cancel a scheduled plan change');
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }

    const updatedMembership: Membership = {
      ...state.memberships[idx],
      pendingChange: undefined,
    };
    state.memberships[idx] = updatedMembership;

    state.notifications.unshift({
      id: `notif-cancel-change-${Date.now()}`,
      userId: memberId,
      title: 'Scheduled Plan Change Cancelled',
      body: 'Your scheduled plan change was cancelled. You will continue on your current plan.',
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return updatedMembership;
  }

  async buyMembership(input: {
    name: string;
    email: string;
    phone: string;
    address: string;
    planId: string;
    payment: { brand: string; last4: string };
    donationCents?: number;
    password?: string;
    waiveEnrollmentFee?: boolean;
    campaignId?: string;
    birthDate?: string;
    householdMembers?: HouseholdMemberInput[];
  }): Promise<{ member: Member; membership: Membership }> {
    const state = await loadStore();
    const plan = planForSignup(state, input.planId);
    const plans = configOf(state).membershipPlans;
    if (input.donationCents && input.donationCents > 0) assertFeatureOn(state, 'donations');
    const campaign = resolveCampaign(state, plan.id, input.campaignId);

    const todayStr = getDemoToday();
    if (input.birthDate) {
      const solo = canHoldSoloMembership(input.birthDate, plan.id, todayStr, plans);
      if (!solo.ok) throw new Error(solo.reason);
    }
    const extras = input.householdMembers ?? [];
    if (extras.length > 0) {
      const check = validateHousehold(
        plan.id,
        [{ birthDate: input.birthDate ?? '1980-01-01' }, ...extras.map((e) => ({ birthDate: e.birthDate }))],
        todayStr,
        plans
      );
      if (!check.ok) throw new Error(check.reason);
    }

    const trimmedEmail = input.email.trim().toLowerCase();
    const existingMemberIdx = state.members.findIndex(
      (m) => m.email.toLowerCase() === trimmedEmail
    );
    const priorMemberType =
      existingMemberIdx !== -1 ? state.members[existingMemberIdx].type : undefined;
    const waiveEnrollment =
      input.waiveEnrollmentFee === true || priorMemberType === '1-Day Guest Pass';
    const enrollmentChargedCents = effectiveEnrollmentFeeCents(plan, {
      waiveEnrollmentFee: waiveEnrollment,
      campaign,
    });

    let member: Member;
    let membership: Membership;
    const nowIso = new Date().toISOString();
    const nextBill = new Date();
    nextBill.setMonth(nextBill.getMonth() + 1);
    const nextBillingDate = nextBill.toISOString().slice(0, 10);

    if (existingMemberIdx !== -1) {
      // Reactivate or update existing member
      member = {
        ...state.members[existingMemberIdx],
        name: input.name.trim() || state.members[existingMemberIdx].name,
        phone: input.phone.trim() || state.members[existingMemberIdx].phone,
        address: input.address.trim() || state.members[existingMemberIdx].address,
        type: plan.name,
        status: 'active',
      };
      state.members[existingMemberIdx] = member;

      // Remove any pending cancel requests
      state.cancelRequests = state.cancelRequests.filter((c) => c.memberId !== member.id);

      const memIdx = state.memberships.findIndex((m) => m.memberId === member.id);
      membership = {
        memberId: member.id,
        rateName: plan.name,
        monthlyAmountCents: plan.monthlyAmountCents,
        nextBillingDate,
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        status: 'active',
        pendingChange: undefined,
        cancelEffectiveDate: undefined,
        lastBillDate: undefined,
        billingStatus: 'current',
        billingIssue: undefined,
        campaignId: campaign?.id,
      };
      if (memIdx !== -1) {
        state.memberships[memIdx] = membership;
      } else {
        state.memberships.push(membership);
      }
    } else {
      // Create new member
      const newId = `member-${Date.now()}`;
      const barcodeId = String(Math.floor(100000 + Math.random() * 900000));
      member = {
        id: newId,
        name: input.name.trim(),
        email: trimmedEmail,
        phone: input.phone.trim(),
        address: input.address.trim(),
        membershipId: barcodeId,
        homeBranchId: 'silver-spring',
        type: plan.name,
        status: 'active',
      };
      membership = {
        memberId: newId,
        rateName: plan.name,
        monthlyAmountCents: plan.monthlyAmountCents,
        nextBillingDate,
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        status: 'active',
        joinedDate: getDemoToday(),
        campaignId: campaign?.id,
      };
      state.members.push(member);
      state.memberships.push(membership);

      state.credentials.push({
        email: trimmedEmail,
        password: input.password || 'ymca-demo',
        userId: newId,
        role: 'member',
      });
    }

    if (input.birthDate) member.birthDate = input.birthDate;
    if (isFamilyPlan(plan)) {
      member.householdId = member.id;
      member.householdRole = 'primary';
      member.hasLogin = true;
      // Keep any household members from a prior membership on the new plan.
      for (const dep of householdMembersOf(state, member.id)) {
        dep.type = plan.name;
        dep.status = 'active';
      }
    }
    for (const extra of extras) buildHouseholdMember(state, member, extra);

    if (input.donationCents && input.donationCents > 0) {
      state.donations.unshift({
        id: `don-${Date.now()}`,
        memberId: member.id,
        donorName: member.name,
        donorEmail: member.email,
        amountCents: input.donationCents,
        frequency: 'monthly',
        designation: 'Annual Community Campaign (Where Needed Most)',
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        createdAt: nowIso,
        taxDeductibleId: '53-0196605',
        receiptNumber: `YMCA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      });
    }

    state.notifications.unshift({
      id: `notif-welcome-${Date.now()}`,
      userId: member.id,
      title: `Welcome to YMCA Silver Spring, ${member.name.split(' ')[0]}!`,
      body: `Your ${plan.name} membership is active!${
        enrollmentChargedCents > 0
          ? ` A one-time enrollment fee of $${(enrollmentChargedCents / 100).toFixed(2)} was included in your first charge.`
          : plan.enrollmentFeeCents > 0
            ? campaign
              ? ` Your one-time enrollment fee was waived (${campaign.name}).`
              : ' Your one-time enrollment fee was waived (guest pass benefit).'
            : ''
      } Use your digital scan barcode at the welcome desk to access the facilities, heated pools, and fitness center.`,
      type: 'membership',
      createdAt: nowIso,
      read: false,
      link: '/(member)/home',
    });

    await saveStore(state);
    return { member, membership };
  }

  async rescindCancelNotice(memberId: string, requesterUserId?: string): Promise<Member> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'approveCancellations', 'rescind cancellations');
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const mem = state.members[memberIdx];

    // Remove pending cancel requests
    state.cancelRequests = state.cancelRequests.filter((r) => r.memberId !== memberId);

    // Set member status back to active
    const updatedMember: Member = {
      ...mem,
      status: 'active',
    };
    state.members[memberIdx] = updatedMember;
    setHouseholdStatus(state, memberId, 'active');

    // Reset membership cancel dates
    const memIdx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (memIdx !== -1) {
      state.memberships[memIdx] = {
        ...state.memberships[memIdx],
        cancelEffectiveDate: undefined,
        lastBillDate: undefined,
        status: 'active',
      };
    }

    state.notifications.unshift({
      id: `notif-rescind-${Date.now()}`,
      userId: memberId,
      title: 'Cancellation Rescinded',
      body: 'Your cancellation notice has been removed. We are thrilled you are continuing your wellness journey with YMCA Silver Spring!',
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return updatedMember;
  }

  async getHousehold(memberId: string): Promise<HouseholdView> {
    const state = await loadStore();
    const primaryId = householdPrimaryId(state, memberId);
    const primary = state.members.find((m) => m.id === primaryId);
    if (!primary) throw new Error(`Member not found: ${memberId}`);
    const membership = state.memberships.find((m) => m.memberId === primaryId);
    if (!membership) throw new Error(`Membership not found: ${memberId}`);
    return { primary, members: householdMembersOf(state, primaryId), membership };
  }

  async addHouseholdMember(primaryId: string, input: HouseholdMemberInput): Promise<Member> {
    const state = await loadStore();
    assertPrimary(state, primaryId, 'add family members');
    const primary = state.members.find((m) => m.id === primaryId);
    if (!primary) throw new Error(`Member not found: ${primaryId}`);
    const plans = configOf(state).membershipPlans;
    const plan = findPlan(primary.type, plans);
    if (!plan || !isFamilyPlan(plan)) {
      throw new Error(`${primary.type} covers one person. Change to a Family plan to add others.`);
    }
    const today = getDemoToday();
    const existing = householdMembersOf(state, primaryId);
    const check = validateHousehold(
      plan.id,
      [
        ...existing.map((m) => ({ birthDate: m.birthDate ?? '1980-01-01' })),
        { birthDate: input.birthDate },
      ],
      today,
      plans
    );
    if (!check.ok) throw new Error(check.reason);
    if (!primary.householdId) {
      primary.householdId = primary.id;
      primary.householdRole = 'primary';
    }
    const created = buildHouseholdMember(state, primary, input);
    await saveStore(state);
    return created;
  }

  async updateHouseholdMember(
    primaryId: string,
    memberId: string,
    updates: Partial<Pick<HouseholdMemberInput, 'name' | 'birthDate' | 'allergies' | 'notes'>>
  ): Promise<Member> {
    const state = await loadStore();
    assertPrimary(state, primaryId, 'edit family members');
    const target = state.members.find((m) => m.id === memberId && m.householdId === primaryId);
    if (!target) throw new Error('That person is not on your plan.');
    if (updates.name !== undefined && !updates.name.trim()) throw new Error('Enter a name.');
    if (updates.birthDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updates.birthDate) || Number.isNaN(Date.parse(updates.birthDate))) {
        throw new Error('Enter a valid birth date (YYYY-MM-DD).');
      }
      const plans = configOf(state).membershipPlans;
      const plan = findPlan(target.type, plans);
      const people = householdMembersOf(state, primaryId).map((m) => ({
        birthDate: m.id === memberId ? updates.birthDate! : m.birthDate ?? '1980-01-01',
      }));
      const check = plan ? validateHousehold(plan.id, people, getDemoToday(), plans) : ({ ok: true } as const);
      if (!check.ok) throw new Error(check.reason);
    }
    if (updates.name !== undefined) target.name = updates.name.trim();
    if (updates.birthDate !== undefined) {
      target.birthDate = updates.birthDate;
      if (ageOn(updates.birthDate, getDemoToday()) < 13) target.householdRole = 'dependent';
      // Age changes can invalidate a gym orientation (only meaningful for 13-17).
    }
    if (updates.allergies !== undefined) target.allergies = updates.allergies.trim() || undefined;
    if (updates.notes !== undefined) target.notes = updates.notes.trim() || undefined;
    await saveStore(state);
    return target;
  }

  async removeHouseholdMember(primaryId: string, memberId: string): Promise<void> {
    const state = await loadStore();
    assertPrimary(state, primaryId, 'remove family members');
    if (memberId === primaryId) throw new Error('The primary member cannot be removed from the plan.');
    const target = state.members.find((m) => m.id === memberId && m.householdId === primaryId);
    if (!target) throw new Error('That person is not on your plan.');
    if (state.childWatchVisits.some((v) => v.childId === memberId && !v.signedOutAt)) {
      throw new Error('Sign this child out of Child Watch before removing them.');
    }
    state.members = state.members.filter((m) => m.id !== memberId);
    state.credentials = state.credentials.filter((c) => c.userId !== memberId);
    state.assignments = state.assignments.filter((a) => a.memberId !== memberId);
    await saveStore(state);
  }

  async recordGymOrientation(memberId: string, staffId: string): Promise<Member> {
    const state = await loadStore();
    const role = requesterRole(state, staffId);
    const allowed = isAdminRole(role) || role === 'trainer' || role === 'wellness_director';
    if (!allowed) throw new Error('Only trainers and admins can complete a gym orientation.');
    const target = state.members.find((m) => m.id === memberId);
    if (!target) throw new Error(`Member not found: ${memberId}`);
    if (!target.birthDate) throw new Error('Add a birth date before recording an orientation.');
    const age = ageOn(target.birthDate, getDemoToday());
    if (age < 13 || age >= 18) throw new Error('Gym orientation is for members ages 13 to 17.');
    const staff = state.staff.find((s) => s.id === staffId);
    target.gymOrientation = {
      completedAt: demoNowIso(),
      staffId,
      staffName: staff?.name ?? 'Staff',
    };
    state.notifications.unshift({
      id: `notif-orientation-${memberId}-${Date.now()}`,
      userId: target.id,
      title: 'Gym orientation complete',
      body: `${target.name.split(' ')[0]} can now use the fitness center. Scan your barcode at the desk.`,
      type: 'membership',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/home',
    });
    if (target.householdId && target.householdId !== target.id) {
      state.notifications.unshift({
        id: `notif-orientation-p-${memberId}-${Date.now()}`,
        userId: target.householdId,
        title: `${target.name} finished gym orientation`,
        body: `${target.name} can now use the fitness center with their own card.`,
        type: 'membership',
        createdAt: new Date().toISOString(),
        read: false,
        link: '/(member)/family',
      });
    }
    await saveStore(state);
    return target;
  }

  async listAnnouncements(branchId?: string): Promise<Announcement[]> {
    const state = await loadStore();
    const list = branchId
      ? state.announcements.filter((a) => a.branchId === branchId)
      : state.announcements;
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  async createAnnouncement(input: Omit<Announcement, 'id' | 'createdAt'>, requesterUserId?: string): Promise<Announcement> {
    const state = await loadStore();
    if (!requesterUserId || !hasCapability(requesterRole(state, requesterUserId), 'broadcast')) throw new Error('Sign in as authorized staff to create announcements.');
    const now = new Date().toISOString();
    const newAnn: Announcement = {
      ...input,
      authorId: requesterUserId,
      id: `ann-${Date.now()}`,
      createdAt: now,
    };
    state.announcements.unshift(newAnn);

    // Broadcast to all active members as an in-app notification
    for (const m of state.members) {
      state.notifications.unshift({
        id: `notif-ann-${Date.now()}-${m.id}`,
        userId: m.id,
        title: input.title,
        body: input.body.length > 120 ? input.body.slice(0, 117) + '...' : input.body,
        type: 'announcement',
        createdAt: now,
        read: false,
        link: input.actionUrl || '/(member)/notifications',
      });
    }

    await saveStore(state);
    return newAnn;
  }

  async listNotifications(userId: string): Promise<AppNotification[]> {
    const state = await loadStore();
    return state.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const state = await loadStore();
    const idx = state.notifications.findIndex(
      (n) => n.id === notificationId && n.userId === userId
    );
    if (idx !== -1) {
      state.notifications[idx] = { ...state.notifications[idx], read: true };
      await saveStore(state);
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const state = await loadStore();
    state.notifications = state.notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n
    );
    await saveStore(state);
  }

  async createNotification(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    const state = await loadStore();
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    state.notifications.unshift(newNotif);
    await saveStore(state);
    return newNotif;
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const state = await loadStore();
    if (!state.notificationPreferences) {
      state.notificationPreferences = {};
    }
    if (!state.notificationPreferences[userId]) {
      state.notificationPreferences[userId] = defaultNotificationPreferences(userId);
      await saveStore(state);
    }
    return { ...state.notificationPreferences[userId] };
  }

  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const state = await loadStore();
    if (!state.notificationPreferences) {
      state.notificationPreferences = {};
    }
    const current = state.notificationPreferences[userId] ?? defaultNotificationPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      userId,
    };
    state.notificationPreferences[userId] = updated;
    await saveStore(state);
    return updated;
  }

  async createDonation(
    donation: Omit<Donation, 'id' | 'createdAt' | 'taxDeductibleId' | 'receiptNumber'>
  ): Promise<Donation> {
    const state = await loadStore();
    assertFeatureOn(state, 'donations');
    if (!Number.isInteger(donation.amountCents)) throw new Error('The gift amount must be a whole number of cents.');
    const { minimumGiftCents } = configOf(state).donations;
    if (donation.amountCents < minimumGiftCents) {
      throw new Error(`The minimum gift is $${(minimumGiftCents / 100).toFixed(2)}.`);
    }
    const nowIso = new Date().toISOString();
    const receiptNumber = `YMCA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const newDonation: Donation = {
      ...donation,
      id: `don-${Date.now()}`,
      createdAt: nowIso,
      taxDeductibleId: '53-0196605',
      receiptNumber,
    };
    state.donations.unshift(newDonation);

    if (donation.memberId) {
      state.notifications.unshift({
        id: `notif-don-${Date.now()}`,
        userId: donation.memberId,
        title: 'Thank You for Your Donation!',
        body: `Your gift of $${(donation.amountCents / 100).toFixed(2)} to ${donation.designation} makes a vital impact. Tax receipt #${receiptNumber}.`,
        type: 'donation',
        createdAt: nowIso,
        read: false,
        link: '/(member)/donate',
      });
    }

    await saveStore(state);
    return newDonation;
  }

  async listDonations(memberId?: string): Promise<Donation[]> {
    const state = await loadStore();
    const list = memberId
      ? state.donations.filter((d) => d.memberId === memberId)
      : state.donations;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ==========================================
  // Announcements Admin CRUD
  // ==========================================
  async updateAnnouncement(id: string, updates: Partial<Announcement>, requesterUserId?: string): Promise<Announcement> {
    const state = await loadStore();
    const idx = state.announcements.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Announcement not found: ${id}`);
    }
    if (!canManageAnnouncement(requesterRole(state, requesterUserId ?? ''), requesterUserId ?? '', state.announcements[idx])) throw new Error('You can only manage your own announcements.');
    const updated: Announcement = {
      ...state.announcements[idx],
      ...updates,
      id: state.announcements[idx].id,
      authorId: state.announcements[idx].authorId,
      authorName: state.announcements[idx].authorName,
      createdAt: state.announcements[idx].createdAt,
    };
    state.announcements[idx] = updated;
    await saveStore(state);
    return updated;
  }

  async deleteAnnouncement(id: string, requesterUserId?: string): Promise<void> {
    const state = await loadStore();
    const announcement = state.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('Announcement not found.');
    if (!canManageAnnouncement(requesterRole(state, requesterUserId ?? ''), requesterUserId ?? '', announcement)) throw new Error('You can only manage your own announcements.');
    state.announcements = state.announcements.filter((a) => a.id !== id);
    await saveStore(state);
  }

  // ==========================================
  // Staff Admin: Member Account Management
  // ==========================================
  async listAllMembers(branchId?: string): Promise<Member[]> {
    const state = await loadStore();
    if (branchId) {
      return state.members.filter((m) => m.homeBranchId === branchId);
    }
    return [...state.members].sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteMemberAccount(memberId: string, requesterUserId?: string): Promise<void> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'deleteMembers', 'delete member accounts');
    const memberIdx = state.members.findIndex((m) => m.id === memberId);
    if (memberIdx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const memberEmail = state.members[memberIdx].email;

    // Completely delete member and all associated entities
    state.members = state.members.filter((m) => m.id !== memberId);
    state.memberships = state.memberships.filter((m) => m.memberId !== memberId);
    state.credentials = state.credentials.filter((c) => c.userId !== memberId && c.email !== memberEmail);
    state.classRegistrations = state.classRegistrations.filter((r) => r.memberId !== memberId);
    state.savedClasses = state.savedClasses.filter((s) => s.memberId !== memberId);
    state.privateLessons = state.privateLessons.filter((l) => l.memberId !== memberId);
    state.assignments = state.assignments.filter((a) => a.memberId !== memberId);
    state.cancelRequests = state.cancelRequests.filter((c) => c.memberId !== memberId);
    state.notifications = state.notifications.filter((n) => n.userId !== memberId);
    state.threads = state.threads.filter((t) => t.memberId !== memberId);

    await saveStore(state);
  }

  async updateMemberAdmin(
    memberId: string,
    updates: Partial<Member>,
    requesterUserId?: string
  ): Promise<Member> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'editMemberProfiles', 'edit member profiles');
    const idx = state.members.findIndex((m) => m.id === memberId);
    if (idx === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const updated: Member = {
      ...state.members[idx],
      ...updates,
      id: state.members[idx].id, // preserve ID
    };
    state.members[idx] = updated;

    // If email changed, sync credentials
    if (updates.email && updates.email.trim() !== '') {
      state.credentials = state.credentials.map((c) =>
        c.userId === memberId ? { ...c, email: updates.email!.trim() } : c
      );
    }

    await saveStore(state);
    return updated;
  }

  async updateMembershipAdmin(
    memberId: string,
    updates: Partial<Membership>,
    requesterUserId?: string
  ): Promise<Membership> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'changePlans', 'update memberships');
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) {
      throw new Error(`Membership not found: ${memberId}`);
    }
    const updated: Membership = {
      ...state.memberships[idx],
      ...updates,
      memberId,
    };
    state.memberships[idx] = updated;

    // Sync member type & status if changed
    const memIdx = state.members.findIndex((m) => m.id === memberId);
    if (memIdx !== -1) {
      if (updates.rateName) {
        state.members[memIdx].type = updates.rateName;
      }
      if (updates.status) {
        state.members[memIdx].status = updates.status;
      }
      for (const dep of householdMembersOf(state, memberId)) {
        if (dep.id === memberId) continue;
        if (updates.rateName) dep.type = updates.rateName;
        if (updates.status) dep.status = updates.status;
      }
    }

    await saveStore(state);
    return updated;
  }

  async listMemberRegistrations(
    memberId: string
  ): Promise<(ClassRegistration & { scheduleItem?: ScheduleItem })[]> {
    const state = await loadStore();
    const regs = state.classRegistrations.filter((r) => r.memberId === memberId);
    return regs.map((r) => ({
      ...r,
      scheduleItem: state.schedules.find((s) => s.id === r.scheduleItemId),
    }));
  }

  async listMemberLessons(memberId: string): Promise<PrivateLesson[]> {
    const state = await loadStore();
    return state.privateLessons
      .filter((l) => l.memberId === memberId)
      .sort((a, b) => b.start.localeCompare(a.start));
  }

  // ==========================================
  // Schedule & Events CRUD
  // ==========================================
  async createScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    const state = await loadStore();
    const newItem: ScheduleItem = {
      ...item,
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    state.schedules.push(newItem);
    await saveStore(state);
    return newItem;
  }

  async updateScheduleItem(id: string, updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
    const state = await loadStore();
    const idx = state.schedules.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Schedule item not found: ${id}`);
    }
    const oldItem = state.schedules[idx];
    const updated: ScheduleItem = {
      ...oldItem,
      ...updates,
      id,
    };
    state.schedules[idx] = updated;

    // If time or location changed, notify registered and starred members
    const timeChanged = updates.start && updates.start !== oldItem.start;
    if (timeChanged) {
      const rosterMemberIds = new Set<string>([
        ...state.classRegistrations
          .filter((r) => r.scheduleItemId === id && r.status === 'registered')
          .map((r) => r.memberId),
        ...state.savedClasses
          .filter((sc) => sc.scheduleItemId === id)
          .map((sc) => sc.memberId),
      ]);
      const nowIso = new Date().toISOString();
      const newTimeStr = new Date(updated.start).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      for (const recipientId of rosterMemberIds) {
        state.notifications.unshift({
          id: `notif-sched-upd-${Date.now()}-${recipientId}`,
          userId: recipientId,
          title: `Schedule Update: ${updated.title}`,
          body: `${updated.title} has been moved to ${newTimeStr} at ${updated.location}.`,
          type: 'event',
          createdAt: nowIso,
          read: false,
          link: '/(member)/schedule',
        });
      }
    }

    await saveStore(state);
    return updated;
  }

  async deleteScheduleItem(id: string, notifyReason?: string): Promise<void> {
    const state = await loadStore();
    const item = state.schedules.find((s) => s.id === id);
    if (!item) {
      return;
    }

    // Dispatch alerts to all rostered and starred members
    const recipientIds = new Set<string>([
      ...state.classRegistrations
        .filter((r) => r.scheduleItemId === id && r.status === 'registered')
        .map((r) => r.memberId),
      ...state.savedClasses
        .filter((sc) => sc.scheduleItemId === id)
        .map((sc) => sc.memberId),
    ]);
    const nowIso = new Date().toISOString();
    for (const recipientId of recipientIds) {
      state.notifications.unshift({
        id: `notif-cancel-${Date.now()}-${recipientId}`,
        userId: recipientId,
        title: `Cancelled: ${item.title}`,
        body: notifyReason
          ? `${item.title} has been cancelled. Reason: ${notifyReason}`
          : `${item.title} has been cancelled by YMCA staff.`,
        type: 'event',
        createdAt: nowIso,
        read: false,
        link: '/(member)/schedule',
      });
    }

    state.schedules = state.schedules.filter((s) => s.id !== id);
    state.classRegistrations = state.classRegistrations.filter((r) => r.scheduleItemId !== id);
    state.savedClasses = state.savedClasses.filter((sc) => sc.scheduleItemId !== id);
    await saveStore(state);
  }

  async listAllSchedules(branchId?: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    const list = branchId
      ? state.schedules.filter((s) => s.branchId === branchId)
      : state.schedules;
    return [...list].sort((a, b) => a.start.localeCompare(b.start));
  }

  // ==========================================
  // Trainer Operations
  // ==========================================
  async listTrainerSchedule(staffId: string): Promise<ScheduleItem[]> {
    const state = await loadStore();
    const staff = state.staff.find((s) => s.id === staffId);
    const staffName = staff?.name.toLowerCase() ?? '';
    return state.schedules
      .filter(
        (item) =>
          item.staffId === staffId ||
          (staffName && item.instructorName.toLowerCase().includes(staffName))
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async cancelClassAndNotify(scheduleItemId: string, reason: string): Promise<void> {
    return this.deleteScheduleItem(scheduleItemId, reason);
  }

  async cancelLessonAndNotify(lessonId: string, reason: string): Promise<PrivateLesson> {
    const state = await loadStore();
    const idx = state.privateLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    const lesson = state.privateLessons[idx];
    lesson.status = 'cancelled';
    state.privateLessons[idx] = lesson;

    // Send notification to member
    const nowIso = new Date().toISOString();
    state.notifications.unshift({
      id: `notif-lesson-cancel-${Date.now()}`,
      userId: lesson.memberId,
      title: 'Private Lesson Cancelled',
      body: `Your private lesson on ${new Date(lesson.start).toLocaleDateString()} has been cancelled. Reason: ${reason}`,
      type: 'general',
      createdAt: nowIso,
      read: false,
      link: '/(member)/book-lesson',
    });

    await saveStore(state);
    return lesson;
  }

  async rescheduleLesson(
    lessonId: string,
    newStart: string,
    newEnd: string,
    newLocation?: string
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    const idx = state.privateLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    const lesson = state.privateLessons[idx];
    lesson.start = newStart;
    lesson.end = newEnd;
    if (newLocation) {
      lesson.location = newLocation;
    }
    state.privateLessons[idx] = lesson;

    // Send notification to member
    const nowIso = new Date().toISOString();
    const timeFormatted = new Date(newStart).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    state.notifications.unshift({
      id: `notif-lesson-resched-${Date.now()}`,
      userId: lesson.memberId,
      title: 'Private Lesson Rescheduled',
      body: `Your private lesson has been updated to ${new Date(newStart).toLocaleDateString()} at ${timeFormatted}.`,
      type: 'general',
      createdAt: nowIso,
      read: false,
      link: '/(member)/book-lesson',
    });

    await saveStore(state);
    return lesson;
  }

  async addLessonSlot(slot: Omit<LessonSlot, 'id'>, requesterUserId: string): Promise<LessonSlot> {
    const state = await loadStore();
    assertCanManageAvailability(state, requesterUserId, slot.staffId);
    const newSlot: LessonSlot = {
      ...slot,
      id: `slot-${Date.now()}`,
    };
    state.lessonSlots.push(newSlot);
    await saveStore(state);
    return newSlot;
  }

  async deleteLessonSlot(slotId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    const existing = state.lessonSlots.find((s) => s.id === slotId);
    if (!existing) throw new Error('Availability window not found');
    assertCanManageAvailability(state, requesterUserId, existing.staffId);
    state.lessonSlots = state.lessonSlots.filter((s) => s.id !== slotId);
    await saveStore(state);
  }

  async getTrainerAvailability(staffId: string, requesterUserId: string): Promise<TrainerAvailability> {
    const state = await loadStore();
    assertCanViewAvailability(state, requesterUserId, staffId);
    return (
      state.trainerAvailability?.[staffId] ?? {
        staffId,
        weekly: [],
        effectiveFrom: getDemoToday(),
        exceptions: [],
        updatedAt: demoNowIso(),
        updatedBy: '',
      }
    );
  }

  async saveTrainerAvailability(
    staffId: string,
    input: TrainerAvailabilityInput,
    requesterUserId: string
  ): Promise<{ availability: TrainerAvailability; conflicts: AvailabilityConflict[] }> {
    const state = await loadStore();
    const staff = assertCanManageAvailability(state, requesterUserId, staffId);
    const check = validateAvailability(input);
    if (!check.ok) throw new Error(check.errors[0].msg);
    const next = normalizeAvailability(input);
    const availability: TrainerAvailability = {
      staffId,
      weekly: next.weekly,
      effectiveFrom: next.effectiveFrom,
      effectiveUntil: next.effectiveUntil,
      exceptions: next.exceptions,
      updatedAt: demoNowIso(),
      updatedBy: requesterUserId,
    };
    state.trainerAvailability = { ...(state.trainerAvailability ?? {}), [staffId]: availability };
    // Existing bookings are never cancelled here; they are reported so a person can follow up.
    const conflicts = findConflicts(
      availability,
      staff.homeBranchId,
      state.privateLessons.filter((l) => l.staffId === staffId),
      (state.sessionRequests ?? []).filter((r) => r.staffId === staffId),
      { extraWindows: state.lessonSlots.filter((s) => s.staffId === staffId), fromIso: demoNowIso() }
    );
    await saveStore(state);
    return { availability, conflicts };
  }

  async listAvailabilityWindows(staffId: string, from: string, to: string): Promise<LessonSlot[]> {
    const state = await loadStore();
    return windowsFor(state, staffId, from, to).sort((a, b) => a.start.localeCompare(b.start));
  }

  // ==========================================
  // Trainer: Attendance & Session Operations
  // ==========================================
  async getClassRegistrations(scheduleItemId: string): Promise<ClassRegistration[]> {
    const state = await loadStore();
    return state.classRegistrations.filter(
      (r) => r.scheduleItemId === scheduleItemId && r.status === 'registered'
    );
  }

  async markClassAttendance(
    scheduleItemId: string,
    memberId: string,
    attendanceStatus: AttendanceStatus
  ): Promise<void> {
    const state = await loadStore();
    const reg = state.classRegistrations.find(
      (r) => r.scheduleItemId === scheduleItemId && r.memberId === memberId && r.status === 'registered'
    );
    if (!reg) {
      throw new Error('Registration not found for this member and class.');
    }
    reg.attendanceStatus = attendanceStatus;
    if (attendanceStatus === 'attended') {
      reg.checkedInAt = new Date().toISOString();
    }
    await saveStore(state);
  }

  async addWalkInRegistration(
    scheduleItemId: string,
    memberId: string
  ): Promise<ClassRegistration> {
    const state = await loadStore();
    const member = state.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }
    const sched = state.schedules.find((s) => s.id === scheduleItemId);
    if (!sched) {
      throw new Error(`Schedule item not found: ${scheduleItemId}`);
    }
    const existing = state.classRegistrations.find(
      (r) => r.scheduleItemId === scheduleItemId && r.memberId === memberId
    );
    if (existing) {
      existing.status = 'registered';
      existing.attendanceStatus = 'attended';
      existing.checkedInAt = new Date().toISOString();
      await saveStore(state);
      return existing;
    }
    const newReg: ClassRegistration = {
      id: `reg-walkin-${Date.now()}`,
      memberId,
      scheduleItemId,
      status: 'registered',
      attendanceStatus: 'attended',
      checkedInAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    };
    state.classRegistrations.push(newReg);
    await saveStore(state);
    return newReg;
  }

  async markLessonStatus(
    lessonId: string,
    status: 'booked' | 'completed' | 'no_show',
    notes?: string
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    const lesson = state.privateLessons.find((l) => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    lesson.status = status;
    if (status === 'completed') {
      lesson.completedAt = new Date().toISOString();
      if (lesson.paymentStatus === 'due') {
        const price = lessonPriceCents(state.lessonPricing, lesson.lessonType ?? 'training', (lesson.durationMin as 30 | 60) ?? 60);
        const ms = state.memberships.find((m) => m.memberId === lesson.memberId);
        lesson.paidAmountCents = price;
        lesson.paymentLast4 = price > 0 ? ms?.paymentLast4 : undefined;
        lesson.paymentStatus = 'paid';
        notifyUser(
          state,
          lesson.memberId,
          'Receipt',
          price > 0
            ? `$${(price / 100).toFixed(2)} was charged to your card ending ${ms?.paymentLast4 ?? '----'} for your session.`
            : 'Your session was completed at no charge.'
        );
      }
    }
    if (notes !== undefined) {
      lesson.notes = notes;
    }
    await saveStore(state);
    return lesson;
  }

  async bookLessonForMember(
    staffId: string,
    memberId: string,
    slotIdOrCustom: string | { start: string; end: string; location: string }
  ): Promise<PrivateLesson> {
    const state = await loadStore();
    if (typeof slotIdOrCustom === 'string') {
      return this.bookPrivateLesson(memberId, slotIdOrCustom);
    }
    const newLesson: PrivateLesson = {
      id: `lesson-custom-${Date.now()}`,
      memberId,
      staffId,
      slotId: `slot-direct-${Date.now()}`,
      start: slotIdOrCustom.start,
      end: slotIdOrCustom.end,
      location: slotIdOrCustom.location,
      status: 'booked',
    };
    state.privateLessons.push(newLesson);

    // Notify member
    state.notifications.unshift({
      id: `notif-lesson-booked-${Date.now()}`,
      userId: memberId,
      title: 'New Private Session Booked',
      body: `Your trainer scheduled a private session for ${new Date(slotIdOrCustom.start).toLocaleDateString()} at ${new Date(slotIdOrCustom.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.`,
      type: 'general',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/(member)/book-lesson',
    });

    await saveStore(state);
    return newLesson;
  }

  // ==========================================
  // Trainer: Client Workout Logs & Progression
  // ==========================================
  async listClientWorkoutLogs(memberId: string): Promise<ClientWorkoutLog[]> {
    const state = await loadStore();
    return (state.workoutLogs || [])
      .filter((w) => w.memberId === memberId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async logClientWorkout(
    input: Omit<ClientWorkoutLog, 'id' | 'createdAt'>
  ): Promise<ClientWorkoutLog> {
    const state = await loadStore();
    const newLog: ClientWorkoutLog = {
      ...input,
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    if (!state.workoutLogs) state.workoutLogs = [];
    state.workoutLogs.unshift(newLog);
    await saveStore(state);
    return newLog;
  }

  async updateClientWorkoutLog(
    logId: string,
    updates: Partial<ClientWorkoutLog>
  ): Promise<ClientWorkoutLog> {
    const state = await loadStore();
    if (!state.workoutLogs) state.workoutLogs = [];
    const index = state.workoutLogs.findIndex((w) => w.id === logId);
    if (index === -1) {
      throw new Error(`Workout log ${logId} not found`);
    }
    const updated: ClientWorkoutLog = {
      ...state.workoutLogs[index],
      ...updates,
      id: logId,
    };
    state.workoutLogs[index] = updated;
    await saveStore(state);
    return updated;
  }

  async deleteClientWorkoutLog(logId: string): Promise<void> {
    const state = await loadStore();
    if (!state.workoutLogs) return;
    state.workoutLogs = state.workoutLogs.filter((w) => w.id !== logId);
    await saveStore(state);
  }

  // ==========================================
  // Trainer: Client Fitness Goals
  // ==========================================
  async getClientFitnessGoal(memberId: string): Promise<ClientFitnessGoal | null> {
    const state = await loadStore();
    return state.clientGoals?.[memberId] ?? null;
  }

  async saveClientFitnessGoal(goal: ClientFitnessGoal): Promise<ClientFitnessGoal> {
    const state = await loadStore();
    if (!state.clientGoals) state.clientGoals = {};
    const updated = {
      ...goal,
      updatedAt: new Date().toISOString(),
    };
    state.clientGoals[goal.memberId] = updated;
    await saveStore(state);
    return updated;
  }

  // ==========================================
  // Staff & Trainer Management (Admin)
  // ==========================================
  async createStaff(input: Omit<Staff, 'id'> & { password: string }): Promise<Staff> {
    const state = await loadStore();
    const existing = state.credentials.find((c) => c.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      throw new Error(`An account with email ${input.email} already exists.`);
    }

    const newId = `staff-${Date.now()}`;
    const newStaff: Staff = {
      id: newId,
      name: input.name.trim(),
      email: input.email.trim(),
      roleLabel: input.roleLabel.trim(),
      homeBranchId: input.homeBranchId || 'silver-spring',
      staffRole: input.staffRole || 'trainer',
      avatarUrl: input.avatarUrl,
    };

    state.staff.push(newStaff);
    state.credentials.push({
      email: input.email.trim(),
      password: input.password || 'ymca-demo',
      userId: newId,
      role: credentialRoleForStaffRole(input.staffRole),
    });

    await saveStore(state);
    return newStaff;
  }

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff> {
    const state = await loadStore();
    const idx = state.staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Staff member not found: ${id}`);
    }

    const old = state.staff[idx];
    const updated: Staff = {
      ...old,
      ...updates,
      id,
    };
    state.staff[idx] = updated;

    // Sync credentials
    const credIdx = state.credentials.findIndex((c) => c.userId === id);
    if (credIdx !== -1) {
      if (updates.email) {
        state.credentials[credIdx].email = updates.email.trim();
      }
      if (updates.staffRole) {
        state.credentials[credIdx].role = credentialRoleForStaffRole(updates.staffRole);
      }
    }

    await saveStore(state);
    return updated;
  }

  async deleteStaff(id: string): Promise<void> {
    const state = await loadStore();
    state.staff = state.staff.filter((s) => s.id !== id);
    state.credentials = state.credentials.filter((c) => c.userId !== id);
    state.lessonSlots = state.lessonSlots.filter((slot) => slot.staffId !== id);
    state.assignments = state.assignments.filter((a) => a.staffId !== id);
    await saveStore(state);
  }

  // ==========================================
  // Password Management (Admin)
  // ==========================================
  async changeUserPassword(email: string, newPassword: string): Promise<void> {
    const state = await loadStore();
    const credIdx = state.credentials.findIndex(
      (c) => c.email.toLowerCase() === email.toLowerCase()
    );
    if (credIdx === -1) {
      throw new Error(`User with email ${email} not found.`);
    }
    state.credentials[credIdx].password = newPassword;
    await saveStore(state);
  }

  // ==========================================
  // Admin Member Creation
  // ==========================================
  async createMemberAdmin(input: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    planId: string;
    password?: string;
    homeBranchId?: string;
    campaignId?: string;
  }): Promise<{ member: Member; membership: Membership }> {
    const state = await loadStore();
    const existing = state.credentials.find(
      (c) => c.email.toLowerCase() === input.email.toLowerCase()
    );
    if (existing) {
      throw new Error(`User with email ${input.email} already exists.`);
    }

    const plan = planForSignup(state, input.planId);

    const newMemberId = `member-${Date.now()}`;
    const membershipId = String(Math.floor(100000 + Math.random() * 900000));
    const nowIso = new Date().toISOString();
    const branch = input.homeBranchId || 'silver-spring';

    const newMember: Member = {
      id: newMemberId,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address?.trim() || '101 Georgia Ave, Silver Spring, MD',
      membershipId,
      homeBranchId: branch,
      type: plan.name,
      status: 'active',
    };

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    const newMembership: Membership = {
      memberId: newMemberId,
      rateName: plan.name,
      monthlyAmountCents: plan.monthlyAmountCents,
      nextBillingDate: nextBillingDate.toISOString().slice(0, 10),
      paymentBrand: 'Visa',
      paymentLast4: '4242',
      status: 'active',
      joinedDate: nowIso.slice(0, 10),
      billingStatus: 'current',
      campaignId: resolveCampaign(state, plan.id, input.campaignId)?.id,
    };

    state.members.push(newMember);
    state.memberships.push(newMembership);
    state.credentials.push({
      email: input.email.trim(),
      password: input.password || 'ymca-demo',
      userId: newMemberId,
      role: 'member',
    });

    state.notifications.unshift({
      id: `notif-welcome-${Date.now()}`,
      userId: newMemberId,
      title: 'Welcome to YMCA Silver Spring!',
      body: `Your ${plan.name} Membership is active. Scan your barcode #${membershipId} for instant facility access.`,
      type: 'membership',
      createdAt: nowIso,
      read: false,
      link: '/(member)/manage-membership',
    });

    await saveStore(state);
    return { member: newMember, membership: newMembership };
  }

  // ==========================================
  // Class Community Forum & Chat
  // ==========================================
  async listClassForumPosts(classId: string): Promise<ClassForumPost[]> {
    const state = await loadStore();
    const posts = (state.classForumPosts ?? []).filter((p) => p.classId === classId);
    return posts.sort((a, b) => {
      // Pinned posts first, then chronological
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  async listRecentlyChattedClassIds(userId: string): Promise<string[]> {
    const state = await loadStore();
    const userPosts = (state.classForumPosts ?? [])
      .filter((p) => p.authorId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of userPosts) {
      if (!seen.has(p.classId)) {
        seen.add(p.classId);
        result.push(p.classId);
      }
    }
    return result;
  }

  async createClassForumPost(input: {
    classId: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    content: string;
    pinned?: boolean;
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
    replyToId?: string;
    replyToAuthorName?: string;
    replyToExcerpt?: string;
  }): Promise<ClassForumPost> {
    const state = await loadStore();
    assertFeatureOn(state, 'communityForum');
    if (!state.classForumPosts) {
      state.classForumPosts = [];
    }

    const now = new Date().toISOString();
    const extracted = extractMentionsFromText(input.content, state);
    const mentionedUserIds = Array.from(
      new Set([...(input.mentionedUserIds ?? []), ...extracted.allIds])
    );
    const mentionedUserNames = Array.from(
      new Set([...(input.mentionedUserNames ?? []), ...extracted.allNames])
    );

    const post: ClassForumPost = {
      id: `cfp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      classId: input.classId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole as any,
      authorAvatarUrl: input.authorAvatarUrl,
      content: filterProfanity(input.content.trim()),
      createdAt: now,
      pinned: input.pinned ?? false,
      mentionedUserIds,
      mentionedUserNames,
      replyToId: input.replyToId,
      replyToAuthorName: input.replyToAuthorName,
      replyToExcerpt: input.replyToExcerpt,
    };

    const existingClassPosts = state.classForumPosts.filter((p) => p.classId === input.classId);
    state.classForumPosts.push(post);

    if (!state.notifications) {
      state.notifications = [];
    }
    const classItem = state.schedules.find((s) => s.id === input.classId);
    const classTitle = classItem?.title ?? 'Class Chat';
    const notifiedUsers = new Set<string>([input.authorId]);

    // 1. Notify any @mentioned users in the class chat post
    for (const rawId of mentionedUserIds) {
      const isStaffAll = rawId === 'staff-all';
      const targetUserId = isStaffAll ? 'staff-desk' : rawId;
      if (notifiedUsers.has(targetUserId)) continue;

      const targetPrefs =
        state.notificationPreferences?.[targetUserId] ?? defaultNotificationPreferences(targetUserId);
      const isEnabled = isStaffAll ? targetPrefs.staffInquiries : targetPrefs.mentions;
      if (!isEnabled) continue;

      notifiedUsers.add(targetUserId);
      state.notifications.push({
        id: `notif-cfp-mention-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: targetUserId,
        title: isStaffAll
          ? `@ Staff Desk in ${classTitle}: ${input.authorName}`
          : `Mentioned in ${classTitle} by ${input.authorName}`,
        body: `"${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}"`,
        type: isStaffAll ? 'staff_inquiry' : 'forum_mention',
        createdAt: now,
        read: false,
        relatedId: input.classId,
        link: '/(member)/community-forum',
      });
    }

    // 2. Notify users who previously chatted in this class forum or marked it as interested
    const classParticipantIds = new Set<string>(existingClassPosts.map((p) => p.authorId));
    for (const [uid, interests] of Object.entries(state.forumInterests ?? {})) {
      if (interests?.classIds?.includes(input.classId)) {
        classParticipantIds.add(uid);
      }
    }
    if (classItem?.staffId) {
      classParticipantIds.add(classItem.staffId);
    }

    for (const targetUserId of classParticipantIds) {
      if (notifiedUsers.has(targetUserId)) continue;
      const targetPrefs =
        state.notificationPreferences?.[targetUserId] ?? defaultNotificationPreferences(targetUserId);
      if (!targetPrefs.classForumAlerts) continue;

      notifiedUsers.add(targetUserId);
      state.notifications.push({
        id: `notif-cfp-reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: targetUserId,
        title: `New Message in ${classTitle} from ${input.authorName}`,
        body: `"${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}"`,
        type: 'class_forum',
        createdAt: now,
        read: false,
        relatedId: input.classId,
        link: '/(member)/community-forum',
      });
    }

    await saveStore(state);
    return post;
  }

  async deleteClassForumPost(postId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    if (!state.classForumPosts) return;

    const idx = state.classForumPosts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      throw new Error(`Forum post not found: ${postId}`);
    }

    const post = state.classForumPosts[idx];

    // Check permissions
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);
    const classItem = state.schedules.find((s) => s.id === post.classId);

    const isAuthor = post.authorId === requesterUserId;
    const isStaffOrITAdmin =
      isAdminRole(requesterStaff?.staffRole) || isAdminRole(requesterCred?.role);
    const isClassTrainer =
      classItem &&
      requesterStaff &&
      (classItem.staffId === requesterUserId ||
        (requesterStaff.name &&
          (classItem.instructorName.toLowerCase().includes(requesterStaff.name.toLowerCase()) ||
            requesterStaff.name.toLowerCase().includes(classItem.instructorName.toLowerCase()))));

    if (!isAuthor && !isStaffOrITAdmin && !isClassTrainer) {
      throw new Error('Only the post author, class trainer, or IT/Staff Admins can delete this message.');
    }

    state.classForumPosts.splice(idx, 1);
    await saveStore(state);
  }

  async togglePinClassForumPost(postId: string, requesterUserId: string): Promise<ClassForumPost> {
    const state = await loadStore();
    if (!state.classForumPosts) {
      throw new Error(`Forum post not found: ${postId}`);
    }

    const idx = state.classForumPosts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      throw new Error(`Forum post not found: ${postId}`);
    }

    const post = state.classForumPosts[idx];

    // Check manager permissions
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);
    const classItem = state.schedules.find((s) => s.id === post.classId);

    const isStaffOrITAdmin =
      isAdminRole(requesterStaff?.staffRole) || isAdminRole(requesterCred?.role);
    const isClassTrainer =
      classItem &&
      requesterStaff &&
      (classItem.staffId === requesterUserId ||
        (requesterStaff.name &&
          classItem.instructorName.toLowerCase().includes(requesterStaff.name.toLowerCase())));

    if (!isStaffOrITAdmin && !isClassTrainer) {
      throw new Error('Only IT Admins, Staff Admins, or the class trainer can pin announcements.');
    }

    post.pinned = !post.pinned;
    state.classForumPosts[idx] = post;
    await saveStore(state);
    return post;
  }

  // ==========================================
  // Dedicated Community Forum
  // ==========================================
  async listForumTopics(filter?: {
    category?: ForumTopicCategory;
    categories?: ForumTopicCategory[];
    staffMentioned?: boolean;
    authorId?: string;
    interestedUserId?: string;
    chattedByUserId?: string;
    chattedOrCreatedByUserId?: string;
    searchQuery?: string;
  }): Promise<ForumTopic[]> {
    const state = await loadStore();
    let topics = [...(state.forumTopics ?? [])];
    const replies = state.forumReplies ?? [];

    const hasUserChattedInTopic = (t: ForumTopic, uid: string): boolean => {
      if ((t.participantIds ?? []).includes(uid)) return true;
      if (t.lastChattedAtBy?.[uid]) return true;
      return replies.some((r) => r.topicId === t.id && r.authorId === uid);
    };

    const isUserInterestedInTopic = (t: ForumTopic, uid: string): boolean => {
      const userInterests = state.forumInterests?.[uid];
      if ((t.interestedBy ?? []).includes(uid)) return true;
      if (userInterests?.topicIds?.includes(t.id)) return true;
      if (userInterests?.categories?.includes(t.category)) return true;
      return false;
    };

    if (filter?.category) {
      topics = topics.filter((t) => t.category === filter.category);
    }
    if (filter?.categories && filter.categories.length > 0) {
      topics = topics.filter((t) => filter.categories!.includes(t.category));
    }
    if (filter?.staffMentioned) {
      topics = topics.filter((t) => t.mentionedStaffIds && t.mentionedStaffIds.length > 0);
    }
    if (filter?.authorId) {
      topics = topics.filter((t) => t.authorId === filter.authorId);
    }
    if (filter?.interestedUserId) {
      const uid = filter.interestedUserId;
      topics = topics.filter((t) => isUserInterestedInTopic(t, uid));
    }
    if (filter?.chattedByUserId) {
      const uid = filter.chattedByUserId;
      topics = topics.filter((t) => hasUserChattedInTopic(t, uid));
    }
    if (filter?.chattedOrCreatedByUserId) {
      const uid = filter.chattedOrCreatedByUserId;
      topics = topics.filter((t) => t.authorId === uid || hasUserChattedInTopic(t, uid));
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      topics = topics.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.authorName.toLowerCase().includes(q)
      );
    }

    if (filter?.chattedByUserId) {
      const uid = filter.chattedByUserId;
      return topics.sort((a, b) => {
        const aTime = a.lastChattedAtBy?.[uid] || a.updatedAt || a.createdAt;
        const bTime = b.lastChattedAtBy?.[uid] || b.updatedAt || b.createdAt;
        return bTime.localeCompare(aTime);
      });
    }

    return topics.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
  }

  async getForumTopic(topicId: string): Promise<ForumTopic | null> {
    const state = await loadStore();
    return (state.forumTopics ?? []).find((t) => t.id === topicId) ?? null;
  }

  async createForumTopic(input: {
    title: string;
    content: string;
    category: ForumTopicCategory;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    pinned?: boolean;
    mentionedStaffIds?: string[];
    mentionedStaffNames?: string[];
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
  }): Promise<ForumTopic> {
    const state = await loadStore();
    assertFeatureOn(state, 'communityForum');
    if (!state.forumTopics) {
      state.forumTopics = [];
    }

    const combinedText = `${input.title} ${input.content}`;
    const extracted = extractMentionsFromText(combinedText, state);

    const mentionedStaffIds = Array.from(
      new Set([...(input.mentionedStaffIds ?? []), ...extracted.staffIds])
    );
    const mentionedStaffNames = Array.from(
      new Set([...(input.mentionedStaffNames ?? []), ...extracted.staffNames])
    );
    const mentionedUserIds = Array.from(
      new Set([...(input.mentionedUserIds ?? []), ...mentionedStaffIds, ...extracted.allIds])
    );
    const mentionedUserNames = Array.from(
      new Set([...(input.mentionedUserNames ?? []), ...mentionedStaffNames, ...extracted.allNames])
    );

    const now = new Date().toISOString();
    const topic: ForumTopic = {
      id: `topic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: filterProfanity(input.title.trim()),
      content: filterProfanity(input.content.trim()),
      category: input.category,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole as any,
      authorAvatarUrl: input.authorAvatarUrl,
      pinned: input.pinned ?? false,
      likes: 0,
      likedBy: [],
      interestedBy: [],
      participantIds: [],
      lastChattedAtBy: {},
      replyCount: 0,
      mentionedStaffIds,
      mentionedStaffNames,
      mentionedUserIds,
      mentionedUserNames,
      hasStaffReply: false,
      createdAt: now,
      updatedAt: now,
    };

    state.forumTopics.unshift(topic);

    // Notify any mentioned users (staff or members), checking their notification preferences
    if (mentionedUserIds.length > 0) {
      if (!state.notifications) {
        state.notifications = [];
      }
      const notifiedTargets = new Set<string>([input.authorId]);
      for (const rawTargetId of mentionedUserIds) {
        const isStaffAll = rawTargetId === 'staff-all';
        const targetUserId = isStaffAll ? 'staff-desk' : rawTargetId;
        if (notifiedTargets.has(targetUserId)) continue;

        const targetPrefs =
          state.notificationPreferences?.[targetUserId] ??
          defaultNotificationPreferences(targetUserId);
        const isEnabled = isStaffAll ? targetPrefs.staffInquiries : targetPrefs.mentions;
        if (!isEnabled) continue;

        notifiedTargets.add(targetUserId);
        state.notifications.push({
          id: `notif-forum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: targetUserId,
          title: isStaffAll
            ? `@ Staff Desk: Question from ${input.authorName}`
            : `Forum Mention from ${input.authorName}`,
          body: `Tagged in "${input.title}": "${input.content.slice(0, 70)}..."`,
          type: isStaffAll ? 'staff_inquiry' : 'forum_mention',
          createdAt: now,
          read: false,
          relatedId: topic.id,
          link: '/(member)/community-forum',
        });
      }
    }

    await saveStore(state);
    return topic;
  }

  async deleteForumTopic(topicId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    if (!state.forumTopics) return;

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);

    const isAuthor = topic.authorId === requesterUserId;
    const isStaffOrAdmin =
      isStaffRole(requesterStaff?.staffRole) || isStaffRole(requesterCred?.role);

    if (!isAuthor && !isStaffOrAdmin) {
      throw new Error('Only the topic author or staff/admin can delete this topic.');
    }

    state.forumTopics.splice(idx, 1);
    // Clean up replies for this topic
    if (state.forumReplies) {
      state.forumReplies = state.forumReplies.filter((r) => r.topicId !== topicId);
    }

    await saveStore(state);
  }

  async togglePinForumTopic(topicId: string, requesterUserId: string): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);

    const isStaffOrAdmin =
      isStaffRole(requesterStaff?.staffRole) || isStaffRole(requesterCred?.role);

    if (!isStaffOrAdmin) {
      throw new Error('Only staff or administrators can pin forum topics.');
    }

    topic.pinned = !topic.pinned;
    state.forumTopics[idx] = topic;
    await saveStore(state);
    return topic;
  }

  async toggleLikeForumTopic(topicId: string, userId: string): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    if (!topic.likedBy) {
      topic.likedBy = [];
    }

    const likedIndex = topic.likedBy.indexOf(userId);
    if (likedIndex >= 0) {
      topic.likedBy.splice(likedIndex, 1);
      topic.likes = Math.max(0, (topic.likes ?? 1) - 1);
    } else {
      topic.likedBy.push(userId);
      topic.likes = (topic.likes ?? 0) + 1;
    }

    state.forumTopics[idx] = topic;
    await saveStore(state);
    return topic;
  }

  async toggleInterestedForumTopic(topicId: string, userId: string): Promise<ForumTopic> {
    const state = await loadStore();
    if (!state.forumTopics) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const idx = state.forumTopics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      throw new Error(`Forum topic not found: ${topicId}`);
    }

    const topic = state.forumTopics[idx];
    if (!topic.interestedBy) {
      topic.interestedBy = [];
    }
    if (!state.forumInterests) {
      state.forumInterests = {};
    }
    const userInterests = state.forumInterests[userId] ?? defaultForumInterests(userId);

    const interestedIdx = topic.interestedBy.indexOf(userId);
    if (interestedIdx >= 0) {
      topic.interestedBy.splice(interestedIdx, 1);
      userInterests.topicIds = (userInterests.topicIds ?? []).filter((id) => id !== topicId);
    } else {
      topic.interestedBy.push(userId);
      if (!userInterests.topicIds.includes(topicId)) {
        userInterests.topicIds = [...userInterests.topicIds, topicId];
      }
    }

    state.forumInterests[userId] = userInterests;
    state.forumTopics[idx] = topic;
    await saveStore(state);
    return topic;
  }

  async getForumInterests(userId: string): Promise<UserForumInterests> {
    const state = await loadStore();
    if (!state.forumInterests) {
      state.forumInterests = {};
    }
    if (!state.forumInterests[userId]) {
      const topicIdsFromTopics = (state.forumTopics ?? [])
        .filter((t) => (t.interestedBy ?? []).includes(userId))
        .map((t) => t.id);
      state.forumInterests[userId] = {
        ...defaultForumInterests(userId),
        topicIds: topicIdsFromTopics,
      };
      await saveStore(state);
    }
    return {
      userId,
      categories: [...(state.forumInterests[userId].categories ?? [])],
      topicIds: [...(state.forumInterests[userId].topicIds ?? [])],
      classIds: [...(state.forumInterests[userId].classIds ?? [])],
    };
  }

  async updateForumInterests(
    userId: string,
    updates: Partial<Omit<UserForumInterests, 'userId'>>
  ): Promise<UserForumInterests> {
    const state = await loadStore();
    if (!state.forumInterests) {
      state.forumInterests = {};
    }
    const current = state.forumInterests[userId] ?? defaultForumInterests(userId);
    const updated: UserForumInterests = {
      userId,
      categories: updates.categories !== undefined ? [...updates.categories] : [...(current.categories ?? [])],
      topicIds: updates.topicIds !== undefined ? [...updates.topicIds] : [...(current.topicIds ?? [])],
      classIds: updates.classIds !== undefined ? [...updates.classIds] : [...(current.classIds ?? [])],
    };
    state.forumInterests[userId] = updated;

    // Sync topic.interestedBy if topicIds was updated
    if (updates.topicIds !== undefined && state.forumTopics) {
      const topicIdSet = new Set(updated.topicIds);
      for (const t of state.forumTopics) {
        const set = new Set(t.interestedBy ?? []);
        if (topicIdSet.has(t.id)) {
          set.add(userId);
        } else {
          set.delete(userId);
        }
        t.interestedBy = Array.from(set);
      }
    }

    await saveStore(state);
    return updated;
  }

  async toggleInterestedForumCategory(
    userId: string,
    category: ForumTopicCategory
  ): Promise<UserForumInterests> {
    const current = await this.getForumInterests(userId);
    const exists = current.categories.includes(category);
    const nextCategories = exists
      ? current.categories.filter((c) => c !== category)
      : [...current.categories, category];
    return this.updateForumInterests(userId, { categories: nextCategories });
  }

  async toggleInterestedClassForum(
    userId: string,
    classId: string
  ): Promise<UserForumInterests> {
    const current = await this.getForumInterests(userId);
    const exists = current.classIds.includes(classId);
    const nextClassIds = exists
      ? current.classIds.filter((c) => c !== classId)
      : [...current.classIds, classId];
    return this.updateForumInterests(userId, { classIds: nextClassIds });
  }

  async listForumReplies(topicId: string): Promise<ForumReply[]> {
    const state = await loadStore();
    const replies = (state.forumReplies ?? []).filter((r) => r.topicId === topicId);
    return replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createForumReply(input: {
    topicId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    isStaffReply: boolean;
    mentionedStaffIds?: string[];
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
    replyToId?: string;
    replyToAuthorName?: string;
    replyToExcerpt?: string;
  }): Promise<ForumReply> {
    const state = await loadStore();
    assertFeatureOn(state, 'communityForum');
    if (!state.forumReplies) {
      state.forumReplies = [];
    }

    const extracted = extractMentionsFromText(input.content, state);
    const mentionedStaffIds = Array.from(
      new Set([...(input.mentionedStaffIds ?? []), ...extracted.staffIds])
    );
    const mentionedUserIds = Array.from(
      new Set([...(input.mentionedUserIds ?? []), ...mentionedStaffIds, ...extracted.allIds])
    );
    const mentionedUserNames = Array.from(
      new Set([...(input.mentionedUserNames ?? []), ...extracted.allNames])
    );

    const now = new Date().toISOString();
    const reply: ForumReply = {
      id: `freply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      topicId: input.topicId,
      content: filterProfanity(input.content.trim()),
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole as any,
      authorAvatarUrl: input.authorAvatarUrl,
      isStaffReply: input.isStaffReply,
      mentionedStaffIds,
      mentionedUserIds,
      mentionedUserNames,
      likes: 0,
      likedBy: [],
      createdAt: now,
      replyToId: input.replyToId,
      replyToAuthorName: input.replyToAuthorName,
      replyToExcerpt: input.replyToExcerpt,
    };

    const previousReplies = state.forumReplies.filter((r) => r.topicId === input.topicId);
    state.forumReplies.push(reply);

    // Update parent topic with replyCount, updatedAt, participantIds, and lastChattedAtBy
    const topic = (state.forumTopics ?? []).find((t) => t.id === input.topicId);
    const previousParticipantIds = new Set<string>([
      ...(topic?.participantIds ?? []),
      ...previousReplies.map((r) => r.authorId),
    ]);

    if (topic) {
      topic.replyCount = (topic.replyCount ?? 0) + 1;
      topic.updatedAt = now;
      if (input.isStaffReply) {
        topic.hasStaffReply = true;
      }
      const nextParticipants = new Set<string>(previousParticipantIds);
      nextParticipants.add(input.authorId);
      topic.participantIds = Array.from(nextParticipants);
      topic.lastChattedAtBy = {
        ...(topic.lastChattedAtBy ?? {}),
        [input.authorId]: now,
      };
    }

    if (!state.notifications) {
      state.notifications = [];
    }
    const notifiedUsers = new Set<string>([input.authorId]);

    // 1. If any users (staff or members) were @mentioned in the reply, check preferences and notify them first
    if (mentionedUserIds.length > 0) {
      for (const rawId of mentionedUserIds) {
        const isStaffAll = rawId === 'staff-all';
        const targetUserId = isStaffAll ? 'staff-desk' : rawId;
        if (notifiedUsers.has(targetUserId)) continue;

        const targetPrefs =
          state.notificationPreferences?.[targetUserId] ??
          defaultNotificationPreferences(targetUserId);
        const isEnabled = isStaffAll ? targetPrefs.staffInquiries : targetPrefs.mentions;
        if (!isEnabled) continue;

        notifiedUsers.add(targetUserId);
        state.notifications.push({
          id: `notif-reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: targetUserId,
          title: isStaffAll
            ? `@ Staff Desk: Reply from ${input.authorName}`
            : `Reply Mention from ${input.authorName}`,
          body: `Tagged in "${topic?.title ?? 'discussion'}": "${reply.content.slice(0, 70)}..."`,
          type: isStaffAll ? 'staff_inquiry' : 'forum_mention',
          createdAt: now,
          read: false,
          relatedId: input.topicId,
          link: '/(member)/community-forum',
        });
      }
    }

    // 2. Notify the original topic author if replied by someone else and author has topicReplies enabled
    if (topic && topic.authorId !== input.authorId && !notifiedUsers.has(topic.authorId)) {
      const authorPrefs =
        state.notificationPreferences?.[topic.authorId] ??
        defaultNotificationPreferences(topic.authorId);
      if (authorPrefs.topicReplies) {
        notifiedUsers.add(topic.authorId);
        state.notifications.push({
          id: `notif-freply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: topic.authorId,
          title: input.isStaffReply
            ? `Official YMCA Response: ${input.authorName}`
            : `New Reply from ${input.authorName}`,
          body: `In "${topic.title}": "${reply.content.slice(0, 70)}..."`,
          type: 'forum_reply',
          createdAt: now,
          read: false,
          relatedId: input.topicId,
          link: '/(member)/community-forum',
        });
      }
    }

    // 3. Notify other users who recently chatted in this topic or marked this topic as interested
    if (topic) {
      const interestedOrParticipantUsers = new Set<string>([
        ...previousParticipantIds,
        ...(topic.interestedBy ?? []),
      ]);
      for (const [uid, interests] of Object.entries(state.forumInterests ?? {})) {
        if (interests?.topicIds?.includes(topic.id)) {
          interestedOrParticipantUsers.add(uid);
        }
      }

      for (const targetUserId of interestedOrParticipantUsers) {
        if (notifiedUsers.has(targetUserId) || targetUserId === topic.authorId) continue;
        const targetPrefs =
          state.notificationPreferences?.[targetUserId] ??
          defaultNotificationPreferences(targetUserId);
        if (!targetPrefs.topicReplies) continue;

        const wasParticipant = previousParticipantIds.has(targetUserId);
        const wasInterested =
          (topic.interestedBy ?? []).includes(targetUserId) ||
          Boolean(state.forumInterests?.[targetUserId]?.topicIds?.includes(topic.id));

        if (wasParticipant && targetPrefs.chattedTopicReplies === false) continue;
        if (!wasParticipant && wasInterested && targetPrefs.interestedTopicActivity === false) continue;

        notifiedUsers.add(targetUserId);
        state.notifications.push({
          id: `notif-fpart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: targetUserId,
          title: input.isStaffReply
            ? `Official YMCA Response: ${input.authorName}`
            : wasParticipant
              ? `New Reply in Thread You Chatted In: ${input.authorName}`
              : `New Reply in Followed Topic: ${input.authorName}`,
          body: `In "${topic.title}": "${reply.content.slice(0, 70)}..."`,
          type: 'forum_reply',
          createdAt: now,
          read: false,
          relatedId: input.topicId,
          link: '/(member)/community-forum',
        });
      }
    }

    await saveStore(state);
    return reply;
  }

  async toggleForumReplyReaction(replyId: string, userId: string, emoji: string): Promise<ForumReply> {
    const state = await loadStore();
    const reply = (state.forumReplies ?? []).find((r) => r.id === replyId);
    if (!reply) throw new Error(`Forum reply not found: ${replyId}`);
    const seeded =
      reply.reactions ?? (reply.likedBy?.length ? { '❤️': [...reply.likedBy] } : undefined);
    reply.reactions = toggleReactionMap(seeded, emoji, userId);
    await saveStore(state);
    return reply;
  }

  async editForumReply(replyId: string, userId: string, content: string): Promise<ForumReply> {
    const state = await loadStore();
    const reply = (state.forumReplies ?? []).find((r) => r.id === replyId);
    if (!reply) throw new Error(`Forum reply not found: ${replyId}`);
    if (reply.authorId !== userId) throw new Error('Only the author can edit this message.');
    const text = filterProfanity(content.trim());
    if (!text) throw new Error('Message cannot be empty.');
    reply.content = text;
    reply.editedAt = new Date().toISOString();
    await saveStore(state);
    return reply;
  }

  async toggleClassForumPostReaction(
    postId: string,
    userId: string,
    emoji: string
  ): Promise<ClassForumPost> {
    const state = await loadStore();
    const post = (state.classForumPosts ?? []).find((p) => p.id === postId);
    if (!post) throw new Error(`Forum post not found: ${postId}`);
    post.reactions = toggleReactionMap(post.reactions, emoji, userId);
    await saveStore(state);
    return post;
  }

  async editClassForumPost(postId: string, userId: string, content: string): Promise<ClassForumPost> {
    const state = await loadStore();
    const post = (state.classForumPosts ?? []).find((p) => p.id === postId);
    if (!post) throw new Error(`Forum post not found: ${postId}`);
    if (post.authorId !== userId) throw new Error('Only the author can edit this message.');
    const text = filterProfanity(content.trim());
    if (!text) throw new Error('Message cannot be empty.');
    post.content = text;
    post.editedAt = new Date().toISOString();
    await saveStore(state);
    return post;
  }

  async deleteForumReply(replyId: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    if (!state.forumReplies) return;

    const idx = state.forumReplies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      throw new Error(`Forum reply not found: ${replyId}`);
    }

    const reply = state.forumReplies[idx];
    const topic = (state.forumTopics ?? []).find((t) => t.id === reply.topicId);
    const requesterStaff = state.staff.find((s) => s.id === requesterUserId);
    const requesterCred = state.credentials.find((c) => c.userId === requesterUserId);

    const isAuthor = reply.authorId === requesterUserId;
    const isTopicOwner = Boolean(topic && topic.authorId === requesterUserId);
    const isStaffOrAdmin =
      isStaffRole(requesterStaff?.staffRole) || isStaffRole(requesterCred?.role);

    if (!isAuthor && !isTopicOwner && !isStaffOrAdmin) {
      throw new Error(
        'Only the reply author, thread owner, trainer, or staff/admin can delete this message.'
      );
    }

    state.forumReplies.splice(idx, 1);

    // Decrement count on topic
    if (topic && topic.replyCount > 0) {
      topic.replyCount -= 1;
    }

    await saveStore(state);
  }

  async toggleLikeForumReply(replyId: string, userId: string): Promise<ForumReply> {
    const state = await loadStore();
    if (!state.forumReplies) {
      throw new Error(`Forum reply not found: ${replyId}`);
    }

    const idx = state.forumReplies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      throw new Error(`Forum reply not found: ${replyId}`);
    }

    const reply = state.forumReplies[idx];
    if (!reply.likedBy) {
      reply.likedBy = [];
    }

    const likedIndex = reply.likedBy.indexOf(userId);
    if (likedIndex >= 0) {
      reply.likedBy.splice(likedIndex, 1);
      reply.likes = Math.max(0, (reply.likes ?? 1) - 1);
    } else {
      reply.likedBy.push(userId);
      reply.likes = (reply.likes ?? 0) + 1;
    }

    state.forumReplies[idx] = reply;
    await saveStore(state);
    return reply;
  }

  async reportForumContent(
    input: ForumContentReportInput
  ): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    const state = await loadStore();
    const member = state.members.find((m) => m.id === input.reporterId);
    const staff = state.staff.find((s) => s.id === input.reporterId);
    const cred = state.credentials.find((c) => c.userId === input.reporterId);
    const reporterEmail =
      input.reporterEmail ||
      member?.email ||
      staff?.email ||
      cred?.email ||
      `${input.reporterId}@silverspring.ymca`;

    const targetLabel =
      input.targetType === 'topic'
        ? 'Community Forum Topic'
        : input.targetType === 'reply'
          ? 'Community Forum Reply'
          : 'Class Forum Message';

    const title = `Forum Report (${input.reason}): ${targetLabel} by ${input.targetAuthorName}`;
    const descriptionLines = [
      `Reported Item: ${targetLabel} (ID: ${input.targetId})`,
      `Reported Author: ${input.targetAuthorName} (${input.targetAuthorId})`,
      input.contextTitle ? `Thread / Class Context: "${input.contextTitle}"` : '',
      `Violation Reason: ${input.reason}`,
      input.details?.trim() ? `Reporter Notes: ${input.details.trim()}` : '',
      `Reported Content Snippet:\n"${input.targetContent.slice(0, 300)}"`,
    ].filter(Boolean);

    const result = await this.createSupportTicket({
      userId: input.reporterId,
      userName: input.reporterName,
      userEmail: reporterEmail,
      userRole: input.reporterRole,
      type: 'problem_report',
      title,
      description: descriptionLines.join('\n'),
      category: 'community_moderation',
      priority: 'high',
    });

    // Also notify IT Admin (staff-itadmin) directly about the moderation ticket
    const latestState = await loadStore();
    if (!latestState.notifications) {
      latestState.notifications = [];
    }
    latestState.notifications.unshift({
      id: `notif-it-report-${Date.now()}`,
      userId: 'staff-itadmin',
      title: `Forum report ticket #${result.ticket.ticketNumber}`,
      body: `${input.reporterName} reported a ${targetLabel.toLowerCase()} by ${input.targetAuthorName} for "${input.reason}".`,
      type: 'staff_inquiry',
      createdAt: new Date().toISOString(),
      read: false,
      relatedId: result.ticket.id,
      link: '/(staff)/(tabs)/messages',
    });
    await saveStore(latestState);

    return result;
  }

  async createSupportTicket(input: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: UserRole | string;
    type: TicketType;
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    deviceInfo?: string;
  }): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    const state = await loadStore();
    if (!state.supportTickets) {
      state.supportTickets = [];
    }

    const nextTicketNum = 1000 + state.supportTickets.length + 1;
    const ticketNumber = `YMCA-IT-${nextTicketNum}`;
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    // 1. Get or create thread with IT Admin (staff-itadmin)
    const itStaffId = 'staff-itadmin';
    let thread = state.threads.find(
      (t) => t.kind !== 'group' && (
        (t.memberId === input.userId && t.staffId === itStaffId) ||
        (t.staffId === input.userId && t.memberId === itStaffId))
    );
    if (!thread) {
      thread = {
        id: `thread-${input.userId}-${itStaffId}`,
        memberId: input.userId,
        staffId: itStaffId,
      };
      state.threads.push(thread);
    }

    // 2. Create SupportTicket
    const ticket: SupportTicket = {
      id: ticketId,
      ticketNumber,
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      userRole: input.userRole,
      type: input.type,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: 'open',
      threadId: thread.id,
      deviceInfo: input.deviceInfo,
      createdAt: now,
      updatedAt: now,
    };
    state.supportTickets.unshift(ticket);

    // 3. Post user's initial ticket message into thread
    const typeLabel = input.type === 'feature_request' ? 'Feature Request' : 'Problem Report';
    const userMsgBody = `[Ticket #${ticketNumber} · ${typeLabel}]\nSubject: ${input.title}\nCategory: ${input.category}\nPriority: ${input.priority.toUpperCase()}\n\n${input.description}`;
    const userMessage: Message = {
      id: `msg-${Date.now()}-1`,
      threadId: thread.id,
      fromId: input.userId,
      body: userMsgBody,
      createdAt: now,
    };
    state.messages.push(userMessage);

    // 4. Auto-generate IT triage acknowledgment response from Abass Shikur (IT Admin)
    const itAckBody = `Hello ${input.userName.split(' ')[0]}! This is Abass Shikur from YMCA IT Systems. We've logged your ticket #${ticketNumber} ("${input.title}") as ${input.priority.toUpperCase()} priority. Our technical support team is reviewing your report. Please feel free to send any additional details or screenshots right here!`;
    const itAckMsg: Message = {
      id: `msg-${Date.now()}-2`,
      threadId: thread.id,
      fromId: itStaffId,
      body: itAckBody,
      createdAt: new Date(Date.now() + 1000).toISOString(),
    };
    state.messages.push(itAckMsg);

    // 5. Create in-app notification for the user
    state.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: input.userId,
      title: `IT Support Ticket Logged: ${ticketNumber}`,
      body: `Ticket "${input.title}" has been registered. Abass Shikur from YMCA IT responded.`,
      type: 'general',
      createdAt: now,
      read: false,
      link: '/(member)/account',
    });

    await saveStore(state);
    return { ticket, thread, initialMessage: userMessage };
  }

  async listSupportTickets(userId?: string, requesterUserId?: string): Promise<SupportTicket[]> {
    const state = await loadStore();
    const list = state.supportTickets ?? [];
    if (userId) {
      return list.filter((t) => t.userId === userId);
    }
    assertStaffCapability(state, requesterUserId, 'manageSupportTickets', 'view support tickets');
    return list;
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket | null> {
    const state = await loadStore();
    return (state.supportTickets ?? []).find((t) => t.id === ticketId) ?? null;
  }

  async updateSupportTicketStatus(ticketId: string, status: TicketStatus, requesterUserId?: string): Promise<SupportTicket> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'manageSupportTickets', 'update support tickets');
    const idx = (state.supportTickets ?? []).findIndex((t) => t.id === ticketId);
    if (idx === -1) {
      throw new Error(`Support ticket not found: ${ticketId}`);
    }
    state.supportTickets[idx].status = status;
    state.supportTickets[idx].updatedAt = new Date().toISOString();
    await saveStore(state);
    return state.supportTickets[idx];
  }

  // ==========================================
  // Complaints & Suggestions
  // ==========================================
  async listComplaintsSuggestions(
    branchId?: string,
    memberId?: string,
    department: FeedbackDepartment | 'all' = 'member_services'
  ): Promise<ComplaintSuggestion[]> {
    const state = await loadStore();
    let list = state.complaintsSuggestions ?? [];
    if (department !== 'all') {
      list = list.filter((item) => (item.department ?? 'member_services') === department);
    }
    if (branchId) {
      list = list.filter((item) => !item.branchId || item.branchId === branchId);
    }
    if (memberId) {
      list = list.filter((item) => item.memberId === memberId);
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createComplaintSuggestion(
    input: Omit<ComplaintSuggestion, 'id' | 'createdAt' | 'status'>
  ): Promise<ComplaintSuggestion> {
    const state = await loadStore();
    const now = new Date().toISOString();
    const item: ComplaintSuggestion = {
      ...input,
      id: `cs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'submitted',
      createdAt: now,
    };
    if (!state.complaintsSuggestions) {
      state.complaintsSuggestions = [];
    }
    state.complaintsSuggestions.unshift(item);
    if (item.department === 'maintenance') {
      const urgent = item.urgency === 'urgent';
      const where = item.location ? ` (${item.location})` : '';
      const heading = `${urgent ? 'URGENT maintenance report' : 'New maintenance report'}: ${item.title}`;
      const recipients = state.staff.filter(
        (x) => x.staffRole === 'maintenance' || (urgent && (x.staffRole === 'staff_admin' || x.staffRole === 'admin'))
      );
      for (const s of recipients) {
        notifyUser(state, s.id, heading, `${item.details.slice(0, 140)}${where}`);
      }
    }
    await saveStore(state);
    return item;
  }

  async updateComplaintSuggestionStatus(
    id: string,
    status: FeedbackStatus,
    staffResponse?: string,
    staffId?: string,
    staffName?: string
  ): Promise<ComplaintSuggestion> {
    const state = await loadStore();
    const list = state.complaintsSuggestions ?? [];
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Complaint/Suggestion not found: ${id}`);
    }
    const existing = list[idx];
    const updated: ComplaintSuggestion = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    if (staffResponse !== undefined) {
      updated.staffResponse = staffResponse;
    }
    if (staffId !== undefined) {
      updated.respondedByStaffId = staffId;
    }
    if (staffName !== undefined) {
      updated.respondedByStaffName = staffName;
    }
    list[idx] = updated;
    state.complaintsSuggestions = list;
    await saveStore(state);
    return updated;
  }

  // Member Surveys & Polls
  async listSurveys(branchId?: string, onlyActive?: boolean): Promise<Survey[]> {
    const state = await loadStore();
    let list = state.surveys ?? [];
    if (branchId) {
      list = list.filter((s) => !s.branchId || s.branchId === branchId);
    }
    if (onlyActive) {
      list = list.filter((s) => s.isActive);
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSurvey(id: string): Promise<Survey | null> {
    const state = await loadStore();
    return (state.surveys ?? []).find((s) => s.id === id) ?? null;
  }

  async createSurvey(
    input: Omit<Survey, 'id' | 'createdAt' | 'totalResponses'>
  ): Promise<Survey> {
    const state = await loadStore();
    const newSurvey: Survey = {
      ...input,
      id: `survey-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      totalResponses: 0,
    };
    state.surveys = [newSurvey, ...(state.surveys ?? [])];
    await saveStore(state);
    return newSurvey;
  }

  async updateSurveyStatus(id: string, isActive: boolean): Promise<Survey> {
    const state = await loadStore();
    const list = state.surveys ?? [];
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Survey not found: ${id}`);
    }
    const updated: Survey = {
      ...list[idx],
      isActive,
    };
    list[idx] = updated;
    state.surveys = list;
    await saveStore(state);
    return updated;
  }

  async deleteSurvey(id: string): Promise<void> {
    const state = await loadStore();
    state.surveys = (state.surveys ?? []).filter((s) => s.id !== id);
    state.surveyResponses = (state.surveyResponses ?? []).filter(
      (r) => r.surveyId !== id
    );
    await saveStore(state);
  }

  async listSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    const state = await loadStore();
    return (state.surveyResponses ?? []).filter((r) => r.surveyId === surveyId);
  }

  async submitSurveyResponse(
    input: Omit<SurveyResponse, 'id' | 'submittedAt'>
  ): Promise<SurveyResponse> {
    const state = await loadStore();
    const responses = state.surveyResponses ?? [];
    const existing = responses.find(
      (r) => r.surveyId === input.surveyId && r.memberId === input.memberId
    );
    if (existing) {
      throw new Error('You have already submitted a response to this survey/poll.');
    }

    const newResponse: SurveyResponse = {
      ...input,
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      submittedAt: new Date().toISOString(),
    };

    state.surveyResponses = [...responses, newResponse];

    // Increment totalResponses on survey
    const surveys = state.surveys ?? [];
    const sIdx = surveys.findIndex((s) => s.id === input.surveyId);
    if (sIdx !== -1) {
      surveys[sIdx] = {
        ...surveys[sIdx],
        totalResponses: (surveys[sIdx].totalResponses || 0) + 1,
      };
      state.surveys = surveys;
    }

    await saveStore(state);
    return newResponse;
  }

  async getMemberSurveyResponses(memberId: string): Promise<SurveyResponse[]> {
    const state = await loadStore();
    return (state.surveyResponses ?? []).filter((r) => r.memberId === memberId);
  }

  // ==========================================
  // Arrivals (trainer alerts)
  // ==========================================
  async recordArrival(
    memberId: string,
    options?: { source?: ArrivalSource; staffId?: string; date?: string }
  ): Promise<ArrivalResult> {
    const state = await loadStore();
    assertStaffCapability(state, options?.staffId, 'checkIn', 'check members in');
    const member = state.members.find((m) => m.id === memberId);
    if (!member) throw new Error(`Member not found: ${memberId}`);

    const date = options?.date ?? getDemoToday();
    const arrivals = state.arrivals ?? (state.arrivals = []);
    let arrival = arrivals.find((a) => a.memberId === memberId && a.date === date);
    const isNew = !arrival;
    if (!arrival) {
      arrival = {
        id: `arr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        memberId,
        date,
        at: demoNowIso(),
        source: options?.source ?? 'desk',
        checkedInByStaffId: options?.staffId,
        notifiedStaffIds: [],
      };
      arrivals.push(arrival);
    }

    // Recipients: assigned trainer plus anyone with a booked lesson with this member today.
    const lessons = state.privateLessons
      .filter((l) => l.memberId === memberId && l.status === 'booked' && scheduleCalendarDay(l.start) === date)
      .sort((a, b) => a.start.localeCompare(b.start));
    const recipientIds = new Set<string>();
    const assigned = state.assignments.find((a) => a.memberId === memberId);
    if (assigned) recipientIds.add(assigned.staffId);
    for (const l of lessons) recipientIds.add(l.staffId);

    const notifiedStaff: Staff[] = [];
    for (const staffId of recipientIds) {
      if (arrival.notifiedStaffIds.includes(staffId)) continue;
      const staff = state.staff.find((s) => s.id === staffId);
      if (!staff) continue;
      const prefs = state.notificationPreferences?.[staffId];
      if (prefs && prefs.clientArrivals === false) continue;
      const lesson = lessons.find((l) => l.staffId === staffId);
      state.notifications.unshift({
        id: `notif-arrival-${Date.now()}-${staffId}-${memberId}`,
        userId: staffId,
        title: `${member.name} has arrived`,
        body: lesson
          ? `Your ${formatClock(lesson.start)} session with ${member.name.split(' ')[0]} is today. They just checked in.`
          : `${member.name} just checked in at the front desk.`,
        type: 'client_arrival',
        createdAt: demoNowIso(),
        read: false,
        relatedId: memberId,
        link: `/(staff)/members/${memberId}`,
      });
      arrival.notifiedStaffIds.push(staffId);
      notifiedStaff.push(staff);
    }

    await saveStore(state);
    return { arrival: { ...arrival }, isNew, notifiedStaff };
  }

  async listArrivals(branchId: string, date: string): Promise<ArrivalRecord[]> {
    const state = await loadStore();
    const inBranch = new Set(state.members.filter((m) => m.homeBranchId === branchId).map((m) => m.id));
    return (state.arrivals ?? [])
      .filter((a) => a.date === date && inBranch.has(a.memberId))
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  async listArrivalsRange(branchId: string, from: string, to: string): Promise<ArrivalRecord[]> {
    const state = await loadStore();
    const inBranch = new Set(state.members.filter((m) => m.homeBranchId === branchId).map((m) => m.id));
    return (state.arrivals ?? [])
      .filter((a) => a.date >= from && a.date <= to && inBranch.has(a.memberId))
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async listMemberships(branchId: string): Promise<Membership[]> {
    const state = await loadStore();
    const inBranch = new Set(state.members.filter((m) => m.homeBranchId === branchId).map((m) => m.id));
    return state.memberships.filter((m) => inBranch.has(m.memberId)).map((m) => ({ ...m }));
  }

  // ==========================================
  // Billing issues
  // ==========================================
  async listBillingIssues(branchId: string, requesterUserId?: string): Promise<BillingIssueRow[]> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'handleBillingIssues', 'view billing issues');
    const rows: BillingIssueRow[] = [];
    for (const membership of state.memberships) {
      if (membership.billingStatus !== 'declined' && membership.billingStatus !== 'past_due') continue;
      const member = state.members.find((m) => m.id === membership.memberId);
      if (!member || member.homeBranchId !== branchId) continue;
      rows.push({ member, membership });
    }
    return rows.sort((a, b) =>
      (a.membership.billingIssue?.failedAt ?? '').localeCompare(b.membership.billingIssue?.failedAt ?? '')
    );
  }

  async resolveBillingIssue(
    memberId: string,
    payment: { brand: string; last4: string },
    requesterUserId: string
  ): Promise<Membership> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'handleBillingIssues', 'resolve billing issues');
    const idx = state.memberships.findIndex((m) => m.memberId === memberId);
    if (idx === -1) throw new Error(`Membership not found: ${memberId}`);
    const updated: Membership = {
      ...state.memberships[idx],
      paymentBrand: payment.brand,
      paymentLast4: payment.last4,
      billingStatus: 'current',
      billingIssue: undefined,
    };
    state.memberships[idx] = updated;

    const staff = state.staff.find((s) => s.id === requesterUserId);
    (state.memberContacts ?? (state.memberContacts = [])).unshift({
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      memberId,
      staffId: requesterUserId,
      staffName: staff?.name ?? 'Staff',
      channel: 'in_person',
      purpose: 'billing',
      outcome: 'card_updated',
      notes: `Payment method updated to ${payment.brand} ending ${payment.last4}.`,
      createdAt: demoNowIso(),
    });
    state.notifications.unshift({
      id: `notif-billing-${Date.now()}`,
      userId: memberId,
      title: 'Payment method updated',
      body: `Your ${payment.brand} ending ${payment.last4} is now on file. Thanks for taking care of your membership.`,
      type: 'billing',
      createdAt: demoNowIso(),
      read: false,
      link: '/(member)/manage-membership',
    });
    await saveStore(state);
    return updated;
  }

  // ==========================================
  // Member contact log
  // ==========================================
  async listMemberContacts(filter?: { memberId?: string; leadId?: string; staffId?: string }): Promise<MemberContact[]> {
    const state = await loadStore();
    return (state.memberContacts ?? [])
      .filter(
        (c) =>
          (!filter?.memberId || c.memberId === filter.memberId) &&
          (!filter?.leadId || c.leadId === filter.leadId) &&
          (!filter?.staffId || c.staffId === filter.staffId)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async logMemberContact(
    input: Omit<MemberContact, 'id' | 'createdAt' | 'staffId' | 'staffName'>,
    requesterUserId: string
  ): Promise<MemberContact> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'logMemberContacts', 'log member contacts');
    if (!input.memberId && !input.leadId) throw new Error('A contact must reference a member or a lead.');
    const staff = state.staff.find((s) => s.id === requesterUserId);
    const contact: MemberContact = {
      ...input,
      notes: input.notes.trim(),
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      staffId: requesterUserId,
      staffName: staff?.name ?? 'Staff',
      createdAt: demoNowIso(),
    };
    (state.memberContacts ?? (state.memberContacts = [])).unshift(contact);
    if (input.leadId) {
      const li = (state.leads ?? []).findIndex((l) => l.id === input.leadId);
      if (li !== -1) {
        const lead = state.leads[li];
        state.leads[li] = {
          ...lead,
          status: lead.status === 'new' ? 'contacted' : lead.status,
          nextFollowUpDate: input.followUpDate ?? lead.nextFollowUpDate,
          updatedAt: contact.createdAt,
        };
      }
    }
    await saveStore(state);
    return contact;
  }

  // ==========================================
  // Leads / sales pipeline
  // ==========================================
  async listLeads(requesterUserId?: string): Promise<Lead[]> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'manageLeads', 'view leads');
    return [...(state.leads ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createLead(
    input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Lead['status'] },
    requesterUserId: string
  ): Promise<Lead> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'manageLeads', 'manage leads');
    if (!input.name.trim()) throw new Error('Lead name is required.');
    const now = demoNowIso();
    const lead: Lead = {
      ...input,
      name: input.name.trim(),
      status: input.status ?? 'new',
      assignedStaffId: input.assignedStaffId ?? requesterUserId,
      campaignId:
        input.campaignId ?? (input.interestPlanId ? resolveCampaign(state, input.interestPlanId)?.id : undefined),
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    (state.leads ?? (state.leads = [])).unshift(lead);
    await saveStore(state);
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>, requesterUserId: string): Promise<Lead> {
    const state = await loadStore();
    assertStaffCapability(state, requesterUserId, 'manageLeads', 'manage leads');
    const idx = (state.leads ?? []).findIndex((l) => l.id === id);
    if (idx === -1) throw new Error(`Lead not found: ${id}`);
    const next: Lead = { ...state.leads[idx], ...updates, id, updatedAt: demoNowIso() };
    state.leads[idx] = next;
    await saveStore(state);
    return next;
  }

  async convertLeadToMember(
    leadId: string,
    input: { planId: string; payment: { brand: string; last4: string }; password?: string },
    requesterUserId: string
  ): Promise<{ member: Member; membership: Membership; enrollmentFeeCents: number; campaign: EnrollmentCampaign | null }> {
    const pre = await loadStore();
    assertStaffCapability(pre, requesterUserId, 'manageLeads', 'convert leads');
    assertStaffCapability(pre, requesterUserId, 'sellMemberships', 'sell memberships');
    const lead = (pre.leads ?? []).find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);
    if (lead.status === 'won') throw new Error('This lead has already been converted.');
    if (!lead.email.trim()) throw new Error('Add an email address to this lead before converting it to a member.');
    const plan = planForSignup(pre, input.planId);
    const campaign = resolveCampaign(pre, plan.id, lead.campaignId);
    const enrollmentFeeCents = effectiveEnrollmentFeeCents(plan, { campaign });

    const result = await this.buyMembership({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: '',
      planId: plan.id,
      payment: input.payment,
      password: input.password,
      campaignId: campaign?.id,
    });

    const state = await loadStore();
    const staff = state.staff.find((s) => s.id === requesterUserId);
    const now = demoNowIso();
    const li = state.leads.findIndex((l) => l.id === leadId);
    state.leads[li] = {
      ...state.leads[li],
      status: 'won',
      convertedMemberId: result.member.id,
      campaignId: campaign?.id ?? state.leads[li].campaignId,
      nextFollowUpDate: undefined,
      updatedAt: now,
    };
    (state.memberContacts ?? (state.memberContacts = [])).unshift({
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      memberId: result.member.id,
      leadId,
      staffId: requesterUserId,
      staffName: staff?.name ?? 'Staff',
      channel: 'in_person',
      purpose: 'sales',
      outcome: 'sold',
      notes: `Sold ${plan.name}. Enrollment fee $${(enrollmentFeeCents / 100).toFixed(2)}${
        campaign ? ` (${campaign.name})` : ''
      }.`,
      createdAt: now,
    });
    await saveStore(state);
    return { ...result, enrollmentFeeCents, campaign };
  }

  // ==========================================
  // Enrollment campaigns
  // ==========================================
  async listCampaigns(): Promise<EnrollmentCampaign[]> {
    const state = await loadStore();
    return [...(state.enrollmentCampaigns ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async getActiveCampaign(date: string, planId?: string): Promise<EnrollmentCampaign | null> {
    const state = await loadStore();
    return activeCampaignFor(date, planId, state.enrollmentCampaigns ?? []);
  }

  async saveCampaign(
    input: Omit<EnrollmentCampaign, 'id' | 'createdByStaffId'> & { id?: string },
    requesterUserId: string
  ): Promise<EnrollmentCampaign> {
    const state = await loadStore();
    assertConfigSectionAccess(state, requesterUserId, 'campaigns');
    if (!input.name.trim()) throw new Error('Campaign name is required.');
    if (input.endDate < input.startDate) throw new Error('End date must be on or after the start date.');
    const list = state.enrollmentCampaigns ?? (state.enrollmentCampaigns = []);
    const idx = input.id ? list.findIndex((c) => c.id === input.id) : -1;
    if (idx !== -1) {
      const before = list[idx];
      list[idx] = { ...list[idx], ...input, id: list[idx].id };
      recordConfigAudit(state, requesterUserId, 'campaigns', before, list[idx], `Updated campaign "${list[idx].name}"`);
      await saveStore(state);
      return list[idx];
    }
    const created: EnrollmentCampaign = {
      ...input,
      id: `camp-${Date.now()}`,
      createdByStaffId: requesterUserId,
    };
    list.unshift(created);
    recordConfigAudit(state, requesterUserId, 'campaigns', null, created, `Created campaign "${created.name}"`);
    await saveStore(state);
    return created;
  }

  async deleteCampaign(id: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    assertConfigSectionAccess(state, requesterUserId, 'campaigns');
    const removed = (state.enrollmentCampaigns ?? []).find((c) => c.id === id);
    state.enrollmentCampaigns = (state.enrollmentCampaigns ?? []).filter((c) => c.id !== id);
    if (removed) {
      recordConfigAudit(state, requesterUserId, 'campaigns', removed, null, `Deleted campaign "${removed.name}"`);
    }
    await saveStore(state);
  }

  // ==========================================
  // App config (business settings)
  // ==========================================
  async getAppConfig(): Promise<AppConfig> {
    const state = await loadStore();
    return normalizeAppConfig(state.appConfig);
  }

  async updateAppConfig<S extends AppConfigSection>(
    section: S,
    patch: AppConfigPatch<S>,
    requesterUserId: string
  ): Promise<AppConfig> {
    const state = await loadStore();
    assertConfigSectionAccess(state, requesterUserId, section);
    const current = normalizeAppConfig(state.appConfig);
    const after = applyConfigPatch(current, section, patch);
    recordConfigAudit(state, requesterUserId, section, current[section], after);
    state.appConfig = { ...current, [section]: after } as AppConfig;
    await saveStore(state);
    return state.appConfig;
  }

  async resetAppConfigSection(section: AppConfigSection, requesterUserId: string): Promise<AppConfig> {
    const state = await loadStore();
    assertConfigSectionAccess(state, requesterUserId, section);
    if (!APP_CONFIG_SECTIONS.includes(section)) throw new Error('Unknown settings section.');
    const current = normalizeAppConfig(state.appConfig);
    const after = defaultsForReset(current, section);
    recordConfigAudit(
      state,
      requesterUserId,
      section,
      current[section],
      after,
      `Reset ${CONFIG_SECTION_LABELS[section]} to defaults`
    );
    state.appConfig = { ...current, [section]: after } as AppConfig;
    await saveStore(state);
    return state.appConfig;
  }

  async listConfigAudit(requesterUserId: string): Promise<ConfigAuditEntry[]> {
    const state = await loadStore();
    if (!requesterUserId) throw new Error('Sign in as staff to view the change log.');
    assertStaffCapability(state, requesterUserId, 'viewConfigAudit', 'view the settings change log');
    return [...(state.configAudit ?? [])];
  }

  // --- Child Watch ---------------------------------------------------------------------------------

  async listChildWatchVisits(
    filter: { date?: string; from?: string; to?: string; activeOnly?: boolean; householdId?: string },
    requesterUserId: string
  ): Promise<ChildWatchVisit[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    if (actor.kind === 'staff') requireChildWatchRoom(actor, 'view Child Watch visits');
    const childById = new Map(state.members.map((m) => [m.id, m]));
    return state.childWatchVisits
      .filter((v) => {
        if (filter.activeOnly && v.signedOutAt) return false;
        if (filter.date && childWatchLocalDay(v.signedInAt) !== filter.date) return false;
        if (filter.from || filter.to) {
          const day = childWatchLocalDay(v.signedInAt);
          if (filter.from && day < filter.from) return false;
          if (filter.to && day > filter.to) return false;
        }
        const child = childById.get(v.childId);
        if (filter.householdId && (child ? householdKeyOf(child) : v.memberId) !== filter.householdId) return false;
        return true;
      })
      .map((v) => {
        const child = childById.get(v.childId);
        return redactVisit(v, Boolean(child) && isChildWatchGuardian(actor, child as Member));
      });
  }

  async childWatchDropOff(input: {
    childId: string;
    requesterUserId: string;
    deskCheckInConfirmed: boolean;
    notes?: string;
    emergencyPhone?: string;
    now?: Date;
  }): Promise<ChildWatchDropOffResult> {
    const state = await loadStore();
    assertFeatureOn(state, 'childWatch');
    const actor = childWatchActor(state, input.requesterUserId);
    const childMember = childWatchChild(state, input.childId);
    if (!childMember.householdId || !childMember.birthDate) throw new Error('Child not found.');
    if (actor.kind === 'member') {
      if (!isChildWatchGuardian(actor, childMember)) throw new Error('Only a guardian in this household can drop off this child.');
    } else {
      requireChildWatchRoom(actor, 'sign children in to Child Watch');
    }
    const now = input.now ?? demoNow();
    const rules = configOf(state).childWatch;
    const primaryId = childMember.householdId;
    const [firstName, ...rest] = childMember.name.trim().split(/\s+/);
    const child: ChildProfile = {
      id: childMember.id,
      memberId: primaryId,
      firstName: firstName ?? '',
      lastName: rest.join(' '),
      birthDate: childMember.birthDate,
    };
    const active = state.childWatchVisits.filter((v) => !v.signedOutAt);
    const check = validateSignIn(
      {
        now,
        child,
        visits: state.childWatchVisits,
        parentCheckedInAtDesk: input.deskCheckInConfirmed,
        staffOnDuty: staffOnDutyAt(state.childWatchShifts ?? [], now),
        occupantAgesMonths: active.map((v) =>
          childWatchAgeMonths(state.members.find((m) => m.id === v.childId)?.birthDate, now)
        ),
      },
      rules
    );
    if (!check.ok) throw new Error(check.reason);

    const id = `cwv-${Date.now()}-${input.childId}`;
    const pickupCode = generatePickupCode(rules.pickupCodeLength);
    const visit: ChildWatchVisit = {
      id,
      childId: input.childId,
      memberId: primaryId,
      signedInAt: now.toISOString(),
      signedInBy: input.requesterUserId,
      // New visits keep only a hash; the plain code is returned once to the caller.
      pickupCode: '',
      pickupCodeHash: hashPickupCode(pickupCode, id),
      ...(actor.kind === 'member' ? { droppedOffByMemberId: actor.id } : {}),
      ...(input.notes?.trim() ? { dropOffNotes: input.notes.trim() } : {}),
      ...(input.emergencyPhone?.trim() ? { emergencyPhone: input.emergencyPhone.trim() } : {}),
    };
    state.childWatchVisits.push(visit);
    state.notifications.unshift({
      id: `notif-cw-${visit.id}`,
      userId: primaryId,
      title: `${child.firstName} signed in to Child Watch`,
      body: `Open Child Watch to view your pickup code. Remember: maximum of ${formatLimit(rules.maxMinutesPerDay)} per day, and parents must remain in the building.`,
      type: 'event',
      createdAt: new Date().toISOString(),
      read: false,
      relatedId: visit.id,
      link: '/(member)/child-watch',
    });
    recordChildWatchAudit(state, actor, 'drop_off', `${child.firstName} dropped off`, { visitId: id, childId: input.childId }, now);
    await saveStore(state);
    return { visit, pickupCode };
  }

  async childWatchPickUp(input: {
    visitId: string;
    requesterUserId: string;
    pickupCode?: string;
    guardianId?: string;
    idVerified?: boolean;
    overrideReason?: string;
    now?: Date;
  }): Promise<ChildWatchVisit> {
    const state = await loadStore();
    const actor = childWatchActor(state, input.requesterUserId);
    const visit = state.childWatchVisits.find((v) => v.id === input.visitId);
    if (!visit) throw new Error('Visit not found.');
    const childMember = childWatchChild(state, visit.childId);
    if (actor.kind === 'staff') requireChildWatchRoom(actor, 'release children from Child Watch');
    const now = input.now ?? demoNow();
    const refs = { visitId: visit.id, childId: visit.childId };
    const rules = configOf(state).childWatch;

    const deny = async (reason: string, action: ChildWatchAuditAction = 'pickup_denied'): Promise<never> => {
      recordChildWatchAudit(state, actor, action, reason, refs, now);
      await saveStore(state);
      throw new Error(reason);
    };

    let authorized: ChildWatchAuthorizedPickup | undefined;
    if (input.guardianId) {
      authorized = (state.childWatchAuthorizedPickups ?? []).find(
        (p) => p.id === input.guardianId && p.householdId === householdKeyOf(childMember)
      );
      if (!authorized) return deny('That pickup person is not on this household\'s list.');
    }

    const decision = validatePickup({
      visit,
      code: input.pickupCode?.trim(),
      guardian: authorized,
      idVerified: Boolean(input.idVerified),
      requester:
        actor.kind === 'member'
          ? { kind: 'member', isGuardian: isChildWatchGuardian(actor, childMember) }
          : { kind: 'staff', canRunRoom: actor.canRunRoom },
      rules,
      overrideReason: input.overrideReason,
      today: getDemoToday(),
    });

    if (!decision.ok) {
      if (decision.codeFailed) {
        visit.failedCodeAttempts = (visit.failedCodeAttempts ?? 0) + 1;
        recordChildWatchAudit(state, actor, 'code_failed', `Wrong pickup code (attempt ${visit.failedCodeAttempts})`, refs, now);
        if (decision.lock) {
          visit.locked = true;
          recordChildWatchAudit(state, actor, 'visit_locked', 'Visit locked after too many wrong codes', refs, now);
          const childName = childMember.name;
          for (const s of state.staff.filter((x) => x.staffRole === 'child_watch_director')) {
            notifyUser(state, s.id, 'Child Watch visit locked', `${childName}'s visit was locked after too many wrong pickup codes. ID verification is required to release the child.`);
          }
        }
        await saveStore(state);
        throw new Error(decision.reason);
      }
      return deny(decision.reason);
    }

    visit.signedOutAt = now.toISOString();
    visit.signedOutBy = input.requesterUserId;
    visit.verification = decision.verification;
    if (authorized) {
      visit.pickedUpByGuardianId = authorized.id;
      visit.pickedUpByName = authorized.name;
    } else if (actor.kind === 'member') {
      visit.pickedUpByName = actor.member.name;
    }
    if (decision.verification === 'supervisor_override') {
      recordChildWatchAudit(state, actor, 'override', `Released after lock: ${input.overrideReason?.trim()}`, refs, now);
    }
    recordChildWatchAudit(state, actor, 'pickup', `Picked up (${decision.verification})`, refs, now);
    await saveStore(state);
    return visit;
  }

  async listAuthorizedPickups(householdId: string, requesterUserId: string): Promise<ChildWatchAuthorizedPickup[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    if (actor.kind === 'staff') {
      if (!actor.canRunRoom && !actor.canManage) throw new Error('Your staff role is not permitted to view authorized pickups.');
    } else if (!isHouseholdAdult(actor, householdId)) {
      throw new Error('Only a guardian in this household can view its pickup people.');
    }
    return (state.childWatchAuthorizedPickups ?? []).filter((p) => p.householdId === householdId);
  }

  async addAuthorizedPickup(
    input: Pick<ChildWatchAuthorizedPickup, 'householdId' | 'name' | 'relationship' | 'phone'> &
      Partial<Pick<ChildWatchAuthorizedPickup, 'photoUrl' | 'idType' | 'idLast4' | 'expiresOn'>>,
    requesterUserId: string
  ): Promise<ChildWatchAuthorizedPickup> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    if (!isHouseholdAdult(actor, input.householdId)) {
      throw new Error('Only a guardian in this household can add a pickup person.');
    }
    if (!input.name.trim() || !input.relationship.trim() || !input.phone.trim()) {
      throw new Error('Enter the name, relationship and phone number of the pickup person.');
    }
    const person: ChildWatchAuthorizedPickup = {
      id: `cwp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      householdId: input.householdId,
      name: input.name.trim(),
      relationship: input.relationship.trim(),
      phone: input.phone.trim(),
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      ...(input.idType ? { idType: input.idType } : {}),
      ...(input.idLast4 ? { idLast4: input.idLast4 } : {}),
      ...(input.expiresOn ? { expiresOn: input.expiresOn } : {}),
      status: 'pending',
      addedByMemberId: requesterUserId,
      addedAt: new Date().toISOString(),
    };
    (state.childWatchAuthorizedPickups ??= []).push(person);
    recordChildWatchAudit(state, actor, 'guardian_added', `${person.name} (${person.relationship}) added, pending approval`);
    for (const s of state.staff.filter((x) => x.staffRole === 'child_watch_director')) {
      notifyUser(state, s.id, 'Pickup person awaiting approval', `${person.name} was added as an authorized pickup person.`);
    }
    await saveStore(state);
    return person;
  }

  async reviewAuthorizedPickup(
    id: string,
    decision: 'approved' | 'revoked',
    requesterUserId: string
  ): Promise<ChildWatchAuthorizedPickup> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'approve or revoke pickup people');
    const person = (state.childWatchAuthorizedPickups ?? []).find((p) => p.id === id);
    if (!person) throw new Error('Pickup person not found.');
    person.status = decision;
    person.reviewedByStaffId = requesterUserId;
    person.reviewedAt = new Date().toISOString();
    recordChildWatchAudit(state, actor, decision === 'approved' ? 'guardian_approved' : 'guardian_revoked', `${person.name} ${decision}`);
    notifyUser(
      state,
      person.addedByMemberId,
      decision === 'approved' ? 'Pickup person approved' : 'Pickup person removed',
      `${person.name} was ${decision === 'approved' ? 'approved' : 'removed'} as an authorized Child Watch pickup person.`
    );
    await saveStore(state);
    return person;
  }

  async logChildWatchIncident(
    input: {
      visitId?: string;
      childId: string;
      type: ChildWatchIncidentType;
      severity: ChildWatchIncident['severity'];
      description: string;
      actionTaken: string;
      now?: Date;
    },
    requesterUserId: string
  ): Promise<ChildWatchIncident> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchRoom(actor, 'log Child Watch incidents');
    const child = childWatchChild(state, input.childId);
    if (!input.description.trim()) throw new Error('Describe what happened.');
    const at = childWatchNowIso(input.now);
    const incident: ChildWatchIncident = {
      id: `cwi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...(input.visitId ? { visitId: input.visitId } : {}),
      childId: input.childId,
      householdId: householdKeyOf(child),
      type: input.type,
      severity: input.severity,
      description: input.description.trim(),
      actionTaken: input.actionTaken.trim(),
      reportedByStaffId: requesterUserId,
      at,
      parentNotifiedAt: at,
      status: 'open',
    };
    (state.childWatchIncidents ??= []).unshift(incident);
    notifyUser(
      state,
      householdKeyOf(child),
      `Child Watch incident: ${child.name}`,
      `${incident.type.replace('_', ' ')} (${incident.severity}). ${incident.description}`,
      '/(member)/child-watch'
    );
    recordChildWatchAudit(state, actor, 'incident_logged', `${incident.type} (${incident.severity})`, { visitId: input.visitId, childId: input.childId }, input.now);
    await saveStore(state);
    return incident;
  }

  async listChildWatchIncidents(
    filter: {
      childId?: string;
      householdId?: string;
      status?: ChildWatchIncident['status'];
      from?: string;
      to?: string;
    },
    requesterUserId: string
  ): Promise<ChildWatchIncident[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    if (actor.kind === 'staff') requireChildWatchRoom(actor, 'view Child Watch incidents');
    return (state.childWatchIncidents ?? []).filter((i) => {
      if (filter.from || filter.to) {
        const day = childWatchLocalDay(i.at);
        if (filter.from && day < filter.from) return false;
        if (filter.to && day > filter.to) return false;
      }
      if (actor.kind === 'member' && !isHouseholdAdult(actor, i.householdId)) return false;
      if (filter.childId && i.childId !== filter.childId) return false;
      if (filter.householdId && i.householdId !== filter.householdId) return false;
      if (filter.status && i.status !== filter.status) return false;
      return true;
    });
  }

  async acknowledgeChildWatchIncident(id: string, memberId: string): Promise<ChildWatchIncident> {
    const state = await loadStore();
    const actor = childWatchActor(state, memberId);
    const incident = (state.childWatchIncidents ?? []).find((i) => i.id === id);
    if (!incident) throw new Error('Incident not found.');
    if (!isHouseholdAdult(actor, incident.householdId)) {
      throw new Error('Only a guardian in this household can acknowledge this incident.');
    }
    incident.parentAcknowledgedAt = new Date().toISOString();
    await saveStore(state);
    return incident;
  }

  async reviewChildWatchIncident(id: string, note: string, requesterUserId: string): Promise<ChildWatchIncident> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'review Child Watch incidents');
    const incident = (state.childWatchIncidents ?? []).find((i) => i.id === id);
    if (!incident) throw new Error('Incident not found.');
    incident.status = 'reviewed';
    incident.reviewedByStaffId = requesterUserId;
    incident.reviewNote = note.trim();
    recordChildWatchAudit(state, actor, 'incident_reviewed', `Incident reviewed: ${incident.type}`, { visitId: incident.visitId, childId: incident.childId });
    await saveStore(state);
    return incident;
  }

  async recordChildWatchHeadcount(
    input: { counted: number; expected?: number; note?: string; now?: Date },
    requesterUserId: string
  ): Promise<ChildWatchHeadcount> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchRoom(actor, 'record Child Watch headcounts');
    if (!Number.isInteger(input.counted) || input.counted < 0) throw new Error('Enter how many children you counted.');
    const now = input.now ?? demoNow();
    const entry: ChildWatchHeadcount = {
      id: `cwh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: now.toISOString(),
      staffId: requesterUserId,
      counted: input.counted,
      expected: input.expected ?? state.childWatchVisits.filter((v) => !v.signedOutAt).length,
      staffOnDuty: staffOnDutyAt(state.childWatchShifts ?? [], now),
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    };
    (state.childWatchHeadcounts ??= []).push(entry);
    recordChildWatchAudit(state, actor, 'headcount', `Counted ${entry.counted}, expected ${entry.expected}`, {}, now);
    await saveStore(state);
    return entry;
  }

  async listChildWatchHeadcounts(date: string, requesterUserId: string): Promise<ChildWatchHeadcount[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchRoom(actor, 'view Child Watch headcounts');
    return (state.childWatchHeadcounts ?? [])
      .filter((h) => childWatchLocalDay(h.at) === date)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async listChildWatchShifts(date: string, requesterUserId: string): Promise<ChildWatchShift[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    if (actor.kind !== 'staff' || (!actor.canRunRoom && !actor.canManage)) {
      throw new Error('Your staff role is not permitted to view Child Watch shifts.');
    }
    return (state.childWatchShifts ?? []).filter((s) => s.date === date).sort((a, b) => a.start.localeCompare(b.start));
  }

  async listChildWatchHeadcountsRange(from: string, to: string, requesterUserId: string): Promise<ChildWatchHeadcount[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchRoom(actor, 'view Child Watch headcounts');
    return (state.childWatchHeadcounts ?? [])
      .filter((h) => {
        const day = childWatchLocalDay(h.at);
        return day >= from && day <= to;
      })
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async listChildWatchShiftsRange(from: string, to: string, requesterUserId: string): Promise<ChildWatchShift[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    if (actor.kind !== 'staff' || (!actor.canRunRoom && !actor.canManage)) {
      throw new Error('Your staff role is not permitted to view Child Watch shifts.');
    }
    return (state.childWatchShifts ?? [])
      .filter((s) => s.date >= from && s.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  }

  async listPendingAuthorizedPickups(requesterUserId: string): Promise<ChildWatchAuthorizedPickup[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'review pending authorized pickups');
    return (state.childWatchAuthorizedPickups ?? []).filter((p) => p.status === 'pending');
  }

  async saveChildWatchShift(
    input: Omit<ChildWatchShift, 'id'> & { id?: string },
    requesterUserId: string
  ): Promise<ChildWatchShift> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'manage Child Watch shifts');
    const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!clock.test(input.start) || !clock.test(input.end) || input.start >= input.end) {
      throw new Error('Shift times must be HH:MM with the start before the end.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Enter the shift date as YYYY-MM-DD.');
    if (!state.staff.some((s) => s.id === input.staffId)) throw new Error('Staff member not found.');
    const shifts = (state.childWatchShifts ??= []);
    const existing = input.id ? shifts.find((s) => s.id === input.id) : undefined;
    const shift: ChildWatchShift = {
      id: existing?.id ?? `cws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      staffId: input.staffId,
      date: input.date,
      start: input.start,
      end: input.end,
    };
    if (existing) Object.assign(existing, shift);
    else shifts.push(shift);
    recordChildWatchAudit(state, actor, 'shift_changed', `Shift ${existing ? 'updated' : 'added'}: ${shift.staffId} ${shift.date} ${shift.start}-${shift.end}`);
    await saveStore(state);
    return shift;
  }

  async deleteChildWatchShift(id: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'manage Child Watch shifts');
    const shift = (state.childWatchShifts ?? []).find((s) => s.id === id);
    if (!shift) throw new Error('Shift not found.');
    state.childWatchShifts = state.childWatchShifts.filter((s) => s.id !== id);
    recordChildWatchAudit(state, actor, 'shift_changed', `Shift removed: ${shift.staffId} ${shift.date} ${shift.start}-${shift.end}`);
    await saveStore(state);
  }

  async recordChildWatchExport(detail: string, requesterUserId: string): Promise<void> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'export Child Watch data');
    recordChildWatchAudit(state, actor, 'data_exported', detail);
    await saveStore(state);
  }

  async listChildWatchAudit(filter: ChildWatchAuditFilter, requesterUserId: string): Promise<ChildWatchAuditEntry[]> {
    const state = await loadStore();
    const actor = childWatchActor(state, requesterUserId);
    requireChildWatchProgram(actor, 'view the Child Watch audit log');
    return (state.childWatchAudit ?? []).filter(
      (e) =>
        (!filter.action || e.action === filter.action) &&
        (!filter.visitId || e.visitId === filter.visitId) &&
        (!filter.childId || e.childId === filter.childId) &&
        (!filter.date || childWatchLocalDay(e.at) === filter.date)
    );
  }
}




