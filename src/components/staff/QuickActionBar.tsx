import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  color?: string;
};

export function QuickActionBar({ actions }: { actions: QuickAction[] }) {
  const { colors: tc } = useTheme();
  const { width } = useWindowDimensions();
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
              { flexBasis: width >= 900 ? '22%' : '45%' },
              { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={a.icon} size={20} color={color} />
            </View>
            <Text style={[styles.label, { color: tc.text }]} allowFontScaling numberOfLines={2}>
              {a.label}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={tc.textMuted} />
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
    flexBasis: '45%',
    minWidth: 140,
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
