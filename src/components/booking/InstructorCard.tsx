import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { Staff } from '@/domain/types';
import { radii } from '@/theme/typography';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function InstructorCard({
  staff,
  selected,
  isAssigned,
  onPress,
}: {
  staff: Staff;
  selected: boolean;
  isAssigned: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.primaryLight : colors.cardBg,
          borderColor: selected ? colors.primary : colors.cardBorder,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${staff.name}, ${staff.roleLabel}${isAssigned ? ', your trainer' : ''}`}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{initials(staff.name)}</Text>
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1} allowFontScaling>
        {staff.name}
      </Text>
      <Text style={[styles.role, { color: colors.textMuted }]} numberOfLines={2} allowFontScaling>
        {staff.roleLabel}
      </Text>
      {isAssigned ? (
        <View style={[styles.tag, { backgroundColor: colors.successBg }]}>
          <Text style={[styles.tagText, { color: colors.success }]}>Your trainer</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    borderWidth: 1.5,
    borderRadius: radii.card,
    padding: 12,
    gap: 4,
    alignItems: 'flex-start',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  name: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  role: { fontSize: 12, minHeight: 30 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full },
  tagText: { fontSize: 11, fontWeight: '800' },
});
