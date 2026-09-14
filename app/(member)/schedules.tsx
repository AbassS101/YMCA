import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { ScheduleRow } from '@/components/ScheduleRow';
import { YHeader } from '@/components/YHeader';
import { getDemoToday } from '@/domain/demoClock';
import type { ScheduleCategory, ScheduleItem } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { savedClassesRepo } from '@/repositories/savedClassesRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

const FILTERS: { key: ScheduleCategory; label: string }[] = [
  { key: 'groupEx', label: 'Group Exercise' },
  { key: 'swim', label: 'Swim' },
  { key: 'childWatch', label: 'Child Watch' },
  { key: 'event', label: 'Events' },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MemberSchedulesScreen() {
  const { session, api } = useSession();
  const memberId = session?.userId ?? '';

  const [category, setCategory] = useState<ScheduleCategory>('groupEx');
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const [schedules, saved] = await Promise.all([
        scheduleRepo.list(api, {
          branchId: BRANCH_ID,
          from: today,
          to: addDays(today, 6),
          category,
        }),
        savedClassesRepo.list(memberId),
      ]);
      schedules.sort((a, b) => a.start.localeCompare(b.start));
      setItems(schedules);
      setSavedIds(new Set(saved.map((s) => s.scheduleItemId)));
    } catch {
      setError(true);
    }
  }, [api, category, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onToggleStar = async (scheduleItemId: string) => {
    if (memberId === '') {
      return;
    }
    await savedClassesRepo.toggle(memberId, scheduleItemId);
    await load();
  };

  const emptyCopy = useMemo(
    () => (items.length === 0 ? 'No classes in this view.' : null),
    [items.length]
  );

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Schedules" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.key === category;
          return (
            <Pressable
              key={f.key}
              onPress={() => setCategory(f.key)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {emptyCopy ? <Text style={styles.empty}>{emptyCopy}</Text> : null}
        {items.map((item) => (
          <ScheduleRow
            key={item.id}
            time={formatClassTime(item.start)}
            title={item.title}
            location={item.location}
            instructor={item.instructorName}
            starred={savedIds.has(item.id)}
            onToggleStar={() => void onToggleStar(item.id)}
          />
        ))}
        <Text style={styles.footer}>
          To enroll in programs, use Program Enrollment on ymcadc.org.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.scarlet,
    borderColor: colors.scarlet,
  },
  chipText: {
    ...typography.label,
    color: colors.nearBlack,
  },
  chipTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 8,
  },
});
