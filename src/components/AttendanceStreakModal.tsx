import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { StreakFireEffect } from '@/components/StreakFireEffect';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { arrivalRepo } from '@/repositories/arrivalRepo';
import {
  countVisitsInWeek,
  FLAME_MILESTONE_TIERS,
  FROZEN_FLAME_TIER,
  getDaysOfWeek,
  getFlameTier,
  getMondayOfWeek,
  getNextMilestone,
  MemberStreakProfile,
  REASON_METADATA,
  StreakHoldReason,
} from '@/domain/attendanceStreak';
import { getDemoToday } from '@/domain/demoClock';
import { streakRepo } from '@/repositories/streakRepo';
import { radii, spacing, typography } from '@/theme/typography';

export type AttendanceStreakModalProps = {
  visible: boolean;
  profile: MemberStreakProfile;
  memberId: string;
  memberName: string;
  onClose: () => void;
  onProfileUpdated: (updated: MemberStreakProfile) => void;
  initialTab?: 'overview' | 'goals' | 'hold' | 'milestones';
};

const GOAL_OPTIONS = [
  { days: 1, title: '1 day / week', tag: 'Gentle Start' },
  { days: 2, title: '2 days / week', tag: 'Balanced Routine' },
  { days: 3, title: '3 days / week', tag: 'Most Popular' },
  { days: 4, title: '4 days / week', tag: 'Fitness Builder' },
  { days: 5, title: '5 days / week', tag: 'Dedicated Athlete' },
  { days: 6, title: '6 days / week', tag: 'Peak Performance' },
  { days: 7, title: '7 days / week', tag: 'Daily Champion' },
];

const HOLD_REASONS: StreakHoldReason[] = [
  'traveling',
  'injury',
  'medical',
  'family',
  'work',
  'other',
];

