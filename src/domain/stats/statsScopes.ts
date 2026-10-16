import { personaForRole } from '@/domain/staffCapabilities';
import type { StaffRole, UserRole } from '@/domain/types';

export type StatsScope = 'branch' | 'childWatch' | 'aquatics' | 'wellness' | 'membership';

export const STATS_SCOPE_LABELS: Record<StatsScope, string> = {
  branch: 'Branch',
  childWatch: 'Child Watch',
  aquatics: 'Aquatics',
  wellness: 'Wellness',
  membership: 'Membership',
};

const ALL_SCOPES: StatsScope[] = ['branch', 'childWatch', 'aquatics', 'wellness', 'membership'];

/** admin/it -> all five; directors -> their own one; everyone else -> []. */
export function statsScopesForRole(role: UserRole | StaffRole | string | null | undefined): StatsScope[] {
  switch (personaForRole(role)) {
    case 'admin':
    case 'it':
      return [...ALL_SCOPES];
    case 'childWatchDirector':
      return ['childWatch'];
    case 'aquaticsDirector':
      return ['aquatics'];
    case 'wellnessDirector':
      return ['wellness'];
    case 'membershipDirector':
      return ['membership'];
    default:
      return [];
  }
}

export function canOpenStats(role: UserRole | StaffRole | string | null | undefined): boolean {
  return statsScopesForRole(role).length > 0;
}
