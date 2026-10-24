import { hasCapability } from '@/domain/staffCapabilities';
import type { Announcement, StaffRole, UserRole } from '@/domain/types';

export function canManageAnnouncement(
  role: UserRole | StaffRole | undefined,
  actorId: string,
  announcement: Pick<Announcement, 'authorId'>,
): boolean {
  if (!actorId || !hasCapability(role, 'broadcast')) return false;
  return role === 'admin' || role === 'staff_admin' || role === 'it_admin' || announcement.authorId === actorId;
}
