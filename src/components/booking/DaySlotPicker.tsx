import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { LessonSlot } from '@/domain/types';
import { radii, spacing } from '@/theme/typography';

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function dayKeyFromDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function DaySlotPicker({
  today,
  slots,
  selectedDay,
  onSelectDay,
  selectedSlotId,
  onSelectSlot,
  durationMin,
}: {
  today: string;
  slots: LessonSlot[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  durationMin: number;
}) {
  const { colors } = useTheme();

  const days = useMemo(() => {
    const base = new Date(`${today}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [today]);

  const byDay = useMemo(() => {
    const map = new Map<string, LessonSlot[]>();
    for (const s of slots) {
      const k = localDayKey(s.start);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [slots]);

  const daySlots = byDay.get(selectedDay) ?? [];

  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {days.map((d) => {
          const key = dayKeyFromDate(d);
          const count = byDay.get(key)?.length ?? 0;
          const active = key === selectedDay;
          const disabled = count === 0;
          return (
            <Pressable
              key={key}
              disabled={disabled}
              onPress={() => onSelectDay(key)}
              style={[
                styles.day,
                {
                  backgroundColor: active ? colors.primary : colors.cardBg,
                  borderColor: active ? colors.primary : colors.cardBorder,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`${d.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}, ${count} open times`}
            >
              <Text style={[styles.dow, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text style={[styles.dom, { color: active ? '#FFFFFF' : colors.text }]}>
                {d.getDate()}
              </Text>
              <Text style={[styles.count, { color: active ? '#FFFFFF' : colors.primary }]}>
                {count === 0 ? '-' : `${count} open`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {daySlots.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]} allowFontScaling>
          No open times on this day. Pick another day or instructor.
        </Text>
      ) : (
        <View style={styles.chips}>
          {daySlots.map((s) => {
            const active = s.id === selectedSlotId;
            const start = new Date(s.start);
            const end = new Date(start.getTime() + durationMin * 60000);
            const fmt = (d: Date) =>
              d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            return (
              <Pressable
                key={s.id}
                onPress={() => onSelectSlot(s.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.cardBg,
                    borderColor: active ? colors.primary : colors.cardBorder,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${fmt(start)} to ${fmt(end)}, ${s.location}`}
              >
                <Text style={[styles.chipTime, { color: colors.text }]} allowFontScaling>
                  {fmt(start)} - {fmt(end)}
                </Text>
                <Text style={[styles.chipLoc, { color: colors.textMuted }]} numberOfLines={1}>
                  {s.location}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export { dayKeyFromDate, localDayKey };

const styles = StyleSheet.create({
  strip: { gap: 8, paddingVertical: 2 },
  day: {
    width: 64,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  dow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  dom: { fontSize: 20, fontWeight: '800' },
  count: { fontSize: 10, fontWeight: '700' },
  chips: { gap: 8 },
  chip: { borderRadius: radii.md, padding: 12, minHeight: 56, justifyContent: 'center', gap: 2 },
  chipTime: { fontSize: 16, fontWeight: '700' },
  chipLoc: { fontSize: 12 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.sm },
});
