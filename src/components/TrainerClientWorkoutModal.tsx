import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { ClientWorkoutLog, Member, WorkoutExercise } from '@/domain/types';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

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

  const effectiveMemberId = member?.id ?? explicitMemberId ?? (mode === 'member' ? session?.userId ?? '' : '');
  const effectiveMemberName = member?.name ?? explicitMemberName ?? 'Member';

  const isEditing = Boolean(initialLog);
  const isSelfLogged = initialLog?.loggedBy === 'member' || (!initialLog && mode === 'member');
  const canEditExercises = mode === 'trainer' || isSelfLogged || !isEditing;

  const [date, setDate] = useState(getDemoToday());
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
    setExercises((prev) => [
      ...prev,
      { name: prefillName ?? '', sets: 3, reps: '10-12', weight: '' },
    ]);
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
          trainerNameToSave = 'Coach Alex Rivera';
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
        } else if (isSelfLogged) {
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
          notes: notes.trim(),
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
    if (val <= 4) return 'Light / Active Recovery';
    if (val <= 6) return 'Moderate / Aerobic Base';
    if (val <= 8) return 'Vigorous / Hard Work';
    return 'Max Effort / Peak Intensity';
  };

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
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: tc.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="barbell" size={20} color={colors.primary} />
                <Text style={[styles.title, { color: tc.text }]}>
                  {isEditing ? 'Edit Workout Session' : mode === 'member' ? 'Log My Workout' : 'Log Client Workout'}
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: tc.textMuted }]}>
                {mode === 'member'
                  ? 'Track your exercise sets, reps, weight load, and reflections'
                  : `Recording session for ${effectiveMemberName}`}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close modal">
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </Pressable>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Session Type Chips */}
            <View>
              <Text style={[styles.sectionLabel, { color: tc.text }]}>Session Focus</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SESSION_TYPES.map((type) => {
                    const isSelected = sessionType === type.key;
                    return (
                      <Pressable
                        key={type.key}
                        onPress={() => setSessionType(type.key)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: isSelected ? colors.primary : isDark ? '#1E293B' : '#F1F5F9',
                            borderColor: isSelected ? colors.primary : tc.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={type.icon as any}
                          size={14}
                          color={isSelected ? '#FFFFFF' : tc.textMuted}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            { color: isSelected ? '#FFFFFF' : tc.text },
                          ]}
                        >
                          {type.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Title & Date */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <TextField
                  label="Session Title *"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Upper Body Push, Leg Day, 5K Run..."
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <TextField
                  label="Date (YYYY-MM-DD)"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Exercise Builder Section */}
            <View style={[styles.exercisesCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.cardBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="list" size={16} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: tc.text }]}>
                    Exercises & Progressive Overload ({exercises.length})
                  </Text>
                </View>
                {canEditExercises ? (
                  <Pressable
                    onPress={() => addExerciseRow()}
                    style={styles.addExerciseBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Add another exercise"
                  >
                    <Ionicons name="add" size={15} color="#FFFFFF" />
                    <Text style={styles.addExerciseBtnText}>Add Row</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Quick Exercise Chips (only if can edit) */}
              {canEditExercises ? (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: tc.textMuted, marginBottom: 4 }}>Quick Add Exercise:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {COMMON_EXERCISES.map((ex) => (
                        <Pressable
                          key={ex}
                          onPress={() => addExerciseRow(ex)}
                          style={[styles.quickExChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.cardBorder }]}
                        >
                          <Text style={[styles.quickExText, { color: tc.text }]}>+ {ex}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}

              {/* Dynamic Exercise Table */}
              <View style={{ gap: 10, marginTop: 8 }}>
                {exercises.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.exerciseRowCard,
                      { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.rowNumBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.rowNumText, { color: colors.primaryDark }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextField
                          placeholder="Exercise Name (e.g. Back Squat)"
                          value={item.name}
                          onChangeText={(v) => updateExercise(idx, 'name', v)}
                          editable={canEditExercises}
                        />
                      </View>
                      {canEditExercises && exercises.length > 1 ? (
                        <Pressable
                          onPress={() => removeExerciseRow(idx)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete exercise ${idx + 1}`}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="Sets"
                          value={String(item.sets)}
                          onChangeText={(v) => updateExercise(idx, 'sets', parseInt(v, 10) || 0)}
                          keyboardType="numeric"
                          placeholder="3"
                          editable={canEditExercises}
                        />
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <TextField
                          label="Reps"
                          value={item.reps}
                          onChangeText={(v) => updateExercise(idx, 'reps', v)}
                          placeholder="8-10"
                          editable={canEditExercises}
                        />
                      </View>
                      <View style={{ flex: 1.8 }}>
                        <TextField
                          label="Weight Load"
                          value={item.weight ?? ''}
                          onChangeText={(v) => updateExercise(idx, 'weight', v)}
                          placeholder="135 lbs / bodyweight"
                          editable={canEditExercises}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* RPE Intensity Slider / Gauge */}
            <View style={[styles.rpeCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.cardBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="pulse" size={16} color={getRpeColor(rpe)} />
                  <Text style={[styles.sectionTitle, { color: tc.text }]}>
                    Session Intensity (RPE {rpe}/10)
                  </Text>
                </View>
                <View style={[styles.rpeBadge, { backgroundColor: getRpeColor(rpe) }]}>
                  <Text style={styles.rpeBadgeText}>{getRpeLabel(rpe)}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: tc.textMuted, marginTop: 4 }}>
                Rate of Perceived Exertion scale (1 = Light warm-up, 10 = Maximal absolute effort).
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const isSel = rpe === val;
                  return (
                    <Pressable
                      key={val}
                      onPress={() => setRpe(val)}
                      style={[
                        styles.rpeDot,
                        {
                          backgroundColor: isSel ? getRpeColor(val) : isDark ? '#1E293B' : '#F1F5F9',
                          borderColor: isSel ? getRpeColor(val) : tc.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rpeDotText,
                          { color: isSel ? '#FFFFFF' : tc.textMuted },
                        ]}
                      >
                        {val}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Coach Training Notes (editable by trainer, viewable by member) */}
            <TextField
              label={mode === 'trainer' ? 'Coach Feedback & Session Debrief' : 'Coach Session Notes'}
              value={notes}
              onChangeText={setNotes}
              editable={mode === 'trainer' || isSelfLogged}
              placeholder={
                mode === 'trainer'
                  ? 'Key observations, technique adjustments, cues, or next workout progression focus...'
                  : 'Coach feedback will appear here.'
              }
              multiline
              numberOfLines={3}
            />

            {/* Client Reflections / Post-Workout Feedback (editable by member, viewable by trainer) */}
            <TextField
              label={mode === 'member' ? 'My Workout Reflection & How It Felt' : 'Client Feedback & Reflections'}
              value={clientFeedback}
              onChangeText={setClientFeedback}
              placeholder="e.g. Energy was high, shoulders felt smooth on overhead work, slight tightness in right hamstring..."
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          {/* Footer Save & Delete Button */}
          <View style={[styles.footer, { borderTopColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {isEditing ? (
                <Pressable
                  onPress={handleDelete}
                  style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete workout log"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={isEditing ? 'Save Changes' : mode === 'member' ? 'Log My Workout' : 'Save Workout Log'}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    ...cardStyle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exercisesCard: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  addExerciseBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickExChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  quickExText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseRowCard: {
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  rowNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowNumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rpeCard: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  rpeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  rpeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  rpeDot: {
    flex: 1,
    height: 34,
    borderRadius: radii.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeDotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    gap: 16,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
