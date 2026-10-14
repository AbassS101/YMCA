import type { StaffRole, UserRole } from '@/domain/types';

export type StaffPersona =
  | 'admin'
  | 'it'
  | 'trainer'
  | 'swimInstructor'
  | 'wellnessDirector'
  | 'aquaticsDirector'
  | 'membershipDirector'
  | 'frontDesk';

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
  | 'viewSessionRequests';

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
];

const TRAINER_CAPABILITIES: readonly StaffCapability[] = [
  'logWorkouts',
  'manageOwnLessonSlots',
  'takeAttendance',
];

// Wellness Director = everything a Staff Admin can do, except reading complaints.
// (Creating/editing admin- or director-level staff is blocked in staff management.)
const WELLNESS_DIRECTOR_CAPABILITIES: readonly StaffCapability[] = ALL_CAPABILITIES.filter(
  (c) => c !== 'manageComplaints'
);

const AQUATICS_DIRECTOR_CAPABILITIES: readonly StaffCapability[] = [
  ...TRAINER_CAPABILITIES,
  'viewAllMembers',
  'manageAllLessonSlots',
  'assignClients',
  'broadcast',
  'viewSessionRequests',
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
];

const FRONT_DESK_CAPABILITIES: readonly StaffCapability[] = [
  'viewAllMembers',
  'createMembers',
  'checkIn',
  'takeAttendance',
  'handleBillingIssues',
  'logMemberContacts',
  'manageLeads',
  'sellMemberships',
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

export function isStaffRole(role?: UserRole | StaffRole | string | null): boolean {
  return personaForRole(role) !== null;
}

export function isDirectorRole(role?: UserRole | StaffRole | string | null): boolean {
  return role === 'wellness_director' || role === 'aquatics_director' || role === 'membership_director';
}

export type PersonaTheme = {
  badge: string;
  title: string;
  icon: 'star' | 'shield-checkmark' | 'barbell' | 'water' | 'fitness' | 'business' | 'person';
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
};

export function personaTheme(role?: UserRole | StaffRole | string | null): PersonaTheme {
  return PERSONA_THEMES[personaForRole(role) ?? 'frontDesk'];
}
