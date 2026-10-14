import { hasCapability } from '@/domain/staffCapabilities';
import type { Staff, StaffRole, UserRole } from '@/domain/types';

type Role = UserRole | StaffRole | string | null | undefined;
type Target = Pick<Staff, 'id' | 'staffRole' | 'lessonTypes'>;

const COACH_STAFF_ROLES = new Set<string>(['trainer', 'swim_instructor', 'wellness_director', 'aquatics_director']);

/**
 * Who may edit a trainer's availability and answer session requests for them: the trainer themselves,
 * admins for everyone, and each director for their own department. Deliberately not isAdminRole,
 * which also covers wellness_director.
 */
export function canManageTrainerAvailability(role: Role, actorId: string, target: Target): boolean {
  if (actorId === target.id) return hasCapability(role, 'manageOwnLessonSlots');
  const types = target.lessonTypes ?? ['training'];
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

/** The coaching staff this user can manage availability for. */
export function manageableTrainers<T extends Target>(role: Role, actorId: string, staff: T[]): T[] {
  return staff.filter(
    (s) => COACH_STAFF_ROLES.has(s.staffRole ?? '') && canManageTrainerAvailability(role, actorId, s)
  );
}
