export type UserRole =
  | 'member'
  | 'guest'
  | 'staff'
  | 'admin'
  | 'trainer'
  | 'swim_instructor'
  | 'it_admin'
  | 'staff_admin'
  | 'wellness_director'
  | 'aquatics_director'
  | 'membership_director'
  | 'child_watch_supervisor'
  | 'child_watch_director'
  | 'maintenance';
export type MemberStatus = 'active' | 'paused' | 'cancel_pending' | 'cancelled';
export type StaffRole =
  | 'it_admin'
  | 'staff_admin'
  | 'trainer'
  | 'swim_instructor'
  | 'desk'
  | 'admin'
  | 'wellness_director'
  | 'aquatics_director'
  | 'membership_director'
  | 'child_watch_supervisor'
  | 'child_watch_director'
  | 'maintenance';
export type ScheduleCategory = 'groupEx' | 'swim' | 'event' | 'seniors';

export type ChildProfile = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  /** ISO date YYYY-MM-DD */
  birthDate: string;
  allergies?: string;
  notes?: string;
};

export type ChildWatchVisit = {
  id: string;
  childId: string;
  memberId: string;
  signedInAt: string; // ISO
  signedOutAt?: string; // ISO
  /** 'member' or a staff id */
  signedInBy: string;
  signedOutBy?: string;
  pickupCode: string;
  /** Member who dropped the child off. */
  droppedOffByMemberId?: string;
  pickedUpByGuardianId?: string;
  pickedUpByName?: string;
  verification?: ChildWatchVerification;
  failedCodeAttempts?: number;
  locked?: boolean;
  dropOffNotes?: string;
  emergencyPhone?: string;
  /** Hash of the pickup code; new visits store this instead of the plain code. */
  pickupCodeHash?: string;
};
export type ChildWatchVerification = 'code' | 'code_and_id' | 'household_self' | 'supervisor_override';

export type ChildWatchAuthorizedPickup = {
  id: string;
  householdId: string;
  name: string;
  relationship: string;
  phone: string;
  photoUrl?: string;
  idType?: string;
  idLast4?: string;
  status: 'pending' | 'approved' | 'revoked';
  addedByMemberId: string;
  addedAt: string; // ISO
  reviewedByStaffId?: string;
  reviewedAt?: string; // ISO
  expiresOn?: string; // YYYY-MM-DD
};

export type ChildWatchIncidentType = 'injury' | 'illness' | 'allergy' | 'behavior' | 'late_pickup' | 'other';

export type ChildWatchIncident = {
  id: string;
  visitId?: string;
  childId: string;
  householdId: string;
  type: ChildWatchIncidentType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  actionTaken: string;
  reportedByStaffId: string;
  at: string; // ISO
  parentNotifiedAt?: string; // ISO
  parentAcknowledgedAt?: string; // ISO
  status: 'open' | 'reviewed' | 'closed';
  reviewedByStaffId?: string;
  reviewNote?: string;
};

export type ChildWatchHeadcount = {
  id: string;
  at: string; // ISO
  staffId: string;
  counted: number;
  expected: number;
  staffOnDuty: number;
  note?: string;
};

export type ChildWatchShift = {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
};

export type ChildWatchAuditAction =
  | 'drop_off'
  | 'pickup'
  | 'pickup_denied'
  | 'code_failed'
  | 'visit_locked'
  | 'override'
  | 'guardian_added'
  | 'guardian_approved'
  | 'guardian_revoked'
  | 'incident_logged'
  | 'incident_reviewed'
  | 'headcount'
  | 'shift_changed'
  | 'data_exported';

export type ChildWatchAuditEntry = {
  id: string;
  at: string; // ISO
  actorId: string;
  actorRole: string;
  action: ChildWatchAuditAction;
  visitId?: string;
  childId?: string;
  detail: string;
};

export type ChildWatchDropOffResult = { visit: ChildWatchVisit; pickupCode: string };
export type RegistrationStatus = 'registered' | 'cancelled';
export type AttendanceStatus = 'unmarked' | 'attended' | 'no_show';
export type LessonStatus = 'booked' | 'cancelled' | 'completed' | 'no_show';
export type LessonType = 'training' | 'swim';
export type PricingTier = 'full' | 'program';

export type LessonPricing = {
  /** Price in cents keyed by duration in minutes. */
  training: { 30: number; 60: number };
  swim: { 30: number; 60: number };
  /** Per-class overrides of the guide prices, keyed by AquaticsClassOffering id. */
  swimClassOverrides: Record<string, { fullCents: number; programCents: number }>;
};

export type SwimClassEnrollment = {
  id: string;
  memberId: string;
  classId: string;
  participantName: string;
  paidAmountCents: number;
  paymentLast4?: string;
  pricingTier: PricingTier;
  status: 'enrolled' | 'cancelled';
  enrolledAt: string;
  /** Household member taking the class, when chosen from the family list. */
  participantMemberId?: string;
};

export type BookLessonOptions = {
  lessonType?: LessonType;
  durationMin?: 30 | 60;
  swimmerName?: string;
  stageCode?: string;
  notes?: string;
  /** When rescheduling, reuse the amount already paid instead of charging again. */
  carryOverPaidCents?: number;
  carryOverPaymentLast4?: string;
};

export type GuestPassInfo = {
  id: string;
  passCode: string;
  guestName: string;
  guestEmail?: string;
  branchId: string;
  issuedDate: string;
  validUntil: string;
  status: 'active' | 'used' | 'expired';
  issuedByMemberId?: string;
  issuedByName?: string;
};

export function isAdminRole(role?: string | null): boolean {
  // Wellness Directors share Staff Admin powers (minus complaints and top-level staff creation).
  return role === 'admin' || role === 'it_admin' || role === 'staff_admin' || role === 'wellness_director';
}

