import type { StaffRole, UserRole } from '@/domain/types';

export type StaffPersona =
  | 'admin'
  | 'it'
  | 'trainer'
  | 'swimInstructor'
  | 'wellnessDirector'
  | 'aquaticsDirector'
  | 'membershipDirector'
  | 'frontDesk'
  | 'childWatchSupervisor'
  | 'childWatchDirector'
  | 'maintenance';

export type StaffCapability =
  | 'viewAllMembers'
  | 'editMemberProfiles'
  | 'createMembers'
  | 'approveCancellations'
  | 'changePlans'
  | 'deleteMembers'
  | 'logWorkouts'
  | 'manageOwnLessonSlots'
  | 'manageAllLessonSlots'
  | 'manageSchedules'
  | 'takeAttendance'
  | 'checkIn'
  | 'assignClients'
  | 'manageTrainers'
  | 'manageStaff'
  | 'broadcast'
  | 'manageComplaints'
  | 'manageSurveys'
  | 'viewBranchKpis'
  | 'handleBillingIssues'
  | 'logMemberContacts'
  | 'manageLeads'
  | 'sellMemberships'
  | 'manageCampaigns'
  | 'viewRepKpis'
  | 'viewSessionRequests'
  | 'manageBusinessConfig'
  | 'manageSystemConfig'
  | 'viewConfigAudit'
  | 'runChildWatchRoom'
  | 'manageChildWatchProgram'
  | 'manageMaintenance'
  | 'viewBranchStats'
  | 'viewDepartmentStats'
  | 'exportData'
  | 'manageSupportTickets'
  /** Only the wellness-related complaints (see WELLNESS_FEEDBACK_CATEGORIES). */
  | 'manageWellnessComplaints';

const ALL_CAPABILITIES: readonly StaffCapability[] = [
  'viewAllMembers',
  'editMemberProfiles',
  'createMembers',
  'approveCancellations',
  'changePlans',
  'deleteMembers',
  'logWorkouts',
  'manageOwnLessonSlots',
  'manageAllLessonSlots',
  'manageSchedules',
  'takeAttendance',
  'checkIn',
  'assignClients',
  'manageTrainers',
  'manageStaff',
  'broadcast',
  'manageComplaints',
  'manageSurveys',
  'viewBranchKpis',
  'handleBillingIssues',
  'logMemberContacts',
  'manageLeads',
  'sellMemberships',
  'manageCampaigns',
  'viewRepKpis',
  'viewSessionRequests',
  'manageBusinessConfig',
  'manageSystemConfig',
  'viewConfigAudit',
  'runChildWatchRoom',
  'manageChildWatchProgram',
  'manageMaintenance',
  'viewBranchStats',
  'viewDepartmentStats',
  'exportData',
  'manageSupportTickets',
  'manageWellnessComplaints',
];

// Staff Admin runs the business settings but not the system-level ones (toggles, branding, thresholds).
const STAFF_ADMIN_CAPABILITIES: readonly StaffCapability[] = ALL_CAPABILITIES.filter(
  (c) => c !== 'manageSystemConfig'
);

const TRAINER_CAPABILITIES: readonly StaffCapability[] = [
  'logWorkouts',
  'manageOwnLessonSlots',
  'takeAttendance',
];

// Wellness Director = everything a Staff Admin can do, except reading non-wellness complaints and the generic
// business/system config powers (they edit only the wellness packages section; see canEditConfigSection).
// (Creating/editing admin- or director-level staff is blocked in staff management.)
const WELLNESS_DIRECTOR_CAPABILITIES: readonly StaffCapability[] = ALL_CAPABILITIES.filter(
  (c) =>
    c !== 'manageComplaints' &&
    c !== 'manageSupportTickets' &&
    c !== 'manageBusinessConfig' &&
    c !== 'manageSystemConfig' &&
    c !== 'viewConfigAudit' &&
    c !== 'runChildWatchRoom' &&
    c !== 'manageChildWatchProgram' &&
    c !== 'manageMaintenance' &&
    c !== 'viewBranchStats'
);

const AQUATICS_DIRECTOR_CAPABILITIES: readonly StaffCapability[] = [
  ...TRAINER_CAPABILITIES,
  'viewAllMembers',
  'manageAllLessonSlots',
  'assignClients',
  'broadcast',
  'viewSessionRequests',
  'viewDepartmentStats',
  'exportData',
];

