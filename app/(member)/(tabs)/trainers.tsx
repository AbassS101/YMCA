import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatModal } from '@/components/ChatModal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { Message, PrivateLesson, Staff } from '@/domain/types';
import { lessonRepo } from '@/repositories/lessonRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { staffRepo } from '@/repositories/staffRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

function branchLabel(branchId: string): string {
  if (branchId === 'silver-spring') {
    return 'YMCA Silver Spring';
  }
  return branchId;
}

function formatLessonWhen(isoStart: string): string {
  const d = new Date(isoStart);
  const day = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

type SupportCategory = 'trainers' | 'staff';

export default function MemberTrainersScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [activeCategory, setActiveCategory] = useState<SupportCategory>('trainers');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [assignedTrainer, setAssignedTrainer] = useState<Staff | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('staff-alex');

  // Chat state
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<Staff | null>(null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const [assigned, staff, mine] = await Promise.all([
        staffRepo.getAssignedTrainer(api, memberId),
        staffRepo.listStaff(api),
        lessonRepo.listMine(api, memberId),
      ]);
      setAssignedTrainer(assigned);
      setStaffList(staff);
      mine.sort((a, b) => a.start.localeCompare(b.start));
      setLessons(mine);

      // Default selected trainer
      if (assigned) {
        setSelectedTrainerId(assigned.id);
      }
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Split staff list into personal trainers and wellness desk staff
  const personalTrainers = useMemo(
    () => staffList.filter((s) => s.id !== 'staff-desk'),
    [staffList]
  );

  const deskStaff = useMemo(
    () => staffList.find((s) => s.id === 'staff-desk') ?? null,
    [staffList]
  );

  const selectedTrainer = useMemo(
    () =>
      personalTrainers.find((s) => s.id === selectedTrainerId) ??
      assignedTrainer ??
      personalTrainers[0] ??
      null,
    [personalTrainers, selectedTrainerId, assignedTrainer]
  );

  // Open Chat in its dedicated pop-up modal
  const openChatWith = async (recipient: Staff) => {
    setChatRecipient(recipient);
    setChatModalVisible(true);
    if (memberId === '') return;

    try {
      const thread = await messageRepo.getOrCreateThread(api, memberId, recipient.id);
      setChatThreadId(thread.id);
      const list = await messageRepo.listMessages(api, thread.id);
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setMessages(list);
    } catch {
      // Keep existing
    }
  };

  const onSend = useCallback(
    async (body: string) => {
      if (memberId === '' || !chatThreadId) {
        return;
      }
      const sent = await messageRepo.sendMessage(api, {
        threadId: chatThreadId,
        fromId: memberId,
        body,
      });
      setMessages((prev) => [...prev, sent]);
    },
    [api, memberId, chatThreadId]
  );

  const handleMakePrimary = async (staffId: string) => {
    if (memberId === '') return;
    try {
      await staffRepo.setAssignedTrainer(api, memberId, staffId);
      const updated = await staffRepo.getAssignedTrainer(api, memberId);
      setAssignedTrainer(updated);
      dialog.alert(
        'Primary Trainer Updated',
        'Your primary trainer assignment has been updated.',
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (e) {
      dialog.alert(
        'Error',
        e instanceof Error ? e.message : 'Could not update primary trainer.',
        [{ text: 'OK' }],
        'alert'
      );
    }
  };

  const confirmCancelLesson = (lesson: PrivateLesson) => {
    dialog.show({
      title: 'Cancel private lesson?',
      message: `Cancel your lesson on ${formatLessonWhen(lesson.start)}?`,
      icon: 'trash',
      buttons: [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel lesson',
          style: 'destructive',
          onPress: () => void doCancelLesson(lesson),
        },
      ],
    });
  };

  const doCancelLesson = async (lesson: PrivateLesson) => {
    if (memberId === '') {
      return;
    }
    setBusyId(lesson.id);
    try {
      await lessonRepo.cancel(api, memberId, lesson.id);
      await load();
    } catch (e) {
      dialog.show({
        title: 'Could not cancel',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusyId(null);
    }
  };

  const isAssigned =
    selectedTrainer && assignedTrainer && selectedTrainer.id === assignedTrainer.id;
  const trainerFirstName = selectedTrainer?.name.split(' ')[0] ?? 'Trainer';

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Trainers & Staff Support" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Category Selector: Separate Options for Trainers vs Staff Desk */}
        <View style={styles.categorySection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]} allowFontScaling>
            Select Option:
          </Text>
          <View
            style={[
              styles.segmentedWrap,
              {
                backgroundColor: isDark ? colors.card : colors.primaryLight,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => setActiveCategory('trainers')}
              style={[
                styles.segmentTab,
                activeCategory === 'trainers'
                  ? [
                      styles.segmentTabActive,
                      {
                        backgroundColor: colors.card,
                        shadowColor: '#000',
                      },
                    ]
                  : null,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeCategory === 'trainers' }}
              accessibilityLabel="Personal Trainers option"
            >
              <Ionicons
                name="fitness"
                size={18}
                color={activeCategory === 'trainers' ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeCategory === 'trainers' ? colors.primary : colors.muted,
                    fontWeight: activeCategory === 'trainers' ? '700' : '600',
                  },
                ]}
                allowFontScaling
              >
                Personal Trainers
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveCategory('staff')}
              style={[
                styles.segmentTab,
                activeCategory === 'staff'
                  ? [
                      styles.segmentTabActive,
                      {
                        backgroundColor: colors.card,
                        shadowColor: '#000',
                      },
                    ]
                  : null,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeCategory === 'staff' }}
              accessibilityLabel="YMCA Staff Desk option"
            >
              <Ionicons
                name="business"
                size={18}
                color={activeCategory === 'staff' ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeCategory === 'staff' ? colors.primary : colors.muted,
                    fontWeight: activeCategory === 'staff' ? '700' : '600',
                  },
                ]}
                allowFontScaling
              >
                Staff & Desk Support
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Option 1: PERSONAL TRAINERS */}
        {activeCategory === 'trainers' ? (
          <View style={styles.tabContent}>
            {/* Trainer Chips List */}
            <View style={styles.selectorSection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]} allowFontScaling>
                Choose Trainer:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.staffChipsScroll}
              >
                {personalTrainers.map((tr) => {
                  const isSelected = tr.id === selectedTrainerId;
                  const isPrimary = assignedTrainer?.id === tr.id;
                  return (
                    <Pressable
                      key={tr.id}
                      onPress={() => setSelectedTrainerId(tr.id)}
                      style={[
                        styles.staffChip,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : colors.cardBg,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${tr.name}, ${tr.roleLabel}`}
                    >
                      <View style={styles.chipTopRow}>
                        <UserAvatar uri={tr.avatarUrl} name={tr.name} size={24} />
                        <Text
                          style={[
                            styles.chipName,
                            {
                              color: isSelected
                                ? isDark
                                ? colors.primary
                                : colors.primaryDark
                                : colors.text,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                          allowFontScaling
                        >
                          {tr.name}
                        </Text>
                        {isPrimary ? (
                          <View style={[styles.primaryBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.chipRole,
                          {
                            color: isSelected ? colors.primary : colors.textMuted,
                          },
                        ]}
                        numberOfLines={1}
                        allowFontScaling
                      >
                        {tr.roleLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selected Trainer Profile Card */}
            {selectedTrainer ? (
              <View style={[styles.card, cardTheme]}>
                <View style={styles.profileHeader}>
                  <UserAvatar
                    uri={selectedTrainer.avatarUrl}
                    name={selectedTrainer.name}
                    size={56}
                  />
                  <View style={styles.profileMeta}>
                    <View style={styles.profileNameRow}>
                      <Text style={[styles.cardName, { color: colors.text }]} allowFontScaling>
                        {selectedTrainer.name}
                      </Text>
                      {isAssigned ? (
                        <View style={[styles.assignedBadge, { backgroundColor: colors.successBg }]}>
                          <Text style={[styles.assignedBadgeText, { color: colors.success }]}>
                            Your Primary Trainer
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.cardRole, { color: colors.primary }]} allowFontScaling>
                      {selectedTrainer.roleLabel}
                    </Text>
                    <Text style={[styles.cardBranch, { color: colors.textMuted }]} allowFontScaling>
                      {branchLabel(selectedTrainer.homeBranchId)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => void openChatWith(selectedTrainer)}
                  style={({ pressed }) => [
                    styles.chatActionButton,
                    {
                      backgroundColor: pressed
                        ? colors.primaryLight
                        : isDark
                          ? colors.card
                          : colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Chat with ${selectedTrainer.name}`}
                >
                  <Ionicons name="chatbubbles" size={20} color={colors.primary} />
                  <Text style={[styles.chatActionText, { color: colors.primary }]} allowFontScaling>
                    Chat with {trainerFirstName}
                  </Text>
                </Pressable>

                {/* Booking & Primary Actions */}
                <PrimaryButton
                  title={`Book private lesson with ${trainerFirstName}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(member)/book-lesson',
                      params: { staffId: selectedTrainer.id },
                    })
                  }
                  accessibilityHint={`Choose an open time with ${selectedTrainer.name}`}
                />

                {!isAssigned ? (
                  <Pressable
                    onPress={() => void handleMakePrimary(selectedTrainer.id)}
                    style={[
                      styles.makePrimaryBtn,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${selectedTrainer.name} as primary trainer`}
                  >
                    <Text
                      style={[styles.makePrimaryText, { color: colors.primary }]}
                      allowFontScaling
                    >
                      ★ Set as My Primary Trainer
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Your Booked Lessons Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} allowFontScaling>
                Your Booked Private Lessons
              </Text>
              {lessons.length === 0 ? (
                <Text style={[styles.muted, { color: colors.textMuted }]} allowFontScaling>
                  No private lessons booked yet. Tap a trainer above to reserve one-on-one sessions.
                </Text>
              ) : (
                lessons.map((lesson) => {
                  const trainerObj = staffList.find((s) => s.id === lesson.staffId);
                  return (
                    <View key={lesson.id} style={[styles.lessonCard, cardTheme]}>
                      <Text style={[styles.lessonWhen, { color: colors.primary }]} allowFontScaling>
                        {formatLessonWhen(lesson.start)}
                      </Text>
                      <Text style={[styles.lessonTrainer, { color: colors.text }]} allowFontScaling>
                        Instructor: {trainerObj?.name ?? 'Assigned Trainer'}
                      </Text>
                      <Text style={[styles.lessonMeta, { color: colors.textMuted }]} allowFontScaling>
                        Location: {lesson.location}
                      </Text>
                      <View style={styles.lessonActions}>
                        <View style={styles.actionFlex}>
                          <SecondaryButton
                            title="Change"
                            onPress={() =>
                              router.push({
                                pathname: '/(member)/book-lesson',
                                params: { changeLessonId: lesson.id, staffId: lesson.staffId },
                              })
                            }
                            disabled={busyId === lesson.id}
                            accessibilityHint="Pick a different open time"
                          />
                        </View>
                        <View style={styles.actionFlex}>
                          <SecondaryButton
                            title="Cancel"
                            destructive
                            onPress={() => confirmCancelLesson(lesson)}
                            disabled={busyId === lesson.id}
                            loading={busyId === lesson.id}
                            accessibilityHint="Cancel this private lesson"
                          />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        ) : (
          /* Option 2: YMCA STAFF & DESK SUPPORT */
          <View style={styles.tabContent}>
            <View style={[styles.card, cardTheme]}>
              <View style={styles.profileHeader}>
                <View
                  style={[
                    styles.trainerAvatar,
                    {
                      backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
                    },
                  ]}
                >
                  <Ionicons name="business" size={26} color={colors.primary} />
                </View>
                <View style={styles.profileMeta}>
                  <Text style={[styles.cardName, { color: colors.text }]} allowFontScaling>
                    YMCA Silver Spring Member Services
                  </Text>
                  <Text style={[styles.cardRole, { color: colors.primary }]} allowFontScaling>
                    {deskStaff?.name ?? 'Marcus Taylor'} · Wellness Desk Lead
                  </Text>
                  <Text style={[styles.cardBranch, { color: colors.textMuted }]} allowFontScaling>
                    Silver Spring Branch · Main Lobby Front Desk
                  </Text>
                </View>
              </View>

              {/* Desk Information Details */}
              <View
                style={[
                  styles.deskDetailsBox,
                  {
                    backgroundColor: isDark ? colors.background : colors.offWhite,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={[styles.detailLabel, { color: colors.text }]} allowFontScaling>
                    Desk Hours:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.textMuted }]} allowFontScaling>
                    Mon–Fri 6:00 AM – 9:00 PM | Sat–Sun 7:00 AM – 6:00 PM
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={18} color={colors.primary} />
                  <Text style={[styles.detailLabel, { color: colors.text }]} allowFontScaling>
                    Desk Phone:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.textMuted }]} allowFontScaling>
                    (301) 585-2120
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.detailLabel, { color: colors.text }]} allowFontScaling>
                    Support for:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.textMuted }]} allowFontScaling>
                    Class registration, locker rentals, membership billing, guest passes, and facility access.
                  </Text>
                </View>
              </View>

              {deskStaff ? (
                <Pressable
                  onPress={() => void openChatWith(deskStaff)}
                  style={({ pressed }) => [
                    styles.chatActionButton,
                    {
                      backgroundColor: pressed
                        ? colors.primaryLight
                        : isDark
                          ? colors.card
                          : colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Chat with YMCA staff desk"
                >
                  <Ionicons name="chatbubbles" size={22} color={colors.primary} />
                  <Text style={[styles.chatActionText, { color: colors.primary }]} allowFontScaling>
                    Chat with Staff Desk
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Dedicated Chat Pop-up Modal */}
      <ChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        recipient={chatRecipient}
        messages={messages}
        currentUserId={memberId}
        onSend={(body) => void onSend(body)}
        isAssignedTrainer={chatRecipient?.id === assignedTrainer?.id}
      />
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
  categorySection: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: radii.button,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.button - 2,
    gap: 6,
  },
  segmentTabActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  tabContent: {
    gap: spacing.md,
  },
  selectorSection: {
    gap: spacing.xs,
  },
  staffChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  staffChip: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 160,
    maxWidth: 210,
    gap: 2,
  },
  chipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  chipName: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  chipRole: {
    ...typography.caption,
    fontSize: 12,
  },
  primaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  card: {
    ...cardStyle,
    gap: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardName: {
    ...typography.title,
    fontSize: 20,
  },
  assignedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assignedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardRole: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  cardBranch: {
    ...typography.caption,
  },
  chatActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  chatActionText: {
    ...typography.bodyStrong,
    fontSize: 15,
    fontWeight: '700',
  },
  makePrimaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  makePrimaryText: {
    ...typography.bodyStrong,
    fontSize: 13,
  },
  deskDetailsBox: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailLabel: {
    ...typography.bodyStrong,
    fontSize: 13,
    minWidth: 80,
  },
  detailValue: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
  },
  muted: {
    ...typography.body,
  },
  lessonCard: {
    ...cardStyle,
    gap: 4,
  },
  lessonWhen: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  lessonTrainer: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  lessonMeta: {
    ...typography.caption,
  },
  lessonActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  actionFlex: {
    flex: 1,
  },
});
