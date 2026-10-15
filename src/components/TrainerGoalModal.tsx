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
import type { ClientFitnessGoal, GoalWarning, Member } from '@/domain/types';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const CATEGORIES: { id: ClientFitnessGoal['category']; label: string; icon: string }[] = [
  { id: 'strength', label: 'Strength & Muscle', icon: 'barbell-outline' },
  { id: 'weight_loss', label: 'Weight Loss & Tone', icon: 'flame-outline' },
  { id: 'endurance', label: 'Endurance & Cardio', icon: 'speedometer-outline' },
  { id: 'mobility', label: 'Mobility & Posture', icon: 'body-outline' },
  { id: 'wellness', label: 'General Wellness', icon: 'heart-outline' },
  { id: 'rehab', label: 'Joint Rehab & Recovery', icon: 'medkit-outline' },
  { id: 'sports', label: 'Sports Performance', icon: 'basketball-outline' },
];

const METRIC_HINTS: Record<
  NonNullable<ClientFitnessGoal['category']>,
  { label: string; unit: string; start: string; target: string }
> = {
  strength: { label: 'Back squat', unit: 'lbs', start: '95', target: '135' },
  weight_loss: { label: 'Waist', unit: 'in', start: '36', target: '33' },
  endurance: { label: '5K time', unit: 'min', start: '35', target: '28' },
  mobility: { label: 'Sit-and-reach', unit: 'in', start: '8', target: '12' },
  wellness: { label: 'Workouts per week', unit: 'days', start: '1', target: '3' },
  rehab: { label: 'Knee flexion', unit: 'deg', start: '90', target: '120' },
  sports: { label: 'Vertical jump', unit: 'in', start: '16', target: '20' },
};

interface TrainerGoalModalProps {
  visible: boolean;
  onClose: () => void;
  member?: Member | null;
  memberId?: string;
  memberName?: string;
  existingGoal: ClientFitnessGoal | null;
  onSaved?: (updatedGoal: ClientFitnessGoal) => void;
  mode?: 'trainer' | 'member';
  currentUserName?: string;
}

