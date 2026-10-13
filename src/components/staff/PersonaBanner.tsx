import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { PersonaTheme } from '@/domain/staffCapabilities';
import { radii } from '@/theme/typography';

export function PersonaBanner({ theme, text }: { theme: PersonaTheme; text: string }) {
  const { isDark } = useTheme();
  const fg = isDark ? '#FFFFFF' : theme.color;
  return (
    <View style={[styles.banner, { backgroundColor: isDark ? theme.darkSoftBg : theme.softBg }]}>
      <Ionicons name={theme.icon} size={15} color={fg} />
      <Text style={[styles.badge, { color: fg }]}>{theme.badge}</Text>
      <Text style={[styles.text, { color: fg }]} allowFontScaling numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});
