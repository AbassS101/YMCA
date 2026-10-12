import { getDemoToday } from './demoClock';

export type StreakHoldReason =
  | 'traveling'
  | 'injury'
  | 'medical'
  | 'family'
  | 'work'
  | 'other';

export type StreakHold = {
  id: string;
  memberId: string;
  reason: StreakHoldReason;
  reasonLabel: string;
  note?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional, or open-ended)
  createdAt: string; // ISO
  active: boolean;
};

export type AttendanceCheckIn = {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  source: 'optical_scanner' | 'manual' | 'class_attendance';
  note?: string;
};

export type FlameMilestoneTier = {
  tier: number;
  threshold: number;
  tierName: string;
  badgeName: string;
  fireColor: string; // Outer vibrant flame color
  coreColor: string; // Inner hot flame core
  haloColor: string; // Atmospheric aura glow
  textColor: string; // Badge text color
  bgColor: string; // Badge container background
  borderColor: string;
  emoji: string;
  iconName: 'flame' | 'shield-checkmark' | 'trophy';
  description: string;
  rarityTitle: string;
};

export const FLAME_MILESTONE_TIERS: FlameMilestoneTier[] = [
  {
    tier: 0,
    threshold: 0,
    tierName: 'Amber Ember',
    badgeName: 'Amber Spark',
    fireColor: '#F97316',
    coreColor: '#FDE047',
    haloColor: 'rgba(249, 115, 22, 0.28)',
    textColor: '#C2410C',
    bgColor: '#FFF7ED',
    borderColor: '#FDBA74',
    emoji: '🔥',
    iconName: 'flame',
    description: 'Starting the fitness journey — building consistency week by week.',
    rarityTitle: 'Novice Streak',
  },
  {
    tier: 1,
    threshold: 10,
    tierName: 'Ruby Blaze',
    badgeName: 'Ruby Blaze (10+)',
    fireColor: '#EF4444',
    coreColor: '#FECACA',
    haloColor: 'rgba(239, 68, 68, 0.35)',
    textColor: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    emoji: '🔥',
    iconName: 'flame',
    description: '10 Weeks Strong — Crimson fire burning with proven commitment!',
    rarityTitle: 'Ember Champion (10+)',
  },
  {
    tier: 2,
    threshold: 30,
    tierName: 'Cobalt Plasma',
    badgeName: 'Cobalt Heat (30+)',
    fireColor: '#0284C7',
    coreColor: '#BAE6FD',
    haloColor: 'rgba(2, 132, 199, 0.38)',
    textColor: '#0369A1',
    bgColor: '#F0F9FF',
    borderColor: '#7DD3FC',
    emoji: '💎',
    iconName: 'flame',
    description: '30 Weeks Strong — Blue plasma burns hotter than red fire!',
    rarityTitle: 'Sapphire Master (30+)',
  },
  {
    tier: 3,
    threshold: 50,
    tierName: 'Cosmic Amethyst',
    badgeName: 'Cosmic Violet (50+)',
    fireColor: '#9333EA',
    coreColor: '#E9D5FF',
    haloColor: 'rgba(147, 51, 234, 0.40)',
    textColor: '#7E22CE',
    bgColor: '#FAF5FF',
    borderColor: '#D8B4FE',
    emoji: '⚡',
    iconName: 'flame',
    description: 'Nearly a full year of consistency — mystical purple lightning flame!',
    rarityTitle: 'Amethyst Titan (50+)',
  },
  {
    tier: 4,
    threshold: 70,
    tierName: 'Emerald Aurora',
    badgeName: 'Emerald Aurora (70+)',
    fireColor: '#10B981',
    coreColor: '#A7F3D0',
    haloColor: 'rgba(16, 185, 129, 0.42)',
    textColor: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    emoji: '🌿',
    iconName: 'flame',
    description: '70 Weeks Strong — Legendary emerald flame reflecting boundless energy!',
    rarityTitle: 'Emerald Immortal (70+)',
  },
  {
    tier: 5,
    threshold: 100,
    tierName: 'Solar Nova Crown',
    badgeName: 'Solar Nova (100+)',
    fireColor: '#F59E0B',
    coreColor: '#FEF08A',
    haloColor: 'rgba(245, 158, 11, 0.45)',
    textColor: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FCD34D',
    emoji: '👑',
    iconName: 'flame',
    description: '100+ Weeks Century Club — Supreme golden crown of YMCA excellence!',
    rarityTitle: 'Centurion Legend (100+)',
  },
];

