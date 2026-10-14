import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionRequestCard } from '@/components/booking/SessionRequestCard';
import { EmptyState, SectionCard } from '@/components/staff/SectionCard';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { LessonType, SessionRequest, SessionRequestStatus } from '@/domain/types';
import { sessionRequestRepo } from '@/repositories/lessonRepo';
import { radii } from '@/theme/typography';

type Filter = 'all' | SessionRequestStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'countered', label: 'Offered' },
  { key: 'accepted', label: 'Confirmed' },
  { key: 'declined', label: 'Declined' },
];

/**
 * Read-only view of private session requests and their full history. What each viewer sees is
 * decided by `canViewSessionRequest` (Wellness Director: PT, Aquatics Director: swim, admins: all).
 */
export function SessionRequestsOversight({
  viewerId,
  accent,
  title = 'Session Requests',
  lessonType,
}: {
  viewerId: string;
  accent: string;
  title?: string;
  /** Optionally narrow to one lesson type. */
  lessonType?: LessonType;
}) {
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      setRequests(await sessionRequestRepo.list(api, { viewerId }));
    } catch {
      setRequests([]);
    }
  }, [api, viewerId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const visible = useMemo(
    () =>
      requests
        .filter((r) => (lessonType ? r.lessonType === lessonType : true))
        .filter((r) => (filter === 'all' ? true : r.status === filter)),
    [requests, filter, lessonType]
  );

  return (
    <SectionCard
      title={title}
      icon="eye-outline"
      accent={accent}
      count={visible.length}
      subtitle="Read-only. Tap a request to see its history."
    >
      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, { backgroundColor: active ? accent : tc.cardBg, borderColor: active ? accent : tc.cardBorder }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={{ color: active ? '#FFFFFF' : tc.text, fontSize: 12, fontWeight: '700' }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {visible.length === 0 ? (
        <EmptyState icon="mail-open-outline" text="No session requests match." />
      ) : (
        visible.map((r) => <SessionRequestCard key={r.id} request={r} perspective="oversight" expandable />)
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1 },
});
