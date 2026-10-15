import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii, spacing, typography } from '@/theme/typography';

import { hubAccent, type HubSection } from './hubTheme';

export const HUB_SECTIONS: { key: HubSection; label: string; icon: keyof typeof Ionicons.glyphMap; a11y: string }[] = [
  { key: 'training', label: 'Personal Training', icon: 'barbell', a11y: 'Personal trainers and training schedule' },
  { key: 'swim', label: 'Swim', icon: 'water', a11y: 'Swim instructors and swim schedule' },
  { key: 'packages', label: 'Packages', icon: 'medal', a11y: 'Wellness training packages and rates' },
  { key: 'desk', label: 'Front Desk', icon: 'business', a11y: 'Front desk and member services' },
  { key: 'maintenance', label: 'Maintenance', icon: 'construct', a11y: 'Report a problem or suggest an improvement to maintenance' },
];

type StatProps = { value: string; label: string };

type HeaderProps = {
  stats: StatProps[];
  onOpenMessages: () => void;
};

/** Hero banner at the top of the Staff page: what this page is for, a few live numbers, and Messages. */
export function StaffHubHero({ stats, onOpenMessages }: HeaderProps) {
  const { colors, isDark } = useTheme();
  const bg = isDark ? '#0C2A3D' : colors.primaryDark;
  return (
    <View style={[styles.hero, { backgroundColor: bg }]}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.heroEyebrow}>YMCA SILVER SPRING</Text>
          <Text style={styles.heroTitle} allowFontScaling>
            Your YMCA Team
          </Text>
          <Text style={styles.heroSub} allowFontScaling>
            Book coaches, message staff, and tell us what needs fixing.
          </Text>
        </View>
        <Pressable
          onPress={onOpenMessages}
          style={({ pressed }) => [styles.msgBtn, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Open my messages with YMCA staff"
        >
          <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
          <Text style={styles.msgText}>Messages</Text>
        </Pressable>
      </View>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type NavProps = {
  active: HubSection;
  onChange: (section: HubSection) => void;
};

/** Scrollable pill navigation between the five sections. */
export function StaffSectionNav({ active, onChange }: NavProps) {
  const { colors, isDark } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.nav}
      accessibilityRole="tablist"
    >
      {HUB_SECTIONS.map((s) => {
        const isActive = s.key === active;
        const { color, soft } = hubAccent(s.key, isDark);
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={[
              styles.pill,
              { backgroundColor: isActive ? soft : colors.cardBg, borderColor: isActive ? color : colors.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={s.a11y}
          >
            <Ionicons name={s.icon} size={16} color={isActive ? color : colors.textMuted} />
            <Text style={{ color: isActive ? color : colors.textMuted, fontSize: 13, fontWeight: isActive ? '800' : '600' }} allowFontScaling>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.card, padding: spacing.md, gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  heroEyebrow: { color: '#BFDBFE', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { ...typography.title, color: '#FFFFFF', fontSize: 24 },
  heroSub: { color: '#DBEAFE', fontSize: 13, lineHeight: 18 },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radii.button, paddingVertical: 8, paddingHorizontal: 10 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#BFDBFE', fontSize: 11, fontWeight: '600' },
  nav: { gap: 8, paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
});
