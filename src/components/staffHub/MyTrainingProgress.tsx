import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { TrainerGoalModal } from '@/components/TrainerGoalModal';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { ClientFitnessGoal, ClientWorkoutLog, Member, Staff } from '@/domain/types';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

type Props = {
  memberId: string;
  assignedTrainer: Staff | null;
};

/** The member's own fitness goal and workout log, with the coach-shared notes. Loads its own data. */
export function MyTrainingProgress({ memberId, assignedTrainer }: Props) {
  const { api } = useSession();
  const { colors, isDark } = useTheme();
  const cardTheme = { backgroundColor: colors.cardBg, borderColor: colors.cardBorder };

  const [clientGoal, setClientGoal] = useState<ClientFitnessGoal | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<ClientWorkoutLog[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [editingWorkoutLog, setEditingWorkoutLog] = useState<ClientWorkoutLog | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'coach' | 'self'>('all');

  const load = useCallback(async () => {
    if (memberId === '') return;
    const [goal, logs, memberData] = await Promise.all([
      trainerRepo.getClientFitnessGoal(api, memberId).catch(() => null),
      trainerRepo.listClientWorkoutLogs(api, memberId).catch(() => []),
      api.getMember(memberId).catch(() => null),
    ]);
    setClientGoal(goal);
    setWorkoutLogs([...logs].sort((a, b) => b.date.localeCompare(a.date)));
    setCurrentMember(memberData);
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <>
            {/* My Coaching & Fitness Goals Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleWrap}>
                  <Ionicons name="trophy" size={20} color={colors.primary} />
                  <Text
                    style={[styles.sectionTitle, styles.sectionTitleFlex, { color: colors.text }]}
                    allowFontScaling
                  >
                    My Fitness Goals & Progress
                  </Text>
                </View>
                <Pressable
                  onPress={() => setGoalModalVisible(true)}
                  style={[styles.sectionActionBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={clientGoal ? 'Edit my fitness goals' : 'Set my fitness goals'}
                >
                  <Ionicons name={clientGoal ? 'create-outline' : 'add'} size={14} color="#FFFFFF" />
                  <Text style={styles.sectionActionBtnText}>
                    {clientGoal ? 'Edit Goals' : '+ Set Goal'}
                  </Text>
                </Pressable>
              </View>

              {clientGoal ? (
                <View style={[styles.card, cardTheme, { gap: 12 }]}>
                  {/* Category & Update Info Banner */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' }}>
                        {clientGoal.category ? clientGoal.category.replace('_', ' ') : 'FITNESS MILESTONE'}
                      </Text>
                    </View>
                    {clientGoal.updatedByName || clientGoal.updatedBy ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Updated by {clientGoal.updatedByName ?? (clientGoal.updatedBy === 'member' ? 'You' : 'Coach')}
                      </Text>
                    ) : null}
                  </View>

                  {/* Primary Goal Title */}
                  <View style={{ backgroundColor: isDark ? '#1E293B' : '#EFF6FF', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' }}>
                      Primary Objective
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                      {clientGoal.primaryGoal}
                    </Text>
                    {clientGoal.targetDate ? (
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                        Target Milestone: <Text style={{ fontWeight: '700', color: colors.text }}>{clientGoal.targetDate}</Text>
                      </Text>
                    ) : null}
                  </View>

                  {/* Weight Progression Metrics */}
                  {clientGoal.currentWeightLbs || clientGoal.targetWeightLbs ? (
                    <View style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
                        {clientGoal.startWeightLbs ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMuted }}>{clientGoal.startWeightLbs} lbs</Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Starting</Text>
                          </View>
                        ) : null}
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{clientGoal.currentWeightLbs ?? '--'} lbs</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>Current</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#15803D' }}>{clientGoal.targetWeightLbs ?? '--'} lbs</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>Goal Target</Text>
                        </View>
                      </View>
                      {clientGoal.currentWeightLbs && clientGoal.targetWeightLbs ? (
                        <View style={{ alignItems: 'center', marginTop: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                            {clientGoal.currentWeightLbs > clientGoal.targetWeightLbs
                              ? `${(clientGoal.currentWeightLbs - clientGoal.targetWeightLbs).toFixed(1)} lbs to reach target!`
                              : clientGoal.currentWeightLbs < clientGoal.targetWeightLbs
                              ? `${(clientGoal.targetWeightLbs - clientGoal.currentWeightLbs).toFixed(1)} lbs lean mass gain target!`
                              : 'Target weight reached!'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Custom Metric Progress */}
                  {clientGoal.metricTarget != null || clientGoal.metricCurrent != null ? (
                    <View style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 }}>
                        {clientGoal.metricLabel || 'Progress'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
                        {clientGoal.metricStart != null ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMuted }}>{clientGoal.metricStart} {clientGoal.metricUnit ?? ''}</Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Starting</Text>
                          </View>
                        ) : null}
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{clientGoal.metricCurrent ?? '--'} {clientGoal.metricUnit ?? ''}</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>Current</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#15803D' }}>{clientGoal.metricTarget ?? '--'} {clientGoal.metricUnit ?? ''}</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>Goal Target</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Member's Personal Motivation / Routine Notes */}
                  {clientGoal.memberNotes ? (
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#F1F5F9', padding: 10, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                        My Motivation & Workout Preferences:
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text, marginTop: 2, fontStyle: 'italic' }}>
                        {`"${clientGoal.memberNotes}"`}
                      </Text>
                    </View>
                  ) : null}

                  {/* Specific Coach Movement Warnings */}
                  {clientGoal.specificWarnings && clientGoal.specificWarnings.length > 0 ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
                        Coach Form & Safety Warnings ({clientGoal.specificWarnings.length}):
                      </Text>
                      {clientGoal.specificWarnings.map((w) => {
                        const isHigh = w.severity === 'high';
                        const isMod = w.severity === 'moderate';
                        const badgeColor = isHigh ? '#DC2626' : isMod ? '#D97706' : '#0284C7';
                        const badgeBg = isHigh ? '#FEE2E2' : isMod ? '#FEF3C7' : '#E0F2FE';
                        return (
                          <View
                            key={w.id}
                            style={{
                              backgroundColor: badgeBg,
                              padding: 8,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: badgeColor,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <Ionicons name="warning-outline" size={15} color={badgeColor} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: badgeColor }}>
                                {w.severity.toUpperCase()} ALERT {w.authorName ? `· ${w.authorName}` : ''}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#1F2937', marginTop: 1, fontWeight: '500' }}>
                                {w.text}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* General Physical / Injury Limitations */}
                  {clientGoal.injuriesOrLimitations ? (
                    <View style={{ backgroundColor: '#FEF3C7', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#F59E0B' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="warning-outline" size={15} color="#D97706" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>MOVEMENT & SAFETY NOTES:</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>{clientGoal.injuriesOrLimitations}</Text>
                    </View>
                  ) : null}

                  {/* Coach Strategy Notes */}
                  {clientGoal.notes ? (
                    <View style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 10, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>COACH STRATEGY & PROTOCOL</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }}>
                        {`"${clientGoal.notes}"`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.card, cardTheme, { alignItems: 'center', paddingVertical: 20, gap: 8 }]}>
                  <Ionicons name="trophy-outline" size={36} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Set Your Fitness Goals</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', maxWidth: 280 }}>
                    Define your target weight, milestone date, and personal motivation. Both you and your coach can customize your profile!
                  </Text>
                  <Pressable
                    onPress={() => setGoalModalVisible(true)}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full, marginTop: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel="Create fitness goals"
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>+ Create My Fitness Goal</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* My Workout Log & Coach Notes History */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleWrap}>
                  <Ionicons name="barbell" size={20} color={colors.primary} />
                  <Text
                    style={[styles.sectionTitle, styles.sectionTitleFlex, { color: colors.text }]}
                    allowFontScaling
                  >
                    My Training Logs & Coach Notes ({workoutLogs.length})
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditingWorkoutLog(null);
                    setWorkoutModalVisible(true);
                  }}
                  style={[styles.sectionActionBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Log workout"
                >
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                  <Text style={styles.sectionActionBtnText}>+ Log Workout</Text>
                </Pressable>
              </View>

              {/* Workout Filter Chips */}
              {workoutLogs.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                  {(['all', 'coach', 'self'] as const).map((filterKey) => {
                    const isSel = logFilter === filterKey;
                    const label = filterKey === 'all' ? `All (${workoutLogs.length})` : filterKey === 'coach' ? 'Coach-Led' : 'Self-Logged';
                    return (
                      <Pressable
                        key={filterKey}
                        onPress={() => setLogFilter(filterKey)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: radii.full,
                          backgroundColor: isSel ? colors.primary : isDark ? '#1E293B' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: isSel ? colors.primary : colors.cardBorder,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#FFFFFF' : colors.textMuted }}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {workoutLogs.length === 0 ? (
                <View style={[styles.card, cardTheme, { alignItems: 'center', paddingVertical: 20, gap: 8 }]}>
                  <Ionicons name="barbell-outline" size={36} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>No Workouts Logged Yet</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', maxWidth: 280 }}>
                    Log your own workouts or have your coach record your 1-on-1 sessions. Keep track of progressive overload and notes!
                  </Text>
                  <Pressable
                    onPress={() => {
                      setEditingWorkoutLog(null);
                      setWorkoutModalVisible(true);
                    }}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full, marginTop: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel="Log first workout"
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>+ Log First Workout</Text>
                  </Pressable>
                </View>
              ) : (
                workoutLogs
                  .filter((log) => {
                    if (logFilter === 'coach') return log.loggedBy !== 'member';
                    if (logFilter === 'self') return log.loggedBy === 'member';
                    return true;
                  })
                  .map((log) => {
                    const isSelf = log.loggedBy === 'member';
                    return (
                      <View key={log.id} style={[styles.lessonCard, cardTheme, { gap: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                              {log.date}
                            </Text>
                            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
                                {log.sessionType.toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ backgroundColor: isSelf ? '#DCFCE7' : '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: isSelf ? '#15803D' : '#1D4ED8' }}>
                                {isSelf ? 'SELF-LOGGED' : `COACH ${log.trainerName ? log.trainerName.split(' ')[0] : 'ALEX'}`}
                              </Text>
                            </View>
                          </View>

                          {log.rpe ? (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                                RPE {log.rpe}/10
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                          {log.title}
                        </Text>

                        {/* Exercise Breakdown */}
                        {log.exercises && log.exercises.length > 0 ? (
                          <View style={{ backgroundColor: isDark ? '#1F2937' : '#F9FAFB', padding: 10, borderRadius: 6, gap: 4 }}>
                            {log.exercises.map((ex, exIdx) => (
                              <View key={exIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{ex.name}</Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                                  {ex.sets} sets × {ex.reps} {ex.weight ? `@ ${ex.weight}` : ''}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {log.notes ? (
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>
                            {`Coach notes: "${log.notes}"`}
                          </Text>
                        ) : null}

                        {log.clientFeedback ? (
                          <Text style={{ fontSize: 12, color: '#15803D', fontStyle: 'italic' }}>
                            {`Your reflection: "${log.clientFeedback}"`}
                          </Text>
                        ) : null}

                        {/* Edit Button */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 }}>
                          <Pressable
                            onPress={() => {
                              setEditingWorkoutLog(log);
                              setWorkoutModalVisible(true);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: radii.sm,
                              borderWidth: 1,
                              borderColor: colors.cardBorder,
                              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${log.title}`}
                          >
                            <Ionicons name="create-outline" size={14} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                              {isSelf ? 'Edit Workout' : 'Edit / Add Reflection'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
              )}
            </View>

      <TrainerGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        member={currentMember}
        memberId={memberId}
        memberName={currentMember?.name ?? 'Member'}
        existingGoal={clientGoal}
        mode="member"
        currentUserName={currentMember?.name}
        onSaved={(updated) => setClientGoal(updated)}
      />

      <TrainerClientWorkoutModal
        visible={workoutModalVisible}
        onClose={() => {
          setWorkoutModalVisible(false);
          setEditingWorkoutLog(null);
        }}
        member={currentMember}
        memberId={memberId}
        memberName={currentMember?.name ?? 'Member'}
        initialLog={editingWorkoutLog}
        mode="member"
        trainerId={assignedTrainer?.id ?? 'staff-alex'}
        trainerName={assignedTrainer?.name ?? 'Doc'}
        onSaved={(saved) => {
          setWorkoutLogs((prev) => {
            const idx = prev.findIndex((p) => p.id === saved.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = saved;
              return next;
            }
            return [saved, ...prev];
          });
        }}
        onDeleted={(id) => setWorkoutLogs((prev) => prev.filter((p) => p.id !== id))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...cardStyle, gap: spacing.md },
  section: { gap: spacing.sm },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionHeaderTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 180 },
  sectionTitle: { ...typography.title, fontSize: 18 },
  sectionTitleFlex: { flex: 1, flexShrink: 1 },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  sectionActionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  lessonCard: { ...cardStyle, gap: 4 },
});
