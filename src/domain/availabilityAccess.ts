import { hasCapability } from '@/domain/staffCapabilities';
import type { Staff, StaffRole, UserRole } from '@/domain/types';

type Role = UserRole | StaffRole | string | null | undefined;
type Target = Pick<Staff, 'id' | 'staffRole' | 'lessonTypes'>;

/** Which schedule a coach belongs on. Explicit lessonTypes win; otherwise swim roles are swim, the rest training. */
export function coachDiscipline(s: Pick<Staff, 'staffRole' | 'lessonTypes'>): 'training' | 'swim' {
  if (s.lessonTypes && s.lessonTypes.length > 0) return s.lessonTypes.includes('training') ? 'training' : 'swim';
  return s.staffRole === 'swim_instructor' || s.staffRole === 'aquatics_director' ? 'swim' : 'training';
}

/** Splits coaching staff into personal trainers and swim instructors (input order is kept). */
export function splitCoachesByDiscipline<T extends Pick<Staff, 'staffRole' | 'lessonTypes'>>(
  staff: T[]
): { trainers: T[]; swim: T[] } {
  return {
    trainers: staff.filter((s) => coachDiscipline(s) === 'training'),
    swim: staff.filter((s) => coachDiscipline(s) === 'swim'),
  };
}

const COACH_STAFF_ROLES = new Set<string>(['trainer', 'swim_instructor', 'wellness_director', 'aquatics_director']);

/**
 * Who may edit a trainer's availability and answer session requests for them: the trainer themselves,
 * admins for everyone, and each director for their own department. Deliberately not isAdminRole,
 * which also covers wellness_director.
 */
export function canManageTrainerAvailability(role: Role, actorId: string, target: Target): boolean {
  if (actorId === target.id) return hasCapability(role, 'manageOwnLessonSlots');
  const types = target.lessonTypes ?? [coachDiscipline(target)];
  switch (role) {
    case 'admin':
    case 'staff_admin':
    case 'it_admin':
      return true;
    case 'wellness_director':
      return types.includes('training');
    case 'aquatics_director':
      return types.includes('swim');
    default:
      return false;
  }
}

/** True for staff who coach members (and so have bookable hours). A missing role counts as a trainer, as elsewhere. */
export function isCoachStaff(s: Pick<Staff, 'staffRole'>): boolean {
  return s.staffRole == null || COACH_STAFF_ROLES.has(s.staffRole);
}

/**
 * Who may see a trainer's hours: everyone who can edit them, plus staff admin, IT admin, the director of
 * membership and front desk (all trainers). Directors only see their own department; other trainers and
 * child watch roles see nothing. Viewers see the full weekly template including day-off notes; members use
 * the open-times lists instead, which carry no notes.
 */
export function canViewTrainerAvailability(role: Role, actorId: string, target: Target): boolean {
  if (canManageTrainerAvailability(role, actorId, target)) return true;
  switch (role) {
    case 'membership_director':
    case 'desk':
    case 'staff':
      return true;
    default:
      return false;
  }
}

/** The coaching staff this user can view availability for. */
export function viewableTrainers<T extends Target>(role: Role, actorId: string, staff: T[]): T[] {
  return staff.filter((s) => isCoachStaff(s) && canViewTrainerAvailability(role, actorId, s));
}

/** The coaching staff this user can manage availability for. */
export function manageableTrainers<T extends Target>(role: Role, actorId: string, staff: T[]): T[] {
  return staff.filter(
    (s) => COACH_STAFF_ROLES.has(s.staffRole ?? '') && canManageTrainerAvailability(role, actorId, s)
  );
}
