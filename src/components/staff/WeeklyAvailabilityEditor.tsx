import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { WEEKDAY_LABELS } from '@/components/RepeatPicker';
import { SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import {
  TIME_STEP_MIN,
  addException,
  addExceptionWindow,
  addWindow,
  copyDayTo,
  errorMap,
  moveException,
  removeException,
  removeExceptionWindow,
  removeWindow,
  shiftTime,
  updateExceptionWindow,
  updateWindow,
  windowsOnDay,
} from '@/domain/availabilityEdit';
import { addDaysToDate, getDemoToday } from '@/domain/demoClock';
import { toMinutes, validateAvailability } from '@/domain/trainerAvailability';
import type { TrainerAvailabilityInput } from '@/domain/types';
import { radii } from '@/theme/typography';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

function timeLabel(hm: string): string {
  const m = toMinutes(hm);
  if (Number.isNaN(m)) return hm;
  const h = Math.floor(m / 60) % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${suffix}`;
}

function dateLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function Stepper({ label, text, onMinus, onPlus, accent }: { label: string; text: string; onMinus: () => void; onPlus: () => void; accent: string }) {
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.stepper, { borderColor: tc.cardBorder }]}>
      <Pressable onPress={onMinus} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} earlier`}>
        <Text style={{ color: accent, fontSize: 18, fontWeight: '700' }}>−</Text>
      </Pressable>
      <Text style={[styles.stepText, { color: tc.text }]} accessibilityLabel={`${label} ${text}`}>
        {text}
      </Text>
      <Pressable onPress={onPlus} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} later`}>
        <Text style={{ color: accent, fontSize: 18, fontWeight: '700' }}>+</Text>
      </Pressable>
    </View>
  );
}

/** One start/end/location row, used for both weekly windows and custom-hours exceptions. */
function WindowRow({
  window: w,
  error,
  accent,
  onChange,
  onRemove,
}: {
  window: { id: string; startTime: string; endTime: string; location: string };
  error?: string;
  accent: string;
  onChange: (patch: { startTime?: string; endTime?: string; location?: string }) => void;
  onRemove: () => void;
}) {
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.windowRow, { borderColor: error ? tc.danger : tc.cardBorder }]}>
      <View style={styles.windowTimes}>
        <Stepper
          label="Start"
          text={timeLabel(w.startTime)}
          accent={accent}
          onMinus={() => onChange({ startTime: shiftTime(w.startTime, -TIME_STEP_MIN) })}
          onPlus={() => onChange({ startTime: shiftTime(w.startTime, TIME_STEP_MIN) })}
        />
        <Text style={{ color: tc.textMuted }}>to</Text>
        <Stepper
          label="End"
          text={timeLabel(w.endTime)}
          accent={accent}
          onMinus={() => onChange({ endTime: shiftTime(w.endTime, -TIME_STEP_MIN) })}
          onPlus={() => onChange({ endTime: shiftTime(w.endTime, TIME_STEP_MIN) })}
        />
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove window">
          <Ionicons name="trash-outline" size={18} color={tc.danger} />
        </Pressable>
      </View>
      <TextField label="Location" value={w.location} onChangeText={(location) => onChange({ location })} placeholder="e.g. Studio B" />
      {error ? <Text style={{ color: tc.danger, fontSize: 12, fontWeight: '600' }}>{error}</Text> : null}
    </View>
  );
}

function DateStepper({ label, date, onChange, accent }: { label: string; date: string; onChange: (d: string) => void; accent: string }) {
  const { colors: tc } = useTheme();
  const jump = (days: number) => (
    <Pressable
      onPress={() => onChange(addDaysToDate(date, days))}
      style={[styles.jump, { borderColor: tc.cardBorder }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${days > 0 ? 'later' : 'earlier'} by ${Math.abs(days) === 7 ? 'a week' : 'a day'}`}
    >
      <Text style={{ color: accent, fontSize: 12, fontWeight: '800' }}>
        {days > 0 ? '+' : '−'}
        {Math.abs(days) === 7 ? '1w' : '1d'}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.dateRow}>
      {jump(-7)}
      {jump(-1)}
      <Text style={[styles.dateText, { color: tc.text }]}>{dateLabel(date)}</Text>
      {jump(1)}
      {jump(7)}
    </View>
  );
}