/** Roles a Wellness Director may NOT create, edit, or delete. */
export function isTopLevelStaffRole(role?: string | null): boolean {
  return (
    role === 'admin' ||
    role === 'it_admin' ||
    role === 'staff_admin' ||
    role === 'wellness_director' ||
    role === 'aquatics_director' ||
    role === 'membership_director' ||
    role === 'child_watch_director'
  );
}

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  membershipId: string;
  homeBranchId: string;
  type: string;
  status: MemberStatus;
  avatarUrl?: string;
  /** ISO date YYYY-MM-DD */
  birthDate?: string;
  /** Id of the primary (paying) member of the household. Undefined = standalone member. */
  householdId?: string;
  householdRole?: HouseholdRole;
  /** True when this person can sign in with their own email + password. */
  hasLogin?: boolean;
  allergies?: string;
  notes?: string;
  gymOrientation?: GymOrientation;
};

export type HouseholdRole = 'primary' | 'adult' | 'dependent';

export type HouseholdMemberInput = {
  name: string;
  /** ISO date YYYY-MM-DD */
  birthDate: string;
  /** Only used for people 13 and older; gives them their own login. */
  email?: string;
  allergies?: string;
  notes?: string;
};

export type HouseholdView = {
  primary: Member;
  /** Primary first, then everyone else on the plan. */
  members: Member[];
  membership: Membership;
};

export type GymOrientation = { completedAt: string; staffId: string; staffName: string };

export type Staff = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  homeBranchId: string;
  staffRole?: StaffRole;
  avatarUrl?: string;
  /** Private lesson types this staff member offers. Undefined = training. */
  lessonTypes?: LessonType[];
  /** Session lengths (minutes) this staff member offers. Undefined = [30, 60]. */
  sessionLengths?: (30 | 60)[];
  /** Members who may book this staff member instantly. Undefined/empty = every booking is a request. */
  instantBookMemberIds?: string[];
};

export type PendingMembershipChange = {
  planName: string;
  monthlyAmountCents: number;
  effectiveDate: string; // ISO date YYYY-MM-DD (e.g. next billing date)
  requestedAt: string;
};

export type Membership = {
  memberId: string;
  rateName: string;
  monthlyAmountCents: number;
  nextBillingDate: string;
  paymentBrand: string;
  paymentLast4: string;
  cancelEffectiveDate?: string;
  lastBillDate?: string;
  pendingChange?: PendingMembershipChange;
  status?: 'active' | 'paused' | 'cancel_pending' | 'cancelled';
  renewalCount?: number;
  joinedDate?: string;
  billingStatus?: BillingStatus;
  billingIssue?: BillingIssue;
  /** Enrollment campaign applied when this member joined. */
  campaignId?: string;
};

export type BillingStatus = 'current' | 'declined' | 'past_due';

export type BillingIssue = {
  reason: string;
  failedAt: string; // ISO
  amountDueCents: number;
  attempts: number;
};

export type ArrivalSource = 'desk' | 'scanner' | 'child_watch' | 'class' | 'manual';

export type ArrivalRecord = {
  id: string;
  memberId: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  at: string; // ISO
  source: ArrivalSource;
  checkedInByStaffId?: string;
  notifiedStaffIds: string[];
};

export type ContactChannel = 'call' | 'in_person' | 'email' | 'sms';
export type ContactPurpose = 'billing' | 'question' | 'sales' | 'welcome' | 'retention' | 'general';
export type ContactOutcome =
  | 'resolved'
  | 'voicemail'
  | 'no_answer'
  | 'callback'
  | 'card_updated'
  | 'sold'
  | 'not_interested';

export type MemberContact = {
  id: string;
  memberId?: string;
  leadId?: string;
  staffId: string;
  staffName: string;
  channel: ContactChannel;
  purpose: ContactPurpose;
  outcome: ContactOutcome;
  notes: string;
  followUpDate?: string; // YYYY-MM-DD
  createdAt: string; // ISO
};

export type LeadSource = 'walk_in' | 'guest_pass' | 'lapsed_member' | 'referral' | 'phone' | 'web';
export type LeadStatus = 'new' | 'contacted' | 'tour_scheduled' | 'follow_up' | 'won' | 'lost';

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  interestPlanId?: string;
  assignedStaffId?: string;
  campaignId?: string;
  nextFollowUpDate?: string;
  notes: string;
  convertedMemberId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingIssueRow = { member: Member; membership: Membership };

export type ArrivalResult = {
  arrival: ArrivalRecord;
  /** True when this is the first arrival logged for the member today. */
  isNew: boolean;
  /** Staff who received a client_arrival notification from this call. */
  notifiedStaff: Staff[];
};

export type EnrollmentCampaign = {
  id: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  waiveEnrollmentFee: boolean;
  /** 1-100; used when the fee is not fully waived. */
  enrollmentFeeDiscountPct?: number;
  /** Undefined or empty = all plans. */
  eligiblePlanIds?: string[];
  active: boolean;
  createdByStaffId: string;
};

export type ScheduleItem = {
  id: string;
  branchId: string;
  category: ScheduleCategory;
  title: string;
  start: string; // ISO
  end: string;
  location: string;
  instructorName: string;
  staffId?: string;
  capacity: number;
  /** First come, first served: capacity undisclosed and no attendance/check-in taken */
  openAccess?: boolean;
  /** Human-readable repeat pattern, e.g. "Mon, Wed, Fri · weekly" */
  recurrenceLabel?: string;
  /** Shared id for all sessions created from one repeating series */
  seriesId?: string;
  /** 0 or undefined = included with membership; > 0 = extra-cost booking */
  priceCents?: number;
  isSpecialEvent?: boolean;
  /** True for classes specially designed or great for Active Older Adults / seniors */
  seniorFriendly?: boolean;
  /** Flags whether advance registration is mandatory on the schedule (e.g. Full Circle Health, Pedaling for Parkinson's) */
  registrationRequired?: boolean;
  /** Exercise intensity level */
  intensity?: 'All Levels' | 'Low' | 'Moderate' | 'High';
  /** Facility room designation */
  roomType?: string;
  /** What equipment is provided by YMCA or brought by member */
  equipmentInfo?: string;
  /** Concise 1-2 line summary displayed directly on the schedule card */
  shortSummary?: string;
  description?: string;
};

