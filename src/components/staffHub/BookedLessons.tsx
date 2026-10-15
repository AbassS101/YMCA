import { StyleSheet, Text, View } from 'react-native';

import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import type { PrivateLesson, Staff } from '@/domain/types';
import { cardStyle } from '@/theme/card';
import { spacing, typography } from '@/theme/typography';

import { formatLessonWhen } from './hubTheme';

type Props = {
  title: string;
  emptyText: string;
  lessons: PrivateLesson[];
  staffList: Staff[];
  accent: string;
  busyId: string | null;
  onChange: (lesson: PrivateLesson) => void;
  onCancel: (lesson: PrivateLesson) => void;
};

/** The member's upcoming private lessons of one kind, with change and cancel. */
export function BookedLessons({ title, emptyText, lessons, staffList, accent, busyId, onChange, onCancel }: Props) {
  const { colors } = useTheme();
  const cardTheme = { backgroundColor: colors.cardBg, borderColor: colors.cardBorder };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
        {title}
      </Text>
      {lessons.length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted }]} allowFontScaling>
          {emptyText}
        </Text>
      ) : (
        lessons.map((lesson) => {
          const coach = staffList.find((s) => s.id === lesson.staffId);
          return (
            <View key={lesson.id} style={[styles.card, cardTheme]}>
              <Text style={[styles.when, { color: accent }]} allowFontScaling>
                {formatLessonWhen(lesson.start)}
              </Text>
              <Text style={[styles.coach, { color: colors.text }]} allowFontScaling>
                Instructor: {coach?.name ?? 'Assigned coach'}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]} allowFontScaling>
                Location: {lesson.location}
              </Text>
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <SecondaryButton
                    title="Change"
                    onPress={() => onChange(lesson)}
                    disabled={busyId === lesson.id}
                    accessibilityHint="Pick a different open time"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SecondaryButton
                    title="Cancel"
                    destructive
                    onPress={() => onCancel(lesson)}
                    disabled={busyId === lesson.id}
                    loading={busyId === lesson.id}
                    accessibilityHint="Cancel this private lesson"
                  />
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, fontSize: 18 },
  card: { ...cardStyle, gap: 4 },
  when: { ...typography.bodyStrong, fontSize: 16 },
  coach: { ...typography.bodyStrong, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
});
