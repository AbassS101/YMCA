import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { ClientWorkoutLog, Member, WorkoutExercise } from '@/domain/types';
import { trainerRepo } from '@/repositories/trainerRepo';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';

const SESSION_TYPES: { key: ClientWorkoutLog['sessionType']; label: string; icon: string }[] = [
  { key: 'strength', label: 'Strength & Weights', icon: 'barbell-outline' },
  { key: 'cardio', label: 'Cardio & Conditioning', icon: 'speedometer-outline' },
  { key: '1-on-1', label: '1-on-1 Coaching', icon: 'person-outline' },
  { key: 'self-directed', label: 'Self-Guided Workout', icon: 'fitness-outline' },
  { key: 'mobility', label: 'Mobility & Recovery', icon: 'body-outline' },
  { key: 'hiit', label: 'HIIT & Circuit', icon: 'flame-outline' },
  { key: 'assessment', label: 'Assessment & Test', icon: 'clipboard-outline' },
];

const COMMON_EXERCISES = [
  'Barbell Back Squat',
  'Barbell Bench Press',
  'Romanian Deadlift',
  'Dumbbell Shoulder Press',
  'Seated Cable Row',
  'Lat Pulldown',
  'Bulgarian Split Squats',
  'Plank Hold',
  'Kettlebell Swings',
  'Incline DB Press',
  'Bicep Curls',
];

function getOffsetDateString(baseIsoDate: string, offsetDays: number): string {
  const parts = baseIsoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return baseIsoDate;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface DateWheelItem {
  iso: string;
  dayName: string;
  monthDay: string;
  badge?: string;
}

function formatDateCardParts(iso: string, todayIso: string, yesterdayIso: string): DateWheelItem {
  const parts = iso.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN) && iso.length === 10) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) {
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const badge =
        iso === todayIso ? 'TODAY' : iso === yesterdayIso ? 'YESTERDAY' : undefined;
      return { iso, dayName, monthDay, badge };
    }
  }
  return { iso, dayName: 'Date', monthDay: iso };
}

const REPS_WHEEL_OPTIONS: string[] = [
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
  '6-8',
  '8-10',
  '10-12',
  '12-15',
  'AMRAP',
];
const REPS_ITEM_HEIGHT = 32;
const REPS_VISIBLE_ROWS = 3;

interface RepsWheelProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  textColor: string;
  mutedColor: string;
  highlightBg: string;
  backgroundColor: string;
  borderColor: string;
  accessibilityLabel: string;
}