const MEMBERSHIP_DIRECTOR_CAPABILITIES: readonly StaffCapability[] = [
  'viewAllMembers',
  'editMemberProfiles',
  'createMembers',
  'approveCancellations',
  'changePlans',
  'deleteMembers',
  'checkIn',
  'takeAttendance',
  'broadcast',
  'manageComplaints',
  'handleBillingIssues',
  'logMemberContacts',
  'manageLeads',
  'sellMemberships',
  'manageCampaigns',
  'viewRepKpis',
  'runChildWatchRoom',
  'viewDepartmentStats',
  'exportData',
];

const MAINTENANCE_CAPABILITIES: readonly StaffCapability[] = ['manageMaintenance', 'broadcast'];

const FRONT_DESK_CAPABILITIES: readonly StaffCapability[] = [
  'viewAllMembers',
  'createMembers',
  'checkIn',
  'takeAttendance',
  'handleBillingIssues',
  'logMemberContacts',
  'manageLeads',
  'sellMemberships',
  'runChildWatchRoom',
];

const CHILD_WATCH_SUPERVISOR_CAPABILITIES: readonly StaffCapability[] = [
  'viewAllMembers',
  'checkIn',
  'runChildWatchRoom',
  'broadcast',
];

const CHILD_WATCH_DIRECTOR_CAPABILITIES: readonly StaffCapability[] = [
  ...CHILD_WATCH_SUPERVISOR_CAPABILITIES,
  'manageChildWatchProgram',
  'takeAttendance',
  'viewDepartmentStats',
  'exportData',
];

export function personaForRole(role?: UserRole | StaffRole | string | null): StaffPersona | null {
  switch (role) {
    case 'admin':
    case 'staff_admin':
      return 'admin';
    case 'it_admin':
      return 'it';
    case 'trainer':
      return 'trainer';
    case 'swim_instructor':
      return 'swimInstructor';
    case 'wellness_director':
      return 'wellnessDirector';
    case 'aquatics_director':
      return 'aquaticsDirector';
    case 'membership_director':
      return 'membershipDirector';
    case 'child_watch_supervisor':
      return 'childWatchSupervisor';
    case 'child_watch_director':
      return 'childWatchDirector';
    case 'maintenance':
      return 'maintenance';
    case 'staff':
    case 'desk':
      return 'frontDesk';
    default:
      return null;
  }
}

export function capabilitiesForRole(role?: UserRole | StaffRole | string | null): ReadonlySet<StaffCapability> {
  switch (personaForRole(role)) {
    case 'admin':
      return new Set(STAFF_ADMIN_CAPABILITIES);
    case 'it':
      return new Set(ALL_CAPABILITIES);
    case 'trainer':
    case 'swimInstructor':
      return new Set(TRAINER_CAPABILITIES);
    case 'wellnessDirector':
      return new Set(WELLNESS_DIRECTOR_CAPABILITIES);
    case 'aquaticsDirector':
      return new Set(AQUATICS_DIRECTOR_CAPABILITIES);
    case 'membershipDirector':
      return new Set(MEMBERSHIP_DIRECTOR_CAPABILITIES);
    case 'frontDesk':
      return new Set(FRONT_DESK_CAPABILITIES);
    case 'childWatchSupervisor':
      return new Set(CHILD_WATCH_SUPERVISOR_CAPABILITIES);
    case 'childWatchDirector':
      return new Set(CHILD_WATCH_DIRECTOR_CAPABILITIES);
    case 'maintenance':
      return new Set(MAINTENANCE_CAPABILITIES);
    default:
      return new Set();
  }
}

export function hasCapability(
  role: UserRole | StaffRole | string | null | undefined,
  capability: StaffCapability
): boolean {
  return capabilitiesForRole(role).has(capability);
}

export type ConfigSection =
  | 'membershipPlans'
  | 'childWatch'
  | 'guestPasses'
  | 'donations'
  | 'wellnessPackages'
  | 'swimClasses'
  | 'lessonPricing'
  | 'campaigns'
  | 'templates'
  | 'branding'
  | 'thresholds'
  | 'featureToggles'
  | 'about'
  | 'amenities'
  | 'programs'
  | 'busyTimes'
  | 'poolSchedule'
  | 'aquaticsSession';

/** Sections only IT may change. Everything else is a business section. */
const SYSTEM_CONFIG_SECTIONS: ReadonlySet<ConfigSection> = new Set(['branding', 'thresholds', 'featureToggles']);

