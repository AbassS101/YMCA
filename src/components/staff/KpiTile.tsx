import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type KpiTileProps = {
  label: string;
  value: number | string;
  icon: IconName;
  color: string;
  onPress?: () => void;
};

export function KpiTile({ label, value, icon, color, onPress }: KpiTileProps) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress == null}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tc.background, borderColor: tc.cardBorder },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.tileHeader}><Ionicons name={icon} size={16} color={color} />{onPress ? <Ionicons name="arrow-forward" size={13} color={tc.textMuted} /> : null}</View>
      <Text style={[styles.value, { color: tc.text }]} allowFontScaling>
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
    minWidth: 120,
    minHeight: 108,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 6,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'left',
  },
  tileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
