import type { ComplaintSuggestion } from '@/domain/types';

export type MaintenanceFilter = 'open' | 'urgent' | 'resolved' | 'all';
export type MaintenanceSource = 'all' | 'member' | 'staff';

export type MaintenanceSummary = {
  open: number;
  urgent: number;
  inProgress: number;
  resolvedThisWeek: number;
  /** Average age in whole days of tickets still open, or 0 when none. */
  avgOpenAgeDays: number;
};

const DAY_MS = 86_400_000;

/** Staff-filed tickets carry submittedByStaffId; everything else came from a member (or an anonymous one). */
export function ticketSource(item: ComplaintSuggestion): 'member' | 'staff' {
  return item.submittedByStaffId ? 'staff' : 'member';
}

export function isOpenTicket(item: ComplaintSuggestion): boolean {
  return item.status !== 'resolved';
}

/** Urgent first, then oldest first, so the queue reads top to bottom as "do this next". Resolved sink to the bottom. */
export function sortMaintenanceQueue(items: ComplaintSuggestion[]): ComplaintSuggestion[] {
  const rank = (i: ComplaintSuggestion) => (i.status === 'resolved' ? 2 : i.urgency === 'urgent' ? 0 : 1);
  return [...items].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt));
}

export function filterMaintenanceQueue(
  items: ComplaintSuggestion[],
  filter: MaintenanceFilter,
  source: MaintenanceSource = 'all'
): ComplaintSuggestion[] {
  return sortMaintenanceQueue(
    items.filter((i) => {
      if (source !== 'all' && ticketSource(i) !== source) return false;
      switch (filter) {
        case 'open':
          return isOpenTicket(i);
        case 'urgent':
          return isOpenTicket(i) && i.urgency === 'urgent';
        case 'resolved':
          return i.status === 'resolved';
        default:
          return true;
      }
    })
  );
}

export function summarizeMaintenance(items: ComplaintSuggestion[], now: Date = new Date()): MaintenanceSummary {
  const open = items.filter(isOpenTicket);
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const ages = open.map((i) => Math.max(0, now.getTime() - new Date(i.createdAt).getTime()) / DAY_MS);
  return {
    open: open.length,
    urgent: open.filter((i) => i.urgency === 'urgent').length,
    inProgress: open.filter((i) => i.status === 'under_review').length,
    resolvedThisWeek: items.filter(
      (i) => i.status === 'resolved' && new Date(i.updatedAt ?? i.createdAt).getTime() >= weekAgo
    ).length,
    avgOpenAgeDays: ages.length === 0 ? 0 : Math.round(ages.reduce((a, b) => a + b, 0) / ages.length),
  };
}

export function ageLabel(createdAt: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(createdAt).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}