export type SavedClass = { memberId: string; scheduleItemId: string };

export type ClassRegistration = {
  id: string;
  memberId: string;
  scheduleItemId: string;
  status: RegistrationStatus;
  paidAmountCents?: number;
  paymentLast4?: string;
  registeredAt?: string;
  attendanceStatus?: AttendanceStatus;
  checkedInAt?: string;
};

export type LessonSlot = {
  id: string;
  staffId: string;
  branchId: string;
  start: string;
  end: string;
  location: string;
};

export type PrivateLesson = {
  id: string;
  memberId: string;
  staffId: string;
  slotId: string;
  start: string;
  end: string;
  location: string;
  status: LessonStatus;
  completedAt?: string;
  notes?: string;
  lessonType?: LessonType;
  durationMin?: number;
  paidAmountCents?: number;
  paymentLast4?: string;
  swimmerName?: string;
  stageCode?: string;
  participantMemberId?: string;
  paymentTiming?: PaymentTiming;
  paymentStatus?: 'paid' | 'due';
  /** Session request this lesson was created from, if any. */
  requestId?: string;
  /** Wellness orientation: the only private session that is complimentary. */
  isOrientation?: boolean;
};

export type PaymentTiming = 'before' | 'after';
export type SessionRequestStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'cancelled';
export type SessionRequestAction =
  | 'requested'
  | 'auto_accepted'
  | 'accepted'
  | 'declined'
  | 'countered'
  | 'counter_accepted'
  | 'counter_declined'
  | 'cancelled';

export type SessionRequestEvent = {
  at: string;
  byId: string;
  byName: string;
  byRole: string;
  action: SessionRequestAction;
  start?: string;
  end?: string;
  note?: string;
};

export type SessionRequest = {
  id: string;
  memberId: string;
  memberName?: string;
  staffId: string;
  staffName?: string;
  lessonType: LessonType;
  durationMin: 30 | 60;
  start: string;
  end: string;
  location: string;
  paymentTiming: PaymentTiming;
  status: SessionRequestStatus;
  swimmerName?: string;
  stageCode?: string;
  participantMemberId?: string;
  notes?: string;
  lessonId?: string;
  replacesLessonId?: string;
  createdAt: string;
  history: SessionRequestEvent[];
};

export type CreateSessionRequestInput = {
  staffId: string;
  lessonType: LessonType;
  durationMin: 30 | 60;
  start: string;
  paymentTiming: PaymentTiming;
  swimmerName?: string;
  stageCode?: string;
  participantMemberId?: string;
  notes?: string;
  /** When rescheduling: the booked lesson this request replaces once confirmed (payment carries over). */
  replacesLessonId?: string;
};

export type SessionRequestResponse = {
  action: 'accept' | 'decline' | 'counter';
  start?: string;
  durationMin?: 30 | 60;
  note?: string;
};

export type SessionRequestFilter = {
  memberId?: string;
  staffId?: string;
  /** Applies role-based visibility for this user. */
  viewerId?: string;
  status?: SessionRequestStatus[];
};

export type BookableTime = { staffId: string; start: string; end: string; location: string; instant: boolean };

/** A repeating weekly availability window. weekday: 0 = Sunday ... 6 = Saturday. Times are Eastern 'HH:MM'. */
export type WeeklyWindow = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location: string;
};
export type DateWindow = Omit<WeeklyWindow, 'weekday'>;

/** A one-day override: 'blocked' removes the day's windows, 'custom' replaces them. */
export type AvailabilityException = {
  id: string;
  date: string;
  kind: 'blocked' | 'custom';
  windows: DateWindow[];
  note?: string;
};

export type TrainerAvailability = {
  staffId: string;
  weekly: WeeklyWindow[];
  effectiveFrom: string;
  effectiveUntil?: string;
  exceptions: AvailabilityException[];
  updatedAt: string;
  updatedBy: string;
};

export type TrainerAvailabilityInput = Pick<
  TrainerAvailability,
  'weekly' | 'effectiveFrom' | 'effectiveUntil' | 'exceptions'
>;

/** A booked lesson or open request that no longer sits inside a trainer's availability. */
export type AvailabilityConflict = {
  kind: 'lesson' | 'request';
  id: string;
  memberName?: string;
  start: string;
  end: string;
};

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  notes?: string;
};

export type ClientWorkoutLog = {
  id: string;
  memberId: string;
  trainerId?: string;
  trainerName?: string;
  date: string; // ISO date string YYYY-MM-DD or full ISO
  sessionType: '1-on-1' | 'assessment' | 'strength' | 'cardio' | 'mobility' | 'self-directed' | 'hiit' | 'recovery';
  title: string;
  notes: string;
  exercises?: WorkoutExercise[];
  rpe?: number; // 1 to 10
  loggedBy?: 'trainer' | 'member';
  clientFeedback?: string;
  createdAt: string;
};

export type GoalWarning = {
  id: string;
  text: string;
  severity: 'low' | 'moderate' | 'high';
  createdAt?: string;
  createdBy?: 'trainer' | 'member';
  authorName?: string;
};

export type ClientFitnessGoal = {
  memberId: string;
  primaryGoal: string;
  category?: 'strength' | 'weight_loss' | 'endurance' | 'mobility' | 'wellness' | 'rehab' | 'sports';
  targetDate?: string;
  injuriesOrLimitations?: string;
  specificWarnings?: GoalWarning[];
  startWeightLbs?: number;
  currentWeightLbs?: number;
  targetWeightLbs?: number;
  // Generic measurable target for non-weight goals (e.g. "Back squat" lbs, "Sit-and-reach" in)
  metricLabel?: string;
  metricUnit?: string;
  metricStart?: number;
  metricCurrent?: number;
  metricTarget?: number;
  notes?: string; // Trainer Strategy & Protocol
  memberNotes?: string; // Member Personal Motivation & Reflections
  updatedBy?: 'member' | 'trainer';
  updatedByName?: string;
  updatedAt: string;
};