function RepsWheel({
  value,
  onChange,
  disabled,
  textColor,
  mutedColor,
  highlightBg,
  backgroundColor,
  borderColor,
  accessibilityLabel,
}: RepsWheelProps) {
  const ref = useRef<ScrollView>(null);
  const trimmed = value.trim();
  const options =
    trimmed && !REPS_WHEEL_OPTIONS.includes(trimmed)
      ? [trimmed, ...REPS_WHEEL_OPTIONS]
      : REPS_WHEEL_OPTIONS;
  const selectedIndex = Math.max(0, options.indexOf(trimmed));
  const pad = ((REPS_VISIBLE_ROWS - 1) / 2) * REPS_ITEM_HEIGHT;

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * REPS_ITEM_HEIGHT, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (y: number) => {
    const idx = Math.min(options.length - 1, Math.max(0, Math.round(y / REPS_ITEM_HEIGHT)));
    if (options[idx] !== trimmed) onChange(options[idx]);
  };

  return (
    <View
      style={{
        height: REPS_ITEM_HEIGHT * REPS_VISIBLE_ROWS,
        borderWidth: 1,
        borderColor,
        borderRadius: radii.sm,
        backgroundColor,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: pad,
          height: REPS_ITEM_HEIGHT,
          backgroundColor: highlightBg,
        }}
      />
      <ScrollView
        ref={ref}
        scrollEnabled={!disabled}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={REPS_ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: pad }}
        onMomentumScrollEnd={(e) => commit(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => commit(e.nativeEvent.contentOffset.y)}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: trimmed }}
      >
        {options.map((opt, i) => (
          <Pressable
            key={opt}
            disabled={disabled}
            onPress={() => {
              ref.current?.scrollTo({ y: i * REPS_ITEM_HEIGHT, animated: true });
              onChange(opt);
            }}
            style={{ height: REPS_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: i === selectedIndex ? '800' : '500',
                color: i === selectedIndex ? textColor : mutedColor,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function formatReadableDateLabel(iso: string): string {
  const parts = iso.trim().split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN) && iso.trim().length === 10) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return 'Custom Date';
}

interface TrainerClientWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  member?: Member | null;
  memberId?: string;
  memberName?: string;
  initialLog?: ClientWorkoutLog | null;
  mode?: 'trainer' | 'member';
  trainerId?: string;
  trainerName?: string;
  onSaved?: (savedLog: ClientWorkoutLog) => void;
  onDeleted?: (logId: string) => void;
}

export function TrainerClientWorkoutModal({
  visible,
  onClose,
  member,
  memberId: explicitMemberId,
  memberName: explicitMemberName,
  initialLog,
  mode = 'trainer',
  trainerId: explicitTrainerId,
  trainerName: explicitTrainerName,
  onSaved,
  onDeleted,
}: TrainerClientWorkoutModalProps) {
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const effectiveMemberId =
    member?.id ?? explicitMemberId ?? (mode === 'member' ? session?.userId ?? '' : '');
  const effectiveMemberName = member?.name ?? explicitMemberName ?? 'Member';

  const isEditing = Boolean(initialLog);
  const isSelfLogged = initialLog?.loggedBy === 'member' || (!initialLog && mode === 'member');
  const canEditExercises = mode === 'trainer' || isSelfLogged || !isEditing;

  const todayStr = getDemoToday();
  const yesterdayStr = getOffsetDateString(todayStr, -1);

  const [date, setDate] = useState(todayStr);
  const dateWheelRef = useRef<ScrollView>(null);
  const dateCardX = useRef<Record<string, number>>({});

  const scrollWheelToDate = (iso: string) => {
    const x = dateCardX.current[iso];
    if (x !== undefined) {
      dateWheelRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }
  };

  useEffect(() => {
    scrollWheelToDate(date.trim());
  }, [date]);
  const [sessionType, setSessionType] = useState<ClientWorkoutLog['sessionType']>('strength');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [rpe, setRpe] = useState<number>(7);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    { name: '', sets: 3, reps: '10', weight: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialLog) {
        setDate(initialLog.date || getDemoToday());
        setSessionType(initialLog.sessionType || 'strength');
        setTitle(initialLog.title || '');
        setNotes(initialLog.notes || '');
        setClientFeedback(initialLog.clientFeedback || '');
        setRpe(initialLog.rpe ?? 7);
        setExercises(
          initialLog.exercises && initialLog.exercises.length > 0
            ? initialLog.exercises.map((e) => ({ ...e }))
            : [{ name: '', sets: 3, reps: '10', weight: '' }]
        );
      } else {
        setDate(getDemoToday());
        setSessionType(mode === 'member' ? 'self-directed' : 'strength');
        setTitle(
          mode === 'member'
            ? 'Strength & Cardio Workout'
            : member
              ? `Training Session with ${member.name.split(' ')[0]}`
              : 'Coaching Session'
        );
        setNotes('');
        setClientFeedback('');
        setRpe(7);
        setExercises([{ name: '', sets: 3, reps: '10', weight: '' }]);
      }
      setError(null);
    }
  }, [visible, initialLog, member, mode]);

  const addExerciseRow = (prefillName?: string) => {
    setExercises((prev) => {
      // If quick-adding a named exercise and the last row is still blank, fill that row first
      if (prefillName && prev.length > 0 && prev[prev.length - 1].name.trim() === '') {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          name: prefillName,
        };
        return next;
      }
      return [
        ...prev,
        { name: prefillName ?? '', sets: 3, reps: '10', weight: '' },
      ];
    });
  };

  const removeExerciseRow = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: string | number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const stepSets = (index: number, delta: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const currentSets = Number(next[index].sets) || 0;
      next[index] = { ...next[index], sets: Math.max(1, Math.min(20, currentSets + delta)) };
      return next;
    });
  };

  const handleDelete = () => {
    if (!initialLog) return;
    dialog.alert(
      'Delete Workout Log?',
      'Are you sure you want to permanently remove this workout log from the history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await trainerRepo.deleteClientWorkoutLog(api, initialLog.id);
              onDeleted?.(initialLog.id);
              onClose();
              dialog.alert('Deleted', 'Workout log removed.', [{ text: 'OK' }]);
            } catch (err: any) {
              setError(err?.message || 'Could not delete log.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
      'trash'
    );
  };

  const handleSave = async () => {
    if (!effectiveMemberId) {
      setError('Member identifier is missing.');
      return;
    }
    if (!title.trim()) {
      setError('Session title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let trainerIdToSave = explicitTrainerId ?? initialLog?.trainerId;
      let trainerNameToSave = explicitTrainerName ?? initialLog?.trainerName;

      if (mode === 'trainer' && !trainerIdToSave) {
        try {
          const staffUser = await api.getStaff(session?.userId ?? '');
          trainerIdToSave = staffUser.id;
          trainerNameToSave = staffUser.name;
        } catch {
          trainerIdToSave = session?.userId ?? 'staff-trainer';
          trainerNameToSave = 'Coach Doc';
        }
      }

      const validExercises = exercises.filter((e) => e.name.trim().length > 0);

      if (isEditing && initialLog) {
        const updates: Partial<ClientWorkoutLog> = {
          date: date.trim() || getDemoToday(),
          sessionType,
          title: title.trim(),
          rpe,
          clientFeedback: clientFeedback.trim() || undefined,
        };

        if (canEditExercises) {
          updates.exercises = validExercises;
        }
        if (mode === 'trainer') {
          updates.notes = notes.trim();
        }

        const saved = await trainerRepo.updateClientWorkoutLog(api, initialLog.id, updates);
        dialog.alert(
          'Workout Updated!',
          'Your edits have been saved to the training history.',
          [{ text: 'OK' }],
          'checkmark'
        );
        onSaved?.(saved);
      } else {
        const created = await trainerRepo.logClientWorkout(api, {
          memberId: effectiveMemberId,
          trainerId: trainerIdToSave,
          trainerName: trainerNameToSave,
          date: date.trim() || getDemoToday(),
          sessionType,
          title: title.trim(),
          notes: mode === 'trainer' ? notes.trim() : '',
          exercises: validExercises,
          rpe,
          loggedBy: mode,
          clientFeedback: clientFeedback.trim(),
        });

        dialog.alert(
          'Workout Logged!',
          mode === 'member'
            ? 'Workout successfully recorded in your training history!'
            : `Session recorded for ${effectiveMemberName}.`,
          [{ text: 'OK' }],
          'checkmark'
        );
        onSaved?.(created);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save workout log.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRpeColor = (val: number) => {
    if (val <= 4) return '#10B981';
    if (val <= 6) return '#0284C7';
    if (val <= 8) return '#F59E0B';
    return '#EF4444';
  };

  const getRpeLabel = (val: number) => {
    if (val <= 4) return 'Light · Active Recovery';
    if (val <= 6) return 'Moderate · Aerobic Base';
    if (val <= 8) return 'Vigorous · Hard Effort';
    return 'Max Effort · Peak Intensity';
  };

  const surfaceSubtle = isDark ? '#1E293B' : '#F8FAFC';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';
  const chipBg = isDark ? '#0F172A' : '#F1F5F9';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          {/* Sheet Handle Bar */}
          <View style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: tc.cardBorder }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: tc.cardBorder }]}>
            <View style={[styles.headerIconBox, { backgroundColor: tc.primaryLight }]}>
              <Ionicons name="barbell" size={20} color={tc.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: tc.text }]} allowFontScaling>
                {isEditing
                  ? 'Edit Workout Session'
                  : mode === 'member'
                    ? 'Log My Workout'
                    : 'Log Client Workout'}
              </Text>
              <Text style={[styles.subtitle, { color: tc.textMuted }]} allowFontScaling>
                {mode === 'member'
                  ? 'Record your exercises, sets, weight load, and session notes'
                  : `Recording training session for ${effectiveMemberName}`}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: surfaceSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={20} color={tc.textMuted} />
            </Pressable>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. SESSION FOCUS CHIPS */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="layers-outline" size={15} color={tc.primary} />
                <Text style={[styles.sectionHeaderLabel, { color: tc.text }]} allowFontScaling>
                  Session Focus
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeChipsScroll}
              >
                {SESSION_TYPES.map((type) => {
                  const isSelected = sessionType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      onPress={() => setSessionType(type.key)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected ? colors.primary : surfaceSubtle,
                          borderColor: isSelected ? colors.primary : tc.cardBorder,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={15}
                        color={isSelected ? '#FFFFFF' : tc.primary}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: isSelected ? '#FFFFFF' : tc.text },
                        ]}
                        allowFontScaling
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. SESSION DETAILS (TITLE & DATE STACKED CLEANLY) */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: surfaceSubtle, borderColor: tc.cardBorder },
              ]}
            >
              <View style={styles.fieldGroup}>
                <Text style={[styles.inputLabel, { color: tc.textMuted }]} allowFontScaling>
                  WORKOUT TITLE *
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Upper Body Push, Leg Day, 5K Run..."
                  placeholderTextColor={tc.textMuted}
                  style={[
                    styles.textInput,
                    {
                      color: tc.text,
                      backgroundColor: inputBg,
                      borderColor: tc.cardBorder,
                    },
                  ]}
                  accessibilityLabel="Session Title"
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.dateHeaderRow}>
                  <View style={styles.noteLabelRow}>
                    <Ionicons name="calendar-outline" size={14} color={tc.primary} />
                    <Text style={[styles.inputLabel, { color: tc.textMuted }]} allowFontScaling>
                      SESSION DATE (SCROLL OR TYPE)
                    </Text>
                  </View>
                  <View style={[styles.dateFormattedPill, { backgroundColor: tc.primaryLight }]}>
                    <Text style={[styles.dateFormattedPillText, { color: tc.primary }]}>
                      {formatReadableDateLabel(date)}
                    </Text>
                  </View>
                </View>

                {/* Horizontal Date Scroll Wheel */}
                <ScrollView
                  ref={dateWheelRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateWheelScroll}
                >
                  {(() => {
                    // Chronological; the wheel opens scrolled so today is the first visible card.
                    // Past days are to the left, upcoming days to the right.
                    const offsets = Array.from({ length: 29 }, (_, i) => i - 14);
                    const items = offsets.map((off) =>
                      formatDateCardParts(
                        getOffsetDateString(todayStr, off),
                        todayStr,
                        yesterdayStr
                      )
                    );
                    const trimmed = date.trim();
                    if (
                      /^\d{4}-\d{2}-\d{2}$/.test(trimmed) &&
                      !items.some((it) => it.iso === trimmed)
                    ) {
                      const customItem = formatDateCardParts(trimmed, todayStr, yesterdayStr);
                      customItem.badge = 'TYPED';
                      items.push(customItem);
                      items.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
                    }
                    return items.map((dItem) => {
                      const isSelected = date.trim() === dItem.iso;
                      return (
                        <Pressable
                          key={dItem.iso}
                          onPress={() => setDate(dItem.iso)}
                          onLayout={(e) => {
                            dateCardX.current[dItem.iso] = e.nativeEvent.layout.x;
                            if (dItem.iso === date.trim()) scrollWheelToDate(dItem.iso);
                          }}
                          style={[
                            styles.dateWheelCard,
                            {
                              backgroundColor: isSelected ? colors.primary : inputBg,
                              borderColor: isSelected ? colors.primary : tc.cardBorder,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`Select date ${dItem.dayName} ${dItem.monthDay}`}
                        >
                          <Text
                            style={[
                              styles.dateWheelDayName,
                              { color: isSelected ? 'rgba(255,255,255,0.85)' : tc.textMuted },
                            ]}
                          >
                            {dItem.dayName}
                          </Text>
                          <Text
                            style={[
                              styles.dateWheelMonthDay,
                              { color: isSelected ? '#FFFFFF' : tc.text },
                            ]}
                          >
                            {dItem.monthDay}
                          </Text>
                          {dItem.badge ? (
                            <View
                              style={[
                                styles.dateWheelBadge,
                                {
                                  backgroundColor: isSelected ? '#FFFFFF' : tc.primaryLight,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dateWheelBadgeText,
                                  { color: colors.primary },
                                ]}
                              >
                                {dItem.badge}
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    });
                  })()}
                </ScrollView>

                {/* Direct Typing Input + Quick Day Nudge Steppers */}
                <View
                  style={[
                    styles.dateInputRow,
                    { backgroundColor: inputBg, borderColor: tc.cardBorder },
                  ]}
                >
                  <Pressable
                    onPress={() => setDate(getOffsetDateString(date.trim() || todayStr, -1))}
                    hitSlop={8}
                    style={[styles.dateStepBtn, { backgroundColor: surfaceSubtle }]}
                    accessibilityRole="button"
                    accessibilityLabel="Previous day"
                  >
                    <Ionicons name="chevron-back" size={16} color={tc.primary} />
                  </Pressable>

                  <View style={styles.dateInputCenterWrap}>
                    <Ionicons name="create-outline" size={16} color={tc.textMuted} />
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD (Type any date)"
                      placeholderTextColor={tc.textMuted}
                      style={[styles.dateTextInput, { color: tc.text }]}
                      accessibilityLabel="Date (YYYY-MM-DD)"
                    />
                  </View>

                  {date.trim() !== todayStr ? (
                    <Pressable
                      onPress={() => setDate(todayStr)}
                      style={[styles.resetTodayChip, { backgroundColor: tc.primaryLight }]}
                      accessibilityRole="button"
                      accessibilityLabel="Jump to today"
                    >
                      <Text style={[styles.resetTodayChipText, { color: tc.primary }]}>
                        Today
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => setDate(getOffsetDateString(date.trim() || todayStr, 1))}
                    hitSlop={8}
                    style={[styles.dateStepBtn, { backgroundColor: surfaceSubtle }]}
                    accessibilityRole="button"
                    accessibilityLabel="Next day"
                  >
                    <Ionicons name="chevron-forward" size={16} color={tc.primary} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* 3. EXERCISES & PROGRESSIVE OVERLOAD BUILDER */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: surfaceSubtle, borderColor: tc.cardBorder },
              ]}
            >
              {/* Non-overlapping Responsive Header */}
              <View style={styles.exercisesHeaderRow}>
                <View style={styles.exercisesTitleWrap}>
                  <View style={[styles.smallIconBadge, { backgroundColor: tc.primaryLight }]}>
                    <Ionicons name="list" size={15} color={tc.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: tc.text }]} allowFontScaling>
                      Exercises & Sets
                    </Text>
                    <Text style={[styles.sectionSubCaption, { color: tc.textMuted }]} allowFontScaling>
                      Track progressive overload across exercises
                    </Text>
                  </View>
                </View>

                <View style={[styles.countPill, { backgroundColor: tc.primaryLight }]}>
                  <Text style={[styles.countPillText, { color: tc.primary }]}>
                    {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'}
                  </Text>
                </View>
              </View>

              {/* Quick-Add Common Exercise Pills */}
              {canEditExercises ? (
                <View style={styles.quickAddBlock}>
                  <Text style={[styles.quickAddLabel, { color: tc.textMuted }]} allowFontScaling>
                    QUICK ADD MOVEMENT:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickAddScroll}
                  >
                    {COMMON_EXERCISES.map((ex) => (
                      <Pressable
                        key={ex}
                        onPress={() => addExerciseRow(ex)}
                        style={({ pressed }) => [
                          styles.quickExChip,
                          {
                            backgroundColor: pressed ? tc.primaryLight : inputBg,
                            borderColor: tc.cardBorder,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Quick add ${ex}`}
                      >
                        <Ionicons name="add-circle" size={14} color={tc.primary} />
                        <Text style={[styles.quickExText, { color: tc.text }]} allowFontScaling>
                          {ex}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* Exercise Cards List */}
              <View style={styles.exerciseList}>
                {exercises.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.exerciseRowCard,
                      { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                    ]}
                  >
                    {/* Exercise Row Top Bar: Badge + Name Input + Delete */}
                    <View style={styles.exerciseTopRow}>
                      <View style={[styles.rowNumBadge, { backgroundColor: tc.primaryLight }]}>
                        <Text style={[styles.rowNumText, { color: tc.primary }]}>#{idx + 1}</Text>
                      </View>
                      <TextInput
                        placeholder="Exercise name (e.g. Barbell Squat)"
                        placeholderTextColor={tc.textMuted}
                        value={item.name}
                        onChangeText={(v) => updateExercise(idx, 'name', v)}
                        editable={canEditExercises}
                        style={[
                          styles.exerciseNameInput,
                          {
                            color: tc.text,
                            backgroundColor: surfaceSubtle,
                            borderColor: tc.cardBorder,
                          },
                        ]}
                        accessibilityLabel={`Exercise ${idx + 1} name`}
                      />
                      {canEditExercises && exercises.length > 1 ? (
                        <Pressable
                          onPress={() => removeExerciseRow(idx)}
                          hitSlop={8}
                          style={[
                            styles.removeRowBtn,
                            { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete exercise ${idx + 1}`}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Exercise Metrics Grid: SETS | REPS | WEIGHT / LOAD */}
                    <View style={styles.metricsGrid}>
                      {/* SETS Column with +/- Steppers */}
                      <View style={styles.metricColSets}>
                        <Text
                          style={[styles.metricLabel, { color: tc.textMuted }]}
                          numberOfLines={1}
                        >
                          SETS
                        </Text>
                        <View
                          style={[
                            styles.setsStepperWrap,
                            { backgroundColor: surfaceSubtle, borderColor: tc.cardBorder },
                          ]}
                        >
                          {canEditExercises ? (
                            <Pressable
                              onPress={() => stepSets(idx, -1)}
                              hitSlop={6}
                              style={styles.stepperBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease sets for exercise ${idx + 1}`}
                            >
                              <Ionicons name="remove" size={14} color={tc.primary} />
                            </Pressable>
                          ) : null}
                          <TextInput
                            value={String(item.sets)}
                            onChangeText={(v) =>
                              updateExercise(idx, 'sets', parseInt(v, 10) || 0)
                            }
                            keyboardType="numeric"
                            placeholder="3"
                            placeholderTextColor={tc.textMuted}
                            editable={canEditExercises}
                            style={[styles.setsInput, { color: tc.text }]}
                            accessibilityLabel={`Sets for exercise ${idx + 1}`}
                          />
                          {canEditExercises ? (
                            <Pressable
                              onPress={() => stepSets(idx, 1)}
                              hitSlop={6}
                              style={styles.stepperBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`Increase sets for exercise ${idx + 1}`}
                            >
                              <Ionicons name="add" size={14} color={tc.primary} />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>

                      {/* REPS Column */}
                      <View style={styles.metricColReps}>
                        <Text
                          style={[styles.metricLabel, { color: tc.textMuted }]}
                          numberOfLines={1}
                        >
                          REPS / TIME
                        </Text>
                        <RepsWheel
                          value={item.reps}
                          onChange={(v) => updateExercise(idx, 'reps', v)}
                          disabled={!canEditExercises}
                          textColor={tc.text}
                          mutedColor={tc.textMuted}
                          highlightBg={tc.primaryLight}
                          backgroundColor={surfaceSubtle}
                          borderColor={tc.cardBorder}
                          accessibilityLabel={`Reps for exercise ${idx + 1}`}
                        />
                      </View>

                      {/* WEIGHT / LOAD Column */}
                      <View style={styles.metricColWeight}>
                        <Text
                          style={[styles.metricLabel, { color: tc.textMuted }]}
                          numberOfLines={1}
                        >
                          WEIGHT / LOAD
                        </Text>
                        <TextInput
                          value={item.weight ?? ''}
                          onChangeText={(v) => updateExercise(idx, 'weight', v)}
                          placeholder="135 lbs"
                          placeholderTextColor={tc.textMuted}
                          editable={canEditExercises}
                          style={[
                            styles.metricInput,
                            {
                              color: tc.text,
                              backgroundColor: surfaceSubtle,
                              borderColor: tc.cardBorder,
                            },
                          ]}
                          accessibilityLabel={`Weight load for exercise ${idx + 1}`}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Full-Width Non-Overlapping "+ Add Exercise Row" Button */}
              {canEditExercises ? (
                <Pressable
                  onPress={() => addExerciseRow()}
                  style={({ pressed }) => [
                    styles.addExerciseRowBtn,
                    {
                      backgroundColor: pressed
                        ? tc.primaryLight
                        : isDark
                          ? 'rgba(56, 189, 248, 0.12)'
                          : tc.primaryLight,
                      borderColor: tc.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add another exercise"
                >
                  <Ionicons name="add-circle" size={18} color={tc.primary} />
                  <Text style={[styles.addExerciseRowBtnText, { color: tc.primary }]} allowFontScaling>
                    + Add Exercise Row
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* 4. RPE SESSION INTENSITY GAUGE */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: surfaceSubtle, borderColor: tc.cardBorder },
              ]}
            >
              <View style={styles.rpeHeaderRow}>
                <View style={styles.rpeTitleGroup}>
                  <Ionicons name="pulse" size={18} color={getRpeColor(rpe)} />
                  <Text style={[styles.sectionTitle, { color: tc.text }]} allowFontScaling>
                    Session Intensity · RPE {rpe}/10
                  </Text>
                </View>
                <View style={[styles.rpeBadge, { backgroundColor: getRpeColor(rpe) }]}>
                  <Text style={styles.rpeBadgeText}>{getRpeLabel(rpe)}</Text>
                </View>
              </View>

              <Text style={[styles.rpeHelperText, { color: tc.textMuted }]} allowFontScaling>
                Rate of Perceived Exertion (1 = Easy recovery, 10 = All-out maximum effort)
              </Text>

              <View style={styles.rpeDotsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const isSel = rpe === val;
                  const activeColor = getRpeColor(val);
                  return (
                    <Pressable
                      key={val}
                      onPress={() => setRpe(val)}
                      style={[
                        styles.rpeDot,
                        {
                          backgroundColor: isSel ? activeColor : chipBg,
                          borderColor: isSel ? activeColor : tc.cardBorder,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSel }}
                      accessibilityLabel={`RPE ${val}`}
                    >
                      <Text
                        style={[
                          styles.rpeDotText,
                          { color: isSel ? '#FFFFFF' : tc.text },
                        ]}
                      >
                        {val}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.rpeScaleFooter}>
                <Text style={[styles.rpeScaleLegend, { color: '#10B981' }]}>1–4 Light</Text>
                <Text style={[styles.rpeScaleLegend, { color: '#0284C7' }]}>5–6 Moderate</Text>
                <Text style={[styles.rpeScaleLegend, { color: '#F59E0B' }]}>7–8 Hard</Text>
                <Text style={[styles.rpeScaleLegend, { color: '#EF4444' }]}>9–10 Max</Text>
              </View>
            </View>

            {/* 5. NOTES & REFLECTIONS */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: surfaceSubtle, borderColor: tc.cardBorder },
              ]}
            >
              {/* Member's Own Workout Notes / Reflection (Shown first for members) */}
              <View style={styles.fieldGroup}>
                <View style={styles.noteLabelRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#10B981" />
                  <Text style={[styles.inputLabel, { color: tc.textMuted }]} allowFontScaling>
                    {mode === 'member'
                      ? 'MY WORKOUT NOTES & REFLECTION'
                      : 'CLIENT FEEDBACK & REFLECTIONS'}
                  </Text>
                </View>
                <TextInput
                  value={clientFeedback}
                  onChangeText={setClientFeedback}
                  placeholder="e.g. Energy was high, shoulders felt smooth on overhead presses, good stamina..."
                  placeholderTextColor={tc.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    styles.multilineInput,
                    {
                      color: tc.text,
                      backgroundColor: inputBg,
                      borderColor: tc.cardBorder,
                    },
                  ]}
                  accessibilityLabel={
                    mode === 'member'
                      ? 'My Workout Notes & Reflection'
                      : 'Client Feedback & Reflections'
                  }
                />
              </View>

              {/* Coach Session Notes (Editable ONLY by Trainer; Read-only for Member) */}
              <View style={styles.fieldGroup}>
                <View style={styles.coachNoteHeaderRow}>
                  <View style={styles.noteLabelRow}>
                    <Ionicons name="clipboard-outline" size={15} color={tc.primary} />
                    <Text style={[styles.inputLabel, { color: tc.textMuted }]} allowFontScaling>
                      COACH FEEDBACK & SESSION NOTES
                    </Text>
                  </View>
                  {mode === 'member' ? (
                    <View
                      style={[
                        styles.coachOnlyBadge,
                        { backgroundColor: tc.primaryLight, borderColor: tc.cardBorder },
                      ]}
                    >
                      <Ionicons name="lock-closed" size={11} color={tc.primary} />
                      <Text style={[styles.coachOnlyBadgeText, { color: tc.primary }]}>
                        Set by Fitness Coach
                      </Text>
                    </View>
                  ) : null}
                </View>

                {mode === 'trainer' ? (
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    editable
                    placeholder="Key observations, technique adjustments, cues, or next progression focus..."
                    placeholderTextColor={tc.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[
                      styles.multilineInput,
                      {
                        color: tc.text,
                        backgroundColor: inputBg,
                        borderColor: tc.cardBorder,
                      },
                    ]}
                    accessibilityLabel="Coach Feedback & Session Notes"
                  />
                ) : (
                  <View
                    style={[
                      styles.coachReadOnlyBox,
                      {
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.55)' : '#F1F5F9',
                        borderColor: tc.cardBorder,
                      },
                    ]}
                  >
                    {notes.trim().length > 0 ? (
                      <Text style={[styles.coachReadOnlyText, { color: tc.text }]} allowFontScaling>
                        "{notes}"
                      </Text>
                    ) : (
                      <Text
                        style={[styles.coachReadOnlyPlaceholder, { color: tc.textMuted }]}
                        allowFontScaling
                      >
                        Only your fitness coach can add or edit coaching notes and form feedback here.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Save & Delete Bar */}
          <View
            style={[
              styles.footer,
              { backgroundColor: tc.cardBg, borderTopColor: tc.cardBorder },
            ]}
          >
            <View style={styles.footerRow}>
              {isEditing ? (
                <Pressable
                  onPress={handleDelete}
                  style={[
                    styles.deleteBtn,
                    {
                      borderColor: '#EF4444',
                      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete workout log"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={
                    isEditing
                      ? 'Save Workout Changes'
                      : mode === 'member'
                        ? 'Log My Workout'
                        : 'Save Workout Log'
                  }
                  onPress={() => void handleSave()}
                  loading={submitting}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '93%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
  },
  bodyContent: {
    gap: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateFormattedPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  dateFormattedPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dateWheelScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  dateWheelCard: {
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateWheelDayName: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateWheelMonthDay: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  dateWheelBadge: {
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dateWheelBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 8,
  },
  dateStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInputCenterWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 0,
  },
  resetTodayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  resetTodayChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  exercisesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  exercisesTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubCaption: {
    fontSize: 11,
    marginTop: 1,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  quickAddBlock: {
    gap: 6,
  },
  quickAddLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickAddScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  quickExChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  quickExText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseList: {
    gap: 10,
  },
  exerciseRowCard: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
  },
  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowNumBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowNumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseNameInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  removeRowBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  metricColSets: {
    flex: 1.15,
    gap: 4,
  },
  metricColReps: {
    flex: 1.05,
    gap: 4,
  },
  metricColWeight: {
    flex: 1.4,
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  setsStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 24,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
  },
  metricInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addExerciseRowBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  rpeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  rpeTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rpeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  rpeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  rpeHelperText: {
    fontSize: 12,
    lineHeight: 16,
  },
  rpeDotsRow: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'space-between',
  },
  rpeDot: {
    flex: 1,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeDotText: {
    fontSize: 13,
    fontWeight: '800',
  },
  rpeScaleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  rpeScaleLegend: {
    fontSize: 10,
    fontWeight: '800',
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachNoteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  coachOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  coachOnlyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  coachReadOnlyBox: {
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  coachReadOnlyText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  coachReadOnlyPlaceholder: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  multilineInput: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
