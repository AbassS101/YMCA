import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export type ScheduleRowProps = {
  time: string;
  title: string;
  location: string;
  instructor: string;
  starred: boolean;
  onToggleStar: () => void;
};

export function ScheduleRow({
  time,
  title,
  location,
  instructor,
  starred,
  onToggleStar,
}: ScheduleRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{location}</Text>
        <Text style={styles.meta}>{instructor}</Text>
      </View>
      <Pressable
        onPress={onToggleStar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={starred ? 'Remove from saved classes' : 'Save class'}
      >
        <Text style={[styles.star, starred && styles.starActive]}>{starred ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  time: {
    ...typography.body,
    fontWeight: '600',
    color: colors.nearBlack,
    width: 56,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.nearBlack,
  },
  meta: {
    ...typography.body,
    color: colors.muted,
  },
  star: {
    fontSize: 22,
    color: colors.muted,
    lineHeight: 26,
  },
  starActive: {
    color: colors.scarlet,
  },
});
