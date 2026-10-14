import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AvailabilitySettings } from '@/components/staff/AvailabilitySettings';
import { ClassAttendanceModal } from '@/components/ClassAttendanceModal';
import { ClassForumModal } from '@/components/ClassForumModal';
import { DateTimeWheelPicker } from '@/components/DateTimeWheelPicker';
import {
  DEFAULT_REPEAT,
  RepeatPicker,
  expandRepeat,
  repeatFromDates,
  repeatLabel,
  type RepeatValue,
} from '@/components/RepeatPicker';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { formatShortDate } from '@/domain/displayDates';
import { type LessonSlot, type Member, type PrivateLesson, type ScheduleCategory, type ScheduleItem, type Staff } from '@/domain/types';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { type ThemeColors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

const CATEGORIES: { key: ScheduleCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'groupEx', label: 'Group Fitness' },
  { key: 'seniors', label: 'Seniors / AOA' },
  { key: 'swim', label: 'Aquatics & Swim' },
  { key: 'event', label: 'Special Events' },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function StaffSchedulesScreen() {
  const { session, api } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const staffId = session?.userId ?? '';
  const { can, isAdmin } = useStaffCapabilities();
  const canManageSchedules = can('manageSchedules');
  const canManageOwnSlots = can('manageOwnLessonSlots');
  const canManageAllSlots = can('manageAllLessonSlots');
  const seesBranchSchedule = isAdmin || !canManageOwnSlots;
  const [slotTrainerId, setSlotTrainerId] = useState<string>(staffId);
  const lessonStaffId = canManageAllSlots && slotTrainerId ? slotTrainerId : staffId;

  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [privateLessons, setPrivateLessons] = useState<PrivateLesson[]>([]);
  const [selectedForumClass, setSelectedForumClass] = useState<ScheduleItem | null>(null);
  const [forumModalVisible, setForumModalVisible] = useState(false);
  const [lessonSlots, setLessonSlots] = useState<LessonSlot[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, Member>>({});

  const [activeTab, setActiveTab] = useState<'classes' | 'lessons'>('classes');
  const [selectedCategory, setSelectedCategory] = useState<ScheduleCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(false);

  // Class / Event Form Modal (Create or Edit)
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ScheduleCategory>('groupEx');
  const [formInstructor, setFormInstructor] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStartDate, setFormStartDate] = useState('2026-09-15');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formDurationMinutes, setFormDurationMinutes] = useState(60);
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formCapacity, setFormCapacity] = useState('20');
  const [formOpenAccess, setFormOpenAccess] = useState(true);
  const [formRepeat, setFormRepeat] = useState<RepeatValue>(DEFAULT_REPEAT);
  const [formEditingItem, setFormEditingItem] = useState<ScheduleItem | null>(null);
  const [formApplyScope, setFormApplyScope] = useState<'one' | 'future'>('one');
  const [slotRepeat, setSlotRepeat] = useState<RepeatValue>(DEFAULT_REPEAT);
  const [formPrice, setFormPrice] = useState('0');
  const [formDescription, setFormDescription] = useState('');
  const [formSeniorFriendly, setFormSeniorFriendly] = useState(false);
  const [formIsSpecialEvent, setFormIsSpecialEvent] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Cancellation & Notification Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{
    id: string;
    title: string;
    type: 'class' | 'lesson';
    seriesId?: string;
    start?: string;
  } | null>(null);
  const [cancelScope, setCancelScope] = useState<'one' | 'future'>('one');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Attendance & Check-In Modal
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [attendanceItem, setAttendanceItem] = useState<ScheduleItem | null>(null);

  // Workout Logging Modal
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [selectedWorkoutMember, setSelectedWorkoutMember] = useState<Member | null>(null);

  // Roster View Modal
  const [rosterModalVisible, setRosterModalVisible] = useState(false);
  const [rosterItem, setRosterItem] = useState<ScheduleItem | null>(null);
  const [rosterList, setRosterList] = useState<Member[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Add Lesson Slot Modal (Trainer)
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotDate, setSlotDate] = useState('2026-09-17');
  const [slotStart, setSlotStart] = useState('14:00');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(60);
  const [slotEnd, setSlotEnd] = useState('15:00');
  const [slotLocation, setSlotLocation] = useState('Wellness Floor / Studio B');
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  function computeEndTime(startTimeStr: string, durationMins: number): string {
    const [hStr, mStr] = (startTimeStr || '09:00').split(':');
    let totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + durationMins;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    const hFormatted = endH < 10 ? `0${endH}` : `${endH}`;
    const mFormatted = endM < 10 ? `0${endM}` : `${endM}`;
    return `${hFormatted}:${mFormatted}`;
  }

  const loadData = useCallback(async () => {
    if (!staffId) return;
    try {
      setError(false);

      const [profile, staffList] = await Promise.all([
        api.getStaff(staffId).catch(() => null),
        api.listStaff().catch(() => []),
      ]);
      setStaffProfile(profile);
      setAllStaff(staffList);

      let classList: ScheduleItem[] = [];
      if (seesBranchSchedule) {
        classList = await scheduleRepo.listAll(api, BRANCH_ID);
      } else {
        classList = await scheduleRepo.listTrainerSchedule(api, staffId);
      }
      setSchedules(classList);

      // Load roster counts
      const counts: Record<string, number> = {};
      await Promise.all(
        classList.map(async (item) => {
          const r = await registrationRepo.roster(api, item.id);
          counts[item.id] = r.length;
        })
      );
      setRosterCounts(counts);

      // Load private lessons & slots if trainer or admin
      const slots = await api.listLessonSlots(lessonStaffId, '2026-09-01', '2026-09-30').catch(() => []);
      setLessonSlots(slots);

      const dayLessons = await api.listStaffLessons(lessonStaffId, '2026-09-15').catch(() => []);
      setPrivateLessons(dayLessons);

      const allMembers = await api.listAllMembers(BRANCH_ID).catch(() => []);
      const mMap: Record<string, Member> = {};
      for (const m of allMembers) {
        mMap[m.id] = m;
      }
      setMemberMap(mMap);
    } catch {
      setError(true);
    }
  }, [api, staffId, seesBranchSchedule, lessonStaffId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const filteredClasses = useMemo(() => {
    let result = schedules;
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.instructorName.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [schedules, selectedCategory, searchQuery]);

  function openCreateModal() {
    setEditingItemId(null);
    setFormTitle('');
    setFormCategory('groupEx');
    setFormInstructor(staffProfile?.name ?? 'YMCA Staff');
    setFormStaffId(staffProfile?.id ?? staffId);
    setFormLocation('Studio A');
    setFormStartDate('2026-09-16');
    setFormStartTime('10:00');
    setFormDurationMinutes(60);
    setFormEndTime('11:00');
    setFormCapacity('20');
    setFormOpenAccess(true);
    setFormRepeat(DEFAULT_REPEAT);
    setFormEditingItem(null);
    setFormApplyScope('one');
    setFormPrice('0');
    setFormDescription('');
    setFormSeniorFriendly(false);
    setFormIsSpecialEvent(false);
    setFormError(null);
    setItemModalVisible(true);
  }

  function openEditModal(item: ScheduleItem, scope: 'one' | 'future' = 'one') {
    setEditingItemId(item.id);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormInstructor(item.instructorName);
    setFormStaffId(item.staffId ?? '');
    setFormLocation(item.location);
    const startDatePart = item.start.slice(0, 10);
    const startTimePart = item.start.slice(11, 16);
    const endTimePart = item.end.slice(11, 16);
    setFormStartDate(startDatePart);
    setFormStartTime(startTimePart);
    setFormEndTime(endTimePart);
    setFormCapacity(String(item.capacity || 20));
    setFormOpenAccess(Boolean(item.openAccess));
    setFormEditingItem(item);
    setFormRepeat(DEFAULT_REPEAT);
    setFormApplyScope(item.seriesId ? scope : 'one');
    if (item.seriesId) {
      // Rebuild the existing repeat pattern from the sessions in this series.
      void api.listAllSchedules(BRANCH_ID).then((all) => {
        const sibs = all.filter((s) => s.seriesId === item.seriesId && s.start >= item.start);
        setFormRepeat(
          repeatFromDates(
            sibs.map((s) => s.start.slice(0, 10)),
            item.recurrenceLabel,
          ),
        );
      });
    }
    setFormPrice(String((item.priceCents || 0) / 100));
    setFormDescription(item.description ?? '');
    setFormSeniorFriendly(Boolean(item.seniorFriendly));
    setFormIsSpecialEvent(Boolean(item.isSpecialEvent));
    setFormError(null);
    setItemModalVisible(true);
  }

  async function handleSaveItem() {
    if (!formTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formLocation.trim()) {
      setFormError('Location is required.');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);

    try {
      const calculatedEnd = formEndTime || computeEndTime(formStartTime, formDurationMinutes);
      // Open access = first come, first served: no visible cap, so use a high internal limit.
      const cap = formOpenAccess ? 9999 : parseInt(formCapacity, 10) || 20;
      const priceC = Math.round(parseFloat(formPrice || '0') * 100);
      const chosenStaffId = formStaffId || staffId;

      const common = {
        title: formTitle.trim(),
        category: formCategory,
        instructorName: formInstructor.trim(),
        staffId: chosenStaffId,
        location: formLocation.trim(),
        capacity: cap,
        openAccess: formOpenAccess,
        priceCents: priceC,
        description: formDescription.trim(),
        seniorFriendly: formSeniorFriendly,
        isSpecialEvent: formIsSpecialEvent,
      };
      const timesFor = (date: string) => ({
        start: `${date}T${formStartTime}:00-04:00`,
        end: `${date}T${calculatedEnd}:00-04:00`,
      });
      const newDates = expandRepeat(formStartDate, formRepeat);
      const label = newDates.length > 1 ? repeatLabel(formRepeat) : undefined;
      if (newDates.length === 0) {
        setFormError('Pick at least one day of the week for the repeat.');
        setFormSubmitting(false);
        return;
      }
      const createOn = (date: string, seriesId?: string) =>
        scheduleRepo.create(api, {
          branchId: BRANCH_ID,
          ...common,
          ...timesFor(date),
          seriesId,
          recurrenceLabel: label,
        });

      if (editingItemId && formEditingItem) {
        const orig = formEditingItem;
        if (orig.seriesId && formApplyScope === 'one') {
          // Only this session changes; it stays linked to its series.
          await scheduleRepo.update(api, editingItemId, { ...common, ...timesFor(formStartDate) });
          dialog.alert('Updated!', 'This session was updated. Participants are notified if the time changed.', [{ text: 'OK' }], 'checkmark');
        } else if (orig.seriesId) {
          // This and all future sessions in the series.
          const all = await api.listAllSchedules(BRANCH_ID);
          const future = all.filter(
            (x) => x.seriesId === orig.seriesId && x.start >= orig.start && x.id !== orig.id,
          );
          const seriesId = newDates.length > 1 ? orig.seriesId : undefined;
          await scheduleRepo.update(api, editingItemId, {
            ...common,
            ...timesFor(formStartDate),
            seriesId,
            recurrenceLabel: label,
          });
          const kept = new Set<string>([formStartDate]);
          for (const sib of future) {
            const date = sib.start.slice(0, 10);
            if (newDates.includes(date) && !kept.has(date)) {
              kept.add(date);
              await scheduleRepo.update(api, sib.id, {
                ...common,
                ...timesFor(date),
                seriesId,
                recurrenceLabel: label,
              });
            } else {
              await scheduleRepo.delete(api, sib.id, 'This session was removed when the repeating schedule changed.');
            }
          }
          for (const date of newDates) {
            if (!kept.has(date)) await createOn(date, seriesId);
          }
          dialog.alert('Updated!', 'This and all future sessions were updated.', [{ text: 'OK' }], 'checkmark');
        } else {
          // Single session: update it, and optionally turn it into a repeating series.
          const seriesId = newDates.length > 1 ? `series-${Date.now()}` : undefined;
          await scheduleRepo.update(api, editingItemId, {
            ...common,
            ...timesFor(formStartDate),
            seriesId,
            recurrenceLabel: label,
          });
          for (const date of newDates) {
            if (date !== formStartDate) await createOn(date, seriesId);
          }
          dialog.alert(
            'Updated!',
            newDates.length > 1
              ? `Updated, and ${newDates.length - 1} repeating sessions were added.`
              : 'Schedule item updated and participants notified if time changed.',
            [{ text: 'OK' }],
            'checkmark',
          );
        }
      } else {
        const seriesId = newDates.length > 1 ? `series-${Date.now()}` : undefined;
        for (const date of newDates) {
          await createOn(date, seriesId);
        }
        dialog.alert(
          'Created!',
          newDates.length > 1
            ? `${newDates.length} sessions have been published to the YMCA schedule.`
            : 'New class or event has been published to the YMCA schedule.',
          [{ text: 'OK' }],
          'checkmark',
        );
      }
      setItemModalVisible(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Could not save schedule item.');
    } finally {
      setFormSubmitting(false);
    }
  }

  function promptCancel(item: ScheduleItem, scope: 'one' | 'future' = 'one') {
    setItemToCancel({ id: item.id, title: item.title, type: 'class', seriesId: item.seriesId, start: item.start });
    setCancelScope(item.seriesId ? scope : 'one');
    setCancelReason('Instructor unwell or emergency facility maintenance.');
    setCancelModalVisible(true);
  }

  function promptCancelLesson(lesson: PrivateLesson) {
    const memberName = memberMap[lesson.memberId]?.name ?? 'Member';
    setItemToCancel({ id: lesson.id, title: `Private Lesson with ${memberName}`, type: 'lesson' });
    setCancelReason('Trainer schedule conflict or illness.');
    setCancelModalVisible(true);
  }

  async function handleConfirmCancel() {
    if (!itemToCancel) return;
    setCancelling(true);
    try {
      if (itemToCancel.type === 'class') {
        let ids = [itemToCancel.id];
        if (itemToCancel.seriesId && cancelScope === 'future') {
          const all = await api.listAllSchedules(BRANCH_ID);
          ids = all
            .filter((x) => x.seriesId === itemToCancel.seriesId && x.start >= (itemToCancel.start ?? ''))
            .map((x) => x.id);
          if (!ids.includes(itemToCancel.id)) ids.push(itemToCancel.id);
        }
        for (const id of ids) {
          await scheduleRepo.cancelClassAndNotify(api, id, cancelReason.trim());
        }
        dialog.alert(
          ids.length > 1 ? `${ids.length} Sessions Cancelled` : 'Class Cancelled',
          'The cancelled sessions have been removed and automated alerts have been sent to all registered attendees.',
          [{ text: 'OK' }],
          'checkmark'
        );
      } else {
        await api.cancelLessonAndNotify(itemToCancel.id, cancelReason.trim());
        dialog.alert(
          'Lesson Cancelled',
          'Private lesson was cancelled and client notified with reason.',
          [{ text: 'OK' }],
          'checkmark'
        );
      }
      setCancelModalVisible(false);
      setItemToCancel(null);
      await loadData();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to cancel session.', [{ text: 'OK' }]);
    } finally {
      setCancelling(false);
    }
  }

  function openRoster(item: ScheduleItem) {
    setAttendanceItem(item);
    setAttendanceModalVisible(true);
  }

  async function handleRemoveAttendee(memberId: string) {
    if (!rosterItem) return;
    try {
      await api.cancelClassRegistration(memberId, rosterItem.id);
      const updated = await registrationRepo.roster(api, rosterItem.id);
      setRosterList(updated);
      setRosterCounts((prev) => ({ ...prev, [rosterItem.id]: updated.length }));
      dialog.alert('Removed', 'Member removed from roster.', [{ text: 'OK' }], 'checkmark');
    } catch {
      dialog.alert('Error', 'Could not remove member.', [{ text: 'OK' }]);
    }
  }

  async function handleAddSlot() {
    setSlotSubmitting(true);
    try {
      const dates = expandRepeat(slotDate, slotRepeat);
      if (dates.length === 0) {
        dialog.alert('Pick a day', 'Choose at least one day of the week for the repeat.', [{ text: 'OK' }]);
        return;
      }
      for (const date of dates) {
        await api.addLessonSlot({
          staffId: lessonStaffId,
          branchId: BRANCH_ID,
          start: `${date}T${slotStart}:00-04:00`,
          end: `${date}T${slotEnd}:00-04:00`,
          location: slotLocation.trim(),
        });
      }
      setSlotModalVisible(false);
      setSlotRepeat(DEFAULT_REPEAT);
      dialog.alert(
        'Availability Added',
        dates.length > 1
          ? `${dates.length} availability windows created. Members request times inside them.`
          : 'New availability window created. Members request times inside it.',
        [{ text: 'OK' }],
        'checkmark',
      );
      await loadData();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not add slot.', [{ text: 'OK' }]);
    } finally {
      setSlotSubmitting(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    try {
      await api.deleteLessonSlot(slotId);
      await loadData();
    } catch {
      dialog.alert('Error', 'Could not remove slot.', [{ text: 'OK' }]);
    }
  }

  return (
    <View style={styles.screen}>
      <YHeader />
      {error ? <ErrorBanner onRetry={() => void loadData()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.actionRow}>
          {canManageSchedules ? (
            <Pressable
              onPress={openCreateModal}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>New class or event</Text>
            </Pressable>
          ) : canManageOwnSlots ? (
            <Pressable
              onPress={() => setSlotModalVisible(true)}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Add available slot</Text>
            </Pressable>
          ) : null}
        </View>

        {canManageOwnSlots && !isAdmin ? (
          <View style={styles.segmentContainer}>
            <Pressable
              onPress={() => setActiveTab('classes')}
              style={[styles.segmentBtn, activeTab === 'classes' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, activeTab === 'classes' && styles.segmentTextActive]}>
                My Classes ({schedules.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('lessons')}
              style={[styles.segmentBtn, activeTab === 'lessons' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, activeTab === 'lessons' && styles.segmentTextActive]}>
                Private Lessons & Slots
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ========================================== */}
        {/* TAB 1: GROUP CLASSES & EVENTS */}
        {/* ========================================== */}
        {activeTab === 'classes' ? (
          <View style={{ gap: 14 }}>
            {/* Search Bar */}
            <TextField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search classes by title, instructor, studio..."
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Category Filter Horizontal Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Items List */}
            {filteredClasses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={40} color={colors.muted} />
                <Text style={styles.emptyText}>No classes or events found matching criteria.</Text>
              </View>
            ) : (
              filteredClasses.map((item) => {
                const rosterCount = rosterCounts[item.id] ?? 0;
                return (
                  <View key={item.id} style={styles.classCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View style={[styles.catBadge, { backgroundColor: item.isSpecialEvent ? '#FEF3C7' : '#EFF6FF' }]}>
                            <Text
                              style={[
                                styles.catBadgeText,
                                { color: item.isSpecialEvent ? '#B45309' : colors.primary },
                              ]}
                            >
                              {item.isSpecialEvent ? 'Special Event' : item.category.toUpperCase()}
                            </Text>
                          </View>
                          {item.seniorFriendly ? (
                            <View style={[styles.catBadge, { backgroundColor: '#F0FDF4' }]}>
                              <Text style={[styles.catBadgeText, { color: '#15803D' }]}>Senior Friendly</Text>
                            </View>
                          ) : null}
                          {item.priceCents && item.priceCents > 0 ? (
                            <View style={[styles.catBadge, { backgroundColor: '#FDF2F8' }]}>
                              <Text style={[styles.catBadgeText, { color: '#BE185D' }]}>
                                ${(item.priceCents / 100).toFixed(2)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.classTitle}>{item.title}</Text>
                        <Text style={styles.classMeta}>
                          {item.instructorName} · {item.location}
                        </Text>
                      </View>
                    </View>

                    {/* Date and Time Bar */}
                    <View style={styles.timeBar}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={styles.timeText}>
                          {formatDate(item.start)} · {formatTime(item.start)} - {formatTime(item.end)}
                          {item.recurrenceLabel ? ` · ${item.recurrenceLabel}` : ''}
                        </Text>
                      </View>
                      {item.openAccess ? (
                        <View style={styles.rosterPill}>
                          <Ionicons name="walk" size={14} color={colors.primary} />
                          <Text style={styles.rosterPillText}>First come, first served</Text>
                        </View>
                      ) : (
                      <Pressable
                        onPress={() => void openRoster(item)}
                        style={styles.rosterPill}
                        accessibilityRole="button"
                        accessibilityLabel={`View roster: ${rosterCount} registered of ${item.capacity}`}
                      >
                        <Ionicons name="people" size={14} color={colors.primary} />
                        <Text style={styles.rosterPillText}>
                          {rosterCount}/{item.capacity} Enrolled
                        </Text>
                      </Pressable>
                      )}
                    </View>

                    {item.description ? <Text style={styles.classDesc}>{item.description}</Text> : null}

                    {/* Action Buttons for Admins & Trainers */}
                    <View style={styles.cardActions}>
                      {item.openAccess ? null : (
                      <Pressable
                        onPress={() => void openRoster(item)}
                        style={({ pressed }) => [styles.actionBtnFilled, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Take attendance for ${item.title}`}
                      >
                        <Text style={styles.actionBtnFilledText}>Attendance</Text>
                      </Pressable>
                      )}

                      <Pressable
                        onPress={() => {
                          setSelectedForumClass(item);
                          setForumModalVisible(true);
                        }}
                        style={({ pressed }) => [styles.actionBtnTonal, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Class forum and chat for ${item.title}`}
                      >
                        <Text style={styles.actionBtnText}>Forum</Text>
                      </Pressable>

                      {canManageSchedules || canManageOwnSlots ? (
                        <>
                          <Pressable
                            onPress={() => openEditModal(item)}
                            style={({ pressed }) => [styles.actionBtnTonal, pressed && styles.pressed]}
                            accessibilityRole="button"
                          >
                            <Text style={styles.actionBtnText}>Edit</Text>
                          </Pressable>

                          {item.seriesId ? (
                            <Pressable
                              onPress={() => openEditModal(item, 'future')}
                              style={({ pressed }) => [styles.actionBtnTonal, pressed && styles.pressed]}
                              accessibilityRole="button"
                              accessibilityLabel={`Edit this and all future sessions of ${item.title}`}
                            >
                              <Text style={styles.actionBtnText}>Edit All Future</Text>
                            </Pressable>
                          ) : null}

                          <Pressable
                            onPress={() => promptCancel(item)}
                            style={({ pressed }) => [styles.actionBtnGhost, pressed && styles.pressed]}
                            accessibilityRole="button"
                          >
                            <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Cancel</Text>
                          </Pressable>

                          {item.seriesId ? (
                            <Pressable
                              onPress={() => promptCancel(item, 'future')}
                              style={({ pressed }) => [styles.actionBtnGhost, pressed && styles.pressed]}
                              accessibilityRole="button"
                              accessibilityLabel={`Cancel this and all future sessions of ${item.title}`}
                            >
                              <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Cancel All Future</Text>
                            </Pressable>
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {/* ========================================== */}
        {/* TAB 2: PRIVATE LESSONS & SLOTS (TRAINER) */}
        {/* ========================================== */}
        {activeTab === 'lessons' ? (
          <View style={{ gap: 16 }}>
            {canManageAllSlots ? (
              <View style={{ gap: 6 }}>
                <Text style={styles.sectionHeader}>Trainer</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  {allStaff
                    .filter((st) => st.staffRole === 'trainer' || st.staffRole === 'swim_instructor' || st.staffRole === 'wellness_director')
                    .map((st) => {
                      const active = lessonStaffId === st.id;
                      return (
                        <Pressable
                          key={st.id}
                          onPress={() => setSlotTrainerId(st.id)}
                          style={[styles.categoryChip, active && styles.categoryChipActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                            {st.id === staffId ? 'Me' : st.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.sectionHeader}>Booked Private Lessons</Text>
            {privateLessons.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="person-circle-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyText}>No private lessons scheduled for today.</Text>
              </View>
            ) : (
              privateLessons.map((l) => {
                const member = memberMap[l.memberId];
                return (
                  <View key={l.id} style={styles.classCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.classTitle}>{member?.name ?? 'Member Client'}</Text>
                        <Text style={styles.classMeta}>{member?.phone ?? member?.email ?? 'Client'}</Text>
                        <Text style={styles.classMeta}>Location: {l.location}</Text>
                        <Text style={[styles.timeText, { marginTop: 4 }]}>
                          Time: {formatTime(l.start)} - {formatTime(l.end)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.catBadge,
                          { backgroundColor: l.status === 'booked' ? '#F0FDF4' : '#FEE2E2' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catBadgeText,
                            { color: l.status === 'booked' ? '#15803D' : colors.scarlet },
                          ]}
                        >
                          {l.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {l.status === 'booked' ? (
                      <View style={[styles.cardActions, { marginTop: 12 }]}>
                        <Pressable
                          onPress={async () => {
                            try {
                              await trainerRepo.markLessonStatus(api, l.id, 'completed', 'Completed 1-on-1 private lesson.');
                              await loadData();
                              const m = memberMap[l.memberId];
                              if (m) {
                                setSelectedWorkoutMember(m);
                                setWorkoutModalVisible(true);
                              }
                            } catch {
                              dialog.alert('Error', 'Could not complete lesson.');
                            }
                          }}
                          style={[styles.actionBtnOutline, { borderColor: '#15803D', backgroundColor: '#F0FDF4', flex: 1.5 }]}
                          accessibilityRole="button"
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
                          <Text style={[styles.actionBtnText, { color: '#15803D' }]}>Complete & Log</Text>
                        </Pressable>

                        <Pressable
                          onPress={async () => {
                            try {
                              await trainerRepo.markLessonStatus(api, l.id, 'no_show', 'Client did not attend.');
                              await loadData();
                            } catch {
                              dialog.alert('Error', 'Could not mark no-show.');
                            }
                          }}
                          style={[styles.actionBtnOutline, { borderColor: colors.scarlet }]}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>No-Show</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => promptCancelLesson(l)}
                          style={styles.actionBtnDestructive}
                          accessibilityRole="button"
                        >
                          <Ionicons name="close-circle-outline" size={16} color={colors.scarlet} />
                          <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}

            {/* Open Availability Slots */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={styles.sectionHeader}>Availability Windows</Text>
              <Pressable
                onPress={() => setSlotModalVisible(true)}
                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>+ Add Availability</Text>
              </Pressable>
            </View>

            {lessonSlots.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyText}>No availability set. Add the hours you are free (for example 9 AM to 2 PM) so members can request sessions.</Text>
              </View>
            ) : (
              lessonSlots.map((slot) => (
                <View key={slot.id} style={styles.slotRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotTime}>
                      {formatDate(slot.start)} · {formatTime(slot.start)} - {formatTime(slot.end)}
                    </Text>
                    <Text style={styles.slotLocation}>{slot.location}</Text>
                  </View>
                  <Pressable
                    onPress={() => void handleDeleteSlot(slot.id)}
                    style={styles.slotDeleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Remove slot"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.scarlet} />
                  </Pressable>
                </View>
              ))
            )}

            <AvailabilitySettings key={lessonStaffId} staffId={lessonStaffId} accent={colors.primary} />
          </View>
        ) : null}
      </ScrollView>

      {/* ========================================== */}
      {/* MODAL: CREATE / EDIT CLASS OR EVENT */}
      {/* ========================================== */}
      <Modal visible={itemModalVisible} animationType="slide" transparent onRequestClose={() => setItemModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItemId ? 'Edit Class / Event' : 'Create New Class / Event'}</Text>
              <Pressable onPress={() => setItemModalVisible(false)} hitSlop={16} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            {formError ? <ErrorBanner message={formError} /> : null}

            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              <TextField label="Title / Class Name" value={formTitle} onChangeText={setFormTitle} placeholder="e.g. Sunrise Yoga Flow" />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {(['groupEx', 'seniors', 'swim', 'event'] as ScheduleCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setFormCategory(cat)}
                    style={[styles.miniChip, formCategory === cat && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipText, formCategory === cat && styles.miniChipTextActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Instructor / Staff Assignment */}
              <View>
                <Text style={styles.fieldLabel}>Instructor / Staff Assignment</Text>
                {allStaff.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>
                    {allStaff.map((st) => {
                      const isSelected = formStaffId === st.id;
                      return (
                        <Pressable
                          key={st.id}
                          onPress={() => {
                            setFormStaffId(st.id);
                            setFormInstructor(st.name);
                          }}
                          style={[styles.miniChip, isSelected && styles.miniChipActive]}
                        >
                          <Text style={[styles.miniChipText, isSelected && styles.miniChipTextActive]}>
                            {st.name} ({st.roleLabel})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
                <TextField
                  label="Instructor Display Name"
                  value={formInstructor}
                  onChangeText={setFormInstructor}
                  placeholder="e.g. Jane Doe or Guest Instructor"
                />
              </View>

              <TextField label="Location / Studio / Pool Lane" value={formLocation} onChangeText={setFormLocation} placeholder="e.g. Studio A, 25m Pool Lane 2" />

              {/* Date & Time Wheel Picker */}
              <DateTimeWheelPicker
                selectedDate={formStartDate}
                onDateChange={setFormStartDate}
                selectedTime={formStartTime}
                onTimeChange={(t) => {
                  setFormStartTime(t);
                  setFormEndTime(computeEndTime(t, formDurationMinutes));
                }}
                label="Class Date & Start Time"
              />

              {/* Duration Selector */}
              <View>
                <Text style={styles.fieldLabel}>Class Duration</Text>
                <View style={styles.chipRow}>
                  {[30, 45, 50, 60, 75, 90].map((mins) => {
                    const active = formDurationMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => {
                          setFormDurationMinutes(mins);
                          setFormEndTime(computeEndTime(formStartTime, mins));
                        }}
                        style={[styles.miniChip, active && styles.miniChipActive]}
                      >
                        <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>
                          {mins} Mins
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  Scheduled: {formStartTime} - {formEndTime} ({formDurationMinutes} mins)
                </Text>
              </View>

              {/* Repeat: available when creating and when editing */}
              {editingItemId && formEditingItem?.seriesId ? (
                <View>
                  <Text style={styles.fieldLabel}>Apply changes to</Text>
                  <View style={styles.chipRow}>
                    {([
                      ['one', 'Just this session'],
                      ['future', 'This & all future sessions'],
                    ] as const).map(([key, text]) => {
                      const active = formApplyScope === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setFormApplyScope(key)}
                          style={[styles.miniChip, active && styles.miniChipActive]}
                        >
                          <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>{text}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {!(editingItemId && formEditingItem?.seriesId && formApplyScope === 'one') ? (
                <RepeatPicker value={formRepeat} onChange={setFormRepeat} startDate={formStartDate} />
              ) : null}

              {/* Capacity mode */}
              <View>
                <Text style={styles.fieldLabel}>Capacity</Text>
                <View style={styles.chipRow}>
                  <Pressable
                    onPress={() => setFormOpenAccess(true)}
                    style={[styles.miniChip, formOpenAccess && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipText, formOpenAccess && styles.miniChipTextActive]}>
                      First come, first served
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFormOpenAccess(false)}
                    style={[styles.miniChip, !formOpenAccess && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipText, !formOpenAccess && styles.miniChipTextActive]}>
                      Limited spots
                    </Text>
                  </Pressable>
                </View>
                {formOpenAccess ? (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                    Capacity is not shown and attendance is not checked.
                  </Text>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {!formOpenAccess ? (
                  <View style={{ flex: 1 }}>
                    <TextField label="Spots" value={formCapacity} onChangeText={setFormCapacity} keyboardType="numeric" />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <TextField label="Price $ (0 = free)" value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" />
                </View>
              </View>

              <TextField
                label="Description & Member Instructions"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="What to bring, equipment details, prerequisites..."
                multiline
              />

              {/* Toggles */}
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                <Pressable
                  onPress={() => setFormSeniorFriendly(!formSeniorFriendly)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Ionicons
                    name={formSeniorFriendly ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={{ fontSize: 14, color: colors.nearBlack }}>Senior Friendly</Text>
                </Pressable>
                <Pressable
                  onPress={() => setFormIsSpecialEvent(!formIsSpecialEvent)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Ionicons
                    name={formIsSpecialEvent ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={{ fontSize: 14, color: colors.nearBlack }}>Special Community Event</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title={editingItemId ? 'Save Changes' : 'Publish to Schedule'}
                  onPress={() => void handleSaveItem()}
                  loading={formSubmitting}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: CANCEL SESSION WITH REASON */}
      {/* ========================================== */}
      <Modal visible={cancelModalVisible} animationType="fade" transparent onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalAlertBox}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="alert-circle" size={32} color={colors.scarlet} />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 8, textAlign: 'center' }]}>Cancel Session & Alert Members</Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4 }}>
                {itemToCancel?.title}
              </Text>
            </View>

            {itemToCancel?.seriesId ? (
              <View style={[styles.chipRow, { justifyContent: 'center', marginBottom: 12 }]}>
                {([
                  ['one', 'Just this session'],
                  ['future', 'This & all future'],
                ] as const).map(([key, text]) => {
                  const active = cancelScope === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setCancelScope(key)}
                      style={[styles.miniChip, active && styles.miniChipActive]}
                    >
                      <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>{text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <TextField
              label="Cancellation Reason (sent to all enrolled members):"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
              placeholder="e.g. Instructor illness, pool maintenance..."
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setCancelModalVisible(false)}
                style={[styles.actionBtnOutline, { flex: 1, paddingVertical: 12 }]}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600', color: colors.muted }}>Keep Session</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleConfirmCancel()}
                disabled={cancelling}
                style={[styles.primaryActionBtn, { flex: 1, backgroundColor: colors.scarlet }]}
              >
                <Text style={styles.primaryActionText}>{cancelling ? 'Sending Alerts...' : 'Cancel & Notify'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: ROSTER ATTENDEE LIST */}
      {/* ========================================== */}
      <Modal visible={rosterModalVisible} animationType="slide" transparent onRequestClose={() => setRosterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Registered Roster</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>{rosterItem?.title}</Text>
              </View>
              <Pressable onPress={() => setRosterModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {rosterLoading ? (
                <Text style={styles.emptyText}>Loading attendee list...</Text>
              ) : rosterList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={32} color={colors.muted} />
                  <Text style={styles.emptyText}>No members registered yet for this session.</Text>
                </View>
              ) : (
                rosterList.map((m) => (
                  <View key={m.id} style={styles.rosterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.nearBlack }}>{m.name}</Text>
                      <Text style={{ fontSize: 13, color: colors.muted }}>
                        {m.email} · ID {m.membershipId}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void handleRemoveAttendee(m.id)}
                      style={styles.removeAttendeeBtn}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: colors.scarlet, fontSize: 12, fontWeight: '700' }}>Remove</Text>
                    </Pressable>
                  </View>
                ))
              )}

              {rosterItem ? (
                <Pressable
                  onPress={() => {
                    setRosterModalVisible(false);
                    setSelectedForumClass(rosterItem);
                    setForumModalVisible(true);
                  }}
                  style={[styles.primaryActionBtn, { backgroundColor: '#7C3AED', marginTop: 12 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Open Class Community Forum</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: ADD LESSON SLOT (TRAINER) */}
      {/* ========================================== */}
      <Modal visible={slotModalVisible} animationType="slide" transparent onRequestClose={() => setSlotModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Add Open Availability Slot</Text>
              </View>
              <Pressable onPress={() => setSlotModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              <DateTimeWheelPicker
                selectedDate={slotDate}
                onDateChange={setSlotDate}
                selectedTime={slotStart}
                onTimeChange={(t) => {
                  setSlotStart(t);
                  setSlotEnd(computeEndTime(t, slotDurationMinutes));
                }}
                label="Slot Date & Start Time"
              />

              {/* Duration selector for slot */}
              <View>
                <Text style={styles.fieldLabel}>Lesson Duration</Text>
                <View style={styles.chipRow}>
                  {[30, 45, 60, 90].map((mins) => {
                    const active = slotDurationMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => {
                          setSlotDurationMinutes(mins);
                          setSlotEnd(computeEndTime(slotStart, mins));
                        }}
                        style={[styles.miniChip, active && styles.miniChipActive]}
                      >
                        <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>
                          {mins} Mins
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  Slot Interval: {slotStart} - {slotEnd} ({slotDurationMinutes} mins)
                </Text>
              </View>

              <RepeatPicker value={slotRepeat} onChange={setSlotRepeat} startDate={slotDate} />

              <TextField label="Location" value={slotLocation} onChangeText={setSlotLocation} placeholder="e.g. Studio B, Pool Lane 3" />

              <View style={{ marginTop: 8 }}>
                <PrimaryButton title="Save Available Slot" onPress={() => void handleAddSlot()} loading={slotSubmitting} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CLASS FORUM & COMMUNITY CHAT MODAL */}
      <ClassForumModal
        visible={forumModalVisible}
        onClose={() => setForumModalVisible(false)}
        scheduleItem={selectedForumClass}
      />

      {/* CLASS ATTENDANCE & CHECK-IN MODAL */}
      <ClassAttendanceModal
        visible={attendanceModalVisible}
        onClose={() => setAttendanceModalVisible(false)}
        scheduleItem={attendanceItem}
        onAttendanceChanged={() => void loadData()}
      />

      {/* TRAINER WORKOUT LOGGING MODAL */}
      <TrainerClientWorkoutModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        member={selectedWorkoutMember}
        onSaved={() => void loadData()}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  bannerTitle: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 15,
  },
  bannerSubtitle: {
    ...typography.body,
    fontSize: 12,
    color: colors.nearBlack,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radii.md,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    ...cardStyle,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nearBlack,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  classCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...cardStyle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  classTitle: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 17,
    color: colors.nearBlack,
  },
  classMeta: {
    ...typography.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  timeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.nearBlack,
  },
  rosterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rosterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  classDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
  actionBtnFilled: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  actionBtnFilledText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnTonal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  actionBtnGhost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  actionBtnDestructive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardStyle,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  slotLocation: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  slotDeleteBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 24,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 20,
    ...cardStyle,
  },
  modalAlertBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 20,
    ...cardStyle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nearBlack,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  miniChip: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  miniChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniChipText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  miniChipTextActive: {
    color: '#FFFFFF',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 14,
    color: colors.nearBlack,
    height: 70,
    textAlignVertical: 'top',
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  removeAttendeeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
});
}
