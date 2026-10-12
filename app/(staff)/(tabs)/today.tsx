import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ClassAttendanceModal } from '@/components/ClassAttendanceModal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import {
  isAdminRole,
  type AnnouncementCategory,
  type AnnouncementPriority,
  type CancelRequest,
  type ClientFitnessGoal,
  type Member,
  type PrivateLesson,
  type ScheduleItem,
  type Staff,
} from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { lessonRepo } from '@/repositories/lessonRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function formatClassTime(isoStart: string): string {
  try {
    return new Date(isoStart).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoStart;
  }
}

type ClassWithRoster = {
  item: ScheduleItem;
  roster: Member[];
};

type ClientWithGoal = {
  member: Member;
  goal: ClientFitnessGoal | null;
};

export default function StaffTodayScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const staffId = session?.userId ?? '';
  const isAdmin = isAdminRole(session?.role);
  const isTrainer = session?.role === 'trainer' || (!isAdmin && session?.role === 'staff');

  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [classes, setClasses] = useState<ClassWithRoster[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [lessonMembers, setLessonMembers] = useState<Record<string, Member>>({});
  const [assignedClients, setAssignedClients] = useState<ClientWithGoal[]>([]);
  const [cancels, setCancels] = useState<CancelRequest[]>([]);
  const [cancelMembers, setCancelMembers] = useState<Record<string, Member>>({});
  const [error, setError] = useState(false);

  // Trainer Interactive Modals
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [selectedWorkoutMember, setSelectedWorkoutMember] = useState<Member | null>(null);

  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<ScheduleItem | null>(null);

  const [addSlotModalVisible, setAddSlotModalVisible] = useState(false);
  const [slotDate, setSlotDate] = useState('2026-09-16');
  const [slotStart, setSlotStart] = useState('11:00');
  const [slotEnd, setSlotEnd] = useState('12:00');
  const [slotLocation, setSlotLocation] = useState('Wellness Studio A');
  const [addingSlot, setAddingSlot] = useState(false);

  // Pick client for standalone workout logging
  const [clientPickerModalVisible, setClientPickerModalVisible] = useState(false);

  // Admin Broadcast announcement modal
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>('facility');
  const [annPriority, setAnnPriority] = useState<AnnouncementPriority>('normal');
  const [annPopup, setAnnPopup] = useState(false);
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [annError, setAnnError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const [profile, allClasses, pending, dayLessons, assignedList] = await Promise.all([
        api.getStaff(staffId).catch(() => null),
        isAdmin
          ? scheduleRepo.listAll(api, BRANCH_ID)
          : scheduleRepo.getStaffDay(api, staffId, today),
        api.listPendingCancels(BRANCH_ID),
        lessonRepo.listStaffDay(api, staffId, today),
        api.listAssignedMembers(staffId).catch(() => []),
      ]);

      setStaffProfile(profile);

      const dayClasses = isAdmin
        ? allClasses.filter((c) => c.start.slice(0, 10) === today)
        : allClasses;

      dayClasses.sort((a, b) => a.start.localeCompare(b.start));
      dayLessons.sort((a, b) => a.start.localeCompare(b.start));

      const withRosters = await Promise.all(
        dayClasses.map(async (item) => ({
          item,
          roster: await registrationRepo.roster(api, item.id),
        }))
      );
      setClasses(withRosters);
      setLessons(dayLessons);

      const lessonMemberIds = [...new Set(dayLessons.map((l) => l.memberId))];
      const lessonMemberList = await Promise.all(
        lessonMemberIds.map((id) => api.getMember(id))
      );
      const lessonById: Record<string, Member> = {};
      for (const m of lessonMemberList) {
        lessonById[m.id] = m;
      }
      setLessonMembers(lessonById);

      // Fetch goals for assigned clients
      const clientsWithGoals: ClientWithGoal[] = await Promise.all(
        assignedList.map(async (member) => {
          const goal = await trainerRepo.getClientFitnessGoal(api, member.id).catch(() => null);
          return { member, goal };
        })
      );
      setAssignedClients(clientsWithGoals);

      const members = await Promise.all(pending.map((c) => api.getMember(c.memberId)));
      const byId: Record<string, Member> = {};
      for (const m of members) {
        byId[m.id] = m;
      }
      setCancels(pending);
      setCancelMembers(byId);
    } catch {
      setError(true);
    }
  }, [api, staffId, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Lesson status handling
  const handleMarkLessonStatus = async (
    lessonId: string,
    status: 'booked' | 'completed' | 'no_show',
    notes?: string
  ) => {
    try {
      await trainerRepo.markLessonStatus(api, lessonId, status, notes);
      await load();
      if (status === 'completed') {
        dialog.alert('Session Completed', 'Private lesson status marked as completed.', [{ text: 'OK' }], 'checkmark');
      }
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not update lesson status.');
    }
  };

  const handleCompleteAndLogWorkout = (lesson: PrivateLesson) => {
    const member = lessonMembers[lesson.memberId] ?? null;
    void handleMarkLessonStatus(lesson.id, 'completed', 'Completed 1-on-1 private lesson session.');
    if (member) {
      setSelectedWorkoutMember(member);
      setWorkoutModalVisible(true);
    }
  };

  const handleOpenClientMessage = async (memberId: string) => {
    try {
      const thread = await api.getOrCreateThread(memberId, staffId);
      router.push(`/(staff)/messages/${thread.id}`);
    } catch {
      dialog.alert('Error', 'Could not open message thread.');
    }
  };

  const handleAddSlot = async () => {
    if (!slotStart || !slotEnd) return;
    setAddingSlot(true);
    try {
      const startIso = `${slotDate}T${slotStart}:00-04:00`;
      const endIso = `${slotDate}T${slotEnd}:00-04:00`;
      await api.addLessonSlot({
        staffId,
        branchId: BRANCH_ID,
        start: startIso,
        end: endIso,
        location: slotLocation.trim(),
      });
      setAddSlotModalVisible(false);
      dialog.alert('Availability Slot Added', 'Clients can now book this private training time.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to add lesson slot.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleBroadcastAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      setAnnError('Please provide both a title and message body.');
      return;
    }
    setAnnSubmitting(true);
    setAnnError(null);
    try {
      const me = await api.getStaff(staffId);
      await announcementRepo.create(api, {
        branchId: BRANCH_ID,
        title: annTitle.trim(),
        body: annBody.trim(),
        category: annCategory,
        priority: annPriority,
        authorName: `${me.name} (${me.roleLabel || 'Staff'})`,
        pinned: annPriority === 'high',
        popupNotice: annPopup,
      });
      setBroadcastModalVisible(false);
      setAnnTitle('');
      setAnnBody('');
      setAnnPopup(false);
      dialog.alert(
        'Notice Broadcasted!',
        annPopup
          ? 'Notice published and configured to pop up when members open the app!'
          : 'Your announcement was published to the branch board and an in-app alert dispatched.',
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (err: any) {
      setAnnError(err?.message || 'Could not broadcast announcement.');
    } finally {
      setAnnSubmitting(false);
    }
  };

  const todayLabel = formatShortDate(getDemoToday());
  const completedTodayCount = lessons.filter((l) => l.status === 'completed').length;

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle={isTrainer && !isAdmin ? 'Personal Trainer Command Center' : 'Staff Today & Notices'} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ========================================================= */}
        {/* PERSONAL TRAINER HERO & KPI DASHBOARD                     */}
        {/* ========================================================= */}
        {isTrainer && !isAdmin ? (
          <View style={[styles.trainerHeroCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <UserAvatar uri={staffProfile?.avatarUrl} name={staffProfile?.name ?? 'Trainer'} size={50} />
                <View>
                  <Text style={[styles.coachGreeting, { color: tc.text }]}>
                    Coach {staffProfile?.name?.split(' ')[0] ?? 'Trainer'}
                  </Text>
                  <Text style={[styles.coachSub, { color: tc.textMuted }]}>
                    {staffProfile?.roleLabel ?? 'Personal Wellness Trainer'} · YMCA Silver Spring
                  </Text>
                </View>
              </View>
              <View style={styles.certifiedBadge}>
                <Ionicons name="barbell" size={14} color="#15803D" />
                <Text style={styles.certifiedBadgeText}>COACH</Text>
              </View>
            </View>

            {/* Quick KPI Stats Row */}
            <View style={[styles.kpiRow, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: tc.cardBorder }]}>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: colors.primary }]}>{lessons.length}</Text>
                <Text style={[styles.kpiLabel, { color: tc.textMuted }]}>1-on-1 Today</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: '#0284C7' }]}>{classes.length}</Text>
                <Text style={[styles.kpiLabel, { color: tc.textMuted }]}>Classes to Teach</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: '#15803D' }]}>{assignedClients.length}</Text>
                <Text style={[styles.kpiLabel, { color: tc.textMuted }]}>Assigned Clients</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: '#D97706' }]}>{completedTodayCount}</Text>
                <Text style={[styles.kpiLabel, { color: tc.textMuted }]}>Done Today</Text>
              </View>
            </View>

            {/* Quick Actions Bar for Trainers */}
            <View style={styles.quickActionsBar}>
              <Pressable
                onPress={() => {
                  if (assignedClients.length === 1) {
                    setSelectedWorkoutMember(assignedClients[0].member);
                    setWorkoutModalVisible(true);
                  } else {
                    setClientPickerModalVisible(true);
                  }
                }}
                style={[styles.quickActionPill, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Log Client Workout"
              >
                <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
                <Text style={styles.quickActionPillText}>+ Log Workout</Text>
              </Pressable>

              <Pressable
                onPress={() => setAddSlotModalVisible(true)}
                style={[styles.quickActionPill, { backgroundColor: '#15803D' }]}
                accessibilityRole="button"
                accessibilityLabel="Add Available Slot"
              >
                <Ionicons name="time-outline" size={16} color="#FFFFFF" />
                <Text style={styles.quickActionPillText}>+ Open Slot</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(staff)/messages')}
                style={[styles.quickActionPill, { backgroundColor: '#0284C7' }]}
                accessibilityRole="button"
                accessibilityLabel="Client Messages"
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#FFFFFF" />
                <Text style={styles.quickActionPillText}>Messages</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(member)/community-forum')}
                style={[styles.quickActionPill, { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderWidth: 1, borderColor: tc.cardBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Community Forum"
              >
                <Ionicons name="people-outline" size={16} color={tc.text} />
                <Text style={[styles.quickActionPillText, { color: tc.text }]}>Forum</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* ADMIN DASHBOARD HEADER (FOR DIRECTORS & IT ADMINS)       */}
        {/* ========================================================= */}
        {isAdmin ? (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <Pressable
              onPress={() => setBroadcastModalVisible(true)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                },
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="megaphone" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    + Broadcast Notice to Members
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 1 }}>
                    Send push alert & notice for pool, schedules, or events
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => router.push('/(staff)/announcements')}
                style={[styles.adminNavBtn, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, flex: 1 }]}
              >
                <Ionicons name="newspaper-outline" size={15} color={colors.primary} />
                <Text style={[styles.adminNavText, { color: colors.primary }]}>Notices</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(staff)/surveys')}
                style={[styles.adminNavBtn, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, flex: 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Staff Member Surveys & Polls"
              >
                <Ionicons name="stats-chart-outline" size={15} color={colors.primary} />
                <Text style={[styles.adminNavText, { color: colors.primary }]}>Surveys</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(staff)/schedules')}
                style={[styles.adminNavBtn, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, flex: 1 }]}
              >
                <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                <Text style={[styles.adminNavText, { color: colors.primary }]}>Schedules</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(staff)/staff-management')}
                style={[styles.adminNavBtn, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, flex: 1 }]}
              >
                <Ionicons name="people-outline" size={15} color={colors.primary} />
                <Text style={[styles.adminNavText, { color: colors.primary }]}>Staff</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* TODAY'S PRIVATE LESSONS (1-ON-1 SESSIONS)                */}
        {/* ========================================================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="body" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]} allowFontScaling>
              {isAdmin ? 'Private Lessons Today' : 'My 1-on-1 Sessions Today'}
            </Text>
          </View>
          <Text style={[styles.sectionBadgeDate, { color: tc.textMuted }]}>{todayLabel}</Text>
        </View>

        {lessons.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Ionicons name="calendar-outline" size={28} color={tc.textMuted} />
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              No private 1-on-1 sessions scheduled for today.
            </Text>
            {isTrainer ? (
              <Pressable
                onPress={() => setAddSlotModalVisible(true)}
                style={styles.addSlotEmptyBtn}
              >
                <Text style={styles.addSlotEmptyText}>+ Open an Available Lesson Slot</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          lessons.map((lesson) => {
            const member = lessonMembers[lesson.memberId];
            const isCompleted = lesson.status === 'completed';
            const isNoShow = lesson.status === 'no_show';

            return (
              <View
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  {
                    backgroundColor: isCompleted
                      ? isDark
                        ? '#064E3B'
                        : '#F0FDF4'
                      : isNoShow
                      ? isDark
                        ? '#7F1D1D'
                        : '#FEF2F2'
                      : tc.cardBg,
                    borderColor: isCompleted
                      ? '#15803D'
                      : isNoShow
                      ? colors.scarlet
                      : tc.cardBorder,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <UserAvatar uri={member?.avatarUrl} name={member?.name ?? 'Member'} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lessonClientName, { color: tc.text }]}>
                        {member?.name ?? 'Client'}
                      </Text>
                      <Text style={[styles.lessonTimeRow, { color: colors.primary }]}>
                        {formatClassTime(lesson.start)} – {formatClassTime(lesson.end)} · {lesson.location}
                      </Text>
                      <Text style={[styles.lessonMeta, { color: tc.textMuted }]}>
                        Member ID: {member?.membershipId || 'Active'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isCompleted
                          ? '#DCFCE7'
                          : isNoShow
                          ? '#FEE2E2'
                          : '#EFF6FF',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: isCompleted
                            ? '#15803D'
                            : isNoShow
                            ? colors.scarlet
                            : colors.primaryDark,
                        },
                      ]}
                    >
                      {lesson.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {lesson.notes ? (
                  <View style={[styles.notesSnippet, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={{ fontSize: 12, color: tc.textMuted, fontStyle: 'italic' }}>
                      "{lesson.notes}"
                    </Text>
                  </View>
                ) : null}

                {/* Trainer Action Buttons for this session */}
                <View style={styles.lessonActionRow}>
                  {!isCompleted ? (
                    <Pressable
                      onPress={() => handleCompleteAndLogWorkout(lesson)}
                      style={[styles.lessonActionBtn, { backgroundColor: '#15803D', flex: 1.6 }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.lessonActionBtnText}>Complete & Log Workout</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        if (member) {
                          setSelectedWorkoutMember(member);
                          setWorkoutModalVisible(true);
                        }
                      }}
                      style={[styles.lessonActionBtn, { backgroundColor: '#15803D', flex: 1.2 }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="barbell" size={16} color="#FFFFFF" />
                      <Text style={styles.lessonActionBtnText}>+ Log Workout</Text>
                    </Pressable>
                  )}

                  {!isCompleted && !isNoShow ? (
                    <Pressable
                      onPress={() => void handleMarkLessonStatus(lesson.id, 'no_show', 'Client did not attend session.')}
                      style={[styles.lessonActionBtnOutline, { borderColor: tc.cardBorder }]}
                      accessibilityRole="button"
                    >
                      <Text style={{ fontSize: 12, color: colors.scarlet, fontWeight: '700' }}>No-Show</Text>
                    </Pressable>
                  ) : null}

                  {isNoShow ? (
                    <Pressable
                      onPress={() => void handleMarkLessonStatus(lesson.id, 'booked')}
                      style={[styles.lessonActionBtnOutline, { borderColor: tc.cardBorder }]}
                    >
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>Reset</Text>
                    </Pressable>
                  ) : null}

                  {member ? (
                    <Pressable
                      onPress={() => void handleOpenClientMessage(member.id)}
                      style={[styles.lessonActionBtnIcon, { borderColor: tc.cardBorder }]}
                      accessibilityRole="button"
                      accessibilityLabel="Message client"
                    >
                      <Ionicons name="chatbubble" size={15} color={colors.primary} />
                    </Pressable>
                  ) : null}

                  {member ? (
                    <Pressable
                      onPress={() => router.push(`/(staff)/members/${member.id}`)}
                      style={[styles.lessonActionBtnIcon, { borderColor: tc.cardBorder }]}
                      accessibilityRole="button"
                      accessibilityLabel="View client profile and goals"
                    >
                      <Ionicons name="person" size={15} color={colors.primary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        {/* ========================================================= */}
        {/* TODAY'S GROUP CLASSES & WORKSHOPS                        */}
        {/* ========================================================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]} allowFontScaling>
              {isAdmin ? 'Branch Classes Today' : 'My Classes Today'}
            </Text>
          </View>
          <Text style={[styles.sectionBadgeDate, { color: tc.textMuted }]}>{todayLabel}</Text>
        </View>

        {classes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Ionicons name="barbell-outline" size={28} color={tc.textMuted} />
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              No group fitness classes on your schedule today.
            </Text>
          </View>
        ) : (
          classes.map(({ item, roster }) => (
            <View
              key={item.id}
              style={[
                styles.classCard,
                { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
              ]}
            >
              <View style={styles.classRow}>
                <View style={styles.classTimeBox}>
                  <Text style={styles.classTime} allowFontScaling>
                    {formatClassTime(item.start)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.primaryDark, fontWeight: '600' }}>
                    {item.location}
                  </Text>
                </View>

                <View style={styles.classBody}>
                  <Text style={[styles.classTitle, { color: tc.text }]} allowFontScaling>
                    {item.title}
                  </Text>
                  <Text style={[styles.classMeta, { color: tc.textMuted }]} allowFontScaling>
                    Instructor: {item.instructorName} · Cap: {item.capacity}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={styles.rosterPill}>
                      <Ionicons name="checkmark-done" size={13} color="#15803D" />
                      <Text style={styles.rosterPillText}>
                        {roster.length} registered
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Take Attendance Button */}
              <Pressable
                onPress={() => {
                  setSelectedAttendanceClass(item);
                  setAttendanceModalVisible(true);
                }}
                style={styles.attendanceActionBtn}
                accessibilityRole="button"
                accessibilityLabel={`Take attendance for ${item.title}`}
              >
                <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />
                <Text style={styles.attendanceActionText}>Take Attendance & Check-In</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))
        )}

        {/* ========================================================= */}
        {/* MY ASSIGNED CLIENTS WORKSPACE (TRAINER VIEW)              */}
        {/* ========================================================= */}
        {isTrainer && assignedClients.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: tc.text }]} allowFontScaling>
                  My Assigned Clients ({assignedClients.length})
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(staff)/members')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>View All ›</Text>
              </Pressable>
            </View>

            {assignedClients.map(({ member, goal }) => (
              <View
                key={member.id}
                style={[
                  styles.clientCard,
                  { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <UserAvatar uri={member.avatarUrl} name={member.name} size={48} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.clientName, { color: tc.text }]}>{member.name}</Text>
                      <View style={styles.activeClientPill}>
                        <Text style={styles.activeClientPillText}>CLIENT</Text>
                      </View>
                    </View>
                    <Text style={[styles.clientSub, { color: tc.textMuted }]}>
                      {member.membershipId} · {member.email}
                    </Text>

                    {goal ? (
                      <View style={[styles.clientGoalBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="flag" size={13} color={colors.primary} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                            Primary Goal:
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: tc.text, marginTop: 2 }} numberOfLines={2}>
                          {goal.primaryGoal}
                        </Text>
                        {goal.currentWeightLbs && goal.targetWeightLbs ? (
                          <Text style={{ fontSize: 11, color: tc.textMuted, marginTop: 3 }}>
                            Weight Target: {goal.currentWeightLbs} lbs → {goal.targetWeightLbs} lbs
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: tc.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                        No fitness goals logged yet. Tap below to establish client baseline.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Quick Client Actions */}
                <View style={styles.clientQuickBtnRow}>
                  <Pressable
                    onPress={() => {
                      setSelectedWorkoutMember(member);
                      setWorkoutModalVisible(true);
                    }}
                    style={[styles.clientActionBtn, { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="barbell" size={14} color="#FFFFFF" />
                    <Text style={styles.clientActionBtnText}>+ Log Workout</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleOpenClientMessage(member.id)}
                    style={[styles.clientActionBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubbles" size={14} color={colors.primary} />
                    <Text style={[styles.clientActionBtnText, { color: colors.primary }]}>Chat</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/(staff)/members/${member.id}`)}
                    style={[styles.clientActionBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="fitness" size={14} color={colors.primary} />
                    <Text style={[styles.clientActionBtnText, { color: colors.primary }]}>Goals & Logs</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* PENDING CANCELLATIONS (ADMIN ONLY)                       */}
        {/* ========================================================= */}
        {isAdmin ? (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.sectionTitle, styles.sectionGap, { color: tc.text }]} allowFontScaling>
              Pending cancellations ({cancels.length})
            </Text>
            {cancels.length === 0 ? (
              <Text style={[styles.empty, { color: tc.textMuted }]} allowFontScaling>
                No pending cancel requests.
              </Text>
            ) : (
              cancels.map((cancel) => {
                const member = cancelMembers[cancel.memberId];
                return (
                  <View
                    key={cancel.id}
                    style={[
                      styles.cancelCard,
                      { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cancelName, { color: tc.text }]} allowFontScaling>
                          {member?.name ?? 'Member'}
                        </Text>
                        <Text style={[styles.cancelMeta, { color: tc.textMuted }]} allowFontScaling>
                          Requested {formatShortDate(cancel.requestedAt)} · access through{' '}
                          {formatShortDate(cancel.accessThrough)}
                        </Text>
                        <Text style={[styles.cancelReason, { color: tc.text }]} allowFontScaling>
                          Reason: "{cancel.reason}"
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ========================================================= */}
      {/* WORKOUT LOGGING MODAL                                    */}
      {/* ========================================================= */}
      <TrainerClientWorkoutModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        member={selectedWorkoutMember}
        onSaved={() => void load()}
      />

      {/* ========================================================= */}
      {/* CLASS ATTENDANCE & CHECK-IN MODAL                        */}
      {/* ========================================================= */}
      <ClassAttendanceModal
        visible={attendanceModalVisible}
        onClose={() => setAttendanceModalVisible(false)}
        scheduleItem={selectedAttendanceClass}
        onAttendanceChanged={() => void load()}
      />

      {/* ========================================================= */}
      {/* ADD AVAILABLE LESSON SLOT MODAL                          */}
      {/* ========================================================= */}
      <Modal visible={addSlotModalVisible} animationType="fade" transparent onRequestClose={() => setAddSlotModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: tc.text }}>
                  Add Lesson Availability
                </Text>
              </View>
              <Pressable onPress={() => setAddSlotModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={tc.textMuted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: tc.textMuted, marginBottom: 10 }}>
              Create an open 1-on-1 time slot on your calendar so clients can book directly.
            </Text>

            <TextField
              label="Date (YYYY-MM-DD)"
              value={slotDate}
              onChangeText={setSlotDate}
              placeholder="2026-09-16"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Start Time (HH:MM)"
                  value={slotStart}
                  onChangeText={setSlotStart}
                  placeholder="11:00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="End Time (HH:MM)"
                  value={slotEnd}
                  onChangeText={setSlotEnd}
                  placeholder="12:00"
                />
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <TextField
                label="Location / Studio"
                value={slotLocation}
                onChangeText={setSlotLocation}
                placeholder="Wellness Studio A"
              />
            </View>

            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                title="Publish Availability Slot"
                onPress={() => void handleAddSlot()}
                loading={addingSlot}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* CLIENT PICKER MODAL (FOR STANDALONE WORKOUT LOG)         */}
      {/* ========================================================= */}
      <Modal visible={clientPickerModalVisible} animationType="slide" transparent onRequestClose={() => setClientPickerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: tc.text }}>
                Choose Client to Log Workout
              </Text>
              <Pressable onPress={() => setClientPickerModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={tc.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              {assignedClients.map(({ member }) => (
                <Pressable
                  key={member.id}
                  onPress={() => {
                    setSelectedWorkoutMember(member);
                    setClientPickerModalVisible(false);
                    setWorkoutModalVisible(true);
                  }}
                  style={[styles.clientPickRow, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: tc.cardBorder }]}
                >
                  <UserAvatar uri={member.avatarUrl} name={member.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: tc.text }}>{member.name}</Text>
                    <Text style={{ fontSize: 12, color: tc.textMuted }}>{member.membershipId} · {member.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* ADMIN BROADCAST NOTICE MODAL                             */}
      {/* ========================================================= */}
      <Modal visible={broadcastModalVisible} transparent animationType="fade" onRequestClose={() => setBroadcastModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="megaphone" size={22} color={colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: tc.text }}>Broadcast Member Notice</Text>
              </View>
              <Pressable onPress={() => setBroadcastModalVisible(false)} disabled={annSubmitting} hitSlop={8}>
                <Ionicons name="close" size={24} color={tc.textMuted} />
              </Pressable>
            </View>

            {annError ? <ErrorBanner message={annError} /> : null}

            <ScrollView style={{ maxHeight: 420 }}>
              <TextField label="Notice Title *" value={annTitle} onChangeText={setAnnTitle} placeholder="e.g. Lap Pool Lanes 1-3 Maintenance" />
              <TextField label="Announcement Details *" value={annBody} onChangeText={setAnnBody} placeholder="Provide details..." multiline numberOfLines={4} />

              <Pressable
                onPress={() => setAnnPopup(!annPopup)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 10,
                  padding: 10,
                  borderRadius: radii.sm,
                  backgroundColor: annPopup ? '#FEF2F2' : isDark ? '#1F2937' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: annPopup ? colors.scarlet : tc.border,
                }}
              >
                <Ionicons
                  name={annPopup ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={annPopup ? colors.scarlet : tc.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: annPopup ? colors.scarlet : tc.text }}>
                    Pop-up Notice on App Open
                  </Text>
                  <Text style={{ fontSize: 12, color: tc.textMuted, marginTop: 2 }}>
                    Displays as an instant modal alert when members open the app.
                  </Text>
                </View>
              </Pressable>

              <View style={{ marginTop: 14 }}>
                <PrimaryButton title="Publish Notice & Alert Members" onPress={() => void handleBroadcastAnnouncement()} loading={annSubmitting} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  trainerHeroCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 12,
    ...cardStyle,
  },
  coachGreeting: {
    fontSize: 18,
    fontWeight: '800',
  },
  coachSub: {
    fontSize: 12,
    marginTop: 1,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  certifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  kpiItem: {
    alignItems: 'center',
    flex: 1,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  quickActionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  adminNavText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 17,
  },
  sectionBadgeDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionGap: {
    marginTop: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  addSlotEmptyBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addSlotEmptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  lessonCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
    gap: 10,
    ...cardStyle,
  },
  lessonClientName: {
    fontSize: 16,
    fontWeight: '800',
  },
  lessonTimeRow: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  lessonMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notesSnippet: {
    padding: 8,
    borderRadius: 6,
  },
  lessonActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  lessonActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  lessonActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lessonActionBtnOutline: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  lessonActionBtnIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  classCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    ...cardStyle,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  classTimeBox: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  classTime: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  classBody: {
    flex: 1,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  classMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  rosterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rosterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  attendanceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  attendanceActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 8,
  },
  clientCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
    ...cardStyle,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '800',
  },
  clientSub: {
    fontSize: 12,
    marginTop: 1,
  },
  activeClientPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeClientPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  clientGoalBox: {
    padding: 8,
    borderRadius: radii.sm,
    marginTop: 6,
  },
  clientQuickBtnRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 8,
  },
  clientActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  clientActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelCard: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 6,
  },
  cancelName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelMeta: {
    fontSize: 12,
  },
  cancelReason: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  empty: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    ...cardStyle,
  },
  clientPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
});
