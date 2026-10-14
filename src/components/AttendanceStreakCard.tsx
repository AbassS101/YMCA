import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceStreakModal } from '@/components/AttendanceStreakModal';
import { StreakFireEffect } from '@/components/StreakFireEffect';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { arrivalRepo } from '@/repositories/arrivalRepo';
import {
  countVisitsInWeek,
  FROZEN_FLAME_TIER,
  getDaysOfWeek,
  getFlameTier,
  getMondayOfWeek,
  MemberStreakProfile,
} from '@/domain/attendanceStreak';
import { getDemoToday } from '@/domain/demoClock';
import { streakRepo } from '@/repositories/streakRepo';
import { radii, spacing, typography } from '@/theme/typography';

export type AttendanceStreakCardProps = {
  profile: MemberStreakProfile;
  memberId: string;
  memberName: string;
  onProfileUpdated: (updated: MemberStreakProfile) => void;
};

export function AttendanceStreakCard({
  profile,
  memberId,
  memberName,
  onProfileUpdated,
}: AttendanceStreakCardProps) {
  const { colors, isDark } = useTheme();
  const { api } = useSession();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'overview' | 'goals' | 'hold' | 'milestones'>('overview');
  const [justCheckedInMsg, setJustCheckedInMsg] = useState<string | null>(null);

  const today = getDemoToday();
  const monday = getMondayOfWeek(today);
  const weekDays = getDaysOfWeek(monday);
  const weekInfo = countVisitsInWeek(profile.checkInDates, today);
  const isFrozen = !!profile.activeHold?.active;
  const tier = isFrozen ? FROZEN_FLAME_TIER : getFlameTier(profile.currentStreakWeeks);

  const isCheckedInToday = profile.checkInDates.includes(today);
  const isGoalMetThisWeek = weekInfo.visitsThisWeek >= profile.weeklyTargetDays;

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Quick 1-tap Check In
  const handleQuickCheckIn = async () => {
    try {
      const result = await streakRepo.recordCheckIn(memberId, {
        date: today,
        source: 'manual',
      });
      onProfileUpdated(result.profile);
      if (result.isNewCheckIn) void arrivalRepo.notifyArrival(api, memberId, 'manual');

      if (result.isNewCheckIn) {
        if (result.justHitMilestone) {
          setJustCheckedInMsg(`You reached ${result.justHitMilestone.tierName}.`);
        } else if (result.goalMetThisWeek) {
          setJustCheckedInMsg('Weekly goal met. Streak extended by a week.');
        } else {
          setJustCheckedInMsg('Checked in for today.');
        }
      } else {
        setJustCheckedInMsg('Great job, already visited today!');
      }
      setTimeout(() => setJustCheckedInMsg(null), 3500);
    } catch (e) {
      void e; // Quick check-in is best effort.
    }
  };

  const openModal = (tab: 'overview' | 'goals' | 'hold' | 'milestones' = 'overview') => {
    setModalInitialTab(tab);
    setModalVisible(true);
  };

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : colors.cardBg,
            borderColor: isFrozen ? '#38BDF8' : colors.cardBorder,
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Attendance Streak: ${profile.currentStreakWeeks} weeks. Weekly Goal: ${profile.weeklyTargetDays} days.`}
      >
        {/* Top Header Row */}
        <View style={styles.topRow}>
          <Pressable
            onPress={() => openModal('overview')}
            style={styles.flameAndTitle}
            accessibilityRole="button"
            accessibilityLabel="View flame streak details"
          >
            <StreakFireEffect
              streakWeeks={profile.currentStreakWeeks}
              isFrozen={isFrozen}
              size="sm"
            />
            <View>
              <View style={styles.kickerRow}>
                <Text
                  style={[
                    styles.streakKicker,
                    { color: isFrozen ? '#0284C7' : tier.textColor },
                  ]}
                >
                  {isFrozen
                    ? 'STREAK ON HOLD (FROZEN)'
                    : `${tier.badgeName.toUpperCase()} STREAK`}
                </Text>
              </View>
              <Text style={[styles.streakTitle, { color: colors.text }]}>
                {profile.currentStreakWeeks}{' '}
                {profile.currentStreakWeeks === 1 ? 'Week Streak' : 'Weeks Streak'}
              </Text>
            </View>
          </Pressable>

          {/* Badge / Pill */}
          <Pressable
            onPress={() => openModal(isFrozen ? 'hold' : 'milestones')}
            style={[
              styles.tierPill,
              {
                backgroundColor: isFrozen ? '#E0F2FE' : tier.bgColor,
                borderColor: isFrozen ? '#7DD3FC' : tier.borderColor,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Streak Milestone info"
          >
            <Text
              style={[
                styles.tierPillText,
                { color: isFrozen ? '#0284C7' : tier.textColor },
              ]}
            >
              {isFrozen ? 'Protected' : `Tier ${tier.tier}`}
            </Text>
          </Pressable>
        </View>

        {/* On Hold Warning / Active Alert */}
        {isFrozen && profile.activeHold ? (
          <View style={[styles.holdNoticeBox, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
            <Text style={styles.holdNoticeText} numberOfLines={2}>
              Protected for {profile.activeHold.reasonLabel}. Your streak will not break while away.
            </Text>
            <Pressable
              onPress={() => openModal('hold')}
              style={styles.holdResumeLink}
              accessibilityRole="button"
            >
              <Text style={styles.holdResumeLinkText}>Manage ›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Weekly Attendance Summary Bar */}
        <View style={styles.weeklySummaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalStatusText, { color: colors.text }]}>
              {isGoalMetThisWeek ? (
                <Text style={{ color: colors.success, fontWeight: '800' }}>
                  Goal met ({weekInfo.visitsThisWeek}/{profile.weeklyTargetDays} days)
                </Text>
              ) : (
                `Goal: ${profile.weeklyTargetDays}x/wk · ${weekInfo.visitsThisWeek} of ${profile.weeklyTargetDays} visits completed`
              )}
            </Text>
            <Text style={[styles.goalSubText, { color: colors.textMuted }]}>
              {isGoalMetThisWeek
                ? 'Streak count updated for this week!'
                : `${profile.weeklyTargetDays - weekInfo.visitsThisWeek} more ${
                    profile.weeklyTargetDays - weekInfo.visitsThisWeek === 1 ? 'visit' : 'visits'
                  } needed to maintain streak`}
            </Text>
          </View>

          <Pressable
            onPress={() => openModal('goals')}
            style={styles.editGoalPill}
            accessibilityRole="button"
            accessibilityLabel="Adjust attendance goal"
          >
            <Text style={[styles.editGoalPillText, { color: colors.primary }]}>
              Edit Goal ›
            </Text>
          </Pressable>
        </View>

        {/* 7-Day Dot Tracker */}
        <View style={styles.dayDotsContainer}>
          {weekDays.map((isoDay, idx) => {
            const visited = profile.checkInDates.includes(isoDay);
            const isToday = isoDay === today;
            return (
              <View key={isoDay} style={styles.dayDotCol}>
                <Text style={[styles.dayDotLabel, { color: colors.textMuted }]}>
                  {dayLabels[idx]}
                </Text>
                <View
                  style={[
                    styles.dayDotCircle,
                    visited
                      ? { backgroundColor: tier.fireColor, borderColor: tier.fireColor }
                      : isToday
                      ? { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: colors.primary, borderWidth: 1.5 }
                      : { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.cardBorder },
                  ]}
                >
                  {visited ? (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  ) : isToday ? (
                    <View style={[styles.todayCenterDot, { backgroundColor: colors.primary }]} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Feedback message if just checked in */}
        {justCheckedInMsg ? (
          <View style={[styles.toastPill, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <Ionicons name="sparkles" size={14} color="#15803D" />
            <Text style={styles.toastPillText}>{justCheckedInMsg}</Text>
          </View>
        ) : null}

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleQuickCheckIn}
            style={({ pressed }) => [
              styles.checkInBtn,
              { backgroundColor: isCheckedInToday ? '#15803D' : colors.primary },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Check in for today"
          >
            <Ionicons
              name={isCheckedInToday ? 'checkmark-circle' : 'finger-print'}
              size={15}
              color="#FFFFFF"
            />
            <Text style={styles.checkInBtnText}>
              {isCheckedInToday ? 'Checked In Today' : 'Check In Today'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => openModal(isFrozen ? 'hold' : 'overview')}
            style={({ pressed }) => [
              styles.manageBtn,
              { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View Streaks & Freeze Hold"
          >
            <Ionicons
              name={isFrozen ? 'shield-checkmark' : 'flame-outline'}
              size={15}
              color={isFrozen ? '#0284C7' : colors.primary}
            />
            <Text style={[styles.manageBtnText, { color: isFrozen ? '#0284C7' : colors.primary }]}>
              {isFrozen ? 'Streak Hold' : 'Streak Hub ›'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Full Modal */}
      {modalVisible ? (
        <AttendanceStreakModal
          visible={modalVisible}
          profile={profile}
          memberId={memberId}
          memberName={memberName}
          initialTab={modalInitialTab}
          onClose={() => setModalVisible(false)}
          onProfileUpdated={onProfileUpdated}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1.5,
    gap: spacing.sm + 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flameAndTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },
  tierPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  holdNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  holdNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    lineHeight: 16,
  },
  holdResumeLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  holdResumeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  weeklySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  goalStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  editGoalPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editGoalPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dayDotCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayDotLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayDotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  todayCenterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  toastPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  checkInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
