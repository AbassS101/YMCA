import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

export type MentionCandidate = {
  id: string;
  name: string;
  roleLabel: string;
  roleType: 'admin' | 'trainer' | 'desk' | 'it' | 'member';
  icon: keyof typeof Ionicons.glyphMap;
  badgeBg: string;
  badgeText: string;
};

export const DEFAULT_MENTION_CANDIDATES: MentionCandidate[] = [
  {
    id: 'staff-all',
    name: 'All Staff Desk',
    roleLabel: 'Front Desk & Operations Team',
    roleType: 'desk',
    icon: 'business',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
  },
  {
    id: 'staff-alex',
    name: 'Alex Rivera',
    roleLabel: 'Personal Wellness Trainer',
    roleType: 'trainer',
    icon: 'barbell',
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
  },
  {
    id: 'staff-sarah',
    name: 'Sarah Davis',
    roleLabel: 'Senior Mobility & Aqua Coach',
    roleType: 'trainer',
    icon: 'water',
    badgeBg: '#E0F2FE',
    badgeText: '#0284C7',
  },
  {
    id: 'staff-desk',
    name: 'Marcus Taylor',
    roleLabel: 'Wellness & Front Desk Team',
    roleType: 'desk',
    icon: 'people',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
  },
  {
    id: 'staff-itadmin',
    name: 'David Miller',
    roleLabel: 'IT Systems & Security',
    roleType: 'it',
    icon: 'construct',
    badgeBg: '#EDE9FE',
    badgeText: '#6D28D9',
  },
  {
    id: 'staff-admin',
    name: 'Jane Smith',
    roleLabel: 'Branch Director',
    roleType: 'admin',
    icon: 'shield-checkmark',
    badgeBg: '#EEF2FF',
    badgeText: '#4F46E5',
  },
];

type MentionAutocompleteProps = {
  /** The current text string from the input */
  text: string;
  /** Callback when user selects a candidate */
  onSelect: (candidate: MentionCandidate, newText: string) => void;
  /** Optional custom list of candidates */
  candidates?: MentionCandidate[];
  /** Optional custom styling */
  style?: StyleProp<ViewStyle>;
  /** Optional manual dismiss */
  onDismiss?: () => void;
};

/**
 * Extracts active mention query from the end of a string.
 * Returns null if user is not currently typing an @ mention.
 */
export function extractMentionQuery(text: string): string | null {
  const match = /(?:^|\s)@([a-zA-Z0-9_\s]{0,25})$/.exec(text);
  if (!match) return null;
  return match[1]; // query string (can be empty string if just typed '@')
}

/**
 * Replaces the trailing @query with the chosen mention tag.
 */
export function applyMentionToText(originalText: string, mentionName: string): string {
  return originalText.replace(/(?:^|\s)@([a-zA-Z0-9_\s]{0,25})$/, (match) => {
    const leadingWhitespace = match.startsWith(' ') || match.startsWith('\n') ? match[0] : '';
    return `${leadingWhitespace}@${mentionName} `;
  });
}

export function MentionAutocomplete({
  text,
  onSelect,
  candidates = DEFAULT_MENTION_CANDIDATES,
  style,
  onDismiss,
}: MentionAutocompleteProps) {
  const { colors: tc, isDark } = useTheme();
  const { multiplier } = useAccessibility();

  const query = extractMentionQuery(text);

  const filtered = useMemo(() => {
    if (query == null) return [];
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.roleLabel.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [query, candidates]);

  if (query == null || filtered.length === 0) {
    return null;
  }

  const handleSelect = (cand: MentionCandidate) => {
    const updated = applyMentionToText(text, cand.name);
    onSelect(cand, updated);
  };

  return (
    <View
      style={[
        styles.popup,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#CBD5E1',
        },
        style,
      ]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="at-circle" size={16} color={colors.primary} />
          <AppText style={[styles.headerTitle, { color: tc.textMuted }]}>
            MENTION SUGGESTIONS
          </AppText>
        </View>
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button">
            <Ionicons name="close" size={16} color={tc.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="always"
        style={styles.list}
        renderItem={({ item }) => {
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.itemRow,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? '#1E293B'
                      : '#F0F9FF'
                    : 'transparent',
                  borderBottomColor: isDark ? '#1E293B' : '#F8FAFC',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Mention ${item.name}, ${item.roleLabel}`}
            >
              <View style={[styles.iconBox, { backgroundColor: item.badgeBg }]}>
                <Ionicons name={item.icon} size={16} color={item.badgeText} />
              </View>

              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <AppText style={[styles.nameText, { color: tc.text }]}>
                    {item.name}
                  </AppText>
                  <View style={[styles.roleBadge, { backgroundColor: item.badgeBg }]}>
                    <Text style={[styles.roleBadgeText, { color: item.badgeText }]}>
                      {item.roleLabel.split(' ')[0].toUpperCase()}
                    </Text>
                  </View>
                </View>
                <AppText
                  style={[styles.subText, { color: tc.textMuted }]}
                  numberOfLines={1}
                >
                  {item.roleLabel}
                </AppText>
              </View>

              <AppText style={[styles.tagPill, { color: colors.primary }]}>
                @{item.name.replace(/\s+/g, '')}
              </AppText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    maxHeight: 220,
    marginBottom: 8,
    ...cardStyle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  list: {
    maxHeight: 180,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subText: {
    fontSize: 11,
    marginTop: 1,
  },
  tagPill: {
    fontSize: 11,
    fontWeight: '700',
  },
});