export type TrainerAssignment = { memberId: string; staffId: string };

export type Thread = { id: string; memberId: string; staffId: string };

export type Message = {
  id: string;
  threadId: string;
  fromId: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToAuthorName?: string;
  replyToExcerpt?: string;
};

export type CancelRequest = {
  id: string;
  memberId: string;
  reason: string;
  requestedAt: string;
  lastBillDate: string;
  accessThrough: string;
  status: 'submitted' | 'approved';
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
};

export type AuthSession = { userId: string; role: UserRole };

export type MembershipPlan = {
  id: string;
  name: string;
  monthlyAmountCents: number;
  enrollmentFeeCents: number;
  ageRange: string;
  badge?: string;
  subtitle: string;
  description: string;
  features: string[];
  recommended?: boolean;
  /** Adults allowed on the plan (default 1). */
  maxAdults?: number;
  /** Whether dependent children (under 18) can be added. */
  allowsDependents?: boolean;
};

const STANDARD_FEATURES = [
  'Access to fitness center, free weights & cardio',
  'Free weekly group exercise classes',
  'Heated outdoor pool & indoor lap pool',
  'Nationwide YMCA reciprocity access',
];
const PICKLEBALL_FEATURES = [
  'Unlimited access to JOOLA pickleball courts',
  'Open play & pickleball programs',
];
const ONE_Y_FEATURES = [
  'ONE Y membership (new for 2026)',
  'Access to all participating YMCA locations',
  'Fitness center, pools, group exercise & courts',
  'Nationwide YMCA reciprocity access',
];
const FAMILY_I_FEATURES = [
  '1 adult on the membership plus all dependent children in the same household',
  'FREE drop-off Child Watch (maximum of 2 hours per day)',
  'Discounts & priority registration for camps and youth sports',
  ...STANDARD_FEATURES,
];
const FAMILY_II_FEATURES = [
  '2 adults on the membership plus all dependent children in the same household',
  'FREE drop-off Child Watch (maximum of 2 hours per day)',
  'Discounts & priority registration for camps and youth sports',
  ...STANDARD_FEATURES,
];

/** One-time enrollment due at signup (guest pass conversions are waived in the app). */
export function effectiveEnrollmentFeeCents(
  plan: MembershipPlan,
  options?: { waiveEnrollmentFee?: boolean; campaign?: EnrollmentCampaign | null }
): number {
  if (options?.waiveEnrollmentFee) return 0;
  const c = options?.campaign;
  if (!c) return plan.enrollmentFeeCents;
  if (c.eligiblePlanIds && c.eligiblePlanIds.length > 0 && !c.eligiblePlanIds.includes(plan.id)) {
    return plan.enrollmentFeeCents;
  }
  if (c.waiveEnrollmentFee) return 0;
  const pct = Math.max(0, Math.min(100, c.enrollmentFeeDiscountPct ?? 0));
  return Math.round(plan.enrollmentFeeCents * (1 - pct / 100));
}

