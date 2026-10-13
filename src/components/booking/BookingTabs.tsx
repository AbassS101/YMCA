import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme/typography';

type Tab<T extends string> = { key: T; label: string };

export function BookingTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
      accessibilityRole="tablist"
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.tab, active && { backgroundColor: colors.primary }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
          >
            <Text
              style={[styles.label, { color: active ? '#FFFFFF' : colors.text }]}
              allowFontScaling
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  label: { fontSize: 15, fontWeight: '700' },
});
