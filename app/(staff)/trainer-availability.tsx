import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { AvailabilitySettings } from '@/components/staff/AvailabilitySettings';
import { SessionRequestsInbox } from '@/components/staff/SessionRequestsInbox';
import { EmptyState, SectionCard } from '@/components/staff/SectionCard';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { WeeklyAvailabilityEditor } from '@/components/staff/WeeklyAvailabilityEditor';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { manageableTrainers } from '@/domain/availabilityAccess';
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

  const trainers = useMemo(() => manageableTrainers(session?.role, actorId, staffList), [session?.role, actorId, staffList]);
  const targetId = useMemo(() => {
    const wanted = pickedId ?? paramId;
    if (wanted && trainers.some((t) => t.id === wanted)) return wanted;
    return trainers.find((t) => t.id === actorId)?.id ?? trainers[0]?.id ?? '';
  }, [pickedId, paramId, trainers, actorId]);
  const target = trainers.find((t) => t.id === targetId);
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
        <View style={styles.chips}>
          {trainers.map((t) => {
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
      ) : null}

      {target && draft ? (
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
        subtitle="What members can request, from your last saved hours"
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

      {targetId ? <SessionRequestsInbox key={`req-${targetId}`} staffId={targetId} accent={theme.color} onChanged={() => void loadPreview()} /> : null}
      {targetId ? <AvailabilitySettings key={targetId} staffId={targetId} accent={theme.color} /> : null}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1.5 },
  previewRow: { flexDirection: 'row', gap: 10 },
  previewDate: { width: 92, fontSize: 13, fontWeight: '800' },
});
