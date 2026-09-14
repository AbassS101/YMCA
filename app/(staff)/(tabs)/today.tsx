import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import type { CancelRequest, Member, PrivateLesson, ScheduleItem } from '@/domain/types';
import { lessonRepo } from '@/repositories/lessonRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ClassWithRoster = {
  item: ScheduleItem;
  roster: Member[];
};

export default function StaffTodayScreen() {
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [classes, setClasses] = useState<ClassWithRoster[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [lessonMembers, setLessonMembers] = useState<Record<string, Member>>({});
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
      const [dayClasses, pending, dayLessons] = await Promise.all([
        scheduleRepo.getStaffDay(api, staffId, today),
        api.listPendingCancels(BRANCH_ID),
        lessonRepo.listStaffDay(api, staffId, today),
      ]);
      dayClasses.sort((a, b) => a.start.localeCompare(b.start));
      dayLessons.sort((a, b) => a.start.localeCompare(b.start));

      const withRosters = await Promise.all(
        dayClasses.map(async (item) => ({
          item,
          roster: await registrationRepo.roster(api, item.id),
        }))
      );
      setClasses(withRosters);
      setLessons(dayLessons);

      const lessonMemberIds = [...new Set(dayLessons.map((l) => l.memberId))];
      const lessonMemberList = await Promise.all(
        lessonMemberIds.map((id) => api.getMember(id))
      );
      const lessonById: Record<string, Member> = {};
      for (const m of lessonMemberList) {
        lessonById[m.id] = m;
      }
      setLessonMembers(lessonById);

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
        <Text style={styles.sectionTitle} allowFontScaling>
          Classes · {todayLabel}
        </Text>
        {classes.length === 0 ? (
          <Text style={styles.empty} allowFontScaling>
            No classes on your schedule today.
          </Text>
        ) : (
          classes.map(({ item, roster }) => (
            <View key={item.id} style={styles.classCard}>
              <View style={styles.classRow}>
                <Text style={styles.classTime} allowFontScaling>
                  {formatClassTime(item.start)}
                </Text>
                <View style={styles.classBody}>
                  <Text style={styles.classTitle} allowFontScaling>
                    {item.title}
                  </Text>
                  <Text style={styles.classMeta} allowFontScaling>
                    {item.location}
                  </Text>
                  <Text style={styles.rosterCount} allowFontScaling>
                    {roster.length} registered
                    {roster.length > 0
                      ? ` · ${roster.map((m) => m.name).join(', ')}`
                      : ''}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.sectionGap]} allowFontScaling>
          Private lessons · {todayLabel}
        </Text>
        {lessons.length === 0 ? (
          <Text style={styles.empty} allowFontScaling>
            No private lessons today.
          </Text>
        ) : (
          lessons.map((lesson) => (
            <View key={lesson.id} style={styles.classCard}>
              <Text style={styles.classTime} allowFontScaling>
                {formatClassTime(lesson.start)}
              </Text>
              <Text style={styles.classTitle} allowFontScaling>
                {lessonMembers[lesson.memberId]?.name ?? 'Member'}
              </Text>
              <Text style={styles.classMeta} allowFontScaling>
                {lesson.location}
              </Text>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.sectionGap]} allowFontScaling>
          Pending cancellations
        </Text>
        {cancels.length === 0 ? (
          <Text style={styles.empty} allowFontScaling>
            No pending cancel requests.
          </Text>
        ) : (
          cancels.map((cancel) => {
            const member = cancelMembers[cancel.memberId];
            return (
              <View key={cancel.id} style={styles.cancelCard}>
                <Text style={styles.cancelName} allowFontScaling>
                  {member?.name ?? 'Member'}
                </Text>
                <Text style={styles.cancelMeta} allowFontScaling>
                  Requested {formatShortDate(cancel.requestedAt)} · access through{' '}
                  {formatShortDate(cancel.accessThrough)}
                </Text>
                <Text style={styles.cancelReason} allowFontScaling>
                  {cancel.reason}
                </Text>
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
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: 10,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.nearBlack,
  },
  sectionGap: {
    marginTop: 20,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
  },
  classCard: {
    ...cardStyle,
    gap: 4,
  },
  classRow: {
    flexDirection: 'row',
    gap: 12,
  },
  classTime: {
    ...typography.bodyStrong,
    color: colors.primary,
    width: 72,
  },
  classBody: {
    flex: 1,
    gap: 2,
  },
  classTitle: {
    ...typography.bodyStrong,
    color: colors.nearBlack,
  },
  classMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  rosterCount: {
    ...typography.caption,
    color: colors.nearBlack,
    marginTop: 4,
  },
  cancelCard: {
    ...cardStyle,
    gap: 4,
  },
  cancelName: {
    ...typography.bodyStrong,
    color: colors.nearBlack,
  },
  cancelMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  cancelReason: {
    ...typography.body,
    color: colors.nearBlack,
    marginTop: 4,
  },
});
