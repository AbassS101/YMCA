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
import { getDemoToday } from '@/domain/demoClock';

const STREAK_STORAGE_PREFIX = '@ymca/attendance_streak:';

function getStorageKey(memberId: string): string {
  return `${STREAK_STORAGE_PREFIX}${memberId}`;
}

function getDefaultProfile(memberId: string): MemberStreakProfile {
  const today = getDemoToday();
  // Provide pre-seeded engaging streak for demo member Jordan
  if (memberId === 'member-jordan' || memberId.includes('jordan')) {
    return {
      memberId,
      weeklyTargetDays: 3,
      currentStreakWeeks: 12, // 10+ Ruby Blaze Milestone reached!
      longestStreakWeeks: 14,
      totalCheckIns: 38,
      checkInDates: ['2026-09-07', '2026-09-09', '2026-09-11', today],
      holdHistory: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    memberId,
    weeklyTargetDays: 3,
    currentStreakWeeks: 0,
    longestStreakWeeks: 0,
    totalCheckIns: 0,
    checkInDates: [],
    holdHistory: [],
    updatedAt: new Date().toISOString(),
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
      console.warn('Failed to save streak profile:', e);
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
