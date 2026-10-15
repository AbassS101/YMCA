import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { addDaysToDate, getDemoToday } from '@/domain/demoClock';
import type { LessonSlot, Staff } from '@/domain/types';
import { availabilityRepo } from '@/repositories/lessonRepo';
import { radii, spacing } from '@/theme/typography';

const DAYS = 7;

type Props = {
  trainers: Staff[];
  /** Tapping a trainer inside a time band. */
  onSelectTrainer: (trainer: Staff, window: LessonSlot) => void;
  accent?: string;
  /** Shown above the list, e.g. "Pick a trainer to book". */
  hint?: string;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  /** Plural noun for the people shown, e.g. "swim instructors". Defaults to "trainers". */
  noun?: string;
  /** Icon in the header. */
  icon?: keyof typeof Ionicons.glyphMap;
};

function dayLabel(date: string): { dow: string; num: string } {
  const d = new Date(`${date}T12:00:00`);
  return { dow: d.toLocaleDateString(undefined, { weekday: 'short' }), num: String(d.getDate()) };
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * The week at a glance, in a dropdown that starts closed: pick a day, see each time band (e.g. 9-12,
 * 4-8 PM) and which trainers are available in it. Shows open hours only, never internal notes.
 * Hours are only fetched once it is opened.
 */
export function WeeklyTrainerSchedule({ title = "This Week's Availability", subtitle, defaultOpen = false, ...rest }: Props) {
  const { colors: tc } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const color = rest.accent ?? tc.primary;
  return (
    <View style={[styles.wrap, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${open ? 'collapse' : 'expand'}`}
      >
        <Ionicons name={rest.icon ?? 'calendar-outline'} size={20} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: tc.text, fontSize: 16, fontWeight: '800' }} allowFontScaling>
            {title}
          </Text>
          {subtitle ? <Text style={{ color: tc.textMuted, fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={tc.textMuted} />
      </Pressable>
      {open ? <ScheduleBody {...rest} /> : null}
    </View>
  );
}

function ScheduleBody({ trainers, onSelectTrainer, accent, hint, noun = 'trainers' }: Omit<Props, 'title' | 'subtitle' | 'defaultOpen' | 'icon'>) {
  const one = noun.endsWith('s') ? noun.slice(0, -1) : noun;
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const color = accent ?? tc.primary;
  const today = getDemoToday();
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDaysToDate(today, i)), [today]);
  const [pickedDay, setDay] = useState(today);
  // Fall back to today if the demo clock moved the week out from under the picked day.
  const day = days.includes(pickedDay) ? pickedDay : days[0];
  const [windows, setWindows] = useState<LessonSlot[] | null>(null);
  const [failed, setFailed] = useState(false);

  const trainerKey = trainers.map((t) => t.id).join('|');
  useEffect(() => {
    let live = true;
    setWindows(null);
    setFailed(false);
    let errors = 0;
    Promise.all(
      trainers.map((t) =>
        availabilityRepo.listWindows(api, t.id, days[0], days[DAYS - 1]).catch(() => {
          errors += 1;
          return [] as LessonSlot[];
        })
      )
    ).then((lists) => {
      if (!live) return;
      setFailed(trainers.length > 0 && errors === trainers.length);
      setWindows(lists.flat());
    });
    return () => {
      live = false;
    };
    // trainerKey stands in for the trainers array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, trainerKey, days]);

  const countByDay = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const w of windows ?? []) m.set(w.start.slice(0, 10), (m.get(w.start.slice(0, 10)) ?? new Set()).add(w.staffId));
    return m;
  }, [windows]);

  const bands = useMemo(() => {
    const groups = new Map<string, { start: string; end: string; slots: LessonSlot[] }>();
    for (const w of (windows ?? []).filter((x) => x.start.slice(0, 10) === day)) {
      const key = `${w.start}|${w.end}`;
      const g = groups.get(key) ?? { start: w.start, end: w.end, slots: [] };
      g.slots.push(w);
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  }, [windows, day]);

  return (
    <View style={{ gap: spacing.sm }}>
      {hint ? <Text style={{ color: tc.textMuted, fontSize: 13 }}>{hint}</Text> : null}
      <View style={styles.dayRow}>
        {days.map((d) => {
          const active = d === day;
          const { dow, num } = dayLabel(d);
          const n = countByDay.get(d)?.size ?? 0;
          return (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              style={[styles.dayChip, { backgroundColor: active ? color : tc.cardBg, borderColor: active ? color : tc.cardBorder }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${dow} ${num}, ${n} ${n === 1 ? one : noun} available`}
            >
              <Text style={{ color: active ? '#FFFFFF' : tc.textMuted, fontSize: 11, fontWeight: '700' }}>{dow}</Text>
              <Text style={{ color: active ? '#FFFFFF' : tc.text, fontSize: 16, fontWeight: '800' }}>{num}</Text>
              <Text style={{ color: active ? '#FFFFFF' : n > 0 ? color : tc.textMuted, fontSize: 10, fontWeight: '700' }}>
                {n > 0 ? `${n} avail` : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {trainers.length === 0 ? (
        <Text style={{ color: tc.textMuted, fontSize: 13 }}>No {noun} to show.</Text>
      ) : failed ? (
        <Text style={{ color: tc.textMuted, fontSize: 13 }}>Could not load trainer hours. Pull to refresh or try again later.</Text>
      ) : windows === null ? (
        <Text style={{ color: tc.textMuted, fontSize: 13 }}>Loading the week…</Text>
      ) : bands.length === 0 ? (
        <Text style={{ color: tc.textMuted, fontSize: 13 }}>No {noun} have open hours this day. Try another day.</Text>
      ) : (
        bands.map((band) => (
          <View key={`${band.start}|${band.end}`} style={[styles.band, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={{ color: tc.text, fontSize: 15, fontWeight: '800' }}>
              {time(band.start)} – {time(band.end)}
            </Text>
            <View style={styles.trainerWrap}>
              {band.slots.map((w) => {
                const trainer = trainers.find((t) => t.id === w.staffId);
                if (!trainer) return null;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => onSelectTrainer(trainer, w)}
                    style={[styles.trainerChip, { borderColor: color, backgroundColor: `${color}12` }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${trainer.name}, ${time(w.start)} to ${time(w.end)}, ${w.location}`}
                  >
                    <UserAvatar uri={trainer.avatarUrl} name={trainer.name} size={22} />
                    <View>
                      <Text style={{ color: tc.text, fontSize: 13, fontWeight: '700' }}>{trainer.name}</Text>
                      <Text style={{ color: tc.textMuted, fontSize: 11 }}>{w.location}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  dayRow: { flexDirection: 'row', gap: 4 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.button, borderWidth: 1.5, gap: 1 },
  band: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 8 },
  trainerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trainerChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radii.button, paddingHorizontal: 10, paddingVertical: 6 },
});
