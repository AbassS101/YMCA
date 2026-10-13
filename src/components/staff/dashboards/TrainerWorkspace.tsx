import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClassAttendanceModal } from '@/components/ClassAttendanceModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { UserAvatar } from '@/components/UserAvatar';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { ActionButton, EmptyState, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { Member, PrivateLesson, ScheduleItem } from '@/domain/types';
import { trainerRepo } from '@/repositories/trainerRepo';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

import { BRANCH_ID, formatClockTime } from './format';
import type { TrainerDay } from './useTrainerDay';

type TrainerWorkspaceProps = {
  day: TrainerDay;
  staffId: string;
  accent: string;
  showQuickActions?: boolean;
};

export function TrainerWorkspace({ day, staffId, accent, showQuickActions = true }: TrainerWorkspaceProps) {
  const router = useRouter();
  const { api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const { classes, lessons, lessonMembers, clients, reload } = day;

  const [workoutMember, setWorkoutMember] = useState<Member | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<ScheduleItem | null>(null);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotDate, setSlotDate] = useState(getDemoToday());
  const [slotStart, setSlotStart] = useState('11:00');
  const [slotEnd, setSlotEnd] = useState('12:00');
  const [slotLocation, setSlotLocation] = useState('Wellness Studio A');
  const [addingSlot, setAddingSlot] = useState(false);

  const markLesson = async (lessonId: string, status: 'booked' | 'completed' | 'no_show', notes?: string) => {
    try {
      await trainerRepo.markLessonStatus(api, lessonId, status, notes);
      await reload();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not update lesson status.');
    }
  };

  const completeAndLog = (lesson: PrivateLesson) => {
    void markLesson(lesson.id, 'completed', 'Completed 1-on-1 private lesson session.');
    const member = lessonMembers[lesson.memberId];
    if (member) setWorkoutMember(member);
  };

  const openMessage = async (memberId: string) => {
    try {
      const thread = await api.getOrCreateThread(memberId, staffId);
      router.push(`/(staff)/messages/${thread.id}`);
    } catch {
      dialog.alert('Error', 'Could not open message thread.');
    }
  };

  const addSlot = async () => {
    if (!slotStart || !slotEnd) return;
    setAddingSlot(true);
    try {
      await api.addLessonSlot({
        staffId,
        branchId: BRANCH_ID,
        start: `${slotDate}T${slotStart}:00-04:00`,
        end: `${slotDate}T${slotEnd}:00-04:00`,
        location: slotLocation.trim(),
      });
      setSlotModalVisible(false);
      dialog.alert('Availability Slot Added', 'Clients can now book this private training time.', [{ text: 'OK' }], 'checkmark');
      await reload();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to add lesson slot.');
    } finally {
      setAddingSlot(false);
    }
  };

  const startWorkoutLog = () => {
    if (clients.length === 1) {
      setWorkoutMember(clients[0].member);
    } else {
      setClientPickerVisible(true);
    }
  };

  return (
    <>
      {showQuickActions ? (
        <QuickActionBar
          actions={[
            { key: 'log', label: 'Log Workout', icon: 'barbell-outline', onPress: startWorkoutLog, color: accent },
            { key: 'slot', label: 'Open Slot', icon: 'time-outline', onPress: () => setSlotModalVisible(true), color: '#15803D' },
            { key: 'msg', label: 'Messages', icon: 'chatbubbles-outline', onPress: () => router.push('/(staff)/messages'), color: '#0284C7' },
            { key: 'forum', label: 'Forum', icon: 'people-outline', onPress: () => router.push('/(member)/community-forum') },
          ]}
        />
      ) : null}

      <SectionCard title="My 1-on-1 Sessions" icon="body" accent={accent} count={lessons.length}>
        {lessons.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            text="No private 1-on-1 sessions scheduled for today."
            actionLabel="+ Open an available lesson slot"
            onAction={() => setSlotModalVisible(true)}
          />
        ) : (
          lessons.map((lesson) => {
            const member = lessonMembers[lesson.memberId];
            const done = lesson.status === 'completed';
            const noShow = lesson.status === 'no_show';
            return (
              <View
                key={lesson.id}
                style={[
                  styles.lesson,
                  {
                    borderColor: done ? colors.success : noShow ? colors.scarlet : tc.cardBorder,
                    backgroundColor: done
                      ? isDark ? '#064E3B' : '#F0FDF4'
                      : noShow
                        ? isDark ? '#7F1D1D' : '#FEF2F2'
                        : 'transparent',
                  },
                ]}
              >
                <View style={styles.lessonTop}>
                  <UserAvatar uri={member?.avatarUrl} name={member?.name ?? 'Member'} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: tc.text }]}>{member?.name ?? 'Client'}</Text>
                    <Text style={[styles.time, { color: tc.primary }]}>
                      {formatClockTime(lesson.start)} – {formatClockTime(lesson.end)} · {lesson.location}
                    </Text>
                  </View>
                  <StatusPill
                    label={lesson.status.toUpperCase()}
                    color={done ? '#15803D' : noShow ? colors.scarlet : colors.primaryDark}
                    bg={done ? '#DCFCE7' : noShow ? '#FEE2E2' : '#EFF6FF'}
                  />
                </View>
                {lesson.notes ? (
                  <Text style={[styles.note, { color: tc.textMuted }]}>"{lesson.notes}"</Text>
                ) : null}
                <View style={styles.actions}>
                  {!done ? (
                    <ActionButton label="Complete & Log" icon="checkmark-circle" color="#15803D" onPress={() => completeAndLog(lesson)} />
                  ) : (
                    <ActionButton label="Log Workout" icon="barbell" color="#15803D" onPress={() => member && setWorkoutMember(member)} />
                  )}
                  {!done && !noShow ? (
                    <ActionButton
                      label="No-Show"
                      color={colors.scarlet}
                      variant="outline"
                      onPress={() => void markLesson(lesson.id, 'no_show', 'Client did not attend session.')}
                    />
                  ) : null}
                  {noShow ? (
                    <ActionButton label="Reset" color={tc.primary} variant="outline" onPress={() => void markLesson(lesson.id, 'booked')} />
                  ) : null}
                  {member ? (
                    <Pressable
                      onPress={() => void openMessage(member.id)}
                      style={[styles.iconBtn, { borderColor: tc.cardBorder }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${member.name}`}
                    >
                      <Ionicons name="chatbubble" size={16} color={tc.primary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </SectionCard>

      <SectionCard title="My Classes Today" icon="people" accent={accent} count={classes.length}>
        {classes.length === 0 ? (
          <EmptyState icon="barbell-outline" text="No group fitness classes on your schedule today." />
        ) : (
          classes.map(({ item, roster }) => (
            <View key={item.id} style={[styles.classRow, { borderColor: tc.cardBorder }]}>
              <View style={[styles.timeBox, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                <Text style={[styles.timeBoxText, { color: isDark ? '#FFFFFF' : colors.primaryDark }]}>
                  {formatClockTime(item.start)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: tc.text }]}>{item.title}</Text>
                <Text style={[styles.meta, { color: tc.textMuted }]}>
                  {item.location} · {roster.length}/{item.capacity} registered
                </Text>
              </View>
              <ActionButton
                label="Attendance"
                icon="clipboard-outline"
                color={tc.primary}
                onPress={() => setAttendanceClass(item)}
              />
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="My Clients"
        icon="trophy"
        accent={accent}
        count={clients.length}
        actionLabel="View all"
        onAction={() => router.push('/(staff)/members')}
      >
        {clients.length === 0 ? (
          <EmptyState icon="person-add-outline" text="No clients are assigned to you yet." />
        ) : (
          clients.map(({ member, goal }) => (
            <View key={member.id} style={[styles.client, { borderColor: tc.cardBorder }]}>
              <View style={styles.lessonTop}>
                <UserAvatar uri={member.avatarUrl} name={member.name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: tc.text }]}>{member.name}</Text>
                  <Text style={[styles.meta, { color: tc.textMuted }]} numberOfLines={2}>
                    {goal ? `Goal: ${goal.primaryGoal}` : 'No fitness goals logged yet'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <ActionButton label="Log Workout" icon="barbell" color={accent} onPress={() => setWorkoutMember(member)} />
                <ActionButton label="Chat" icon="chatbubbles" color={tc.primary} variant="outline" onPress={() => void openMessage(member.id)} />
                <ActionButton
                  label="Goals & Logs"
                  icon="fitness"
                  color={tc.primary}
                  variant="outline"
                  onPress={() => router.push(`/(staff)/members/${member.id}`)}
                />
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <TrainerClientWorkoutModal
        visible={workoutMember != null}
        onClose={() => setWorkoutMember(null)}
        member={workoutMember}
        onSaved={() => void reload()}
      />

      <ClassAttendanceModal
        visible={attendanceClass != null}
        onClose={() => setAttendanceClass(null)}
        scheduleItem={attendanceClass}
        onAttendanceChanged={() => void reload()}
      />

      <Modal visible={slotModalVisible} animationType="fade" transparent onRequestClose={() => setSlotModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>Add Lesson Availability</Text>
              <Pressable onPress={() => setSlotModalVisible(false)} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={tc.textMuted} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, color: tc.textMuted }}>
              Create an open 1-on-1 time slot on your calendar so clients can book directly.
            </Text>
            <TextField label="Date (YYYY-MM-DD)" value={slotDate} onChangeText={setSlotDate} placeholder="2026-09-16" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextField label="Start (HH:MM)" value={slotStart} onChangeText={setSlotStart} placeholder="11:00" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="End (HH:MM)" value={slotEnd} onChangeText={setSlotEnd} placeholder="12:00" />
              </View>
            </View>
            <TextField label="Location / Studio" value={slotLocation} onChangeText={setSlotLocation} placeholder="Wellness Studio A" />
            <PrimaryButton title="Publish Availability Slot" onPress={() => void addSlot()} loading={addingSlot} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={clientPickerVisible} animationType="slide" transparent onRequestClose={() => setClientPickerVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>Choose Client to Log Workout</Text>
              <Pressable onPress={() => setClientPickerVisible(false)} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={tc.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              {clients.length === 0 ? (
                <EmptyState icon="person-outline" text="Assign clients first to log their workouts." />
              ) : (
                clients.map(({ member }) => (
                  <Pressable
                    key={member.id}
                    onPress={() => {
                      setClientPickerVisible(false);
                      setWorkoutMember(member);
                    }}
                    style={[styles.pickRow, { borderColor: tc.cardBorder }]}
                    accessibilityRole="button"
                  >
                    <UserAvatar uri={member.avatarUrl} name={member.name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: tc.text }]}>{member.name}</Text>
                      <Text style={[styles.meta, { color: tc.textMuted }]}>{member.membershipId}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={tc.primary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  lesson: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
  },
  lessonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  meta: {
    fontSize: 12,
    marginTop: 1,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  timeBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  timeBoxText: {
    fontSize: 13,
    fontWeight: '800',
  },
  client: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
});