export const YMCA_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'youth',
    name: 'Youth',
    monthlyAmountCents: 5500,
    enrollmentFeeCents: 1200,
    ageRange: '13 to 17',
    subtitle: 'Ages 13 to 17 - $12 enrollment fee',
    description: 'Youth membership, ages 13 to 17.',
    features: STANDARD_FEATURES,
  },
  {
    id: 'young-adult',
    name: 'Young Adult',
    monthlyAmountCents: 6900,
    enrollmentFeeCents: 3000,
    ageRange: '18 to 22',
    subtitle: 'Ages 18 to 22 - $30 enrollment fee',
    description: 'Young Adult membership, ages 18 to 22.',
    features: STANDARD_FEATURES,
  },
  {
    id: 'adult',
    name: 'Adult',
    monthlyAmountCents: 8900,
    enrollmentFeeCents: 9900,
    ageRange: '23 to 64',
    subtitle: 'Ages 23 to 64 - $99 enrollment fee',
    description: 'Adult membership, ages 23 to 64.',
    features: STANDARD_FEATURES,
  },
  {
    id: 'senior-adult',
    name: 'Senior Adult',
    monthlyAmountCents: 6500,
    enrollmentFeeCents: 6400,
    ageRange: '65 to 99',
    subtitle: 'Ages 65 to 99 - $64 enrollment fee',
    description: 'Senior Adult membership, ages 65 to 99.',
    features: STANDARD_FEATURES,
  },
  {
    id: 'senior-family',
    maxAdults: 2,
    allowsDependents: false,
    name: 'Senior Family',
    monthlyAmountCents: 9500,
    enrollmentFeeCents: 8400,
    ageRange: '65 to 99',
    subtitle: 'Ages 65 to 99 - $84 enrollment fee',
    description: 'Senior Family membership, ages 65 to 99.',
    features: STANDARD_FEATURES,
  },
  {
    id: 'family-1',
    maxAdults: 1,
    allowsDependents: true,
    name: 'Family I',
    monthlyAmountCents: 9900,
    enrollmentFeeCents: 9900,
    ageRange: '18 to 64',
    subtitle: '1 adult + all children · $99 enrollment fee',
    description: 'Household membership for one adult and all dependent children living at the same address.',
    features: FAMILY_I_FEATURES,
  },
  {
    id: 'family-2',
    maxAdults: 2,
    allowsDependents: true,
    name: 'Family II',
    monthlyAmountCents: 11900,
    enrollmentFeeCents: 13500,
    ageRange: '18 to 99',
    subtitle: '2 adults + all children · $135 enrollment fee',
    description: 'Household membership for two adults and all dependent children living at the same address.',
    features: FAMILY_II_FEATURES,
  },
  {
    id: 'pickleball-youth',
    name: 'Pickleball Only Youth',
    monthlyAmountCents: 4000,
    enrollmentFeeCents: 10000,
    ageRange: 'under 18',
    subtitle: 'Ages under 18 - $100 enrollment fee',
    description: 'Pickleball Only Youth membership, ages under 18.',
    features: PICKLEBALL_FEATURES,
  },
  {
    id: 'pickleball-adult',
    name: 'Pickleball Only Adult',
    monthlyAmountCents: 5900,
    enrollmentFeeCents: 10000,
    ageRange: '18-65',
    subtitle: 'Ages 18-65 - $100 enrollment fee',
    description: 'Pickleball Only Adult membership, ages 18-65.',
    features: PICKLEBALL_FEATURES,
  },
  {
    id: 'pickleball-senior',
    name: 'Pickleball Only Senior',
    monthlyAmountCents: 5000,
    enrollmentFeeCents: 10000,
    ageRange: '65+',
    subtitle: 'Ages 65+ - $100 enrollment fee',
    description: 'Pickleball Only Senior membership, ages 65+.',
    features: PICKLEBALL_FEATURES,
  },
  {
    id: 'youth-oney',
    name: 'Youth Mem ONE Y (New 2026)',
    monthlyAmountCents: 6500,
    enrollmentFeeCents: 1200,
    ageRange: '13 to 17',
    subtitle: 'Ages 13 to 17 - $12 enrollment fee',
    description: 'Youth Mem ONE Y (New 2026) membership, ages 13 to 17.',
    features: ONE_Y_FEATURES,
  },
  {
    id: 'young-adult-oney',
    name: 'Young Adult ONE Y (New 2026)',
    monthlyAmountCents: 8500,
    enrollmentFeeCents: 3000,
    ageRange: '18 to 22',
    subtitle: 'Ages 18 to 22 - $30 enrollment fee',
    description: 'Young Adult ONE Y (New 2026) membership, ages 18 to 22.',
    features: ONE_Y_FEATURES,
  },
  {
    id: 'adult-oney',
    name: 'Adult/Fitness ONE Y (New 2026)',
    monthlyAmountCents: 10900,
    enrollmentFeeCents: 9900,
    ageRange: '23 to 64',
    badge: 'ONE Y (New 2026)',
    recommended: true,
    subtitle: 'Ages 23 to 64 - $99 enrollment fee',
    description: 'Adult/Fitness ONE Y (New 2026) membership, ages 23 to 64.',
    features: ONE_Y_FEATURES,
  },
  {
    id: 'senior-adult-oney',
    name: 'Senior Adult ONE Y (New 2026)',
    monthlyAmountCents: 8500,
    enrollmentFeeCents: 6400,
    ageRange: '65 to 99',
    subtitle: 'Ages 65 to 99 - $64 enrollment fee',
    description: 'Senior Adult ONE Y (New 2026) membership, ages 65 to 99.',
    features: ONE_Y_FEATURES,
  },
  {
    id: 'senior-family-oney',
    maxAdults: 2,
    allowsDependents: false,
    name: 'Senior Family ONE Y (New 2026)',
    monthlyAmountCents: 14500,
    enrollmentFeeCents: 8400,
    ageRange: '65 to 99',
    subtitle: 'Ages 65 to 99 - $84 enrollment fee',
    description: 'Senior Family ONE Y (New 2026) membership, ages 65 to 99.',
    features: ONE_Y_FEATURES,
  },
  {
    id: 'family-1-oney',
    maxAdults: 1,
    allowsDependents: true,
    name: 'Family I ONE Y (New 2026)',
    monthlyAmountCents: 12500,
    enrollmentFeeCents: 9900,
    ageRange: '18 to 64',
    subtitle: '1 adult + all children · $99 enrollment fee',
    description: 'ONE Y household plan: one adult and all dependent children at the same address.',
    features: [...FAMILY_I_FEATURES.slice(0, 3), ...ONE_Y_FEATURES],
  },
  {
    id: 'family-2-oney',
    maxAdults: 2,
    allowsDependents: true,
    name: 'Family II ONE Y (New 2026)',
    monthlyAmountCents: 19500,
    enrollmentFeeCents: 13500,
    ageRange: '18 to 99',
    subtitle: '2 adults + all children · $135 enrollment fee',
    description: 'ONE Y household plan: two adults and all dependent children at the same address.',
    features: [...FAMILY_II_FEATURES.slice(0, 3), ...ONE_Y_FEATURES],
  },
];

export type AnnouncementCategory = 'facility' | 'event' | 'program' | 'community';
export type AnnouncementPriority = 'normal' | 'high' | 'urgent';

export type Announcement = {
  id: string;
  branchId: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  createdAt: string; // ISO
  expiresAt?: string;
  actionUrl?: string; // Optional deep link
  actionLabel?: string;
  authorName: string;
  pinned?: boolean;
  popupNotice?: boolean; // When true, pops up as a modal when members open the app
};

export type NotificationType =
  | 'forum_mention'
  | 'forum_reply'
  | 'class_forum'
  | 'staff_inquiry'
  | 'announcement'
  | 'event'
  | 'membership'
  | 'donation'
  | 'client_arrival'
  | 'billing'
  | 'general';

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  createdAt: string; // ISO
  read: boolean;
  relatedId?: string;
  link?: string;
};

export type NotificationDigestFrequency = 'instant' | 'daily' | 'weekly' | 'none';

