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
];

const EXPECTED: Record<string, StaffCapability[]> = {
  admin: ALL,
  staff_admin: ALL,
  it_admin: ALL,
  trainer: ['logWorkouts', 'manageOwnLessonSlots', 'takeAttendance'],
  wellness_director: [
    'logWorkouts',
    'manageOwnLessonSlots',
    'takeAttendance',
    'viewAllMembers',
    'manageAllLessonSlots',
    'assignClients',
    'manageTrainers',
    'broadcast',
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
  ],
  staff: ['viewAllMembers', 'checkIn', 'takeAttendance'],
  desk: ['viewAllMembers', 'checkIn', 'takeAttendance'],
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

  it('keeps membership decisions away from trainers and the Wellness Director', () => {
    for (const role of ['trainer', 'wellness_director']) {
      expect(hasCapability(role, 'approveCancellations')).toBe(false);
      expect(hasCapability(role, 'changePlans')).toBe(false);
      expect(hasCapability(role, 'deleteMembers')).toBe(false);
    }
  });
});

describe('staff persona helpers', () => {
  it('maps roles to personas', () => {
    expect(personaForRole('staff_admin')).toBe('admin');
    expect(personaForRole('admin')).toBe('admin');
    expect(personaForRole('it_admin')).toBe('it');
    expect(personaForRole('trainer')).toBe('trainer');
    expect(personaForRole('wellness_director')).toBe('wellnessDirector');
    expect(personaForRole('membership_director')).toBe('membershipDirector');
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
