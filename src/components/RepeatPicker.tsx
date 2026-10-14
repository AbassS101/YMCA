import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

export type RepeatMode = 'once' | 'repeat';

export type RepeatValue = {
  mode: RepeatMode;
  /** 0 = Sunday ... 6 = Saturday */
  days: number[];
  /** Repeat every N weeks (1 = every week, 2 = every other week, ...) */
  interval: number;
  /** Total span of the series, in weeks */
  weeks: number;
};

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DEFAULT_REPEAT: RepeatValue = { mode: 'once', days: [], interval: 1, weeks: 8 };

const DAY_MS = 86400000;
const MAX_INTERVAL = 12;
const MAX_WEEKS = 104;

function utcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Day of week (0-6) for a YYYY-MM-DD calendar date. */
export function dayOfWeek(date: string): number {
  return new Date(utcMs(date)).getUTCDay();
}

/** All YYYY-MM-DD dates a repeat pattern produces, starting on/after startDate. */
export function expandRepeat(startDate: string, value: RepeatValue): string[] {
  if (value.mode === 'once') return [startDate];
  if (value.days.length === 0) return [];
  const interval = Math.max(1, value.interval || 1);
  const start = utcMs(startDate);
  const weekStart = start - dayOfWeek(startDate) * DAY_MS;
  const out: string[] = [];
  for (let w = 0; w < value.weeks; w += interval) {
    for (const dow of [...value.days].sort((a, b) => a - b)) {
      const t = weekStart + (w * 7 + dow) * DAY_MS;
      if (t >= start) out.push(new Date(t).toISOString().slice(0, 10));
    }
  }
  return out;
}

function intervalText(interval: number): string {
  if (interval <= 1) return 'weekly';
  if (interval === 2) return 'every other week';
  return `every ${interval} weeks`;
}

export function repeatLabel(value: RepeatValue): string | undefined {
  if (value.mode === 'once' || value.days.length === 0) return undefined;
  const days = [...value.days].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]).join(', ');
  return `${days} · ${intervalText(Math.max(1, value.interval || 1))}`;
}

/** Rebuild a repeat value from the dates of an existing series. */
export function repeatFromDates(dates: string[], label?: string): RepeatValue {
  if (dates.length < 2) return DEFAULT_REPEAT;
  const sorted = [...dates].sort();
  const days = Array.from(new Set(sorted.map(dayOfWeek))).sort((a, b) => a - b);
  const spanWeeks = Math.round((utcMs(sorted[sorted.length - 1]) - utcMs(sorted[0])) / (7 * DAY_MS)) + 1;
  let interval = 1;
  if (label?.includes('every other')) interval = 2;
  else {
    const m = label?.match(/every (\d+) weeks/);
    if (m) interval = Math.max(1, Number(m[1]));
  }
  return { mode: 'repeat', days, interval, weeks: Math.max(spanWeeks, 1) };
}

type Props = {
  value: RepeatValue;
  onChange: (v: RepeatValue) => void;
  /** Used to pre-select the weekday when switching on a repeat */
  startDate: string;
  label?: string;
};

const PRESETS: { text: string; days: number[] }[] = [
  { text: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { text: 'Weekends', days: [0, 6] },
  { text: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

function Stepper({
  value,
  min,
  max,
  onChange,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  unit: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel={`Decrease ${unit}`}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.stepBtn, value <= min && { opacity: 0.35 }]}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        accessibilityLabel={`Increase ${unit}`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.stepBtn, value >= max && { opacity: 0.35 }]}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

export function RepeatPicker({ value, onChange, startDate, label = 'Repeat' }: Props) {
  const on = value.mode === 'repeat';
  const sortedDays = [...value.days].sort((a, b) => a - b);

  const toggleRepeat = (next: boolean) =>
    onChange({
      ...value,
      mode: next ? 'repeat' : 'once',
      days: next && value.days.length === 0 ? [dayOfWeek(startDate)] : value.days,
    });

  const count = on ? expandRepeat(startDate, value).length : 0;
  const summary = repeatLabel(value);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segment}>
        {([false, true] as const).map((next) => {
          const active = on === next;
          return (
            <Pressable
              key={String(next)}
              onPress={() => toggleRepeat(next)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {next ? 'Repeats' : 'Does not repeat'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {on ? (
        <View style={styles.panel}>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Every</Text>
            <Stepper
              value={Math.max(1, value.interval || 1)}
              min={1}
              max={MAX_INTERVAL}
              unit="interval"
              onChange={(interval) => onChange({ ...value, interval })}
            />
            <Text style={styles.lineLabel}>{value.interval > 1 ? 'weeks' : 'week'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sub}>On</Text>
          <View style={styles.daysRow}>
            {WEEKDAY_INITIALS.map((d, dow) => {
              const active = value.days.includes(dow);
              return (
                <Pressable
                  key={dow}
                  accessibilityLabel={WEEKDAY_LABELS[dow]}
                  onPress={() =>
                    onChange({
                      ...value,
                      days: active ? value.days.filter((x) => x !== dow) : [...value.days, dow],
                    })
                  }
                  style={[styles.dayDot, active && styles.dayDotActive]}
                >
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.presetRow}>
            {PRESETS.map((p) => {
              const active = sortedDays.join() === p.days.join();
              return (
                <Pressable
                  key={p.text}
                  onPress={() => onChange({ ...value, days: p.days })}
                  style={[styles.preset, active && styles.presetActive]}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>{p.text}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.line}>
            <Text style={styles.lineLabel}>For</Text>
            <Stepper
              value={value.weeks}
              min={1}
              max={MAX_WEEKS}
              unit="weeks"
              onChange={(weeks) => onChange({ ...value, weeks })}
            />
            <Text style={styles.lineLabel}>{value.weeks > 1 ? 'weeks' : 'week'}</Text>
          </View>

          <Text style={styles.summary}>
            {value.days.length === 0
              ? 'Pick at least one day.'
              : `${summary} · ${count} session${count === 1 ? '' : 's'}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.nearBlack, marginBottom: 6 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radii.md },
  segmentItemActive: { backgroundColor: colors.white },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.nearBlack, opacity: 0.6 },
  segmentTextActive: { opacity: 1, fontWeight: '700' },
  panel: {
    marginTop: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineLabel: { fontSize: 14, fontWeight: '600', color: colors.nearBlack },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 12 },
  sub: { fontSize: 12, fontWeight: '700', color: colors.nearBlack, opacity: 0.6, marginBottom: 8 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, fontWeight: '600', color: colors.primary },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.nearBlack },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dayDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 13, fontWeight: '700', color: colors.nearBlack },
  dayTextActive: { color: '#FFFFFF' },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  preset: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.border },
  presetActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 12, fontWeight: '600', color: colors.nearBlack },
  presetTextActive: { color: '#FFFFFF' },
  summary: { marginTop: 12, fontSize: 12, color: colors.nearBlack, opacity: 0.65 },
});
