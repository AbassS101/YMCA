jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  countVisitsInWeek,
  FLAME_MILESTONE_TIERS,
  FROZEN_FLAME_TIER,
  getDaysOfWeek,
  getFlameTier,
  getMondayOfWeek,
  getNextMilestone,
  isDateInHold,
  REASON_METADATA,
  StreakHoldReason,
} from '@/domain/attendanceStreak';
import { streakRepo } from '@/repositories/streakRepo';

describe('Attendance Goals, Streaks, Fire Colors & Hold System', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Flame Milestone Tiers & Fire Colors (10, 30, 50, 70, 100)', () => {
    test('defines all 6 tiers with correct thresholds and colors', () => {
      expect(FLAME_MILESTONE_TIERS).toHaveLength(6);

      const thresholds = FLAME_MILESTONE_TIERS.map((t) => t.threshold);
      expect(thresholds).toEqual([0, 10, 30, 50, 70, 100]);
    });

    test('0-9 weeks returns Amber Ember tier (Orange #F97316)', () => {
      const tier0 = getFlameTier(0);
      expect(tier0.threshold).toBe(0);
      expect(tier0.tierName).toBe('Amber Ember');
      expect(tier0.fireColor).toBe('#F97316');

      const tier9 = getFlameTier(9);
      expect(tier9.threshold).toBe(0);
      expect(tier9.fireColor).toBe('#F97316');
    });

    test('10-29 weeks returns Ruby Blaze tier (Crimson Red #EF4444)', () => {
      const tier10 = getFlameTier(10);
      expect(tier10.threshold).toBe(10);
      expect(tier10.tierName).toBe('Ruby Blaze');
      expect(tier10.fireColor).toBe('#EF4444');

      const tier25 = getFlameTier(25);
      expect(tier25.threshold).toBe(10);
      expect(tier25.fireColor).toBe('#EF4444');
    });

    test('30-49 weeks returns Cobalt Plasma tier (Neon Blue #0284C7)', () => {
      const tier30 = getFlameTier(30);
      expect(tier30.threshold).toBe(30);
      expect(tier30.tierName).toBe('Cobalt Plasma');
      expect(tier30.fireColor).toBe('#0284C7');

      const tier45 = getFlameTier(45);
      expect(tier45.threshold).toBe(30);
      expect(tier45.fireColor).toBe('#0284C7');
    });

    test('50-69 weeks returns Cosmic Amethyst tier (Purple Lightning #9333EA)', () => {
      const tier50 = getFlameTier(50);
      expect(tier50.threshold).toBe(50);
      expect(tier50.tierName).toBe('Cosmic Amethyst');
      expect(tier50.fireColor).toBe('#9333EA');

      const tier65 = getFlameTier(65);
      expect(tier65.threshold).toBe(50);
      expect(tier65.fireColor).toBe('#9333EA');
    });

    test('70-99 weeks returns Emerald Aurora tier (Green #10B981)', () => {
      const tier70 = getFlameTier(70);
      expect(tier70.threshold).toBe(70);
      expect(tier70.tierName).toBe('Emerald Aurora');
      expect(tier70.fireColor).toBe('#10B981');

      const tier99 = getFlameTier(99);
      expect(tier99.threshold).toBe(70);
      expect(tier99.fireColor).toBe('#10B981');
    });

    test('100+ weeks returns Solar Nova Crown tier (Gold #F59E0B)', () => {
      const tier100 = getFlameTier(100);
      expect(tier100.threshold).toBe(100);
      expect(tier100.tierName).toBe('Solar Nova Crown');
      expect(tier100.fireColor).toBe('#F59E0B');
      expect(tier100.emoji).toBe('👑');

      const tier150 = getFlameTier(150);
      expect(tier150.threshold).toBe(100);
    });

    test('calculates next upcoming milestone accurately', () => {
      const nextFrom0 = getNextMilestone(0);
      expect(nextFrom0).not.toBeNull();
      expect(nextFrom0?.nextTier.threshold).toBe(10);
      expect(nextFrom0?.weeksRemaining).toBe(10);

      const nextFrom12 = getNextMilestone(12);
      expect(nextFrom12?.nextTier.threshold).toBe(30);
      expect(nextFrom12?.weeksRemaining).toBe(18);

      const nextFrom35 = getNextMilestone(35);
      expect(nextFrom35?.nextTier.threshold).toBe(50);
      expect(nextFrom35?.weeksRemaining).toBe(15);

      const nextFrom55 = getNextMilestone(55);
      expect(nextFrom55?.nextTier.threshold).toBe(70);
      expect(nextFrom55?.weeksRemaining).toBe(15);

      const nextFrom75 = getNextMilestone(75);
      expect(nextFrom75?.nextTier.threshold).toBe(100);
      expect(nextFrom75?.weeksRemaining).toBe(25);

      const nextFrom105 = getNextMilestone(105);
      expect(nextFrom105).toBeNull(); // Max tier reached
    });
  });

  describe('Attendance Goal Setting', () => {
    test('updates weekly target days and clamps within 1-7 days', async () => {
      const profile = await streakRepo.setAttendanceGoal('member-test', 4);
      expect(profile.weeklyTargetDays).toBe(4);

      const clampedLow = await streakRepo.setAttendanceGoal('member-test', 0);
      expect(clampedLow.weeklyTargetDays).toBe(1);

      const clampedHigh = await streakRepo.setAttendanceGoal('member-test', 10);
      expect(clampedHigh.weeklyTargetDays).toBe(7);
    });
  });

  describe('Attendance Check-In & Streak Advancement', () => {
    test('records attendance and increments count', async () => {
      const result = await streakRepo.recordCheckIn('member-new', {
        date: '2026-09-14',
      });

      expect(result.isNewCheckIn).toBe(true);
      expect(result.profile.totalCheckIns).toBe(1);
      expect(result.profile.checkInDates).toContain('2026-09-14');

      // Duplicate check-in on the same day is idempotent
      const dup = await streakRepo.recordCheckIn('member-new', {
        date: '2026-09-14',
      });
      expect(dup.isNewCheckIn).toBe(false);
      expect(dup.profile.totalCheckIns).toBe(1);
    });

    test('increments streak when weekly goal is reached', async () => {
      // Set goal to 2 days/week
      await streakRepo.setAttendanceGoal('member-streak', 2);

      // Check-in day 1 (Monday 2026-09-14)
      const day1 = await streakRepo.recordCheckIn('member-streak', {
        date: '2026-09-14',
      });
      expect(day1.goalMetThisWeek).toBe(false);
      expect(day1.profile.currentStreakWeeks).toBe(0);

      // Check-in day 2 (Wednesday 2026-09-16)
      const day2 = await streakRepo.recordCheckIn('member-streak', {
        date: '2026-09-16',
      });
      expect(day2.goalMetThisWeek).toBe(true);
      expect(day2.profile.currentStreakWeeks).toBe(1);
      expect(day2.profile.longestStreakWeeks).toBe(1);
    });
  });

  describe('Streak Hold / Freeze for Extraneous Circumstances (Injury & Travel)', () => {
    test('has metadata for travel, injury, medical, family, work reasons', () => {
      const reasons: StreakHoldReason[] = ['traveling', 'injury', 'medical', 'family', 'work', 'other'];
      reasons.forEach((r) => {
        expect(REASON_METADATA[r]).toBeDefined();
        expect(REASON_METADATA[r].label).toBeTruthy();
        expect(REASON_METADATA[r].icon).toBeTruthy();
      });
    });

    test('activates streak hold for injury with note and date', async () => {
      const profile = await streakRepo.activateStreakHold('member-jordan', {
        reason: 'injury',
        note: 'Sprained wrist during tennis match',
        startDate: '2026-09-14',
      });

      expect(profile.activeHold).toBeDefined();
      expect(profile.activeHold?.active).toBe(true);
      expect(profile.activeHold?.reason).toBe('injury');
      expect(profile.activeHold?.reasonLabel).toBe('Injury / Rehab');
      expect(profile.activeHold?.note).toBe('Sprained wrist during tennis match');
      expect(profile.holdHistory).toHaveLength(1);
    });

    test('activates streak hold for traveling and protects streak', async () => {
      const profile = await streakRepo.activateStreakHold('member-traveler', {
        reason: 'traveling',
        note: 'Two week European vacation',
        startDate: '2026-09-10',
        endDate: '2026-09-24',
      });

      expect(profile.activeHold?.active).toBe(true);
      expect(profile.activeHold?.reason).toBe('traveling');

      // Date verification helper
      expect(isDateInHold('2026-09-15', profile.activeHold)).toBe(true);
      expect(isDateInHold('2026-09-08', profile.activeHold)).toBe(false);
      expect(isDateInHold('2026-09-28', profile.activeHold)).toBe(false);
    });

    test('resumes streak hold when member returns', async () => {
      await streakRepo.activateStreakHold('member-resume', {
        reason: 'medical',
        note: 'Flu recovery',
      });

      const resumed = await streakRepo.resumeStreakHold('member-resume');
      expect(resumed.activeHold).toBeUndefined();
      expect(resumed.holdHistory[0].active).toBe(false);
    });
  });

  describe('Milestone Simulator & Date Helpers', () => {
    test('allows setting streak count for demonstration of fire colors', async () => {
      const { profile, milestone } = await streakRepo.setStreakCountForDemo('member-demo', 50);
      expect(profile.currentStreakWeeks).toBe(50);
      expect(milestone.tierName).toBe('Cosmic Amethyst');
      expect(milestone.fireColor).toBe('#9333EA');

      const { milestone: century } = await streakRepo.setStreakCountForDemo('member-demo', 100);
      expect(century.tierName).toBe('Solar Nova Crown');
      expect(century.fireColor).toBe('#F59E0B');
    });

    test('getMondayOfWeek accurately finds Monday for any date', () => {
      // 2026-09-14 was a Monday
      expect(getMondayOfWeek('2026-09-14')).toBe('2026-09-14');
      // 2026-09-16 was a Wednesday -> Monday is 2026-09-14
      expect(getMondayOfWeek('2026-09-16')).toBe('2026-09-14');
      // 2026-09-20 was a Sunday -> Monday was 2026-09-14
      expect(getMondayOfWeek('2026-09-20')).toBe('2026-09-14');
    });

    test('countVisitsInWeek accurately counts visits during the week', () => {
      const checkIns = ['2026-09-14', '2026-09-16', '2026-09-18', '2026-09-01'];
      const weekInfo = countVisitsInWeek(checkIns, '2026-09-15');

      expect(weekInfo.monday).toBe('2026-09-14');
      expect(weekInfo.visitsThisWeek).toBe(3);
      expect(weekInfo.visitedDatesThisWeek).toEqual([
        '2026-09-14',
        '2026-09-16',
        '2026-09-18',
      ]);
    });
  });
});
