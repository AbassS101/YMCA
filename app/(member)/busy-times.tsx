import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { YHeader } from '@/components/YHeader';
import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import {
  type BusyLevel,
  formatHour,
  getBusyHours,
  isOpenAt,
  levelFor,
  quietestHours,
} from '@/domain/busyness';
import { radii, spacing } from '@/theme/typography';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LEVEL_COLOR: Record<BusyLevel, string> = {
  quiet: '#16A34A',
  moderate: '#D97706',
  busy: '#DC2626',
};
const LEVEL_LABEL: Record<BusyLevel, string> = {
  quiet: 'Not busy',
  moderate: 'Moderately busy',
  busy: 'Very busy',
};
const CHART_HEIGHT = 120;

export default function BusyTimesScreen() {
  const { busyTimes } = useAppConfig().config;
  const router = useRouter();
  const { colors: tc, isDark } = useTheme();
  const now = new Date();
  const today = now.getDay();
  const nowHour = now.getHours();

  const [selectedDay, setSelectedDay] = useState(today);
  const hours = useMemo(() => getBusyHours(selectedDay, busyTimes.byDay), [selectedDay, busyTimes.byDay]);
  const isToday = selectedDay === today;

  const current = isToday ? hours.find((h) => h.hour === nowHour) : undefined;
  const closed = isToday && !isOpenAt(nowHour);
  const best = useMemo(
    () => quietestHours(hours, isToday ? nowHour : 0),
    [hours, isToday, nowHour]
  );

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="How busy is the Y?" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
        >
          <Ionicons name="arrow-back" size={20} color={tc.primary} />
          <Text style={[styles.backText, { color: tc.primary }]}>Back</Text>
        </Pressable>

        {busyTimes.note?.trim() ? (
          <View
            style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B', backgroundColor: isDark ? '#451A03' : '#FEF3C7', marginBottom: 12 }}
            accessibilityRole="alert"
          >
            <Ionicons name="megaphone-outline" size={18} color={isDark ? '#FDE68A' : '#92400E'} />
            <Text style={{ flex: 1, color: isDark ? '#FDE68A' : '#92400E', fontSize: 14 }}>{busyTimes.note.trim()}</Text>
          </View>
        ) : null}

        {/* Right-now card */}
        <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <Text style={[styles.eyebrow, { color: tc.textMuted }]}>
            {isToday ? 'RIGHT NOW' : DAY_NAMES[selectedDay].toUpperCase()}
          </Text>
          {isToday ? (
            closed ? (
              <Text style={[styles.headline, { color: tc.text }]}>The Y is closed</Text>
            ) : current ? (
              <Text style={[styles.headline, { color: LEVEL_COLOR[current.level] }]}>
                {LEVEL_LABEL[current.level]}
              </Text>
            ) : null
          ) : (
            <Text style={[styles.headline, { color: tc.text }]}>Typical day</Text>
          )}
          {best.length > 0 ? (
            <Text style={[styles.sub, { color: tc.text, marginTop: spacing.xs }]}>
              Best times: {best.map((h) => formatHour(h.hour)).join(', ')}
            </Text>
          ) : null}
        </View>

        {/* Day picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {DAY_NAMES.map((name, i) => {
            const active = i === selectedDay;
            return (
              <Pressable
                key={name}
                onPress={() => setSelectedDay(i)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: active ? tc.primary : isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: active ? tc.primary : tc.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={{ color: active ? '#FFFFFF' : tc.text, fontWeight: '700', fontSize: 13 }}>
                  {name.slice(0, 3)}
                  {i === today ? ' •' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Bar chart */}
        <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <View style={styles.chart}>
            {hours.map((h) => {
              const isNow = isToday && h.hour === nowHour;
              return (
                <View key={h.hour} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (h.value / 100) * CHART_HEIGHT),
                        backgroundColor: LEVEL_COLOR[levelFor(h.value)],
                        opacity: isNow || !isToday ? 1 : 0.55,
                        borderWidth: isNow ? 2 : 0,
                        borderColor: tc.text,
                      },
                    ]}
                    accessibilityLabel={`${formatHour(h.hour)}: ${LEVEL_LABEL[h.level]}`}
                  />
                  <Text style={[styles.barLabel, { color: isNow ? tc.text : tc.textMuted }]}>
                    {h.hour % 3 === 0 ? h.label : ''}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            {(Object.keys(LEVEL_COLOR) as BusyLevel[]).map((k) => (
              <View key={k} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: LEVEL_COLOR[k] }]} />
                <Text style={[styles.legendText, { color: tc.textMuted }]}>{LEVEL_LABEL[k]}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.note, { color: tc.textMuted }]}>
          Based on typical attendance patterns. Holidays, events, and weather can change how busy it gets.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: radii.card, borderWidth: 1, padding: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  headline: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  sub: { fontSize: 13, marginTop: 2 },
  days: { gap: 6 },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 20, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  barLabel: { fontSize: 10, height: 16, marginTop: 4 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  note: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
});
