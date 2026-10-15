import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { WeeklyTrainerSchedule } from '@/components/WeeklyTrainerSchedule';
import { AvailabilitySettings } from '@/components/staff/AvailabilitySettings';
import { SessionRequestsInbox } from '@/components/staff/SessionRequestsInbox';
import { EmptyState, SectionCard } from '@/components/staff/SectionCard';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { WeeklyAvailabilityEditor } from '@/components/staff/WeeklyAvailabilityEditor';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { canManageTrainerAvailability, splitCoachesByDiscipline, viewableTrainers } from '@/domain/availabilityAccess';
import { addDaysToDate, getDemoToday } from '@/domain/demoClock';
import { validateAvailability } from '@/domain/trainerAvailability';
import type { AvailabilityConflict, LessonSlot, Staff, TrainerAvailability, TrainerAvailabilityInput } from '@/domain/types';
import { availabilityRepo } from '@/repositories/lessonRepo';
import { radii } from '@/theme/typography';

const PREVIEW_DAYS = 14;

function toInput(av: TrainerAvailability): TrainerAvailabilityInput {
  return { weekly: av.weekly, effectiveFrom: av.effectiveFrom, effectiveUntil: av.effectiveUntil, exceptions: av.exceptions };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "16:00" -> "4:00 PM". */
function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function conflictLine(c: AvailabilityConflict): string {
  return c.kind === 'lesson'
    ? `Booked lesson, ${formatWhen(c.start)}`
    : `Request from ${c.memberName ?? 'a member'}, ${formatWhen(c.start)}`;
}

export default function TrainerAvailabilityScreen() {
  const { staffId: paramId } = useLocalSearchParams<{ staffId?: string }>();
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const { theme } = useStaffCapabilities();
  const actorId = session?.userId ?? '';

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Tagged with its trainer so a slow load can never show (or save) another trainer's hours.
  const [loadedDraft, setLoadedDraft] = useState<{ staffId: string; input: TrainerAvailabilityInput } | null>(null);
  const [loadedPreview, setLoadedPreview] = useState<{ staffId: string; slots: LessonSlot[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  useEffect(() => {
    let live = true;
    api
      .listStaff()
      .then((s) => live && setStaffList(s))
      .catch(() => live && setStaffList([]))
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [api]);

  const trainers = useMemo(() => viewableTrainers(session?.role, actorId, staffList), [session?.role, actorId, staffList]);
  const targetId = useMemo(() => {
    const wanted = pickedId ?? paramId;
    if (wanted && trainers.some((t) => t.id === wanted)) return wanted;
    return trainers.find((t) => t.id === actorId)?.id ?? trainers[0]?.id ?? '';
  }, [pickedId, paramId, trainers, actorId]);
  const groups = useMemo(() => splitCoachesByDiscipline(trainers), [trainers]);
  const target = trainers.find((t) => t.id === targetId);
  const canEdit = target ? canManageTrainerAvailability(session?.role, actorId, target) : false;
  const draft = loadedDraft?.staffId === targetId ? loadedDraft.input : null;
  const preview = useMemo(() => (loadedPreview?.staffId === targetId ? loadedPreview.slots : []), [loadedPreview, targetId]);
  const setDraft = (input: TrainerAvailabilityInput) => setLoadedDraft({ staffId: targetId, input });
  const defaultLocation = target?.lessonTypes?.length === 1 && target.lessonTypes[0] === 'swim' ? 'Indoor Lap Pool (Lane 1)' : 'Wellness Floor / Studio B';

  const loadPreview = useCallback(async () => {
    if (!targetId) return;
    const today = getDemoToday();
    const slots = await availabilityRepo.listWindows(api, targetId, today, addDaysToDate(today, PREVIEW_DAYS - 1)).catch(() => []);
    setLoadedPreview({ staffId: targetId, slots });
  }, [api, targetId]);

  useEffect(() => {
    if (!targetId || !actorId) return;
    let live = true;
    availabilityRepo
      .get(api, targetId, actorId)
      .then((av) => live && setLoadedDraft({ staffId: targetId, input: toInput(av) }))
      .catch((e) => live && dialog.alert('Error', e instanceof Error ? e.message : 'Could not load availability.'));
    void loadPreview();
    return () => {
      live = false;
    };
  }, [api, targetId, actorId, loadPreview]);

  const save = async () => {
    if (!draft || !targetId) return;
    const check = validateAvailability(draft);
    if (!check.ok) {
      dialog.alert('Check your hours', check.errors[0].msg);
      return;
    }
    setSaving(true);
    try {
      const { availability, conflicts } = await availabilityRepo.save(api, targetId, draft, actorId);
      setLoadedDraft({ staffId: targetId, input: toInput(availability) });
      await loadPreview();
      setScheduleVersion((v) => v + 1);
      if (conflicts.length === 0) {
        dialog.alert('Hours Saved', 'Members can now request times inside your updated hours.', [{ text: 'OK' }], 'checkmark');
      } else {
        // Nothing is cancelled; the person saving decides how to follow up with each member.
        dialog.alert(
          'Hours Saved, Needs Follow-Up',
          `${conflicts.length} existing ${conflicts.length === 1 ? 'item is' : 'items are'} now outside these hours. They were not cancelled. Contact each member to move or confirm them:\n\n${conflicts
            .map((c) => `• ${conflictLine(c)}`)
            .join('\n')}`,
          [{ text: 'OK' }],
          'alert'
        );
      }
    } catch (e) {
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not save availability.');
    } finally {
      setSaving(false);
    }
  };

  const byDay = useMemo(() => {
    const map = new Map<string, LessonSlot[]>();
    for (const s of preview) map.set(s.start.slice(0, 10), [...(map.get(s.start.slice(0, 10)) ?? []), s]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [preview]);

  return (
    <StaffScreen subtitle="Trainer Availability" allowed={!loaded || trainers.length > 0}>
      {trainers.length > 1 ? (
        <View style={styles.chipGroups}>
          {[
            { key: 'training', label: 'Personal Trainers', list: groups.trainers },
            { key: 'swim', label: 'Swim Instructors', list: groups.swim },
          ]
            .filter((g) => g.list.length > 0)
            .map((g) => (
              <View key={g.key} style={{ gap: 6 }}>
                <Text style={[styles.groupLabel, { color: tc.textMuted }]}>{g.label}</Text>
                <View style={styles.chips}>
                  {g.list.map((t) => {
                    const active = t.id === targetId;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setPickedId(t.id)}
                        style={[styles.chip, { backgroundColor: active ? theme.color : tc.cardBg, borderColor: active ? theme.color : tc.cardBorder }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : tc.text, fontWeight: '700', fontSize: 13 }}>
                          {t.id === actorId ? 'Me' : t.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
        </View>
      ) : null}

      {groups.trainers.length > 0 ? (
        <WeeklyTrainerSchedule
          key={`pt-${scheduleVersion}`}
          title="Personal Training: This Week"
          subtitle="Who is available when. Tap a trainer to open their hours"
          icon="barbell-outline"
          noun="trainers"
          trainers={groups.trainers}
          accent="#15803D"
          onSelectTrainer={(t) => setPickedId(t.id)}
        />
      ) : null}

      {groups.swim.length > 0 ? (
        <WeeklyTrainerSchedule
          key={`swim-${scheduleVersion}`}
          title="Swim Instruction: This Week"
          subtitle="Who is on the deck when. Tap an instructor to open their hours"
          icon="water-outline"
          noun="swim instructors"
          trainers={groups.swim}
          accent="#0284C7"
          onSelectTrainer={(t) => setPickedId(t.id)}
        />
      ) : null}

      {target && draft && !canEdit ? (
        <SectionCard
          title={`${target.name}'s Hours`}
          icon="time-outline"
          accent={theme.color}
          subtitle="View only. Hours are set by the trainer, their director or an admin"
        >
          {draft.weekly.length === 0 ? (
            <EmptyState icon="time-outline" text="No weekly hours set yet." />
          ) : (
            WEEKDAYS.map((name, weekday) => {
              const rows = draft.weekly.filter((w) => w.weekday === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime));
              if (rows.length === 0) return null;
              return (
                <View key={name} style={styles.previewRow}>
                  <Text style={[styles.previewDate, { color: tc.text }]}>{name}</Text>
                  <View style={{ flex: 1 }}>
                    {rows.map((w) => (
                      <Text key={w.id} style={{ color: tc.textMuted, fontSize: 13 }}>
                        {formatClock(w.startTime)} - {formatClock(w.endTime)} · {w.location}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })
          )}
          {draft.exceptions.length > 0 ? (
            <View style={{ gap: 2, marginTop: 6 }}>
              <Text style={{ color: tc.text, fontSize: 13, fontWeight: '800' }}>Days off and changes</Text>
              {draft.exceptions.map((e) => (
                <Text key={e.id} style={{ color: tc.textMuted, fontSize: 13 }}>
                  {formatDay(e.date)} · {e.kind === 'blocked' ? 'Unavailable' : 'Custom hours'}
                  {e.note ? ` · ${e.note}` : ''}
                </Text>
              ))}
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      {target && draft && canEdit ? (
        <>
          <Text style={{ color: tc.textMuted, fontSize: 13 }}>
            Editing hours for {target.id === actorId ? 'yourself' : target.name}. Existing lessons are never cancelled by a change.
          </Text>
          <WeeklyAvailabilityEditor key={targetId} value={draft} onChange={setDraft} accent={theme.color} defaultLocation={defaultLocation} />
          <PrimaryButton title={saving ? 'Saving...' : 'Save hours'} onPress={() => void save()} disabled={saving} />
        </>
      ) : null}

      <SectionCard
        title="Next 14 Days"
        icon="eye-outline"
        accent={theme.color}
        subtitle={canEdit ? 'What members can request, from your last saved hours' : 'What members can currently request'}
      >
        {byDay.length === 0 ? (
          <EmptyState icon="time-outline" text="No open hours in the next two weeks." />
        ) : (
          byDay.map(([date, slots]) => (
            <View key={date} style={styles.previewRow}>
              <Text style={[styles.previewDate, { color: tc.text }]}>{formatDay(date)}</Text>
              <View style={{ flex: 1 }}>
                {slots.map((s) => (
                  <Text key={s.id} style={{ color: tc.textMuted, fontSize: 13 }}>
                    {formatTime(s.start)} - {formatTime(s.end)} · {s.location}
                  </Text>
                ))}
              </View>
            </View>
          ))
        )}
      </SectionCard>

      {targetId && canEdit ? <SessionRequestsInbox key={`req-${targetId}`} staffId={targetId} accent={theme.color} onChanged={() => void loadPreview()} /> : null}
      {targetId && canEdit ? <AvailabilitySettings key={targetId} staffId={targetId} accent={theme.color} /> : null}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  chipGroups: { gap: 10 },
  groupLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1.5 },
  previewRow: { flexDirection: 'row', gap: 10 },
  previewDate: { width: 92, fontSize: 13, fontWeight: '800' },
});
