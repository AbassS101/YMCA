import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme/typography';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type KpiTileProps = {
  label: string;
  value: number | string;
  icon: IconName;
  color: string;
  onPress?: () => void;
};

export function KpiTile({ label, value, icon, color, onPress }: KpiTileProps) {
  const { colors: tc, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress == null}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: isDark ? '#0F1B2E' : '#F8FAFC', borderColor: tc.cardBorder },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.value, { color }]} allowFontScaling>
        {value}
      </Text>
      <Text style={[styles.label, { color: tc.textMuted }]} allowFontScaling numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function KpiRow({ items }: { items: KpiTileProps[] }) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <KpiTile key={item.label} {...item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    minHeight: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
