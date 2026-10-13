import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme/typography';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  color?: string;
};

export function QuickActionBar({ actions }: { actions: QuickAction[] }) {
  const { colors: tc, isDark } = useTheme();
  return (
    <View style={styles.grid}>
      {actions.map((a) => {
        const color = a.color ?? tc.primary;
        return (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: isDark ? '#0F1B2E' : '#FFFFFF', borderColor: tc.cardBorder },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
              <Ionicons name={a.icon} size={20} color={color} />
            </View>
            <Text style={[styles.label, { color: tc.text }]} allowFontScaling numberOfLines={2}>
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 76,
    minHeight: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
