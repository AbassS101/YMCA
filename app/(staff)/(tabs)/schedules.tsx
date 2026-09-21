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

import { ClassForumModal } from '@/components/ClassForumModal';
import { DateTimeWheelPicker } from '@/components/DateTimeWheelPicker';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { formatShortDate } from '@/domain/displayDates';
import { isAdminRole, type LessonSlot, type Member, type PrivateLesson, type ScheduleCategory, type ScheduleItem, type Staff } from '@/domain/types';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

const CATEGORIES: { key: ScheduleCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'groupEx', label: 'Group Fitness' },
  { key: 'seniors', label: 'Seniors / AOA' },
  { key: 'swim', label: 'Aquatics & Swim' },
  { key: 'childWatch', label: 'Child Watch' },
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
  const staffId = session?.userId ?? '';
  const isAdmin = isAdminRole(session?.role);
  const isTrainer = session?.role === 'trainer' || (!isAdmin && session?.role === 'staff');

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
  const [formPrice, setFormPrice] = useState('0');
  const [formDescription, setFormDescription] = useState('');
  const [formSeniorFriendly, setFormSeniorFriendly] = useState(false);
  const [formIsSpecialEvent, setFormIsSpecialEvent] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Cancellation & Notification Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{ id: string; title: string; type: 'class' | 'lesson' } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

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
      if (isAdmin) {
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
      const slots = await api.listLessonSlots(staffId, '2026-09-01', '2026-09-30').catch(() => []);
      setLessonSlots(slots);

      const dayLessons = await api.listStaffLessons(staffId, '2026-09-15').catch(() => []);
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
  }, [api, staffId, isAdmin]);

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
    setFormPrice('0');
    setFormDescription('');
    setFormSeniorFriendly(false);
    setFormIsSpecialEvent(false);
    setFormError(null);
    setItemModalVisible(true);
  }

  function openEditModal(item: ScheduleItem) {
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
      const startIso = `${formStartDate}T${formStartTime}:00-04:00`;
      const endIso = `${formStartDate}T${calculatedEnd}:00-04:00`;
      const cap = parseInt(formCapacity, 10) || 20;
      const priceC = Math.round(parseFloat(formPrice || '0') * 100);
      const chosenStaffId = formStaffId || staffId;

      if (editingItemId) {
        await scheduleRepo.update(api, editingItemId, {
          title: formTitle.trim(),
          category: formCategory,
          instructorName: formInstructor.trim(),
          staffId: chosenStaffId,
          location: formLocation.trim(),
          start: startIso,
          end: endIso,
          capacity: cap,
          priceCents: priceC,
          description: formDescription.trim(),
          seniorFriendly: formSeniorFriendly,
          isSpecialEvent: formIsSpecialEvent,
        });
        dialog.alert('Updated!', 'Schedule item updated and participants notified if time changed.', [{ text: 'OK' }], 'checkmark');
      } else {
        await scheduleRepo.create(api, {
          branchId: BRANCH_ID,
          title: formTitle.trim(),
          category: formCategory,
          instructorName: formInstructor.trim(),
          staffId: chosenStaffId,
          location: formLocation.trim(),
          start: startIso,
          end: endIso,
          capacity: cap,
          priceCents: priceC,
          description: formDescription.trim(),
          seniorFriendly: formSeniorFriendly,
          isSpecialEvent: formIsSpecialEvent,
        });
        dialog.alert('Created!', 'New class or event has been published to the YMCA schedule.', [{ text: 'OK' }], 'checkmark');
      }
      setItemModalVisible(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Could not save schedule item.');
    } finally {
      setFormSubmitting(false);
    }
  }

  function promptCancel(item: ScheduleItem) {
    setItemToCancel({ id: item.id, title: item.title, type: 'class' });
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
        await scheduleRepo.cancelClassAndNotify(api, itemToCancel.id, cancelReason.trim());
        dialog.alert(
          'Class Cancelled',
          'The session was cancelled and automated alerts have been sent to all registered attendees.',
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

  async function openRoster(item: ScheduleItem) {
    setRosterItem(item);
    setRosterModalVisible(true);
    setRosterLoading(true);
    try {
      const roster = await registrationRepo.roster(api, item.id);
      setRosterList(roster);
    } catch {
      setRosterList([]);
    } finally {
      setRosterLoading(false);
    }
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
      const startIso = `${slotDate}T${slotStart}:00-04:00`;
      const endIso = `${slotDate}T${slotEnd}:00-04:00`;
      await api.addLessonSlot({
        staffId,
        branchId: BRANCH_ID,
        start: startIso,
        end: endIso,
        location: slotLocation.trim(),
      });
      setSlotModalVisible(false);
      dialog.alert('Slot Added', 'New open private lesson availability created.', [{ text: 'OK' }], 'checkmark');
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
      <YHeader subtitle={isAdmin ? 'Staff Admin · Schedules & Events' : 'Trainer Portal · Schedules'} />
      {error ? <ErrorBanner onRetry={() => void loadData()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Quick Action Buttons */}
        <View style={styles.actionRow}>
          {isAdmin ? (
            <Pressable
              onPress={openCreateModal}
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>+ New Class or Event</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setSlotModalVisible(true)}
              style={[styles.primaryActionBtn, { backgroundColor: '#15803D' }]}
              accessibilityRole="button"
            >
              <Ionicons name="time" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>+ Add Available Slot</Text>
            </Pressable>
          )}
        </View>

        {/* Trainer Tab Switcher */}
        {isTrainer && !isAdmin ? (
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={styles.timeText}>
                          {formatDate(item.start)} · {formatTime(item.start)} - {formatTime(item.end)}
                        </Text>
                      </View>
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
                    </View>

                    {item.description ? <Text style={styles.classDesc}>{item.description}</Text> : null}

                    {/* Action Buttons for Admins & Trainers */}
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => {
                          setSelectedForumClass(item);
                          setForumModalVisible(true);
                        }}
                        style={[styles.actionBtnOutline, { borderColor: '#C084FC', flex: 1.2 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Class forum and chat for ${item.title}`}
                      >
                        <Ionicons name="chatbubbles-outline" size={16} color="#7C3AED" />
                        <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Class Forum</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openEditModal(item)}
                        style={styles.actionBtnOutline}
                        accessibilityRole="button"
                      >
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => promptCancel(item)}
                        style={styles.actionBtnDestructive}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close-circle-outline" size={16} color={colors.scarlet} />
                        <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Cancel</Text>
                      </Pressable>
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
            {/* Booked Lessons */}
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
                          onPress={() => promptCancelLesson(l)}
                          style={styles.actionBtnDestructive}
                          accessibilityRole="button"
                        >
                          <Ionicons name="close-circle-outline" size={16} color={colors.scarlet} />
                          <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Cancel & Alert Client</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}

            {/* Open Availability Slots */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={styles.sectionHeader}>Open Availability Slots</Text>
              <Pressable
                onPress={() => setSlotModalVisible(true)}
                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>+ Add Slot</Text>
              </Pressable>
            </View>

            {lessonSlots.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyText}>No available slots configured. Add open times for members to book.</Text>
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
              <Pressable onPress={() => setItemModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            {formError ? <ErrorBanner message={formError} /> : null}

            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              <TextField label="Title / Class Name" value={formTitle} onChangeText={setFormTitle} placeholder="e.g. Sunrise Yoga Flow" />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {(['groupEx', 'seniors', 'swim', 'childWatch', 'event'] as ScheduleCategory[]).map((cat) => (
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
                  placeholder="e.g. Sarah Jenkins or Guest Instructor"
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

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField label="Capacity" value={formCapacity} onChangeText={setFormCapacity} keyboardType="numeric" />
                </View>
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

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.nearBlack, marginBottom: 4 }}>
              Cancellation Reason (sent to all enrolled members):
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              style={styles.reasonInput}
              multiline
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

            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeText: {
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
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  miniChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniChipText: {
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