export function AttendanceStreakModal({
  visible,
  profile,
  memberId,
  memberName,
  onClose,
  onProfileUpdated,
  initialTab = 'overview',
}: AttendanceStreakModalProps) {
  const { colors, isDark } = useTheme();
  const { api } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'hold' | 'milestones'>(initialTab);

  // Goal state
  const [selectedGoalDays, setSelectedGoalDays] = useState(profile.weeklyTargetDays);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null);

  // Hold state
  const [selectedHoldReason, setSelectedHoldReason] = useState<StreakHoldReason>('traveling');
  const [holdNote, setHoldNote] = useState('');
  const [isUpdatingHold, setIsUpdatingHold] = useState(false);
  const [holdFeedback, setHoldFeedback] = useState<string | null>(null);

  // Check in feedback
  const [checkInFeedback, setCheckInFeedback] = useState<string | null>(null);

  const today = getDemoToday();
  const monday = getMondayOfWeek(today);
  const weekDays = getDaysOfWeek(monday);
  const weekInfo = countVisitsInWeek(profile.checkInDates, today);
  const currentTier = profile.activeHold?.active
    ? FROZEN_FLAME_TIER
    : getFlameTier(profile.currentStreakWeeks);
  const nextMilestone = getNextMilestone(profile.currentStreakWeeks);

  const isCheckedInToday = profile.checkInDates.includes(today);

  // Save new goal
  const handleSaveGoal = async (days: number) => {
    setSelectedGoalDays(days);
    setIsSavingGoal(true);
    setGoalFeedback(null);
    try {
      const updated = await streakRepo.setAttendanceGoal(memberId, days);
      onProfileUpdated(updated);
      setGoalFeedback(`Goal updated to ${days} days per week!`);
      setTimeout(() => setGoalFeedback(null), 3500);
    } catch {
      setGoalFeedback('Failed to update goal. Please try again.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Toggle Check In
  const handleRecordCheckIn = async () => {
    try {
      const result = await streakRepo.recordCheckIn(memberId, {
        date: today,
        source: 'manual',
      });
      onProfileUpdated(result.profile);
      if (result.isNewCheckIn) {
        void arrivalRepo.notifyArrival(api, memberId, 'manual');
        if (result.justHitMilestone) {
          setCheckInFeedback(
            `You reached ${result.justHitMilestone.tierName} (${result.justHitMilestone.threshold}+ weeks).`
          );
        } else if (result.goalMetThisWeek) {
          setCheckInFeedback('Weekly goal met. Your streak is now a week longer.');
        } else {
          setCheckInFeedback('Check-in recorded for today.');
        }
      } else {
        setCheckInFeedback('You have already checked in today.');
      }
      setTimeout(() => setCheckInFeedback(null), 4000);
    } catch (e) {
      // Check-in is best effort; the card refreshes on the next visit.
      void e;
    }
  };

  // Activate Streak Hold
  const handleActivateHold = async () => {
    setIsUpdatingHold(true);
    setHoldFeedback(null);
    try {
      const updated = await streakRepo.activateStreakHold(memberId, {
        reason: selectedHoldReason,
        note: holdNote,
        startDate: today,
      });
      onProfileUpdated(updated);
      setHoldFeedback('Streak hold started. Your streak will not break while you are away.');
      setTimeout(() => setHoldFeedback(null), 4000);
    } catch {
      setHoldFeedback('Failed to activate hold.');
    } finally {
      setIsUpdatingHold(false);
    }
  };

  // Resume Streak Hold
  const handleResumeHold = async () => {
    setIsUpdatingHold(true);
    setHoldFeedback(null);
    try {
      const updated = await streakRepo.resumeStreakHold(memberId);
      onProfileUpdated(updated);
      setHoldFeedback('Streak resumed. Welcome back.');
      setTimeout(() => setHoldFeedback(null), 4000);
    } catch {
      setHoldFeedback('Failed to resume streak.');
    } finally {
      setIsUpdatingHold(false);
    }
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPress} onPress={onClose} accessibilityLabel="Close modal" />

        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          {/* Top Drag Indicator & Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragBar} />
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kickerText, { color: colors.primary }]}>
                  YMCA WELLNESS & ATTENDANCE
                </Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Goals & Streaks
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.closeCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Navigation Tabs */}
            <View style={[styles.tabsRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
              <Pressable
                onPress={() => setActiveTab('overview')}
                style={[
                  styles.tabBtn,
                  activeTab === 'overview' && [
                    styles.tabBtnActive,
                    { backgroundColor: colors.cardBg },
                  ],
                ]}
              >
                <Ionicons
                  name="flame"
                  size={15}
                  color={activeTab === 'overview' ? currentTier.fireColor : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color: activeTab === 'overview' ? colors.text : colors.textMuted,
                      fontWeight: activeTab === 'overview' ? '700' : '500',
                    },
                  ]}
                >
                  Streak
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('goals')}
                style={[
                  styles.tabBtn,
                  activeTab === 'goals' && [
                    styles.tabBtnActive,
                    { backgroundColor: colors.cardBg },
                  ],
                ]}
              >
                <Ionicons
                  name="flag-outline"
                  size={15}
                  color={activeTab === 'goals' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color: activeTab === 'goals' ? colors.text : colors.textMuted,
                      fontWeight: activeTab === 'goals' ? '700' : '500',
                    },
                  ]}
                >
                  Goals
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('hold')}
                style={[
                  styles.tabBtn,
                  activeTab === 'hold' && [
                    styles.tabBtnActive,
                    { backgroundColor: colors.cardBg },
                  ],
                ]}
              >
                <Ionicons
                  name={profile.activeHold?.active ? 'shield-checkmark' : 'shield-outline'}
                  size={15}
                  color={
                    profile.activeHold?.active
                      ? '#0284C7'
                      : activeTab === 'hold'
                      ? colors.primary
                      : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color: activeTab === 'hold' ? colors.text : colors.textMuted,
                      fontWeight: activeTab === 'hold' ? '700' : '500',
                    },
                  ]}
                >
                  Hold
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('milestones')}
                style={[
                  styles.tabBtn,
                  activeTab === 'milestones' && [
                    styles.tabBtnActive,
                    { backgroundColor: colors.cardBg },
                  ],
                ]}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={15}
                  color={activeTab === 'milestones' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color: activeTab === 'milestones' ? colors.text : colors.textMuted,
                      fontWeight: activeTab === 'milestones' ? '700' : '500',
                    },
                  ]}
                >
                  Flames
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Feedback Banners */}
          {checkInFeedback ? (
            <View style={[styles.feedbackBanner, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
              <Ionicons name="sparkles" size={16} color="#15803D" />
              <Text style={styles.feedbackBannerText}>{checkInFeedback}</Text>
            </View>
          ) : null}

          {goalFeedback ? (
            <View style={[styles.feedbackBanner, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#1D4ED8" />
              <Text style={[styles.feedbackBannerText, { color: '#1D4ED8' }]}>{goalFeedback}</Text>
            </View>
          ) : null}

          {holdFeedback ? (
            <View style={[styles.feedbackBanner, { backgroundColor: '#F0F9FF', borderColor: '#7DD3FC' }]}>
              <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
              <Text style={[styles.feedbackBannerText, { color: '#0369A1' }]}>{holdFeedback}</Text>
            </View>
          ) : null}

          {/* Main Scroll Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* ========================================================= */}
            {/* TAB 1: OVERVIEW & STREAK HERO */}
            {/* ========================================================= */}
            {activeTab === 'overview' && (
              <View style={styles.tabSection}>
                {/* Hold Banner if Streak is currently on hold */}
                {profile.activeHold?.active ? (
                  <View style={[styles.holdActiveHero, { backgroundColor: '#F0F9FF', borderColor: '#7DD3FC' }]}>
                    <View style={styles.holdActiveHeaderRow}>
                      <View style={styles.holdActiveLeft}>
                        <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
                        <Text style={styles.holdActiveTitle}>STREAK PROTECTED ON HOLD</Text>
                      </View>
                      <Pressable
                        onPress={handleResumeHold}
                        style={styles.resumeMiniBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Resume streak"
                      >
                        <Text style={styles.resumeMiniBtnText}>Resume Now</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.holdActiveReason}>
                      Reason: {profile.activeHold.reasonLabel}
                    </Text>
                    {profile.activeHold.note ? (
                      <Text style={styles.holdActiveNote}>"{profile.activeHold.note}"</Text>
                    ) : null}
                    <Text style={styles.holdActiveSub}>
                      Your streak will not lapse while traveling or healing.
                    </Text>
                  </View>
                ) : null}

                {/* Hero Flame Display */}
                <View
                  style={[
                    styles.heroCard,
                    {
                      backgroundColor: currentTier.bgColor,
                      borderColor: currentTier.borderColor,
                    },
                  ]}
                >
                  <StreakFireEffect
                    streakWeeks={profile.currentStreakWeeks}
                    isFrozen={profile.activeHold?.active}
                    size="hero"
                  />

                  <View style={styles.heroTierBadge}>
                    <Text style={[styles.heroTierBadgeText, { color: currentTier.textColor }]}>
                      {currentTier.badgeName.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[styles.heroStreakNumber, { color: currentTier.textColor }]}>
                    {profile.currentStreakWeeks}
                  </Text>
                  <Text style={[styles.heroStreakLabel, { color: colors.text }]}>
                    {profile.currentStreakWeeks === 1 ? 'Week Streak' : 'Weeks Streak'}
                  </Text>
                  <Text style={[styles.heroDesc, { color: colors.textMuted }]}>
                    {currentTier.description}
                  </Text>

                  {/* Next Milestone Progress Bar */}
                  {nextMilestone && !profile.activeHold?.active ? (
                    <View style={styles.nextMilestoneBox}>
                      <View style={styles.nextMilestoneRow}>
                        <Text style={[styles.nextMilestoneTitle, { color: colors.text }]}>
                          Next Flame: {nextMilestone.nextTier.badgeName}
                        </Text>
                        <Text style={[styles.nextMilestoneWeeks, { color: nextMilestone.nextTier.fireColor }]}>
                          {nextMilestone.weeksRemaining} {nextMilestone.weeksRemaining === 1 ? 'week' : 'weeks'} left
                        </Text>
                      </View>
                      <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${nextMilestone.progressPercent}%`,
                              backgroundColor: nextMilestone.nextTier.fireColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* This Week Attendance Tracker */}
                <View
                  style={[
                    styles.sectionCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.sectionCardHeader}>
                    <View>
                      <Text style={[styles.sectionCardKicker, { color: colors.primary }]}>
                        WEEKLY ATTENDANCE
                      </Text>
                      <Text style={[styles.sectionCardTitle, { color: colors.text }]}>
                        This Week: {weekInfo.visitsThisWeek} of {profile.weeklyTargetDays} days
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setActiveTab('goals')}
                      style={styles.adjustGoalLink}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.adjustGoalLinkText, { color: colors.primary }]}>
                        Goal: {profile.weeklyTargetDays}x/wk ›
                      </Text>
                    </Pressable>
                  </View>

                  {/* Day-by-Day Circles */}
                  <View style={styles.weekDaysRow}>
                    {weekDays.map((isoDay, idx) => {
                      const visited = profile.checkInDates.includes(isoDay);
                      const isToday = isoDay === today;
                      return (
                        <View key={isoDay} style={styles.dayCol}>
                          <Text style={[styles.dayLetter, { color: colors.textMuted }]}>
                            {dayLabels[idx]}
                          </Text>
                          <View
                            style={[
                              styles.dayCircle,
                              visited
                                ? { backgroundColor: currentTier.fireColor, borderColor: currentTier.fireColor }
                                : isToday
                                ? { backgroundColor: isDark ? '#334155' : '#E2E8F0', borderColor: colors.primary, borderWidth: 2 }
                                : { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#334155' : '#CBD5E1' },
                            ]}
                          >
                            {visited ? (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            ) : isToday ? (
                              <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Check In Action Button */}
                  <Pressable
                    onPress={handleRecordCheckIn}
                    style={({ pressed }) => [
                      styles.checkInActionBtn,
                      { backgroundColor: isCheckedInToday ? colors.success : colors.primary },
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Check in for today's visit"
                  >
                    <Ionicons
                      name={isCheckedInToday ? 'checkmark-circle' : 'finger-print'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.checkInActionBtnText}>
                      {isCheckedInToday ? 'Checked In for Today! (Tap again to verify)' : 'Check In for Today (Log Visit)'}
                    </Text>
                  </Pressable>
                </View>

                {/* Lifetime Stats Matrix */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                    <Text style={[styles.statNum, { color: colors.text }]}>
                      {profile.currentStreakWeeks}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Current Streak
                    </Text>
                  </View>

                  <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                    <Text style={[styles.statNum, { color: colors.text }]}>
                      {profile.longestStreakWeeks}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Longest Streak
                    </Text>
                  </View>

                  <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                    <Text style={[styles.statNum, { color: colors.text }]}>
                      {profile.totalCheckIns}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Total Check-Ins
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* TAB 2: GOALS SETTING */}
            {/* ========================================================= */}
            {activeTab === 'goals' && (
              <View style={styles.tabSection}>
                <View style={styles.sectionHeaderIntro}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Set Your Attendance Goal
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                    Choose how often you intend to visit the YMCA each week. Completing your chosen days keeps your streak alive!
                  </Text>
                </View>

                {/* Goal Selection Cards */}
                <View style={styles.goalList}>
                  {GOAL_OPTIONS.map((opt) => {
                    const isSelected = selectedGoalDays === opt.days;
                    return (
                      <Pressable
                        key={opt.days}
                        onPress={() => void handleSaveGoal(opt.days)}
                        style={({ pressed }) => [
                          styles.goalOptionCard,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? '#1E3A8A'
                                : '#EFF6FF'
                              : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                            borderColor: isSelected ? colors.primary : colors.cardBorder,
                          },
                          pressed && { opacity: 0.85 },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={styles.goalOptionLeft}>
                          <View
                            style={[
                              styles.radioCircle,
                              {
                                borderColor: isSelected ? colors.primary : colors.textMuted,
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                              },
                            ]}
                          >
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.goalOptionTitle,
                                {
                                  color: isSelected ? colors.primary : colors.text,
                                  fontWeight: isSelected ? '800' : '600',
                                },
                              ]}
                            >
                              {opt.title}
                            </Text>
                            <Text style={[styles.goalOptionTag, { color: colors.textMuted }]}>
                              {opt.tag}
                            </Text>
                          </View>
                        </View>

                        {isSelected ? (
                          <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                            <Text style={styles.activePillText}>ACTIVE GOAL</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.goalTipCard, { backgroundColor: isDark ? '#142E1F' : '#F0FDF4', borderColor: '#86EFAC' }]}>
                  <Ionicons name="bulb-outline" size={20} color="#15803D" />
                  <Text style={[styles.goalTipText, { color: isDark ? '#86EFAC' : '#166534' }]}>
                    Tip: Most members start with 3 days per week to establish sustained momentum without burnout!
                  </Text>
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* TAB 3: STREAK HOLD / FREEZE (INJURY / TRAVEL) */}
            {/* ========================================================= */}
            {activeTab === 'hold' && (
              <View style={styles.tabSection}>
                <View style={styles.sectionHeaderIntro}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Streak Hold & Travel Freeze
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                    Going on vacation or recovering from an injury? Hold your streak so you don’t lose your fire while away!
                  </Text>
                </View>

                {/* If Currently Active Hold */}
                {profile.activeHold?.active ? (
                  <View style={[styles.activeHoldBox, { backgroundColor: '#F0F9FF', borderColor: '#38BDF8' }]}>
                    <View style={styles.activeHoldTop}>
                      <StreakFireEffect isFrozen={true} size="md" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activeHoldStatusBadge}>STREAK CURRENTLY PROTECTED</Text>
                        <Text style={styles.activeHoldReasonMain}>
                          {profile.activeHold.reasonLabel}
                        </Text>
                        <Text style={styles.activeHoldDate}>
                          Started: {profile.activeHold.startDate}
                        </Text>
                      </View>
                    </View>

                    {profile.activeHold.note ? (
                      <View style={styles.activeHoldNoteBox}>
                        <Text style={styles.activeHoldNoteText}>
                          Note: {profile.activeHold.note}
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      onPress={handleResumeHold}
                      disabled={isUpdatingHold}
                      style={[styles.resumeFullBtn, { backgroundColor: colors.primary }]}
                      accessibilityRole="button"
                      accessibilityLabel="Resume streak"
                    >
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={styles.resumeFullBtnText}>
                        {isUpdatingHold ? 'Resuming...' : 'I’m Back! Resume Streak'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  // Activate Hold Form
                  <View style={styles.holdForm}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>
                      Select Extraneous Circumstance Reason:
                    </Text>

                    <View style={styles.reasonsGrid}>
                      {HOLD_REASONS.map((r) => {
                        const meta = REASON_METADATA[r];
                        const isChosen = selectedHoldReason === r;
                        return (
                          <Pressable
                            key={r}
                            onPress={() => setSelectedHoldReason(r)}
                            style={[
                              styles.reasonChip,
                              {
                                backgroundColor: isChosen
                                  ? isDark
                                    ? '#1E3A8A'
                                    : '#E0F2FE'
                                  : isDark
                                  ? '#1E293B'
                                  : '#F8FAFC',
                                borderColor: isChosen ? '#0284C7' : colors.cardBorder,
                              },
                            ]}
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name={meta.icon as any}
                              size={18}
                              color={isChosen ? '#0284C7' : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.reasonChipText,
                                {
                                  color: isChosen ? '#0284C7' : colors.text,
                                  fontWeight: isChosen ? '700' : '500',
                                },
                              ]}
                            >
                              {meta.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={[styles.formLabel, { color: colors.text, marginTop: 14 }]}>
                      Optional Note / Return Timeframe:
                    </Text>
                    <TextInput
                      value={holdNote}
                      onChangeText={setHoldNote}
                      placeholder="e.g. Traveling until end of month or Physical therapy for shoulder"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.holdTextInput,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          borderColor: colors.cardBorder,
                          color: colors.text,
                        },
                      ]}
                      multiline={true}
                      numberOfLines={3}
                    />

                    <Pressable
                      onPress={handleActivateHold}
                      disabled={isUpdatingHold}
                      style={[styles.activateHoldBtn, { backgroundColor: '#0284C7' }]}
                      accessibilityRole="button"
                      accessibilityLabel="Activate streak hold"
                    >
                      <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.activateHoldBtnText}>
                        {isUpdatingHold ? 'Activating...' : 'Activate Streak Hold (Freeze Progress)'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Hold History */}
                {profile.holdHistory && profile.holdHistory.length > 0 ? (
                  <View style={styles.historyWrap}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Past Streak Holds:</Text>
                    {profile.holdHistory.map((h) => (
                      <View
                        key={h.id}
                        style={[
                          styles.historyRow,
                          { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder },
                        ]}
                      >
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyRowTitle, { color: colors.text }]}>
                            {h.reasonLabel} ({h.startDate})
                          </Text>
                          {h.note ? (
                            <Text style={[styles.historyRowNote, { color: colors.textMuted }]}>
                              "{h.note}"
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.historyRowBadge, { color: h.active ? '#0284C7' : colors.textMuted }]}>
                          {h.active ? 'ACTIVE' : 'COMPLETED'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}

            {/* ========================================================= */}
            {/* TAB 4: FIRE MILESTONE GALLERY (10, 30, 50, 70, 100) */}
            {/* ========================================================= */}
            {activeTab === 'milestones' && (
              <View style={styles.tabSection}>
                <View style={styles.sectionHeaderIntro}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Fire Milestone Progression
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                    Your flame changes color at 10, 30, 50, 70 and 100 weeks of meeting your weekly goal.
                  </Text>
                </View>

                {/* Milestone Cards List */}
                <View style={styles.milestonesList}>
                  {FLAME_MILESTONE_TIERS.map((tier) => {
                    const isCurrent =
                      profile.currentStreakWeeks >= tier.threshold &&
                      (tier.tier === FLAME_MILESTONE_TIERS.length - 1 ||
                        profile.currentStreakWeeks < FLAME_MILESTONE_TIERS[tier.tier + 1].threshold);
                    const isUnlocked = profile.currentStreakWeeks >= tier.threshold;

                    return (
                      <View
                        key={tier.tier}
                        style={[
                          styles.milestoneCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : tier.bgColor,
                            borderColor: isCurrent ? tier.fireColor : tier.borderColor,
                            borderWidth: isCurrent ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={styles.milestoneLeft}>
                          <StreakFireEffect tier={tier} size="md" />
                          <View style={{ flex: 1 }}>
                            <View style={styles.milestoneHeaderRow}>
                              <Text style={[styles.milestoneTierTitle, { color: tier.textColor }]}>
                                {tier.tierName}
                              </Text>
                              <View
                                style={[
                                  styles.thresholdPill,
                                  { backgroundColor: tier.fireColor },
                                ]}
                              >
                                <Text style={styles.thresholdPillText}>
                                  {tier.threshold === 0 ? 'START' : `${tier.threshold}+ WEEKS`}
                                </Text>
                              </View>
                            </View>

                            <Text style={[styles.milestoneRarity, { color: colors.text }]}>
                              {tier.rarityTitle}
                            </Text>
                            <Text style={[styles.milestoneDesc, { color: colors.textMuted }]}>
                              {tier.description}
                            </Text>
                          </View>
                        </View>

                        {/* Status / Quick Test Button */}
                        <View style={styles.milestoneFooterRow}>
                          {isCurrent ? (
                            <View style={[styles.currentTierIndicator, { backgroundColor: tier.fireColor }]}>
                              <Ionicons name="flame" size={12} color="#FFFFFF" />
                              <Text style={styles.currentTierIndicatorText}>YOUR CURRENT FLAME</Text>
                            </View>
                          ) : isUnlocked ? (
                            <View style={styles.unlockedIndicator}>
                              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                              <Text style={[styles.unlockedText, { color: colors.success }]}>
                                REACHED
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.lockedIndicator}>
                              <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                              <Text style={[styles.lockedText, { color: colors.textMuted }]}>
                                {tier.threshold - profile.currentStreakWeeks} weeks to go
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Done Bar */}
          <View style={[styles.bottomBar, { borderTopColor: colors.cardBorder }]}>
            <Pressable
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.doneBtnText}>Close & Return to Home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '75%',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  dragBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 2,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  tabBtnActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: '100%',
  },
  feedbackBanner: {
    marginHorizontal: spacing.lg,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  tabSection: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  sectionHeaderIntro: {
    gap: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Overview Hero
  heroCard: {
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTierBadge: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroTierBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroStreakNumber: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 62,
  },
  heroStreakLabel: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroDesc: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  nextMilestoneBox: {
    width: '100%',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nextMilestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextMilestoneTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextMilestoneWeeks: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3.5,
  },

  // Active Hold Hero Banner
  holdActiveHero: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  holdActiveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holdActiveTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#0369A1',
  },
  resumeMiniBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resumeMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  holdActiveReason: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  holdActiveNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#0284C7',
  },
  holdActiveSub: {
    fontSize: 11,
    color: '#475467',
  },

  // Weekly attendance card
  sectionCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionCardKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  adjustGoalLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  adjustGoalLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLetter: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  checkInActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkInActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Goals Tab
  goalList: {
    gap: spacing.sm,
  },
  goalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  goalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  goalOptionTitle: {
    fontSize: 15,
  },
  goalOptionTag: {
    fontSize: 12,
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  goalTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  goalTipText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    fontWeight: '600',
  },

  // Hold Tab
  activeHoldBox: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  activeHoldTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeHoldStatusBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#0284C7',
  },
  activeHoldReasonMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  activeHoldDate: {
    fontSize: 12,
    color: '#475467',
  },
  activeHoldNoteBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  activeHoldNoteText: {
    fontSize: 13,
    color: '#0369A1',
  },
  resumeFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resumeFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  holdForm: {
    gap: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  reasonChipText: {
    fontSize: 12,
  },
  holdTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  activateHoldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  activateHoldBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historyWrap: {
    marginTop: spacing.md,
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyRowTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyRowNote: {
    fontSize: 11,
    marginTop: 2,
  },
  historyRowBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Milestones Tab
  milestonesList: {
    gap: spacing.md,
  },
  milestoneCard: {
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  milestoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneTierTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  thresholdPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  thresholdPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  milestoneRarity: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  milestoneDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  milestoneFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 8,
  },
  currentTierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentTierIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unlockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlockedText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  testFlameBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  testFlameBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Bottom Done Bar
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
