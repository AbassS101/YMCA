import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { formatCents } from '@/domain/lessonPricing';
import type { LessonPricing, LessonType } from '@/domain/types';
import { radii, spacing } from '@/theme/typography';

const OPTIONS: {
  key: LessonType;
  title: string;
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'training', title: 'Personal Training', blurb: 'Strength and wellness', icon: 'barbell-outline' },
  { key: 'swim', title: 'Private Swim Lesson', blurb: 'One-on-one in the pool', icon: 'water-outline' },
];

export function LessonTypeToggle({
  value,
  onChange,
  pricing,
}: {
  value: LessonType;
  onChange: (t: LessonType) => void;
  pricing: LessonPricing;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {OPTIONS.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.card,
              {
                backgroundColor: active ? colors.primaryLight : colors.cardBg,
                borderColor: active ? colors.primary : colors.cardBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${o.title}, from ${formatCents(pricing[o.key][30])}`}
          >
            <Ionicons name={o.icon} size={24} color={active ? colors.primary : colors.textMuted} />
            <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
              {o.title}
            </Text>
            <Text style={[styles.blurb, { color: colors.textMuted }]} allowFontScaling>
              {o.blurb}
            </Text>
            <Text style={[styles.price, { color: colors.primary }]} allowFontScaling>
              From {formatCents(pricing[o.key][30])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radii.card,
    padding: spacing.sm,
    gap: 4,
    minHeight: 120,
  },
  title: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  blurb: { fontSize: 12 },
  price: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