/** Directors may edit just the sections that belong to their area. */
const CONFIG_SECTION_OWNERS: Partial<Record<ConfigSection, readonly StaffPersona[]>> = {
  campaigns: ['membershipDirector'],
  swimClasses: ['aquaticsDirector'],
  // Lesson pricing holds both swim and personal training prices.
  lessonPricing: ['aquaticsDirector', 'wellnessDirector'],
  wellnessPackages: ['wellnessDirector'],
  childWatch: ['childWatchDirector'],
  poolSchedule: ['aquaticsDirector'],
  aquaticsSession: ['aquaticsDirector'],
  busyTimes: ['membershipDirector'],
  programs: ['wellnessDirector'],
};

export function canEditConfigSection(
  role: UserRole | StaffRole | string | null | undefined,
  section: ConfigSection
): boolean {
  if (SYSTEM_CONFIG_SECTIONS.has(section)) return hasCapability(role, 'manageSystemConfig');
  if (hasCapability(role, 'manageBusinessConfig')) return true;
  const persona = personaForRole(role);
  return persona !== null && (CONFIG_SECTION_OWNERS[section] ?? []).includes(persona);
}

export function isStaffRole(role?: UserRole | StaffRole | string | null): boolean {
  return personaForRole(role) !== null;
}

export function isDirectorRole(role?: UserRole | StaffRole | string | null): boolean {
  return (
    role === 'wellness_director' ||
    role === 'aquatics_director' ||
    role === 'membership_director' ||
    role === 'child_watch_director'
  );
}

export type PersonaTheme = {
  badge: string;
  title: string;
  icon: 'star' | 'shield-checkmark' | 'barbell' | 'water' | 'fitness' | 'business' | 'person' | 'happy' | 'construct';
  color: string;
  softBg: string;
  darkSoftBg: string;
};

export const PERSONA_THEMES: Record<StaffPersona, PersonaTheme> = {
  admin: {
    badge: 'STAFF ADMIN',
    title: 'Staff Admin',
    icon: 'star',
    color: '#B45309',
    softBg: '#FEF3C7',
    darkSoftBg: '#451A03',
  },
  it: {
    badge: 'IT ADMIN',
    title: 'IT Systems',
    icon: 'shield-checkmark',
    color: '#7C3AED',
    softBg: '#F5F3FF',
    darkSoftBg: '#2E1065',
  },
  trainer: {
    badge: 'TRAINER',
    title: 'Personal Trainer',
    icon: 'barbell',
    color: '#15803D',
    softBg: '#DCFCE7',
    darkSoftBg: '#052E16',
  },
  swimInstructor: {
    badge: 'SWIM INSTRUCTOR',
    title: 'Swim Instructor',
    icon: 'water',
    color: '#0284C7',
    softBg: '#E0F2FE',
    darkSoftBg: '#082F49',
  },
  wellnessDirector: {
    badge: 'WELLNESS DIR',
    title: 'Wellness Director',
    icon: 'fitness',
    color: '#9D174D',
    softBg: '#FCE7F3',
    darkSoftBg: '#500724',
  },
  aquaticsDirector: {
    badge: 'AQUATICS DIR',
    title: 'Aquatics Director',
    icon: 'water',
    color: '#0369A1',
    softBg: '#E0F2FE',
    darkSoftBg: '#082F49',
  },
  membershipDirector: {
    badge: 'MEMBERSHIP DIR',
    title: 'Membership Director',
    icon: 'business',
    color: '#4338CA',
    softBg: '#E0E7FF',
    darkSoftBg: '#1E1B4B',
  },
  frontDesk: {
    badge: 'MEMBERSHIP REP',
    title: 'Front Desk Membership Representative',
    icon: 'person',
    color: '#0369A1',
    softBg: '#E0F2FE',
    darkSoftBg: '#082F49',
  },
  childWatchSupervisor: {
    badge: 'CW SUPERVISOR',
    title: 'Child Watch Supervisor',
    icon: 'happy',
    color: '#C2410C',
    softBg: '#FFEDD5',
    darkSoftBg: '#431407',
  },
  childWatchDirector: {
    badge: 'CW DIRECTOR',
    title: 'Child Watch Director',
    icon: 'happy',
    color: '#BE123C',
    softBg: '#FFE4E6',
    darkSoftBg: '#4C0519',
  },
  maintenance: {
    badge: 'MAINTENANCE',
    title: 'Facilities & Maintenance',
    icon: 'construct',
    color: '#B45309',
    softBg: '#FEF3C7',
    darkSoftBg: '#451A03',
  },
};

export function personaTheme(role?: UserRole | StaffRole | string | null): PersonaTheme {
  return PERSONA_THEMES[personaForRole(role) ?? 'frontDesk'];
}
