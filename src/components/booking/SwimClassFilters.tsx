import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme/typography';

export type ClassFilterState = { day: string; age: string };

export const DAY_FILTERS = ['All', 'Monday', 'Friday', 'Saturday', 'Sunday'];
export const AGE_FILTERS = ['All', 'Parent/Child', 'Preschool', 'Youth', 'Teen & Adult', 'Adult Masters'];

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => {
          const active = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(o)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.cardBg,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${o}`}
            >
              <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                {o}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function SwimClassFilters({
  value,
  onChange,
}: {
  value: ClassFilterState;
  onChange: (v: ClassFilterState) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <ChipRow label="DAY" options={DAY_FILTERS} value={value.day} onChange={(day) => onChange({ ...value, day })} />
      <ChipRow label="AGE GROUP" options={AGE_FILTERS} value={value.age} onChange={(age) => onChange({ ...value, age })} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  row: { gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: radii.full, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
});
