import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import {
  useAccessibility,
  type TextScale,
} from '@/context/AccessibilityContext';
import { useSession } from '@/context/SessionContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { cancelRequestedCopy } from '@/domain/displayDates';
import type { Member, Membership } from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: Member['status']): string {
  return status === 'active' ? 'Active' : 'Cancellation pending';
}

const SCALE_OPTIONS: { key: TextScale; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'larger', label: 'Larger' },
  { key: 'largest', label: 'Largest' },
];

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

function MenuRow({
  label,
  icon,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.primaryLight },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <AppText style={[styles.menuLabel, { color: colors.text }]}>{label}</AppText>
      </View>
      <AppText style={[styles.menuChevron, { color: colors.muted }]}>›</AppText>
    </Pressable>
  );
}

export default function MemberAccountScreen() {
  const router = useRouter();
  const { session, api, logout } = useSession();
  const { textScale, setTextScale } = useAccessibility();
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const [nextMember, nextMembership] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
      ]);
      setMember(nextMember);
      setMembership(nextMembership);
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  const cancelBanner =
    member?.status === 'cancel_pending' &&
    membership?.lastBillDate != null &&
    membership.cancelEffectiveDate != null
      ? cancelRequestedCopy(membership.lastBillDate, membership.cancelEffectiveDate)
      : null;

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Account" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {member ? (
          <View style={[styles.card, cardTheme]}>
            <AppText style={[styles.name, { color: colors.text }]}>{member.name}</AppText>
            <AppText style={[styles.meta, { color: colors.textMuted }]}>{member.email}</AppText>
            <AppText style={[styles.meta, { color: colors.textMuted }]}>{member.phone}</AppText>
          </View>
        ) : null}

        {member && membership ? (
          <View style={[styles.card, cardTheme]}>
            <View style={styles.membershipCardHeader}>
              <View>
                <AppText style={[styles.sectionTitle, { color: colors.text }]}>Membership</AppText>
                <AppText style={[styles.row, { color: colors.text }]}>ID {member.membershipId}</AppText>
              </View>
              <Pressable
                onPress={() => router.push('/(member)/change-membership')}
                style={[styles.changePlanPill, { backgroundColor: colors.primaryLight }]}
                accessibilityRole="button"
                accessibilityLabel="Change membership plan"
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                <AppText style={[styles.changePlanText, { color: colors.primary }]}>
                  Change Plan
                </AppText>
              </Pressable>
            </View>

            <AppText style={[styles.row, { color: colors.text, fontWeight: '700' }]}>
              {member.type} Plan · {formatCents(membership.monthlyAmountCents)}/mo
            </AppText>
            <AppText style={[styles.row, { color: colors.text }]}>
              Status: {statusLabel(member.status)}
            </AppText>
            {cancelBanner ? (
              <AppText style={styles.cancelBanner}>{cancelBanner}</AppText>
            ) : null}
          </View>
        ) : null}

        {membership ? (
          <View style={[styles.card, cardTheme]}>
            <View style={styles.membershipCardHeader}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Payment method</AppText>
              <Pressable
                onPress={() => router.push('/(member)/update-payment')}
                style={[styles.changePlanPill, { backgroundColor: colors.primaryLight }]}
                accessibilityRole="button"
                accessibilityLabel="Update payment method"
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <AppText style={[styles.changePlanText, { color: colors.primary }]}>
                  Update
                </AppText>
              </Pressable>
            </View>
            <AppText style={[styles.row, { color: colors.text }]}>
              {membership.paymentBrand} •••• {membership.paymentLast4}
            </AppText>
          </View>
        ) : null}

        {/* Appearance & Color Theme */}
        <View style={[styles.card, cardTheme]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            Appearance & Theme
          </AppText>
          <AppText style={[styles.meta, { color: colors.textMuted }]}>
            Choose Light mode, Dark mode, or follow your device settings.
          </AppText>
          <View style={styles.scaleRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setThemeMode(opt.key);
                  }}
                  style={[
                    styles.scaleChip,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBg,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${opt.label} theme`}
                >
                  <View style={styles.chipInner}>
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={active ? '#FFFFFF' : colors.text}
                    />
                    <AppText
                      style={[
                        styles.scaleChipText,
                        {
                          color: active ? '#FFFFFF' : colors.text,
                          fontWeight: active ? '700' : '600',
                        },
                      ]}
                    >
                      {opt.label}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Accessibility: Text Size */}
        <View style={[styles.card, cardTheme]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>Text size</AppText>
          <AppText style={[styles.meta, { color: colors.textMuted }]}>
            Larger text makes the app easier to read.
          </AppText>
          <View style={styles.scaleRow}>
            {SCALE_OPTIONS.map((opt) => {
              const active = textScale === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setTextScale(opt.key);
                  }}
                  style={[
                    styles.scaleChip,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBg,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Text size ${opt.label}`}
                >
                  <AppText
                    style={[
                      styles.scaleChipText,
                      {
                        color: active ? '#FFFFFF' : colors.text,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.menu, cardTheme]}>
          <MenuRow
            label="Change membership plan"
            icon="swap-horizontal"
            onPress={() => router.push('/(member)/change-membership')}
            colors={colors}
          />
          <MenuRow
            label="Branch amenities & pool hours"
            icon="water"
            onPress={() => router.push('/(member)/branch-amenities')}
            colors={colors}
          />
          <MenuRow
            label="Programs & Community Health"
            icon="fitness"
            onPress={() => router.push('/(member)/programs')}
            colors={colors}
          />
          <MenuRow
            label="Guest passes & reciprocity"
            icon="ticket"
            onPress={() => router.push('/(member)/guest-pass')}
            colors={colors}
          />
          <MenuRow
            label="Update payment method"
            icon="card"
            onPress={() => router.push('/(member)/update-payment')}
            colors={colors}
          />
          <MenuRow
            label="Cancel membership"
            icon="close-circle"
            onPress={() => router.push('/(member)/cancel')}
            colors={colors}
          />
          <MenuRow
            label="About"
            icon="information-circle"
            onPress={() => router.push('/(member)/about')}
            colors={colors}
          />
        </View>

        <View style={[styles.card, cardTheme]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>YMCA Silver Spring</AppText>
          <AppText style={[styles.row, { color: colors.text }]}>9800 Hastings Drive, Silver Spring, MD 20901</AppText>
          <AppText style={[styles.row, { color: colors.text }]}>Phone: (301) 585-2120</AppText>
          <AppText style={[styles.row, { color: colors.text }]}>Email: silverspring@ymcadc.org</AppText>
          <AppText style={[styles.meta, { color: colors.textMuted, marginTop: 4 }]}>
            Questions about classes, heated pool schedules, senior programs, or accessibility accommodations? Our Member Services team is here to assist you anytime.
          </AppText>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              title="Explore Amenities & Pool Schedules"
              onPress={() => router.push('/(member)/branch-amenities')}
              accessibilityHint="View facility amenities"
            />
          </View>
        </View>

        <PrimaryButton title="Log out" onPress={() => void handleLogout()} loading={loggingOut} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    ...cardStyle,
    gap: 6,
  },
  membershipCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  changePlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.chip,
  },
  changePlanText: {
    ...typography.caption,
    fontWeight: '700',
  },
  name: {
    ...typography.title,
    fontSize: 20,
  },
  meta: {
    ...typography.body,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    marginBottom: 4,
  },
  row: {
    ...typography.body,
  },
  cancelBanner: {
    ...typography.body,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '600',
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  scaleChip: {
    minHeight: tapTarget,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleChipText: {
    ...typography.body,
    fontSize: 15,
  },
  menu: {
    ...cardStyle,
    padding: 0,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: tapTarget,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuLabel: {
    ...typography.body,
  },
  menuChevron: {
    ...typography.body,
    fontSize: 22,
    lineHeight: 22,
  },
});
