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

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import { isAdminRole, type AnnouncementCategory, type AnnouncementPriority, type CancelRequest, type Member, type PrivateLesson, type ScheduleItem } from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { lessonRepo } from '@/repositories/lessonRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ClassWithRoster = {
  item: ScheduleItem;
  roster: Member[];
};

export default function StaffTodayScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const staffId = session?.userId ?? '';
  const isAdmin = isAdminRole(session?.role);
  const isTrainer = session?.role === 'trainer';

  const [classes, setClasses] = useState<ClassWithRoster[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [lessonMembers, setLessonMembers] = useState<Record<string, Member>>({});
  const [cancels, setCancels] = useState<CancelRequest[]>([]);
  const [cancelMembers, setCancelMembers] = useState<Record<string, Member>>({});
  const [error, setError] = useState(false);

  // Broadcast announcement modal
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>('facility');
  const [annPriority, setAnnPriority] = useState<AnnouncementPriority>('normal');
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [annError, setAnnError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const [allClasses, pending, dayLessons] = await Promise.all([
        isAdmin
          ? scheduleRepo.listAll(api, BRANCH_ID)
          : scheduleRepo.getStaffDay(api, staffId, today),
        api.listPendingCancels(BRANCH_ID),
        lessonRepo.listStaffDay(api, staffId, today),
      ]);

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
      });
      setBroadcastModalVisible(false);
      setAnnTitle('');
      setAnnBody('');
      dialog.alert(
        'Notice Broadcasted!',
        'Your announcement was published to the branch board and an in-app push alert was dispatched to all members.',
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (err: any) {
      setAnnError(err?.message || 'Could not broadcast announcement.');
    } finally {
      setAnnSubmitting(false);
    }
  };

  async function handleApproveCancel(cancel: CancelRequest) {
    try {
      await api.updateMembershipAdmin(cancel.memberId, { status: 'cancelled' });
      dialog.alert('Cancelled', 'Membership cancellation has been processed.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not process cancellation.', [{ text: 'OK' }]);
    }
  }

  async function handleRescindCancel(cancel: CancelRequest) {
    try {
      await api.rescindCancelNotice(cancel.memberId);
      dialog.alert('Restored', 'Cancellation rescinded and membership kept active.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not rescind cancellation.', [{ text: 'OK' }]);
    }
  }

  const todayLabel = formatShortDate(getDemoToday());

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Staff Today & Notices" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Action Shortcuts */}
        <View style={{ gap: 8, marginBottom: 16 }}>
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
                ...Platform.select({
                  ios: {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 3,
                  },
                  default: {},
                }),
              },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Broadcast Facility Notice or Alert to Members"
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

          {/* General Community Forum for Staff */}
          <Pressable
            onPress={() => router.push('/(member)/community-forum')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: radii.md,
              backgroundColor: tc.cardBg,
              borderWidth: 1,
              borderColor: tc.cardBorder,
              gap: 12,
            }}
            accessibilityRole="button"
            accessibilityLabel="Open General Community Forum & Staff Inquiries"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                    General Community Forum
                  </Text>
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>@ STAFF DESK</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: tc.textMuted, marginTop: 1 }}>
                  Answer member inquiries, share fitness tips, and pin announcements
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>

          {isAdmin ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => router.push('/(staff)/announcements')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: radii.sm,
                  backgroundColor: tc.cardBg,
                  borderWidth: 1,
                  borderColor: tc.cardBorder,
                }}
              >
                <Ionicons name="newspaper-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                  Manage Notices
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(staff)/schedules')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: radii.sm,
                  backgroundColor: tc.cardBg,
                  borderWidth: 1,
                  borderColor: tc.cardBorder,
                }}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                  Manage Schedules
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: tc.text }]} allowFontScaling>
          {isAdmin ? 'Branch Classes Today' : 'My Classes Today'} · {todayLabel}
        </Text>
        {classes.length === 0 ? (
          <Text style={[styles.empty, { color: tc.textMuted }]} allowFontScaling>
            No classes on your schedule today.
          </Text>
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
                <Text style={styles.classTime} allowFontScaling>
                  {formatClassTime(item.start)}
                </Text>
                <View style={styles.classBody}>
                  <Text style={[styles.classTitle, { color: tc.text }]} allowFontScaling>
                    {item.title}
                  </Text>
                  <Text style={[styles.classMeta, { color: tc.textMuted }]} allowFontScaling>
                    {item.instructorName} · {item.location}
                  </Text>
                  <Text style={[styles.rosterCount, { color: tc.text }]} allowFontScaling>
                    {roster.length} registered
                    {roster.length > 0
                      ? ` · ${roster.map((m) => m.name).join(', ')}`
                      : ''}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.sectionGap, { color: tc.text }]} allowFontScaling>
          {isAdmin ? 'Private Lessons Today' : 'My Private Lessons'} · {todayLabel}
        </Text>
        {lessons.length === 0 ? (
          <Text style={[styles.empty, { color: tc.textMuted }]} allowFontScaling>
            No private lessons today.
          </Text>
        ) : (
          lessons.map((lesson) => (
            <View
              key={lesson.id}
              style={[
                styles.classCard,
                { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
              ]}
            >
              <Text style={styles.classTime} allowFontScaling>
                {formatClassTime(lesson.start)}
              </Text>
              <Text style={[styles.classTitle, { color: tc.text }]} allowFontScaling>
                {lessonMembers[lesson.memberId]?.name ?? 'Member'}
              </Text>
              <Text style={[styles.classMeta, { color: tc.textMuted }]} allowFontScaling>
                {lesson.location}
              </Text>
            </View>
          ))
        )}

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

                {isAdmin ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Pressable
                      onPress={() => void handleRescindCancel(cancel)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: '#15803D',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Keep / Retain</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleApproveCancel(cancel)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: colors.scarlet,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Approve Cancel</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Broadcast Community Announcement Modal */}
      <Modal
        visible={broadcastModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!annSubmitting) setBroadcastModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: tc.cardBg,
              borderColor: tc.cardBorder,
              borderWidth: 1,
              borderRadius: radii.lg,
              padding: 20,
              ...cardStyle,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="megaphone" size={22} color={colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: tc.text }}>
                  Broadcast Member Notice
                </Text>
              </View>
              <Pressable
                onPress={() => setBroadcastModalVisible(false)}
                disabled={annSubmitting}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>

            {annError ? <ErrorBanner message={annError} /> : null}

            <ScrollView style={{ maxHeight: 420 }}>
              <TextField
                label="Notice Title *"
                value={annTitle}
                onChangeText={setAnnTitle}
                placeholder="e.g. Lap Pool Lanes 1-3 Maintenance"
              />

              <TextField
                label="Announcement Details *"
                value={annBody}
                onChangeText={setAnnBody}
                placeholder="Provide details about schedule adjustments, events, or branch information..."
                multiline
                numberOfLines={4}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: tc.text, marginTop: 10, marginBottom: 6 }}>
                Category
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[
                  { key: 'facility', label: 'Facility' },
                  { key: 'event', label: 'Event' },
                  { key: 'program', label: 'Program' },
                  { key: 'community', label: 'Community' },
                ].map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => setAnnCategory(c.key as AnnouncementCategory)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: annCategory === c.key ? colors.primary : tc.border,
                      backgroundColor: annCategory === c.key ? colors.primaryLight : tc.cardBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: annCategory === c.key ? colors.primary : tc.text,
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ fontSize: 13, fontWeight: '700', color: tc.text, marginBottom: 6 }}>
                Priority
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <Pressable
                  onPress={() => setAnnPriority('normal')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: annPriority === 'normal' ? colors.primary : tc.border,
                    backgroundColor: annPriority === 'normal' ? colors.primaryLight : tc.cardBg,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: annPriority === 'normal' ? colors.primary : tc.text }}>
                    Standard Notice
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAnnPriority('high')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: annPriority === 'high' ? colors.gold : tc.border,
                    backgroundColor: annPriority === 'high' ? colors.goldBg : tc.cardBg,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: annPriority === 'high' ? '#B45309' : tc.text }}>
                    High Alert / Pinned
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                title="Broadcast & Notify All Members"
                onPress={() => void handleBroadcastAnnouncement()}
                loading={annSubmitting}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: 10,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.nearBlack,
  },
  sectionGap: {
    marginTop: 20,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
  },
  classCard: {
    ...cardStyle,
    gap: 4,
  },
  classRow: {
    flexDirection: 'row',
    gap: 12,
  },
  classTime: {
    ...typography.bodyStrong,
    color: colors.primary,
    width: 72,
  },
  classBody: {
    flex: 1,
    gap: 2,
  },
  classTitle: {
    ...typography.bodyStrong,
    color: colors.nearBlack,
  },
  classMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  rosterCount: {
    ...typography.caption,
    color: colors.nearBlack,
    marginTop: 4,
  },
  cancelCard: {
    ...cardStyle,
    gap: 4,
  },
  cancelName: {
    ...typography.bodyStrong,
    color: colors.nearBlack,
  },
  cancelMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  cancelReason: {
    ...typography.body,
    color: colors.nearBlack,
    marginTop: 4,
  },
});
