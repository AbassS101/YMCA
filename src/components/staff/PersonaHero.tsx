import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { useTheme } from '@/context/ThemeContext';
import type { PersonaTheme } from '@/domain/staffCapabilities';
import { radii } from '@/theme/typography';

type PersonaHeroProps = {
  theme: PersonaTheme;
  name: string;
  avatarUrl?: string;
  roleLabel?: string;
  greeting?: string;
  dateLabel: string;
  children?: ReactNode;
};

export function PersonaHero({ theme, name, avatarUrl, roleLabel, greeting, dateLabel, children }: PersonaHeroProps) {
  const { colors: tc, isDark } = useTheme();
  const firstName = name.split(' ')[0] || name;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
      ]}
    >
      <View style={styles.topRow}>
        <UserAvatar uri={avatarUrl} name={name} size={52} />
        <View style={styles.identity}>
          <Text style={[styles.greeting, { color: tc.text }]} allowFontScaling accessibilityRole="header">
            {greeting ?? `Hi, ${firstName}`}
          </Text>
          <Text style={[styles.roleLabel, { color: tc.textMuted }]} allowFontScaling numberOfLines={2}>
            {roleLabel ?? theme.title} · YMCA Silver Spring
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isDark ? theme.darkSoftBg : theme.softBg }]}>
          <Ionicons name={theme.icon} size={13} color={isDark ? '#FFFFFF' : theme.color} />
          <Text style={[styles.badgeText, { color: isDark ? '#FFFFFF' : theme.color }]}>{theme.badge}</Text>
        </View>
      </View>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-clear-outline" size={14} color={tc.textMuted} />
        <Text style={[styles.dateText, { color: tc.textMuted }]} allowFontScaling>
          {dateLabel}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  identity: {
    flex: 1,
    minWidth: 150,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  roleLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
