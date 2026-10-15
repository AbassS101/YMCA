import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClassAttendanceModal } from '@/components/ClassAttendanceModal';
import { DateTimeWheelPicker } from '@/components/DateTimeWheelPicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DEFAULT_REPEAT, RepeatPicker, expandRepeat, type RepeatValue } from '@/components/RepeatPicker';
import { TextField } from '@/components/TextField';
import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { UserAvatar } from '@/components/UserAvatar';
import { AvailabilitySettings } from '@/components/staff/AvailabilitySettings';
import { SessionRequestsInbox } from '@/components/staff/SessionRequestsInbox';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { ActionButton, EmptyState, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { useAppConfig } from '@/context/AppConfigContext';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { easternOffset, getDemoToday } from '@/domain/demoClock';
import { ageOn, facilityAccess } from '@/domain/householdAccess';
import type { Member, PrivateLesson, ScheduleItem } from '@/domain/types';
import { householdRepo } from '@/repositories/householdRepo';
import { trainerRepo } from '@/repositories/trainerRepo';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

import { BRANCH_ID, formatClockTime } from './format';

function addMinutes(time: string, mins: number): string {
  const [h, m] = (time || '09:00').split(':').map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
import type { TrainerDay } from './useTrainerDay';

type TrainerWorkspaceProps = {
  day: TrainerDay;
  staffId: string;
  accent: string;
  showQuickActions?: boolean;
  variant?: 'training' | 'swim';
};

export function TrainerWorkspace({ day, staffId, accent, showQuickActions = true, variant = 'training' }: TrainerWorkspaceProps) {
  const isSwim = variant === 'swim';
  const router = useRouter();
  const { api, session } = useSession();
  const forumOn = useAppConfig().config.featureToggles.communityForum;
  const { colors: tc, isDark } = useTheme();
  const { classes, lessons, lessonMembers, clients, reload } = day;
  const arrivedAt = day.arrivedAt ?? {};
  const arrivedList = Object.entries(arrivedAt)
    .map(([memberId, at]) => ({
      member: lessonMembers[memberId] ?? clients.find((c) => c.member.id === memberId)?.member,
      at,
      nextLesson: lessons.find((l) => l.memberId === memberId && l.status === 'booked'),
    }))
    .filter((x): x is { member: Member; at: string; nextLesson: PrivateLesson | undefined } => x.member !== undefined)
    .sort((a, b) => b.at.localeCompare(a.at));

  const [orientationQueue, setOrientationQueue] = useState<Member[]>([]);
  const [orientingId, setOrientingId] = useState<string | null>(null);

  const loadOrientationQueue = useCallback(async () => {
    try {
      const all = await api.listAllMembers(BRANCH_ID);
      const today = getDemoToday();
      setOrientationQueue(
        all.filter((m) => m.birthDate && facilityAccess(m, today).gym.status === 'needs_orientation')
      );
    } catch {
      setOrientationQueue([]);
    }
  }, [api]);

  useEffect(() => {
    void loadOrientationQueue();
  }, [loadOrientationQueue]);

  const completeOrientation = async (teenId: string) => {
    setOrientingId(teenId);
    try {
      await householdRepo.recordGymOrientation(api, teenId, staffId);
      await loadOrientationQueue();
    } catch (err: any) {
      dialog.alert('Could not record orientation', err?.message || 'Please try again.');
    } finally {
      setOrientingId(null);
    }
  };

  const [workoutMember, setWorkoutMember] = useState<Member | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<ScheduleItem | null>(null);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotDate, setSlotDate] = useState(getDemoToday());
  const [slotStart, setSlotStart] = useState('11:00');
  const [slotEnd, setSlotEnd] = useState('12:00');
  const [slotLocation, setSlotLocation] = useState(variant === 'swim' ? 'Indoor Lap Pool (Lane 1)' : 'Wellness Studio A');
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotRepeat, setSlotRepeat] = useState<RepeatValue>(DEFAULT_REPEAT);

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
    const dates = expandRepeat(slotDate, slotRepeat);
    if (dates.length === 0) {
      dialog.alert('Pick a day', 'Choose at least one day of the week for the repeat.');
      return;
    }
    setAddingSlot(true);
    try {
      for (const date of dates) {
        await api.addLessonSlot({
          staffId,
          branchId: BRANCH_ID,
          start: `${date}T${slotStart}:00${easternOffset(date, Number(slotStart.slice(0, 2)))}`,
          end: `${date}T${slotEnd}:00${easternOffset(date, Number(slotEnd.slice(0, 2)))}`,
          location: slotLocation.trim(),
        }, session?.userId ?? staffId);
      }
      setSlotModalVisible(false);
      setSlotRepeat(DEFAULT_REPEAT);
      dialog.alert(
        dates.length > 1 ? `${dates.length} Availability Windows Added` : 'Availability Window Added',
        `Members can now request private ${isSwim ? 'swim lesson' : 'training'} times inside this window.`,
        [{ text: 'OK' }],
        'checkmark',
      );
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
            { key: 'avail', label: 'Availability', icon: 'calendar-outline', onPress: () => router.push({ pathname: '/(staff)/trainer-availability', params: { staffId } }), color: '#15803D' },
            { key: 'slot', label: 'One-off window', icon: 'time-outline', onPress: () => setSlotModalVisible(true), color: '#0F766E' },
            { key: 'msg', label: 'Messages', icon: 'chatbubbles-outline', onPress: () => router.push('/(staff)/messages'), color: '#0284C7' },
            ...(forumOn
              ? [{ key: 'forum', label: 'Forum', icon: 'people-outline' as const, onPress: () => router.push('/(member)/community-forum') }]
              : []),
          ]}
        />
      ) : null}

      <SessionRequestsInbox staffId={staffId} accent={accent} onChanged={() => void reload()} />

      {!isSwim && orientationQueue.length > 0 ? (
        <SectionCard
          title="Teens Awaiting Gym Orientation"
          icon="shield-checkmark"
          accent="#B45309"
          count={orientationQueue.length}
          subtitle="Ages 13-17 can use the gym after an orientation with a trainer"
        >
          {orientationQueue.slice(0, 5).map((teen) => (
            <View key={teen.id} style={[styles.client, { borderColor: '#FDE68A' }]}>
              <View style={styles.lessonTop}>
                <UserAvatar uri={teen.avatarUrl} name={teen.name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: tc.text }]}>{teen.name}</Text>
                  <Text style={[styles.meta, { color: tc.textMuted }]}>
                    {teen.birthDate ? `${ageOn(teen.birthDate, getDemoToday())} yrs · ` : ''}ID {teen.membershipId}
                  </Text>
                </View>
                <StatusPill label="NEEDS ORIENTATION" color="#92400E" bg="#FEF3C7" />
              </View>
              <View style={styles.actions}>
                <ActionButton
                  label="Mark complete"
                  icon="checkmark-circle"
                  color="#15803D"
                  loading={orientingId === teen.id}
                  onPress={() => void completeOrientation(teen.id)}
                />
                <ActionButton
                  label="Open Profile"
                  icon="person"
                  color={accent}
                  variant="outline"
                  onPress={() => router.push(`/(staff)/members/${teen.id}`)}
                />
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {arrivedList.length > 0 ? (
        <SectionCard
          title="Arrived Now"
          icon="walk"
          accent="#15803D"
          count={arrivedList.length}
          subtitle={isSwim ? 'Swimmers who just checked in' : 'Clients who just checked in'}
        >
          {arrivedList.map(({ member, at, nextLesson }) => (
            <View key={member.id} style={[styles.client, { borderColor: '#86EFAC' }]}>
              <View style={styles.lessonTop}>
                <UserAvatar uri={member.avatarUrl} name={member.name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: tc.text }]}>{member.name}</Text>
                  <Text style={[styles.meta, { color: tc.textMuted }]}>
                    Arrived {formatClockTime(at)}
                    {nextLesson ? ` · Session at ${formatClockTime(nextLesson.start)}` : ''}
                  </Text>
                </View>
                <StatusPill label="ARRIVED" color="#15803D" bg="#DCFCE7" />
              </View>
              <View style={styles.actions}>
                <ActionButton label="Message" icon="chatbubble" color={tc.primary} variant="outline" onPress={() => void openMessage(member.id)} />
                <ActionButton
                  label="Open Profile"
                  icon="person"
                  color={accent}
                  onPress={() => router.push(`/(staff)/members/${member.id}`)}
                />
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title={isSwim ? 'My Private Swim Lessons' : 'My 1-on-1 Sessions'} icon="body" accent={accent} count={lessons.length}>
        {lessons.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            text={isSwim ? 'No private swim lessons scheduled for today.' : 'No private 1-on-1 sessions scheduled for today.'}
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
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusPill
                      label={lesson.status.toUpperCase()}
                      color={done ? '#15803D' : noShow ? colors.scarlet : colors.primaryDark}
                      bg={done ? '#DCFCE7' : noShow ? '#FEE2E2' : '#EFF6FF'}
                    />
                    {arrivedAt[lesson.memberId] && !done && !noShow ? (
                      <StatusPill label="ARRIVED" color="#15803D" bg="#DCFCE7" />
                    ) : null}
                  </View>
                </View>
                {lesson.notes ? (
                  <Text style={[styles.note, { color: tc.textMuted }]}>&ldquo;{lesson.notes}&rdquo;</Text>
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

      <SectionCard title={isSwim ? 'My Swim Classes Today' : 'My Classes Today'} icon="people" accent={accent} count={classes.length}>
        {classes.length === 0 ? (
          <EmptyState icon="barbell-outline" text={isSwim ? 'No swim classes on your schedule today.' : 'No group fitness classes on your schedule today.'} />
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
        title={isSwim ? 'My Swimmers' : 'My Clients'}
        icon="trophy"
        accent={accent}
        count={clients.length}
        actionLabel="View all"
        onAction={() => router.push('/(staff)/members')}
      >
        {clients.length === 0 ? (
          <EmptyState icon="person-add-outline" text={isSwim ? 'No swimmers are assigned to you yet.' : 'No clients are assigned to you yet.'} />
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
                {arrivedAt[member.id] ? <StatusPill label="ARRIVED" color="#15803D" bg="#DCFCE7" /> : null}
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

      <AvailabilitySettings staffId={staffId} accent={accent} />

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
              Set a window you are free (for example 9:00 AM to 2:00 PM). Members request any start time inside it.
            </Text>
            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              <DateTimeWheelPicker
                selectedDate={slotDate}
                onDateChange={setSlotDate}
                selectedTime={slotStart}
                onTimeChange={(t) => {
                  setSlotStart(t);
                  setSlotEnd(addMinutes(t, slotDuration));
                }}
                label="Date & Start Time"
              />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tc.text, marginBottom: 4 }}>Lesson Duration</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[30, 45, 60, 90].map((mins) => {
                    const active = slotDuration === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => {
                          setSlotDuration(mins);
                          setSlotEnd(addMinutes(slotStart, mins));
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: active ? colors.primary : tc.cardBorder,
                          backgroundColor: active ? colors.primary : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : tc.text }}>{mins} Mins</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 12, color: tc.textMuted, marginTop: 2 }}>
                  {slotStart} - {slotEnd}
                </Text>
              </View>
              <RepeatPicker value={slotRepeat} onChange={setSlotRepeat} startDate={slotDate} />
              <TextField label="Location / Studio" value={slotLocation} onChangeText={setSlotLocation} placeholder={isSwim ? 'Indoor Lap Pool (Lane 1)' : 'Wellness Studio A'} />
              <PrimaryButton title="Publish Availability Window" onPress={() => void addSlot()} loading={addingSlot} />
            </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
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
