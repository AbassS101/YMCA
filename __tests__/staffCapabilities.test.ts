import {
  capabilitiesForRole,
  hasCapability,
  isDirectorRole,
  isStaffRole,
  personaForRole,
  personaTheme,
  type StaffCapability,
} from '@/domain/staffCapabilities';

const ALL: StaffCapability[] = [
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
];

// Staff Admin runs the business settings but not the system-level ones.
const STAFF_ADMIN = ALL.filter((c) => c !== 'manageSystemConfig');
const CONFIG_CAPS: StaffCapability[] = ['manageBusinessConfig', 'manageSystemConfig', 'viewConfigAudit'];
const CHILD_WATCH_CAPS: StaffCapability[] = ['runChildWatchRoom', 'manageChildWatchProgram'];

const REP: StaffCapability[] = [
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

const EXPECTED: Record<string, StaffCapability[]> = {
  admin: STAFF_ADMIN,
  staff_admin: STAFF_ADMIN,
  it_admin: ALL,
  trainer: ['logWorkouts', 'manageOwnLessonSlots', 'takeAttendance'],
  // Everything a Staff Admin can do, except reading complaints and the generic config powers.
  wellness_director: ALL.filter(
    (c) => c !== 'manageComplaints' && !CONFIG_CAPS.includes(c) && !CHILD_WATCH_CAPS.includes(c)
  ),
  aquatics_director: [
    'logWorkouts',
    'manageOwnLessonSlots',
    'takeAttendance',
    'viewAllMembers',
    'manageAllLessonSlots',
    'assignClients',
    'broadcast',
    'viewSessionRequests',
  ],
  membership_director: [
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
  ],
  child_watch_supervisor: ['viewAllMembers', 'checkIn', 'runChildWatchRoom', 'broadcast'],
  child_watch_director: [
    'viewAllMembers',
    'checkIn',
    'runChildWatchRoom',
    'broadcast',
    'manageChildWatchProgram',
    'takeAttendance',
  ],
  staff: REP,
  desk: REP,
  member: [],
  guest: [],
};

describe('staff capability matrix', () => {
  for (const [role, granted] of Object.entries(EXPECTED)) {
    describe(role, () => {
      for (const cap of ALL) {
        const expected = granted.includes(cap);
        it(`${expected ? 'can' : 'cannot'} ${cap}`, () => {
          expect(hasCapability(role, cap)).toBe(expected);
        });
      }
    });
  }

  it('returns exactly the expected capability set for every role', () => {
    for (const [role, granted] of Object.entries(EXPECTED)) {
      expect([...capabilitiesForRole(role)].sort()).toEqual([...granted].sort());
    }
  });

  it('keeps membership decisions away from trainers', () => {
    expect(hasCapability('trainer', 'approveCancellations')).toBe(false);
    expect(hasCapability('trainer', 'changePlans')).toBe(false);
    expect(hasCapability('trainer', 'deleteMembers')).toBe(false);
  });

  it('keeps complaints away from the Wellness Director', () => {
    expect(hasCapability('wellness_director', 'manageComplaints')).toBe(false);
  });

  it('keeps the generic config powers away from the Wellness Director', () => {
    for (const cap of CONFIG_CAPS) expect(hasCapability('wellness_director', cap)).toBe(false);
  });

  it('keeps Child Watch powers away from the Wellness Director', () => {
    for (const cap of CHILD_WATCH_CAPS) expect(hasCapability('wellness_director', cap)).toBe(false);
  });

  it('keeps system config (toggles, branding, thresholds) with IT only', () => {
    expect(hasCapability('it_admin', 'manageSystemConfig')).toBe(true);
    expect(hasCapability('staff_admin', 'manageSystemConfig')).toBe(false);
    expect(hasCapability('staff_admin', 'manageBusinessConfig')).toBe(true);
  });
});

describe('staff persona helpers', () => {
  it('maps roles to personas', () => {
    expect(personaForRole('staff_admin')).toBe('admin');
    expect(personaForRole('admin')).toBe('admin');
    expect(personaForRole('it_admin')).toBe('it');
    expect(personaForRole('trainer')).toBe('trainer');
    expect(personaForRole('swim_instructor')).toBe('swimInstructor');
    expect([...capabilitiesForRole('swim_instructor')].sort()).toEqual([...capabilitiesForRole('trainer')].sort());
    expect(personaForRole('wellness_director')).toBe('wellnessDirector');
    expect(personaForRole('aquatics_director')).toBe('aquaticsDirector');
    expect(isDirectorRole('aquatics_director')).toBe(true);
    expect(personaForRole('membership_director')).toBe('membershipDirector');
    expect(personaForRole('child_watch_supervisor')).toBe('childWatchSupervisor');
    expect(personaForRole('child_watch_director')).toBe('childWatchDirector');
    expect(personaForRole('desk')).toBe('frontDesk');
    expect(personaForRole('staff')).toBe('frontDesk');
    expect(personaForRole('member')).toBeNull();
    expect(personaForRole(undefined)).toBeNull();
  });

  it('identifies staff and director roles', () => {
    expect(isStaffRole('wellness_director')).toBe(true);
    expect(isStaffRole('membership_director')).toBe(true);
    expect(isStaffRole('member')).toBe(false);
    expect(isStaffRole('guest')).toBe(false);
    expect(isDirectorRole('wellness_director')).toBe(true);
    expect(isDirectorRole('membership_director')).toBe(true);
    expect(isDirectorRole('child_watch_director')).toBe(true);
    expect(isDirectorRole('child_watch_supervisor')).toBe(false);
    expect(isStaffRole('child_watch_supervisor')).toBe(true);
    expect(isStaffRole('child_watch_director')).toBe(true);
    expect(isDirectorRole('staff_admin')).toBe(false);
    expect(isDirectorRole('trainer')).toBe(false);
  });

  it('gives each director a distinct badge and color', () => {
    const wellness = personaTheme('wellness_director');
    const membership = personaTheme('membership_director');
    expect(wellness.badge).not.toBe(membership.badge);
    expect(wellness.color).not.toBe(membership.color);
    expect(personaTheme('staff_admin').color).not.toBe(membership.color);
  });
});
