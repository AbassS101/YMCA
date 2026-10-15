import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { Staff } from '@/domain/types';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

import { hubAccent } from './hubTheme';

type Props = {
  deskStaff: Staff | null;
  onChat: (staff: Staff) => void;
};

const ROWS: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
  { icon: 'time-outline', label: 'Desk Hours', value: 'Mon–Fri 6:00 AM – 9:00 PM | Sat–Sun 7:00 AM – 6:00 PM' },
  { icon: 'call-outline', label: 'Desk Phone', value: '301 585 2120 ext 2506' },
  {
    icon: 'help-circle-outline',
    label: 'Support For',
    value: 'Class registration, locker rentals, membership billing, guest passes, and facility access.',
  },
];

/** Member services: who runs the front desk, when it is open, and a direct chat. */
export function FrontDeskSection({ deskStaff, onChat }: Props) {
  const { colors, isDark } = useTheme();
  const { color: accent, soft } = hubAccent('desk', isDark);
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: soft }]}>
          <Ionicons name="business" size={26} color={accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
            YMCA Silver Spring Member Services
          </Text>
          <Text style={[styles.role, { color: accent }]} allowFontScaling>
            {deskStaff?.name ?? 'Billy Deveaux'} · Membership Director
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} allowFontScaling>
            Silver Spring Branch · Main Lobby Front Desk
          </Text>
        </View>
      </View>

      <View style={[styles.details, { backgroundColor: isDark ? colors.background : colors.offWhite, borderColor: colors.border }]}>
        {ROWS.map((r) => (
          <View key={r.label} style={styles.row}>
            <Ionicons name={r.icon} size={18} color={accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]} allowFontScaling>
              {r.label}:
            </Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]} allowFontScaling>
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      {deskStaff ? (
        <Pressable
          onPress={() => onChat(deskStaff)}
          style={({ pressed }) => [styles.chat, { borderColor: accent, backgroundColor: pressed ? soft : colors.cardBg }]}
          accessibilityRole="button"
          accessibilityLabel="Chat with YMCA staff desk"
        >
          <Ionicons name="chatbubbles" size={22} color={accent} />
          <Text style={[styles.chatText, { color: accent }]} allowFontScaling>
            Chat with Staff Desk
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardStyle, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, fontSize: 18 },
  role: { ...typography.bodyStrong, fontSize: 14 },
  details: { padding: spacing.md, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  rowLabel: { ...typography.bodyStrong, fontSize: 13, minWidth: 90 },
  rowValue: { ...typography.body, fontSize: 13, flex: 1 },
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatText: { ...typography.bodyStrong, fontSize: 15, fontWeight: '700' },
});
