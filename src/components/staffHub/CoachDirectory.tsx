import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { UserAvatar } from '@/components/UserAvatar';
import { useTheme } from '@/context/ThemeContext';
import type { Staff } from '@/domain/types';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

type Props = {
  discipline: 'training' | 'swim';
  coaches: Staff[];
  selectedId: string;
  onSelect: (id: string) => void;
  accent: string;
  accentSoft: string;
  /** Only personal trainers can be made a primary coach. */
  primaryId?: string | null;
  onMakePrimary?: (staff: Staff) => void;
  onChat: (staff: Staff) => void;
  onBook: (staff: Staff) => void;
};

const COPY = {
  training: { label: 'Choose a Trainer', noun: 'trainer', book: 'Book private lesson' },
  swim: { label: 'Choose a Swim Instructor', noun: 'swim instructor', book: 'Book private swim lesson' },
};

/** Selectable coach cards plus the selected coach's profile and actions. Shared by training and swim. */
export function CoachDirectory({
  discipline,
  coaches,
  selectedId,
  onSelect,
  accent,
  accentSoft,
  primaryId,
  onMakePrimary,
  onChat,
  onBook,
}: Props) {
  const { colors } = useTheme();
  const copy = COPY[discipline];
  const selected = coaches.find((c) => c.id === selectedId) ?? coaches[0] ?? null;
  const firstName = selected?.name.split(' ')[0] ?? copy.noun;
  const isPrimary = selected != null && primaryId === selected.id;

  if (coaches.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>No {copy.noun}s are available right now.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.eyebrow, { color: colors.textMuted }]} allowFontScaling>
        {copy.label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {coaches.map((c) => {
          const active = c.id === selected?.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              style={[styles.chip, { backgroundColor: active ? accentSoft : colors.cardBg, borderColor: active ? accent : colors.border }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${c.name}, ${c.roleLabel}`}
            >
              <View style={styles.chipTop}>
                <UserAvatar uri={c.avatarUrl} name={c.name} size={28} />
                <Text style={[styles.chipName, { color: active ? accent : colors.text }]} numberOfLines={1} allowFontScaling>
                  {c.name}
                </Text>
                {primaryId === c.id ? (
                  <View style={[styles.badge, { backgroundColor: accent }]}>
                    <Text style={styles.badgeText}>PRIMARY</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.chipRole, { color: colors.textMuted }]} numberOfLines={1} allowFontScaling>
                {c.roleLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected ? (
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.profile}>
            <UserAvatar uri={selected.avatarUrl} name={selected.name} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]} allowFontScaling>
                  {selected.name}
                </Text>
                {isPrimary ? (
                  <View style={[styles.primaryPill, { backgroundColor: colors.successBg }]}>
                    <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>Your Primary Trainer</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.role, { color: accent }]} allowFontScaling>
                {selected.roleLabel}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]} allowFontScaling>
                  YMCA Silver Spring
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => onChat(selected)}
            style={({ pressed }) => [styles.chat, { borderColor: accent, backgroundColor: pressed ? accentSoft : colors.cardBg }]}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${selected.name}`}
          >
            <Ionicons name="chatbubbles" size={20} color={accent} />
            <Text style={[styles.chatText, { color: accent }]} allowFontScaling>
              Chat with {firstName}
            </Text>
          </Pressable>

          <PrimaryButton
            title={`${copy.book} with ${firstName}`}
            onPress={() => onBook(selected)}
            accessibilityHint={`Choose an open time with ${selected.name}`}
          />

          {onMakePrimary && !isPrimary ? (
            <Pressable
              onPress={() => onMakePrimary(selected)}
              style={[styles.makePrimary, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
              accessibilityRole="button"
              accessibilityLabel={`Set ${selected.name} as primary trainer`}
            >
              <Text style={{ color: accent, fontSize: 13, fontWeight: '700' }} allowFontScaling>
                Set as My Primary Trainer
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { borderRadius: radii.card, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, minWidth: 170, maxWidth: 220, gap: 4 },
  chipTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipName: { ...typography.bodyStrong, fontSize: 14, flexShrink: 1 },
  chipRole: { ...typography.caption, fontSize: 12 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  card: { ...cardStyle, gap: spacing.md },
  muted: { ...typography.body },
  profile: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { ...typography.title, fontSize: 20 },
  primaryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  role: { ...typography.bodyStrong, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...typography.caption },
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
  makePrimary: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.button, borderWidth: 1 },
});
