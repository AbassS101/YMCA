import { isStaffRole } from '@/domain/staffCapabilities';

const SHARED_PAGES = new Set(['/schedules', '/notifications', '/child-watch', '/complaints-suggestions', '/surveys']);

/** Expo's member and staff route groups share public URLs. Keep staff reloads in their workspace. */
export function staffRouteForSharedPage(pathname: string, role: string | null | undefined): string | null {
  if (!isStaffRole(role)) return null;
  if (SHARED_PAGES.has(pathname) || pathname === '/messages' || pathname.startsWith('/messages/')) {
    return `/(staff)${pathname}`;
  }
  return null;
}
