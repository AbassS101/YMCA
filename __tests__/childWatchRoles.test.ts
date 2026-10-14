import { canEditConfigSection, capabilitiesForRole, hasCapability, personaTheme } from '@/domain/staffCapabilities';
import { isTopLevelStaffRole } from '@/domain/types';

describe('Child Watch roles', () => {
  it('lets room staff run the room but only the director manage the program', () => {
    for (const role of ['child_watch_supervisor', 'child_watch_director', 'desk', 'membership_director', 'staff_admin', 'it_admin']) {
      expect(hasCapability(role, 'runChildWatchRoom')).toBe(true);
    }
    for (const role of ['child_watch_director', 'staff_admin', 'admin', 'it_admin']) {
      expect(hasCapability(role, 'manageChildWatchProgram')).toBe(true);
    }
    for (const role of ['child_watch_supervisor', 'desk', 'membership_director', 'trainer', 'swim_instructor', 'aquatics_director', 'wellness_director', 'member', 'guest']) {
      expect(hasCapability(role, 'manageChildWatchProgram')).toBe(false);
    }
  });

  it('keeps trainers, aquatics and wellness directors out of the room', () => {
    for (const role of ['trainer', 'swim_instructor', 'aquatics_director', 'wellness_director', 'member']) {
      expect(hasCapability(role, 'runChildWatchRoom')).toBe(false);
    }
  });

  it('gives the supervisor a narrow set and the director the supervisor set plus program powers', () => {
    const sup = [...capabilitiesForRole('child_watch_supervisor')].sort();
    expect(sup).toEqual(['broadcast', 'checkIn', 'runChildWatchRoom', 'viewAllMembers']);
    const dir = new Set(capabilitiesForRole('child_watch_director'));
    for (const c of sup) expect(dir.has(c as never)).toBe(true);
    expect(dir.has('manageChildWatchProgram')).toBe(true);
    expect(dir.has('takeAttendance')).toBe(true);
    expect(dir.has('manageBusinessConfig')).toBe(false);
    expect(dir.has('editMemberProfiles')).toBe(false);
  });

  it('lets the director (and admins) edit Child Watch settings, not the supervisor', () => {
    expect(canEditConfigSection('child_watch_director', 'childWatch')).toBe(true);
    expect(canEditConfigSection('staff_admin', 'childWatch')).toBe(true);
    expect(canEditConfigSection('it_admin', 'childWatch')).toBe(true);
    expect(canEditConfigSection('child_watch_supervisor', 'childWatch')).toBe(false);
    expect(canEditConfigSection('wellness_director', 'childWatch')).toBe(false);
    expect(canEditConfigSection('child_watch_director', 'membershipPlans')).toBe(false);
    expect(canEditConfigSection('child_watch_director', 'featureToggles')).toBe(false);
  });

  it('treats only the director as top level', () => {
    expect(isTopLevelStaffRole('child_watch_director')).toBe(true);
    expect(isTopLevelStaffRole('child_watch_supervisor')).toBe(false);
  });

  it('gives each role its own badge and the happy icon', () => {
    const sup = personaTheme('child_watch_supervisor');
    const dir = personaTheme('child_watch_director');
    expect(sup.badge).toBe('CW SUPERVISOR');
    expect(dir.badge).toBe('CW DIRECTOR');
    expect(sup.icon).toBe('happy');
    expect(dir.icon).toBe('happy');
    expect(sup.color).not.toBe(dir.color);
  });
});