export const FROZEN_FLAME_TIER = {
  tier: -1,
  threshold: 0,
  tierName: 'Frozen Shield',
  badgeName: 'Streak Protected (On Hold)',
  fireColor: '#38BDF8',
  coreColor: '#E0F2FE',
  haloColor: 'rgba(56, 189, 248, 0.35)',
  textColor: '#0284C7',
  bgColor: '#F0F9FF',
  borderColor: '#BAE6FD',
  emoji: '🛡️',
  iconName: 'shield-checkmark' as const,
  description: 'Your streak is safely paused for traveling or recovery.',
  rarityTitle: 'Protected On Hold',
};

export type MemberStreakProfile = {
  memberId: string;
  weeklyTargetDays: number; // e.g. 1 to 7 days per week
  currentStreakWeeks: number; // consecutive weeks met
  longestStreakWeeks: number;
  totalCheckIns: number;
  activeHold?: StreakHold;
  holdHistory: StreakHold[];
  checkInDates: string[]; // YYYY-MM-DD
  updatedAt: string;
};

export const REASON_METADATA: Record<StreakHoldReason, { label: string; icon: string; prompt: string }> = {
  traveling: {
    label: 'Traveling / Vacation',
    icon: 'airplane',
    prompt: 'Away on vacation or out of town travel',
  },
  injury: {
    label: 'Injury / Rehab',
    icon: 'bandage',
    prompt: 'Recovering from physical strain or sports injury',
  },
  medical: {
    label: 'Medical Recovery / Illness',
    icon: 'medkit',
    prompt: 'Doctor-advised rest or illness recovery',
  },
  family: {
    label: 'Family / Personal Emergency',
    icon: 'people',
    prompt: 'Taking care of family or personal matters',
  },
  work: {
    label: 'Work / Relocation Trip',
    icon: 'briefcase',
    prompt: 'Heavy travel for business or temporary relocation',
  },
  other: {
    label: 'Other Extraneous Circumstances',
    icon: 'ellipsis-horizontal-circle',
    prompt: 'Other temporary pause needed',
  },
};

/**
 * Returns the matching flame milestone tier based on streak week count.
 */
export function getFlameTier(streakWeeks: number): FlameMilestoneTier {
  for (let i = FLAME_MILESTONE_TIERS.length - 1; i >= 0; i--) {
    if (streakWeeks >= FLAME_MILESTONE_TIERS[i].threshold) {
      return FLAME_MILESTONE_TIERS[i];
    }
  }
  return FLAME_MILESTONE_TIERS[0];
}

/**
 * Returns the next upcoming milestone tier and how many weeks remain until reaching it.
 */
export function getNextMilestone(streakWeeks: number): {
  nextTier: FlameMilestoneTier;
  weeksRemaining: number;
  progressPercent: number;
} | null {
  const currentTier = getFlameTier(streakWeeks);
  const nextTier = FLAME_MILESTONE_TIERS.find((t) => t.threshold > streakWeeks);

  if (!nextTier) {
    return null; // Already at highest tier (100+)
  }

  const range = nextTier.threshold - currentTier.threshold;
  const currentProgress = streakWeeks - currentTier.threshold;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));
  const weeksRemaining = nextTier.threshold - streakWeeks;

  return {
    nextTier,
    weeksRemaining,
    progressPercent,
  };
}

/**
 * Returns Monday of the week containing the given date.
 */
export function getMondayOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  dt.setUTCDate(dt.getUTCDate() + diff);

  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const date = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Returns the 7 days of the current week starting Monday.
 */
export function getDaysOfWeek(mondayIso: string): string[] {
  const days: string[] = [];
  const [y, m, d] = mondayIso.split('-').map(Number);
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12, 0, 0));
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const date = String(dt.getUTCDate()).padStart(2, '0');
    days.push(`${year}-${month}-${date}`);
  }
  return days;
}

/**
 * Calculates how many times the member has checked in during the given week.
 */
export function countVisitsInWeek(checkInDates: string[], referenceDate: string = getDemoToday()): {
  monday: string;
  weekDays: string[];
  visitsThisWeek: number;
  visitedDatesThisWeek: string[];
} {
  const monday = getMondayOfWeek(referenceDate);
  const weekDays = getDaysOfWeek(monday);
  const visitedDatesThisWeek = weekDays.filter((day) => checkInDates.includes(day));

  return {
    monday,
    weekDays,
    visitsThisWeek: visitedDatesThisWeek.length,
    visitedDatesThisWeek,
  };
}

/**
 * Checks if a given date falls within an active streak hold.
 */
export function isDateInHold(isoDate: string, hold?: StreakHold): boolean {
  if (!hold || !hold.active) return false;
  if (isoDate < hold.startDate) return false;
  if (hold.endDate && isoDate > hold.endDate) return false;
  return true;
}
