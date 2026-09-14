import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { spacing, tapTarget, typography } from '@/theme/typography';

export type ClassCardProps = {
  time: string;
  title: string;
  location: string;
  instructor: string;
  spotsLeft: number;
  registered: boolean;
  starred?: boolean;
  priceCents?: number;
  isSpecialEvent?: boolean;
  seniorFriendly?: boolean;
  paidAmountCents?: number;
  onToggleStar?: () => void;
  onRegister?: () => void;
  onChange?: () => void;
  onCancel?: () => void;
  busy?: boolean;
};

export function ClassCard({
  time,
  title,
  location,
  instructor,
  spotsLeft,
  registered,
  starred,
  priceCents = 0,
  isSpecialEvent,
  seniorFriendly,
  paidAmountCents,
  onToggleStar,
  onRegister,
  onChange,
  onCancel,
  busy,
}: ClassCardProps) {
  const { colors: tc, isDark } = useTheme();
  const full = spotsLeft <= 0 && !registered;
  const isPaid = priceCents > 0;
  const priceDisplay = isPaid ? `$${(priceCents / 100).toFixed(2)}` : 'Free';

  return (
    <View
      style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
      accessibilityRole="summary"
    >
      {/* Badges Header Row */}
      <View style={styles.badgeRow}>
        {isPaid ? (
          <View
            style={[
              styles.pill,
              isSpecialEvent
                ? styles.pillSpecial
                : [styles.pillPaid, { backgroundColor: tc.paidBadgeBg, borderColor: tc.border }],
            ]}
          >
            <AppText
              style={[
                styles.pillText,
                isSpecialEvent ? styles.pillSpecialText : { color: tc.paidBadge },
              ]}
            >
              {isSpecialEvent ? `Special Event · ${priceDisplay}` : `Extra Cost · ${priceDisplay}`}
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.pill,
              styles.pillIncluded,
              { backgroundColor: tc.successBg, borderColor: '#A7F3D0' },
            ]}
          >
            <AppText style={[styles.pillText, { color: tc.success }]}>
              Included with Membership
            </AppText>
          </View>
        )}

        {seniorFriendly ? (
          <View
            style={[
              styles.pill,
              styles.pillSenior,
              { backgroundColor: tc.primaryLight, borderColor: tc.border },
            ]}
          >
            <AppText style={[styles.pillText, { color: tc.primary }]}>
              Senior / AOA Friendly
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.topRow}>
        <View style={styles.timeBlock}>
          <AppText style={[styles.time, { color: tc.primary }]}>{time}</AppText>
        </View>
        <View style={styles.body}>
          <AppText style={[styles.title, { color: tc.text }]}>{title}</AppText>
          <AppText style={[styles.meta, { color: tc.textMuted }]}>{location}</AppText>
          <AppText style={[styles.meta, { color: tc.textMuted }]}>Instructor: {instructor}</AppText>
        </View>
        {onToggleStar ? (
          <Pressable
            onPress={onToggleStar}
            style={styles.starHit}
            accessibilityRole="button"
            accessibilityLabel={starred ? 'Remove from saved classes' : 'Save class'}
          >
            <AppText style={[styles.star, { color: tc.muted }, starred && styles.starActive]}>
              {starred ? '★' : '☆'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        {registered ? (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>
              {paidAmountCents && paidAmountCents > 0
                ? `Booked & Paid ($${(paidAmountCents / 100).toFixed(2)})`
                : 'Registered'}
            </AppText>
          </View>
        ) : (
          <AppText
            style={[
              styles.spots,
              full && styles.spotsFull,
              !full && spotsLeft <= 3 && styles.spotsLow,
            ]}
          >
            {full
              ? 'Class full'
              : spotsLeft <= 3
              ? `Only ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} remaining!`
              : `${spotsLeft} spots left`}
          </AppText>
        )}
      </View>

      {registered ? (
        <View style={styles.actions}>
          {onChange ? (
            <View style={styles.actionFlex}>
              <SecondaryButton
                title="Change"
                onPress={onChange}
                disabled={busy}
                accessibilityHint="Pick another day for this class"
              />
            </View>
          ) : null}
          {onCancel ? (
            <View style={styles.actionFlex}>
              <SecondaryButton
                title="Cancel"
                onPress={onCancel}
                destructive
                disabled={busy}
                accessibilityHint="Cancel your registration for this class"
              />
            </View>
          ) : null}
        </View>
      ) : onRegister ? (
        <PrimaryButton
          title={isPaid ? `Book & Pay ${priceDisplay}` : 'Register (Free)'}
          onPress={onRegister}
          disabled={full || busy}
          loading={busy}
          accessibilityHint={
            isPaid
              ? `Book this paid session for ${priceDisplay}`
              : 'Register for this class. Included with your membership.'
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    gap: spacing.sm,
    marginBottom: spacing.md,
    minWidth: 280,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillIncluded: {
    backgroundColor: colors.successBg,
    borderColor: '#BBF7D0',
  },
  pillIncludedText: {
    color: colors.success,
  },
  pillPaid: {
    backgroundColor: colors.paidBadgeBg,
    borderColor: '#BFDBFE',
  },
  pillPaidText: {
    color: colors.paidBadge,
  },
  pillSpecial: {
    backgroundColor: colors.goldBg,
    borderColor: '#FDE68A',
  },
  pillSpecialText: {
    color: colors.gold,
  },
  pillSenior: {
    backgroundColor: colors.primaryLight,
    borderColor: '#BAE6FD',
  },
  pillSeniorText: {
    color: colors.primary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timeBlock: {
    minWidth: 74,
  },
  time: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 16,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...typography.title,
    fontSize: 19,
    color: colors.nearBlack,
  },
  meta: {
    ...typography.caption,
    color: colors.muted,
  },
  starHit: {
    minWidth: tapTarget,
    minHeight: tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 28,
    color: colors.muted,
  },
  starActive: {
    color: colors.gold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    ...typography.label,
    color: colors.success,
  },
  spots: {
    ...typography.caption,
    color: colors.muted,
  },
  spotsLow: {
    color: colors.gold,
    fontWeight: '600',
  },
  spotsFull: {
    color: colors.danger,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
});
