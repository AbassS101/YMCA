import type { SessionRequest, SessionRequestStatus, Staff, StaffRole, UserRole } from '@/domain/types';

export function canInstantBook(staff: Pick<Staff, 'instantBookMemberIds'> | undefined | null, memberId: string): boolean {
  return Boolean(staff?.instantBookMemberIds?.includes(memberId));
}

export type RequestActor = 'staff' | 'member';

/** Allowed status transitions. Staff answer pending requests; members answer counter-offers. */
export function canTransition(
  status: SessionRequestStatus,
  action: 'accept' | 'decline' | 'counter' | 'accept_counter' | 'decline_counter' | 'cancel',
  actor: RequestActor
): boolean {
  switch (action) {
    case 'accept':
    case 'decline':
    case 'counter':
      return actor === 'staff' && status === 'pending';
    case 'accept_counter':
    case 'decline_counter':
      return actor === 'member' && status === 'countered';
    case 'cancel':
      return status === 'pending' || status === 'countered' || status === 'accepted';
  }
}

/** Who can read a request and its history. */
export function canViewSessionRequest(
  role: UserRole | StaffRole | string | null | undefined,
  userId: string,
  req: Pick<SessionRequest, 'staffId' | 'memberId' | 'lessonType'>
): boolean {
  if (req.memberId === userId || req.staffId === userId) return true;
  switch (role) {
    case 'admin':
    case 'staff_admin':
    case 'it_admin':
      return true;
    case 'wellness_director':
      return req.lessonType === 'training';
    case 'aquatics_director':
      return req.lessonType === 'swim';
    default:
      return false;
  }
}
