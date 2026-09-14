import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { YHeader } from '@/components/YHeader';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import type { CancelRequest, Member, ScheduleItem } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function StaffTodayScreen() {
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [classes, setClasses] = useState<ScheduleItem[]>([]);
  const [cancels, setCancels] = useState<CancelRequest[]>([]);
  const [cancelMembers, setCancelMembers] = useState<Record<string, Member>>({});
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const [dayClasses, pending] = await Promise.all([
        scheduleRepo.getStaffDay(api, staffId, today),
        api.listPendingCancels(BRANCH_ID),
      ]);
      dayClasses.sort((a, b) => a.start.localeCompare(b.start));
      setClasses(dayClasses);

      const members = await Promise.all(pending.map((c) => api.getMember(c.memberId)));
      const byId: Record<string, Member> = {};
      for (const m of members) {
        byId[m.id] = m;
      }
      setCancels(pending);
      setCancelMembers(byId);
    } catch {
      setError(true);
    }
  }, [api, staffId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const todayLabel = formatShortDate(getDemoToday());

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Today" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Classes · {todayLabel}</Text>
        {classes.length === 0 ? (
          <Text style={styles.empty}>No classes on your schedule today.</Text>
        ) : (
          classes.map((item) => (
            <View key={item.id} style={styles.classRow}>
              <Text style={styles.classTime}>{formatClassTime(item.start)}</Text>
              <View style={styles.classBody}>
                <Text style={styles.classTitle}>{item.title}</Text>
                <Text style={styles.classMeta}>{item.location}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.sectionGap]}>Pending cancellations</Text>
        {cancels.length === 0 ? (
          <Text style={styles.empty}>No pending cancel requests.</Text>
        ) : (
          cancels.map((cancel) => {
            const member = cancelMembers[cancel.memberId];
            return (
              <View key={cancel.id} style={styles.cancelCard}>
                <Text style={styles.cancelName}>{member?.name ?? 'Member'}</Text>
                <Text style={styles.cancelMeta}>
                  Requested {formatShortDate(cancel.requestedAt)} · access through{' '}
                  {formatShortDate(cancel.accessThrough)}
                </Text>
                <Text style={styles.cancelReason}>{cancel.reason}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  sectionGap: {
    marginTop: 20,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
  },
  classRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  classTime: {
    ...typography.label,
    color: colors.scarlet,
    width: 72,
  },
  classBody: {
    flex: 1,
    gap: 2,
  },
  classTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.nearBlack,
  },
  classMeta: {
    ...typography.body,
    color: colors.muted,
  },
  cancelCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  cancelName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  cancelMeta: {
    ...typography.body,
    color: colors.muted,
  },
  cancelReason: {
    ...typography.body,
    color: colors.nearBlack,
    marginTop: 4,
  },
});