function Chip({ label, active, accent, onPress }: { label: string; active?: boolean; accent: string; onPress: () => void }) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? accent : tc.cardBg, borderColor: active ? accent : tc.cardBorder }]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
    >
      <Text style={{ color: active ? '#FFFFFF' : tc.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Weekly hours editor: windows per weekday, when the schedule repeats from/until, and one-day
 * exceptions. Controlled; all edits go through the pure helpers in availabilityEdit.
 */
export function WeeklyAvailabilityEditor({
  value,
  onChange,
  accent,
  defaultLocation,
}: {
  value: TrainerAvailabilityInput;
  onChange: (next: TrainerAvailabilityInput) => void;
  accent: string;
  defaultLocation: string;
}) {
  const { colors: tc } = useTheme();
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const errors = useMemo(() => errorMap(validateAvailability(value).errors), [value]);

  const setWeekly = (weekly: TrainerAvailabilityInput['weekly']) => onChange({ ...value, weekly });
  const setExceptions = (exceptions: TrainerAvailabilityInput['exceptions']) => onChange({ ...value, exceptions });

  const openCopy = (day: number) => {
    setCopyFrom(copyFrom === day ? null : day);
    setCopyTargets([]);
  };
  const applyCopy = () => {
    if (copyFrom == null) return;
    setWeekly(copyDayTo(value.weekly, copyFrom, copyTargets));
    setCopyFrom(null);
    setCopyTargets([]);
  };

  return (
    <>
      <SectionCard
        title="Weekly Hours"
        icon="calendar-outline"
        accent={accent}
        subtitle="Members request times inside these windows"
      >
        {DAYS.map((day) => {
          const windows = windowsOnDay(value.weekly, day);
          return (
            <View key={day} style={[styles.dayBlock, { borderColor: tc.cardBorder }]}>
              <View style={styles.dayHead}>
                <Text style={[styles.dayName, { color: tc.text }]}>{WEEKDAY_LABELS[day]}</Text>
                {windows.length === 0 ? <Text style={{ color: tc.textMuted, fontSize: 12 }}>Not available</Text> : null}
                <View style={{ flex: 1 }} />
                {windows.length > 0 ? (
                  <Pressable onPress={() => openCopy(day)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Copy ${WEEKDAY_LABELS[day]} to other days`}>
                    <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>Copy to...</Text>
                  </Pressable>
                ) : null}
              </View>

              {windows.map((w) => (
                <WindowRow
                  key={w.id}
                  window={w}
                  error={errors[w.id]}
                  accent={accent}
                  onChange={(patch) => setWeekly(updateWindow(value.weekly, w.id, patch))}
                  onRemove={() => setWeekly(removeWindow(value.weekly, w.id))}
                />
              ))}

              {copyFrom === day ? (
                <View style={[styles.copyPanel, { backgroundColor: tc.primaryLight }]}>
                  <Text style={{ color: tc.text, fontSize: 12, fontWeight: '700' }}>
                    Copy {WEEKDAY_LABELS[day]} hours to (replaces those days)
                  </Text>
                  <View style={styles.chipRow}>
                    {DAYS.filter((d) => d !== day).map((d) => (
                      <Chip
                        key={d}
                        label={WEEKDAY_LABELS[d]}
                        accent={accent}
                        active={copyTargets.includes(d)}
                        onPress={() => setCopyTargets((t) => (t.includes(d) ? t.filter((x) => x !== d) : [...t, d]))}
                      />
                    ))}
                  </View>
                  <View style={styles.chipRow}>
                    <Chip label="Apply" accent={accent} active={copyTargets.length > 0} onPress={applyCopy} />
                    <Chip label="Cancel" accent={accent} onPress={() => setCopyFrom(null)} />
                  </View>
                </View>
              ) : null}

              <Pressable
                onPress={() => setWeekly(addWindow(value.weekly, day, defaultLocation))}
                accessibilityRole="button"
                accessibilityLabel={`Add window on ${WEEKDAY_LABELS[day]}`}
              >
                <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>+ Add window</Text>
              </Pressable>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="Repeats Weekly" icon="repeat-outline" accent={accent}>
        <Text style={[styles.label, { color: tc.text }]}>Repeats weekly from</Text>
        <DateStepper
          label="Start date"
          date={value.effectiveFrom}
          accent={accent}
          onChange={(d) => onChange({ ...value, effectiveFrom: d })}
        />
        <Text style={[styles.label, { color: tc.text }]}>Until (optional)</Text>
        {value.effectiveUntil ? (
          <>
            <DateStepper
              label="End date"
              date={value.effectiveUntil}
              accent={accent}
              onChange={(d) => onChange({ ...value, effectiveUntil: d })}
            />
            <Pressable onPress={() => onChange({ ...value, effectiveUntil: undefined })} accessibilityRole="button">
              <Text style={{ color: tc.danger, fontWeight: '700', fontSize: 13 }}>Remove end date</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => onChange({ ...value, effectiveUntil: addDaysToDate(value.effectiveFrom, 90) })}
            accessibilityRole="button"
          >
            <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>No end date. Set one</Text>
          </Pressable>
        )}
        {errors.effectiveUntil ? <Text style={{ color: tc.danger, fontSize: 12, fontWeight: '600' }}>{errors.effectiveUntil}</Text> : null}
      </SectionCard>

      <SectionCard
        title="Exceptions"
        icon="alert-circle-outline"
        accent={accent}
        count={value.exceptions.length}
        subtitle="Block a date, or use different hours for one date"
      >
        {value.exceptions.map((ex) => (
          <View key={ex.id} style={[styles.dayBlock, { borderColor: tc.cardBorder }]}>
            <View style={styles.dayHead}>
              <Text style={[styles.dayName, { color: tc.text, flex: 1 }]}>{ex.kind === 'blocked' ? 'Blocked' : 'Custom hours'}</Text>
              <Pressable
                onPress={() => setExceptions(removeException(value.exceptions, ex.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove exception on ${ex.date}`}
              >
                <Ionicons name="trash-outline" size={18} color={tc.danger} />
              </Pressable>
            </View>
            <DateStepper
              label="Exception date"
              date={ex.date}
              accent={accent}
              onChange={(d) => setExceptions(moveException(value.exceptions, ex.id, d))}
            />
            {ex.windows.map((w) => (
              <WindowRow
                key={w.id}
                window={w}
                error={errors[w.id]}
                accent={accent}
                onChange={(patch) => setExceptions(updateExceptionWindow(value.exceptions, w.id, patch))}
                onRemove={() => setExceptions(removeExceptionWindow(value.exceptions, w.id))}
              />
            ))}
            {ex.kind === 'custom' ? (
              <Pressable onPress={() => setExceptions(addExceptionWindow(value.exceptions, ex.id, defaultLocation))} accessibilityRole="button">
                <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>+ Add window</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <View style={styles.chipRow}>
          <Chip
            label="Block a date"
            accent={accent}
            onPress={() => setExceptions(addException(value.exceptions, addDaysToDate(getDemoToday(), 1), 'blocked', defaultLocation))}
          />
          <Chip
            label="Custom hours for a date"
            accent={accent}
            onPress={() => setExceptions(addException(value.exceptions, addDaysToDate(getDemoToday(), 1), 'custom', defaultLocation))}
          />
        </View>
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  dayBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName: { fontSize: 15, fontWeight: '800' },
  windowRow: { borderWidth: 1, borderRadius: radii.md, padding: 8, gap: 6 },
  windowTimes: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md },
  stepBtn: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepText: { minWidth: 72, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  copyPanel: { borderRadius: radii.md, padding: 10, gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1 },
  label: { fontSize: 14, fontWeight: '800' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dateText: { fontSize: 13, fontWeight: '700' },
  jump: { paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderRadius: radii.md },
});