export function TrainerGoalModal({
  visible,
  onClose,
  member,
  memberId: explicitMemberId,
  memberName: explicitMemberName,
  existingGoal,
  onSaved,
  mode = 'trainer',
  currentUserName,
}: TrainerGoalModalProps) {
  const { api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const effectiveMemberId = member?.id ?? explicitMemberId ?? '';
  const effectiveMemberName = member?.name ?? explicitMemberName ?? 'Member';

  const [primaryGoal, setPrimaryGoal] = useState('');
  const [category, setCategory] = useState<ClientFitnessGoal['category']>('strength');
  const [targetDate, setTargetDate] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [metricLabel, setMetricLabel] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [metricStart, setMetricStart] = useState('');
  const [metricCurrent, setMetricCurrent] = useState('');
  const [metricTarget, setMetricTarget] = useState('');
  const [injuries, setInjuries] = useState('');
  const [notes, setNotes] = useState('');
  const [memberNotes, setMemberNotes] = useState('');
  const [warnings, setWarnings] = useState<GoalWarning[]>([]);

  // New warning form state
  const [newWarningText, setNewWarningText] = useState('');
  const [newWarningSeverity, setNewWarningSeverity] = useState<'low' | 'moderate' | 'high'>('moderate');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (existingGoal) {
        setPrimaryGoal(existingGoal.primaryGoal || '');
        setCategory(existingGoal.category || 'strength');
        setTargetDate(existingGoal.targetDate || '');
        setStartWeight(existingGoal.startWeightLbs ? String(existingGoal.startWeightLbs) : '');
        setCurrentWeight(existingGoal.currentWeightLbs ? String(existingGoal.currentWeightLbs) : '');
        setTargetWeight(existingGoal.targetWeightLbs ? String(existingGoal.targetWeightLbs) : '');
        setMetricLabel(existingGoal.metricLabel || '');
        setMetricUnit(existingGoal.metricUnit || '');
        setMetricStart(existingGoal.metricStart != null ? String(existingGoal.metricStart) : '');
        setMetricCurrent(existingGoal.metricCurrent != null ? String(existingGoal.metricCurrent) : '');
        setMetricTarget(existingGoal.metricTarget != null ? String(existingGoal.metricTarget) : '');
        setInjuries(existingGoal.injuriesOrLimitations || '');
        setNotes(existingGoal.notes || '');
        setMemberNotes(existingGoal.memberNotes || '');
        setWarnings(existingGoal.specificWarnings || []);
      } else {
        setPrimaryGoal(
          mode === 'member'
            ? 'Build functional strength, improve stamina and stay consistent'
            : 'Increase functional strength, lean muscle mass & cardiovascular endurance'
        );
        setCategory('strength');
        setTargetDate('2026-12-31');
        setStartWeight('');
        setCurrentWeight('');
        setTargetWeight('');
        setMetricLabel('');
        setMetricUnit('');
        setMetricStart('');
        setMetricCurrent('');
        setMetricTarget('');
        setInjuries('');
        setNotes(
          mode === 'trainer'
            ? 'Weekly check-in with coach; 3x gym sessions per week recommended.'
            : ''
        );
        setMemberNotes('');
        setWarnings([]);
      }
      setNewWarningText('');
      setNewWarningSeverity('moderate');
      setError(null);
    }
  }, [visible, existingGoal, mode]);

  const handleAddWarning = () => {
    if (!newWarningText.trim()) return;
    const item: GoalWarning = {
      id: `warn-${Date.now()}`,
      text: newWarningText.trim(),
      severity: newWarningSeverity,
      createdAt: new Date().toISOString(),
      createdBy: mode,
      authorName: currentUserName ?? (mode === 'trainer' ? 'Coach' : 'Member'),
    };
    setWarnings([...warnings, item]);
    setNewWarningText('');
  };

  const handleRemoveWarning = (id: string) => {
    setWarnings(warnings.filter((w) => w.id !== id));
  };

  const setDateShortcut = (monthsFromNow: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsFromNow);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setTargetDate(`${y}-${m}-${day}`);
  };

  const handleSave = async () => {
    if (!effectiveMemberId) {
      setError('Member identifier is missing.');
      return;
    }
    if (!primaryGoal.trim()) {
      setError('Please provide a primary fitness goal.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const curW = parseFloat(currentWeight.trim()) || undefined;
      const tgtW = parseFloat(targetWeight.trim()) || undefined;
      const strW = parseFloat(startWeight.trim()) || undefined;

      const goalToSave: ClientFitnessGoal = {
        memberId: effectiveMemberId,
        primaryGoal: primaryGoal.trim(),
        category,
        targetDate: targetDate.trim() || undefined,
        startWeightLbs: strW,
        currentWeightLbs: curW,
        targetWeightLbs: tgtW,
        metricLabel: metricLabel.trim() || undefined,
        metricUnit: metricUnit.trim() || undefined,
        metricStart: parseFloat(metricStart.trim()) || undefined,
        metricCurrent: parseFloat(metricCurrent.trim()) || undefined,
        metricTarget: parseFloat(metricTarget.trim()) || undefined,
        injuriesOrLimitations: injuries.trim() || undefined,
        specificWarnings: warnings.length > 0 ? warnings : undefined,
        notes: notes.trim() || undefined,
        memberNotes: memberNotes.trim() || undefined,
        updatedBy: mode,
        updatedByName: currentUserName,
        updatedAt: new Date().toISOString(),
      };

      const saved = await trainerRepo.saveClientFitnessGoal(api, goalToSave);

      dialog.alert(
        'Goals Saved!',
        mode === 'member'
          ? 'Your personalized fitness goals and preferences have been updated!'
          : `Fitness goals and safety protocol updated for ${effectiveMemberName}.`,
        [{ text: 'OK' }],
        'checkmark'
      );

      onSaved?.(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save fitness goals.');
    } finally {
      setSubmitting(false);
    }
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
                <Ionicons name="trophy" size={20} color={colors.primary} />
                <Text style={[styles.title, { color: tc.text }]}>
                  {mode === 'member' ? 'My Fitness Goals & Health Profile' : 'Client Goals & Safety Protocol'}
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: tc.textMuted }]}>
                {mode === 'member'
                  ? 'Set your milestones, motivation, and track your progression'
                  : `Managing profile for ${effectiveMemberName}`}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </Pressable>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Primary Goal Category Picker */}
            <View>
              <Text style={[styles.sectionLabel, { color: tc.text }]}>Goal Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected ? colors.primary : isDark ? '#1E293B' : '#F1F5F9',
                            borderColor: isSelected ? colors.primary : tc.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={14}
                          color={isSelected ? '#FFFFFF' : tc.textMuted}
                        />
                        <Text
                          style={[
                            styles.catChipText,
                            { color: isSelected ? '#FFFFFF' : tc.text },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Primary Goal Description */}
            <TextField
              label="Primary Fitness Target *"
              value={primaryGoal}
              onChangeText={setPrimaryGoal}
              placeholder="e.g. Build functional strength, run 5K, lose 10 lbs..."
              multiline
              numberOfLines={2}
            />

            {/* Target Date & Quick Date Shortcuts */}
            <View>
              <TextField
                label="Target Milestone Date (YYYY-MM-DD)"
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="2026-12-31"
              />
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Pressable onPress={() => setDateShortcut(1)} style={[styles.dateChip, { borderColor: tc.cardBorder, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.dateChipText, { color: tc.textMuted }]}>+1 Month</Text>
                </Pressable>
                <Pressable onPress={() => setDateShortcut(3)} style={[styles.dateChip, { borderColor: tc.cardBorder, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.dateChipText, { color: tc.textMuted }]}>+3 Months</Text>
                </Pressable>
                <Pressable onPress={() => setDateShortcut(6)} style={[styles.dateChip, { borderColor: tc.cardBorder, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.dateChipText, { color: tc.textMuted }]}>+6 Months</Text>
                </Pressable>
              </View>
            </View>

            {/* Measurable target for non-weight goals (strength, mobility, endurance, ...) */}
            {category !== 'weight_loss' ? (
              <View style={[styles.weightContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: tc.text }}>
                    Progress Target (optional)
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 2 }}>
                    <TextField
                      label="What are you measuring?"
                      value={metricLabel}
                      onChangeText={setMetricLabel}
                      placeholder={METRIC_HINTS[category ?? 'strength'].label}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Unit"
                      value={metricUnit}
                      onChangeText={setMetricUnit}
                      placeholder={METRIC_HINTS[category ?? 'strength'].unit}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Starting"
                      value={metricStart}
                      onChangeText={setMetricStart}
                      keyboardType="numeric"
                      placeholder={METRIC_HINTS[category ?? 'strength'].start}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Current"
                      value={metricCurrent}
                      onChangeText={setMetricCurrent}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Target Goal"
                      value={metricTarget}
                      onChangeText={setMetricTarget}
                      keyboardType="numeric"
                      placeholder={METRIC_HINTS[category ?? 'strength'].target}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {/* Weight Progression Card */}
            {category === 'weight_loss' || startWeight || currentWeight || targetWeight ? (
            <View style={[styles.weightContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="speedometer-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: tc.text }}>Weight Milestones (lbs)</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Starting"
                    value={startWeight}
                    onChangeText={setStartWeight}
                    keyboardType="numeric"
                    placeholder="180"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Current"
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                    keyboardType="numeric"
                    placeholder="175"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Target Goal"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="numeric"
                    placeholder="165"
                  />
                </View>
              </View>
            </View>
            ) : null}

            {/* Member's Personal Notes / Motivation (editable by member, viewable/editable by trainer) */}
            <TextField
              label={mode === 'member' ? 'My Personal Motivation & Workout Preferences' : 'Member Motivation & Preferences'}
              value={memberNotes}
              onChangeText={setMemberNotes}
              placeholder="e.g. Enjoys lap swimming and dumbbell circuits, wants to feel more energetic, prefers morning workouts..."
              multiline
              numberOfLines={3}
            />

            {/* ========================================================================= */}
            {/* SAFETY & LIMITATIONS SECTION */}
            {/* ========================================================================= */}
            <View
              style={[
                styles.safetyCard,
                { backgroundColor: isDark ? '#451A03' : '#FEF3C7', borderColor: '#F59E0B' },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="warning-outline" size={18} color="#D97706" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309' }}>
                  Safety & Physical Limitations
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                Important joint precautions, movement contraindications, or medical considerations to keep workouts safe and effective.
              </Text>
            </View>

            {/* Free-form injury notes */}
            <TextField
              label="Physical Limitations & Movement Precautions"
              value={injuries}
              onChangeText={setInjuries}
              placeholder="e.g. Mild rotator cuff strain, avoid behind-neck pressing, left knee ACL history..."
              multiline
              numberOfLines={2}
            />

            {/* Specific Warnings List (Dynamic interactive warnings) */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.sectionLabel, { color: tc.text }]}>
                  Specific Movement & Safety Alerts ({warnings.length})
                </Text>
              </View>

              {warnings.length === 0 ? (
                <Text style={{ fontSize: 12, color: tc.textMuted, fontStyle: 'italic' }}>
                  No active specific alerts set.
                </Text>
              ) : (
                warnings.map((w) => {
                  const isHigh = w.severity === 'high';
                  const isMod = w.severity === 'moderate';
                  const badgeColor = isHigh ? '#DC2626' : isMod ? '#D97706' : '#0284C7';
                  const badgeBg = isHigh ? '#FEE2E2' : isMod ? '#FEF3C7' : '#E0F2FE';

                  return (
                    <View
                      key={w.id}
                      style={[
                        styles.warningItem,
                        { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: tc.cardBorder },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.severityBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.severityBadgeText, { color: badgeColor }]}>
                              {w.severity.toUpperCase()}
                            </Text>
                          </View>
                          {w.authorName ? (
                            <Text style={{ fontSize: 11, color: tc.textMuted }}>by {w.authorName}</Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 13, color: tc.text, fontWeight: '500' }}>{w.text}</Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveWarning(w.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Delete warning"
                      >
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </Pressable>
                    </View>
                  );
                })
              )}

              {/* Add New Warning Box */}
              <View style={[styles.addWarningBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.cardBorder }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: tc.text }}>
                  {mode === 'trainer' ? '+ Add Coach Safety Warning' : '+ Add Personal Safety Note'}
                </Text>
                <TextField
                  value={newWarningText}
                  onChangeText={setNewWarningText}
                  placeholder="e.g. Always perform 5m band warm-up before squats"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['low', 'moderate', 'high'] as const).map((sev) => {
                      const isSel = newWarningSeverity === sev;
                      return (
                        <Pressable
                          key={sev}
                          onPress={() => setNewWarningSeverity(sev)}
                          style={[
                            styles.sevChip,
                            isSel && { backgroundColor: sev === 'high' ? '#DC2626' : sev === 'moderate' ? '#D97706' : '#0284C7' },
                          ]}
                        >
                          <Text style={[styles.sevChipText, { color: isSel ? '#FFFFFF' : tc.textMuted }]}>
                            {sev === 'high' ? 'High Alert' : sev === 'moderate' ? 'Caution' : 'Low'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    onPress={handleAddWarning}
                    style={[styles.addWarnBtn, { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                    accessibilityLabel="Add warning to list"
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>+ Add Alert</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Coach Training Strategy & Protocol */}
            <TextField
              label={mode === 'trainer' ? 'Coach Program Strategy & Protocol' : 'Coach Strategy (Set by Trainer)'}
              value={notes}
              onChangeText={setNotes}
              editable={mode === 'trainer'}
              placeholder={
                mode === 'trainer'
                  ? 'e.g. Split recommendations, progressive overload rules, nutrition guidelines...'
                  : 'Your trainer will add coaching strategies here.'
              }
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          {/* Footer Save Button */}
          <View style={[styles.footer, { borderTopColor: tc.cardBorder }]}>
            <PrimaryButton
              title={mode === 'member' ? 'Save My Fitness Goals' : 'Save Goals & Safety Protocol'}
              onPress={() => void handleSave()}
              loading={submitting}
            />
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
    padding: 0,
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
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weightContainer: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    gap: 16,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  safetyCard: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 10,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  addWarningBox: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 8,
  },
  sevChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sevChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addWarnBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