export type NotificationPreferences = {
  userId: string;
  mentions: boolean;
  topicReplies: boolean;
  interestedTopicActivity?: boolean;
  chattedTopicReplies?: boolean;
  classForumAlerts: boolean;
  staffInquiries: boolean;
  announcements: boolean;
  events: boolean;
  directMessages: boolean;
  /** Staff only: alert when an assigned client or today's lesson client arrives. Default on. */
  clientArrivals?: boolean;
  emailDigest: NotificationDigestFrequency;
  pushEnabled: boolean;
  inAppBannerEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

export type DonationFrequency = 'one-time' | 'monthly';

export type Donation = {
  id: string;
  memberId?: string;
  donorName: string;
  donorEmail: string;
  amountCents: number;
  frequency: DonationFrequency;
  designation: string;
  dedication?: {
    tributeType: 'honor' | 'memory';
    name: string;
    message?: string;
  };
  paymentBrand: string;
  paymentLast4: string;
  createdAt: string; // ISO
  taxDeductibleId: string;
  receiptNumber: string;
};

export type DonationImpactTier = {
  amountCents: number;
  title: string;
  subtitle?: string;
  issue?: string;
  response?: string;
  impactText: string;
  badge?: string;
};

export const YMCA_CASE_FOR_SUPPORT_2026 = {
  title: 'YMCA Programs and Services Address Community Needs',
  documentSubtitle: 'Case for Support 2026',
  mission:
    'To foster the spiritual, mental and physical development of individuals, families and communities according to the ideals of inclusiveness, equality and mutual respect for all.',
  cause:
    'At the Y, we strengthen community by helping people build health, confidence and connection at every stage of life. In Montgomery County, residents and health leaders continue to identify access to community services and healthier lifestyle options as important needs. The County’s current health priorities include obesity, behavioral health, diabetes, cardiovascular disease, cancer, and maternal and infant health. Your support helps the Y respond with welcoming programs that improve well-being, nurture children and families, and remove financial barriers to participation.',
  goal:
    'To help children, families and individuals overcome barriers and achieve more through youth development, healthy living and social responsibility.',
  commitments: [
    {
      id: 'all',
      title: 'Making the Y Available to All',
      description:
        'We work to ensure that cost is not a barrier to the relationships, resources and opportunities people need to learn, grow and thrive.',
    },
    {
      id: 'kids',
      title: 'Nurturing the Potential of Kids',
      description:
        'The Y supports children and families through child care, day camp and aquatics—safe, enriching experiences that help young people build skills, confidence and connection.',
    },
    {
      id: 'health',
      title: 'Strengthening Community Health',
      description:
        'The Y expands access to evidence-informed programs that support people living with or beyond cancer and people living with Parkinson’s disease, while creating meaningful social connection.',
    },
  ],
  tagline: 'A stronger Montgomery County starts with each of us. Count Me In.',
} as const;

export const YMCA_DONATION_TIERS: DonationImpactTier[] = [
  {
    amountCents: 5000,
    title: 'LIVESTRONG® at the YMCA',
    subtitle: 'Cancer Survivorship Program',
    issue:
      'The County’s first comprehensive chronic disease report found that five of Montgomery County’s ten leading causes of death from 2021–2023 were chronic diseases, including cancer. Cancer remains one of Healthy Montgomery’s top-ranked priority areas.',
    response:
      'LIVESTRONG® at the YMCA is a 12-week, small-group physical activity and well-being program for adults living with, through or beyond cancer. YMCA-certified instructors guide participants through cardiovascular conditioning, strength training, balance and flexibility while building a supportive community. The program is designed to be offered at low or no cost, with medical clearance.',
    impactText:
      'Your $50 gift helps make this cancer survivorship program accessible to a participant. You help create a place to rebuild strength, increase confidence and connect with others, so a cancer diagnosis does not have to mean facing recovery alone.',
  },
  {
    amountCents: 10000,
    title: 'Pedaling for Parkinson’s™',
    subtitle: 'Mobility & Motor Function',
    badge: 'Community Favorite',
    issue:
      'People living with Parkinson’s can experience changes in mobility, balance and daily function, making consistent, supportive physical activity especially valuable. Montgomery County’s health improvement work continues to emphasize healthier lifestyle options and access to community-based supports.',
    response:
      'Pedaling for Parkinson’s™, powered by the Davis Phinney Foundation, is an evidence-based indoor cycling program for people living with Parkinson’s disease. Trained instructors lead a structured cycling protocol that supports mobility, motor function, confidence and connection. YMCA Silver Spring offers the program at no cost to participants and caregivers.',
    impactText:
      'Your $100 gift helps sustain trained instruction, program access and a welcoming community for people living with Parkinson’s. You are the catalyst that helps participants keep moving, build confidence and live well today.',
  },
  {
    amountCents: 17500,
    title: 'Day Camp',
    subtitle: 'Enriching Summer Experiences',
    issue:
      'Families need safe, enriching summer options that keep children active and connected while parents and caregivers work. In Montgomery County, only 21% of families have access to affordable summer care, creating a significant gap between the need for quality childcare and its availability.',
    response:
      'YMCA day camp gives children a supervised place to learn, play, build friendships and discover new interests. Camp experiences promote physical activity, creativity, confidence and belonging while giving families dependable summer support.',
    impactText:
      'Your $175 gift helps a child access YMCA day camp. You help create a summer filled with learning, movement, friendships and experiences that can build confidence long after camp ends.',
  },
  {
    amountCents: 25000,
    title: 'Aquatics',
    subtitle: 'Life-Saving Skills and Confidence',
    issue:
      'Water safety is an essential life skill, yet cost and access can keep families from swim instruction. In Montgomery County, drowning is a leading cause of unintentional death among children, particularly those ages 1–4, and second leading cause for children ages 4–12.',
    response:
      'To combat this, we partner with local organizations to offer swim lessons for children who otherwise lack access to water safety education. Additionally, we provide swim lessons to ensure all children, regardless of background or ability, can learn to swim in a safe and supportive environment.',
    impactText:
      'Your $250 gift helps expand access to aquatics and swim instruction for participants who need financial support. You help someone become safer and more confident around water while opening the door to a lifetime of healthy activity.',
  },
  {
    amountCents: 50000,
    title: 'Child Care',
    subtitle: 'Supporting Children and Working Families',
    issue:
      'Affordable child care remains a significant Montgomery County challenge; families face significant demand for reliable, affordable child care, with 75% of households reporting a need for reliable options. Quality child care supports children’s development while giving parents and caregivers the dependable care they need to work and support their families.',
    response:
      'The Y brings early learning and school-age care together as a continuum of child care support for families. Children have safe, nurturing environments where they can build relationships, strengthen social-emotional and academic skills, stay active and grow in confidence while parents and caregivers have dependable support for work and family life.',
    impactText:
      'Your $500 gift helps make YMCA child care more affordable for a family. You help a child learn, belong and thrive while strengthening the stability of the whole family.',
  },
  {
    amountCents: 100000,
    title: 'Making the Y Available to All',
    subtitle: 'Financial Assistance & Access',
    badge: 'Leadership Circle',
    issue:
      'Montgomery County’s health improvement process identifies access to health and social services and health equity as core goals. Even in a resource-rich county, financial barriers can limit access to the programs, relationships and healthy activities that strengthen individual and family well-being.',
    response:
      'The Y works to remove financial barriers so that people can participate in membership and programs based on their needs, not simply their ability to pay. Donor support helps open doors to youth development, healthy living and community connection across the lifespan.',
    impactText:
      'Your $1,000 gift helps make the Y available to all by supporting financial assistance for membership and programs. Your generosity becomes the catalyst that connects more neighbors to opportunities to be healthy, build relationships and reach their full potential.',
  },
];

export const YMCA_COMMUNITY_FUNDS = [
  { id: 'annual-campaign', name: 'Annual Community Campaign (Where Needed Most)' },
  { id: 'available-to-all', name: 'Making the Y Available to All (Financial Assistance)' },
  { id: 'livestrong', name: 'LIVESTRONG® at the YMCA (Cancer Survivorship)' },
  { id: 'parkinsons', name: 'Pedaling for Parkinson’s™ (Mobility & Motor Function)' },
  { id: 'summer-camp', name: 'Day Camp & Enriching Summer Experiences' },
  { id: 'aquatics', name: 'Aquatics & Life-Saving Water Safety' },
  { id: 'child-care', name: 'Child Care & Early Learning (Working Families)' },
] as const;

export type ClassForumPost = {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string; // ISO
  pinned?: boolean;
  mentionedUserIds?: string[];
  mentionedUserNames?: string[];
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToAuthorName?: string;
  replyToExcerpt?: string;
  editedAt?: string;
};

export type ForumTopicCategory =
  | 'general'
  | 'fitness'
  | 'swim'
  | 'facilities'
  | 'community'
  | 'programs';

export type UserForumInterests = {
  userId: string;
  categories: ForumTopicCategory[];
  topicIds: string[];
  classIds: string[];
};

export type ForumTopic = {
  id: string;
  title: string;
  content: string;
  category: ForumTopicCategory;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole;
  authorAvatarUrl?: string;
  pinned?: boolean;
  likes: number;
  likedBy: string[];
  interestedBy?: string[];
  participantIds?: string[];
  lastChattedAtBy?: Record<string, string>;
  replyCount: number;
  mentionedStaffIds?: string[];
  mentionedStaffNames?: string[];
  mentionedUserIds?: string[];
  mentionedUserNames?: string[];
  hasStaffReply?: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ForumReply = {
  id: string;
  topicId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole;
  authorAvatarUrl?: string;
  isStaffReply: boolean;
  mentionedStaffIds?: string[];
  mentionedUserIds?: string[];
  mentionedUserNames?: string[];
  likes: number;
  likedBy: string[];
  createdAt: string; // ISO
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToAuthorName?: string;
  replyToExcerpt?: string;
  editedAt?: string;
};

export const FORUM_CATEGORIES: {
  id: ForumTopicCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { id: 'general', label: 'General', icon: 'chatbubbles-outline', color: '#0284C7' },
  { id: 'fitness', label: 'Fitness & Gym', icon: 'barbell-outline', color: '#16A34A' },
  { id: 'swim', label: 'Pool & Aquatics', icon: 'water-outline', color: '#00609C' },
  { id: 'facilities', label: 'Facility Updates', icon: 'business-outline', color: '#D97706' },
  { id: 'community', label: 'Community & Meetups', icon: 'people-outline', color: '#7C3AED' },
  { id: 'programs', label: 'Classes & Youth', icon: 'calendar-outline', color: '#E11D48' },
];

export type TicketType = 'feature_request' | 'problem_report';

export type TicketCategory =
  | 'app_bug'
  | 'feature_idea'
  | 'facility_tech'
  | 'account_access'
  | 'schedule_booking'
  | 'billing_membership'
  | 'community_moderation'
  | 'other';

export type ForumReportTargetType = 'topic' | 'reply' | 'class_post';

export type ForumContentReportInput = {
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reporterRole: UserRole | string;
  targetType: ForumReportTargetType;
  targetId: string;
  targetAuthorId: string;
  targetAuthorName: string;
  targetContent: string;
  contextTitle?: string;
  reason: string;
  details?: string;
};

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole | string;
  type: TicketType;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  threadId: string;
  deviceInfo?: string;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackType = 'complaint' | 'suggestion';

export type FeedbackCategory =
  | 'facility_cleanliness'
  | 'equipment'
  | 'pool_aquatics'
  | 'group_classes'
  | 'staff_service'
  | 'hours_schedules'
  | 'locker_rooms'
  | 'programs_events'
  | 'wellness_training'
  | 'other'
  | MaintenanceCategory;

export type MaintenanceCategory =
  | 'maint_hvac'
  | 'maint_plumbing'
  | 'maint_pool_equipment'
  | 'maint_gym_equipment'
  | 'maint_lighting'
  | 'maint_cleaning'
  | 'maint_safety'
  | 'maint_other';

export type FeedbackDepartment = 'member_services' | 'maintenance';
export type FeedbackUrgency = 'low' | 'normal' | 'urgent';

export type FeedbackStatus = 'submitted' | 'under_review' | 'resolved';

export type ComplaintSuggestion = {
  id: string;
  type: FeedbackType;
  title: string;
  details: string;
  category: FeedbackCategory;
  branchId: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  isAnonymous?: boolean;
  status: FeedbackStatus;
  /** Who handles it. Missing means member services (the original complaints queue). */
  department?: FeedbackDepartment;
  /** Maintenance tickets: where the problem is, e.g. "Lap pool deck". */
  location?: string;
  urgency?: FeedbackUrgency;
  /** Set when a staff member (not a member) filed the ticket. */
  submittedByStaffId?: string;
  submittedByStaffName?: string;
  staffResponse?: string;
  respondedByStaffId?: string;
  respondedByStaffName?: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

export const FEEDBACK_CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  { id: 'facility_cleanliness', label: 'Facility & Cleanliness', icon: 'sparkles-outline', description: 'Gym floor, studios, and general hygiene' },
  { id: 'equipment', label: 'Weights & Equipment', icon: 'barbell-outline', description: 'Machines, free weights, and cardio gear' },
  { id: 'pool_aquatics', label: 'Pool & Aquatics', icon: 'water-outline', description: 'Lap lanes, temperature, and saunas' },
  { id: 'group_classes', label: 'Group Classes & Instructors', icon: 'people-outline', description: 'Yoga, BodyPump, Cycle, and class sizes' },
  { id: 'staff_service', label: 'Staff & Front Desk', icon: 'shield-outline', description: 'Customer service and member care' },
  { id: 'hours_schedules', label: 'Hours & Scheduling', icon: 'time-outline', description: 'Building open times and class time slots' },
  { id: 'locker_rooms', label: 'Locker Rooms & Showers', icon: 'business-outline', description: 'Lockers, showers, and saunas' },
  { id: 'wellness_training', label: 'Personal Training & Wellness', icon: 'fitness-outline', description: 'Trainers, wellness packages, and assessments' },
  { id: 'programs_events', label: 'Programs & Youth Activities', icon: 'fitness-outline', description: 'Child Watch, summer camps, and sports leagues' },
  { id: 'other', label: 'General / Other', icon: 'chatbox-ellipses-outline', description: 'Other thoughts, ideas, or feedback' },
];

/** Feedback the Wellness Director reviews (they see only these complaints). */
export const WELLNESS_FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = ['wellness_training', 'equipment'];

export const MAINTENANCE_CATEGORIES: {
  id: MaintenanceCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  { id: 'maint_hvac', label: 'Heating & Cooling', icon: 'thermometer-outline', description: 'Too hot, too cold, or airflow problems' },
  { id: 'maint_plumbing', label: 'Plumbing & Showers', icon: 'water-outline', description: 'Leaks, drains, water pressure, hot water' },
  { id: 'maint_pool_equipment', label: 'Pool Equipment', icon: 'boat-outline', description: 'Pumps, lane lines, lifts, chemical or water issues' },
  { id: 'maint_gym_equipment', label: 'Gym Equipment Repair', icon: 'barbell-outline', description: 'Broken machines, benches, or racks' },
  { id: 'maint_lighting', label: 'Lighting & Electrical', icon: 'bulb-outline', description: 'Burnt-out lights, outlets, or power issues' },
  { id: 'maint_cleaning', label: 'Cleaning & Spills', icon: 'sparkles-outline', description: 'Spills, trash, restocking, or odors' },
  { id: 'maint_safety', label: 'Safety Hazard', icon: 'warning-outline', description: 'Slip risks, damaged floors, or exposed hazards' },
  { id: 'maint_other', label: 'Other Facility Issue', icon: 'construct-outline', description: 'Anything else about the building' },
];

export function isMaintenanceTicket(item: Pick<ComplaintSuggestion, 'department'>): boolean {
  return item.department === 'maintenance';
}

export type SurveyType = 'poll' | 'survey';

export type SurveyCategory =
  | 'fitness'
  | 'aquatics'
  | 'facility'
  | 'programs'
  | 'schedule'
  | 'general';

export type SurveyQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'rating'
  | 'text';

export type SurveyQuestion = {
  id: string;
  prompt: string;
  type: SurveyQuestionType;
  options?: string[]; // choices for single_choice or multiple_choice
  required?: boolean;
};

export type Survey = {
  id: string;
  title: string;
  description: string;
  branchId: string;
  type: SurveyType;
  category: SurveyCategory;
  targetAudience?: string; // e.g. "All YMCA Members", "Morning Swimmers"
  questions: SurveyQuestion[];
  createdByStaffId: string;
  createdByStaffName: string;
  createdAt: string; // ISO
  expiresAt?: string; // ISO
  isActive: boolean;
  allowAnonymous?: boolean;
  totalResponses: number;
};

export type SurveyAnswer = {
  questionId: string;
  selectedOptions?: string[]; // option values selected
  ratingValue?: number; // 1 to 5
  textResponse?: string;
};

export type SurveyResponse = {
  id: string;
  surveyId: string;
  memberId: string;
  memberName: string;
  isAnonymous: boolean;
  answers: SurveyAnswer[];
  submittedAt: string; // ISO
};

export const SURVEY_CATEGORIES: {
  id: SurveyCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { id: 'fitness', label: 'Fitness & Gym', icon: 'barbell-outline', color: '#16A34A' },
  { id: 'aquatics', label: 'Pool & Aquatics', icon: 'water-outline', color: '#0284C7' },
  { id: 'facility', label: 'Facility & Cleanliness', icon: 'business-outline', color: '#D97706' },
  { id: 'programs', label: 'Programs & Youth', icon: 'people-outline', color: '#7C3AED' },
  { id: 'schedule', label: 'Hours & Schedules', icon: 'time-outline', color: '#E11D48' },
  { id: 'general', label: 'General / Community', icon: 'chatbubbles-outline', color: '#0D9488' },
];


export type {
  StreakHoldReason,
  StreakHold,
  AttendanceCheckIn,
  FlameMilestoneTier,
  MemberStreakProfile,
} from './attendanceStreak';
export {
  FLAME_MILESTONE_TIERS,
  FROZEN_FLAME_TIER,
  REASON_METADATA,
  getFlameTier,
  getNextMilestone,
  getMondayOfWeek,
  getDaysOfWeek,
  countVisitsInWeek,
  isDateInHold,
} from './attendanceStreak';

export {
  PROFANITY_WORD_LIST,
  containsProfanity,
  findProfanityWords,
  filterProfanity,
} from './profanityFilter';
