import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  countVisitsInWeek,
  FlameMilestoneTier,
  getFlameTier,
  MemberStreakProfile,
  REASON_METADATA,
  StreakHold,
  StreakHoldReason,
} from '@/domain/attendanceStreak';
import { addDaysToDate, getDemoToday } from '@/domain/demoClock';

import { SEED } from '@/protivity/seed';

const STREAK_STORAGE_PREFIX = '@ymca/attendance_streak:v2:';

function getStorageKey(memberId: string): string {
  return `${STREAK_STORAGE_PREFIX}${memberId}`;
}

const SEEDED_MEMBER_IDS = new Set(SEED.members.map((m) => m.id));

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function getDefaultProfile(memberId: string): MemberStreakProfile {
  const today = getDemoToday();
  const base = {
    memberId,
    weeklyTargetDays: 3,
    holdHistory: [],
    updatedAt: new Date().toISOString(),
  };
  if (!SEEDED_MEMBER_IDS.has(memberId) || memberId.startsWith('guest-')) {
    return { ...base, currentStreakWeeks: 0, longestStreakWeeks: 0, totalCheckIns: 0, checkInDates: [] };
  }
  // Demo member Jordan has a long-running streak; everyone else gets a believable, id-derived one.
  const isJordan = memberId === 'member-jordan';
  const h = hashId(memberId);
  const weeks = isJordan ? 12 : h % 9;
  const longest = isJordan ? 14 : weeks + (h % 4);
  const visits = isJordan ? [0, 2, 4, 7, 9, 11, 14] : [1 + (h % 3), 3 + (h % 3), 8 + (h % 3), 10 + (h % 2)];
  const checkInDates = Array.from(new Set(visits.map((d) => addDaysToDate(today, -d)))).sort();
  return {
    ...base,
    currentStreakWeeks: weeks,
    longestStreakWeeks: longest,
    totalCheckIns: isJordan ? 38 : weeks * 3 + checkInDates.length,
    checkInDates,
  };
}

export const streakRepo = {
  async getStreakProfile(memberId: string): Promise<MemberStreakProfile> {
    if (!memberId) {
      return getDefaultProfile('guest');
    }
    try {
      const raw = await AsyncStorage.getItem(getStorageKey(memberId));
      if (!raw) {
        const initial = getDefaultProfile(memberId);
        await AsyncStorage.setItem(getStorageKey(memberId), JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw) as MemberStreakProfile;
      return parsed;
    } catch {
      return getDefaultProfile(memberId);
    }
  },

  async saveStreakProfile(profile: MemberStreakProfile): Promise<MemberStreakProfile> {
    profile.updatedAt = new Date().toISOString();
    try {
      await AsyncStorage.setItem(getStorageKey(profile.memberId), JSON.stringify(profile));
    } catch (e) {
      void e; // Persisting the streak is best effort.
    }
    return profile;
  },

  async setAttendanceGoal(memberId: string, weeklyTargetDays: number): Promise<MemberStreakProfile> {
    const profile = await this.getStreakProfile(memberId);
    profile.weeklyTargetDays = Math.max(1, Math.min(7, Math.round(weeklyTargetDays)));
    return this.saveStreakProfile(profile);
  },

  async recordCheckIn(
    memberId: string,
    options?: {
      date?: string;
      source?: 'optical_scanner' | 'manual' | 'class_attendance';
      note?: string;
    }
  ): Promise<{
    profile: MemberStreakProfile;
    isNewCheckIn: boolean;
    goalMetThisWeek: boolean;
    justHitMilestone?: FlameMilestoneTier;
  }> {
    const profile = await this.getStreakProfile(memberId);
    const date = options?.date ?? getDemoToday();
    const isNew = !profile.checkInDates.includes(date);

    let justHitMilestone: FlameMilestoneTier | undefined;
    const oldTier = getFlameTier(profile.currentStreakWeeks);

    if (isNew) {
      profile.checkInDates.push(date);
      profile.totalCheckIns += 1;

      // Check weekly completion
      const weekInfo = countVisitsInWeek(profile.checkInDates, date);
      const goalMet = weekInfo.visitsThisWeek >= profile.weeklyTargetDays;

      // If they just reached their goal for this week, increment streak
      if (weekInfo.visitsThisWeek === profile.weeklyTargetDays) {
        profile.currentStreakWeeks += 1;
        if (profile.currentStreakWeeks > profile.longestStreakWeeks) {
          profile.longestStreakWeeks = profile.currentStreakWeeks;
        }

        const newTier = getFlameTier(profile.currentStreakWeeks);
        if (newTier.tier > oldTier.tier && newTier.threshold === profile.currentStreakWeeks) {
          justHitMilestone = newTier;
        }
      }

      await this.saveStreakProfile(profile);

      return {
        profile,
        isNewCheckIn: true,
        goalMetThisWeek: goalMet,
        justHitMilestone,
      };
    }

    const weekInfo = countVisitsInWeek(profile.checkInDates, date);
    return {
      profile,
      isNewCheckIn: false,
      goalMetThisWeek: weekInfo.visitsThisWeek >= profile.weeklyTargetDays,
      justHitMilestone: undefined,
    };
  },

  async activateStreakHold(
    memberId: string,
    input: {
      reason: StreakHoldReason;
      note?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<MemberStreakProfile> {
    const profile = await this.getStreakProfile(memberId);
    const startDate = input.startDate || getDemoToday();
    const meta = REASON_METADATA[input.reason];

    const newHold: StreakHold = {
      id: `hold-${Date.now()}`,
      memberId,
      reason: input.reason,
      reasonLabel: meta ? meta.label : 'Streak Hold',
      note: input.note?.trim(),
      startDate,
      endDate: input.endDate,
      createdAt: new Date().toISOString(),
      active: true,
    };

    profile.activeHold = newHold;
    profile.holdHistory = [newHold, ...(profile.holdHistory || [])];

    return this.saveStreakProfile(profile);
  },

  async resumeStreakHold(memberId: string): Promise<MemberStreakProfile> {
    const profile = await this.getStreakProfile(memberId);
    if (profile.activeHold) {
      profile.activeHold.active = false;
      const matching = profile.holdHistory?.find((h) => h.id === profile.activeHold?.id);
      if (matching) {
        matching.active = false;
      }
      profile.activeHold = undefined;
    }
    return this.saveStreakProfile(profile);
  },

  async setStreakCountForDemo(
    memberId: string,
    streakWeeks: number
  ): Promise<{ profile: MemberStreakProfile; milestone: FlameMilestoneTier }> {
    const profile = await this.getStreakProfile(memberId);
    profile.currentStreakWeeks = Math.max(0, streakWeeks);
    if (profile.currentStreakWeeks > profile.longestStreakWeeks) {
      profile.longestStreakWeeks = profile.currentStreakWeeks;
    }
    const saved = await this.saveStreakProfile(profile);
    const milestone = getFlameTier(saved.currentStreakWeeks);
    return { profile: saved, milestone };
  },

  async resetStreakProfile(memberId: string): Promise<MemberStreakProfile> {
    const fresh = getDefaultProfile(memberId);
    await AsyncStorage.setItem(getStorageKey(memberId), JSON.stringify(fresh));
    return fresh;
  },
};
