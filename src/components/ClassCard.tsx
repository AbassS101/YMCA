import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

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
  registrationRequired?: boolean;
  intensity?: 'All Levels' | 'Low' | 'Moderate' | 'High';
  capacity?: number;
  durationStr?: string;
  paidAmountCents?: number;
  onToggleStar?: () => void;
  onRegister?: () => void;
  onChange?: () => void;
  onCancel?: () => void;
  onOpenForum?: () => void;
  onPressCard?: () => void;
  busy?: boolean;
};

function getLocationIcon(loc: string): any {
  const l = loc.toLowerCase();
  if (l.includes('pool')) return 'water';
  if (l.includes('free weight') || l.includes('weight')) return 'barbell';
  if (l.includes('circuit') || l.includes('studio/circuit')) return 'fitness';
  if (l.includes('studio')) return 'sparkles';
  return 'basketball';
}

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
  registrationRequired,
  intensity,
  capacity = 20,
  durationStr,
  paidAmountCents,
  onToggleStar,
  onRegister,
  onChange,
  onCancel,
  onOpenForum,
  onPressCard,
  busy,
}: ClassCardProps) {
  const { colors: tc, isDark } = useTheme();
  const full = spotsLeft <= 0 && !registered;
  const isPaid = priceCents > 0;
  const priceDisplay = isPaid ? `$${(priceCents / 100).toFixed(2)}` : 'Free';
  const totalEnrolled = Math.max(0, capacity - spotsLeft);
  const percentFilled = Math.min(100, Math.max(8, (totalEnrolled / Math.max(1, capacity)) * 100));

  const locIcon = getLocationIcon(location);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tc.cardBg,
          borderColor: registered
            ? tc.success
            : registrationRequired
            ? isDark
              ? '#B45309'
              : '#FBBF24'
            : tc.cardBorder,
        },
      ]}
      accessibilityRole="summary"
    >
      {/* Badges Header Row */}
      <View style={styles.badgeRow}>
        <View style={styles.badgeLeftGroup}>
          {registrationRequired ? (
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                  borderColor: isDark ? '#D97706' : '#F59E0B',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={12} color="#D97706" />
              <AppText style={[styles.pillText, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                REGISTRATION REQUIRED
              </AppText>
            </View>
          ) : null}

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
              <Ionicons name="checkmark-circle-outline" size={12} color={tc.success} />
              <AppText style={[styles.pillText, { color: tc.success }]}>
                Included Free
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
              <Ionicons name="heart" size={11} color={tc.primary} />
              <AppText style={[styles.pillText, { color: tc.primary }]}>
                Senior / AOA Friendly
              </AppText>
            </View>
          ) : null}
        </View>

        {onToggleStar ? (
          <Pressable
            onPress={onToggleStar}
            style={styles.starHit}
            accessibilityRole="button"
            accessibilityLabel={starred ? 'Remove from saved classes' : 'Save class'}
            hitSlop={8}
          >
            <Ionicons
              name={starred ? 'star' : 'star-outline'}
              size={22}
              color={starred ? colors.gold : tc.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Main Card Content (Tappable for Details) */}
      <Pressable
        onPress={onPressCard}
        style={styles.pressableArea}
        accessibilityRole="button"
        accessibilityLabel={`View full details for ${title}`}
      >
        <View style={styles.topRow}>
          {/* Time & Duration Rail */}
          <View style={[styles.timeBlock, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: tc.border }]}>
            <AppText style={[styles.time, { color: tc.primary }]}>{time}</AppText>
            {durationStr ? (
              <View style={[styles.durationPill, { backgroundColor: tc.primaryLight }]}>
                <AppText style={[styles.durationText, { color: tc.primary }]}>{durationStr}</AppText>
              </View>
            ) : null}
          </View>

          {/* Title & Metadata */}
          <View style={styles.body}>
            <AppText style={[styles.title, { color: tc.text }]} numberOfLines={2}>
              {title}
            </AppText>

            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name={locIcon} size={12} color={tc.primary} />
                <AppText style={[styles.metaChipText, { color: tc.text }]}>
                  {location}
                </AppText>
              </View>

              <View style={[styles.metaChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name="person" size={12} color={tc.textMuted} />
                <AppText style={[styles.metaChipText, { color: tc.textMuted }]}>
                  {instructor}
                </AppText>
              </View>

              {intensity ? (
                <View style={[styles.metaChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="speedometer-outline" size={12} color={tc.textMuted} />
                  <AppText style={[styles.metaChipText, { color: tc.textMuted }]}>
                    {intensity}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Capacity Bar & Spots Indicator */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityStatusRow}>
            {registered ? (
              <View style={[styles.registeredPill, { backgroundColor: tc.successBg }]}>
                <Ionicons name="checkmark-circle" size={13} color={tc.success} />
                <AppText style={[styles.registeredPillText, { color: tc.success }]}>
                  {paidAmountCents && paidAmountCents > 0
                    ? `Booked & Paid ($${(paidAmountCents / 100).toFixed(2)})`
                    : 'You are Registered'}
                </AppText>
              </View>
            ) : (
              <AppText
                style={[
                  styles.spots,
                  full && [styles.spotsFull, { color: tc.danger }],
                  !full && spotsLeft <= 3 && [styles.spotsLow, { color: tc.gold }],
                  !full && spotsLeft > 3 && { color: tc.textMuted },
                ]}
              >
                {full
                  ? 'Session is Full'
                  : spotsLeft <= 3
                  ? `Only ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} remaining!`
                  : `${spotsLeft} of ${capacity} spots open`}
              </AppText>
            )}

            <AppText style={[styles.detailsPrompt, { color: tc.primary }]}>
              Details & Info ›
            </AppText>
          </View>

          {/* Mini capacity track */}
          {!registered ? (
            <View style={[styles.miniTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.miniFill,
                  {
                    width: `${percentFilled}%`,
                    backgroundColor: full
                      ? tc.danger
                      : spotsLeft <= 3
                      ? tc.gold
                      : tc.primary,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Primary Actions (Register, Change, Cancel) */}
      {registered ? (
        <View style={styles.actions}>
          {onChange ? (
            <View style={styles.actionFlex}>
              <SecondaryButton
                title="Change Session"
                onPress={onChange}
                disabled={busy}
                accessibilityHint="Pick another time for this class"
              />
            </View>
          ) : null}
          {onCancel ? (
            <View style={styles.actionFlex}>
              <SecondaryButton
                title="Cancel Spot"
                onPress={onCancel}
                destructive
                disabled={busy}
                accessibilityHint="Cancel your registration"
              />
            </View>
          ) : null}
        </View>
      ) : onRegister ? (
        <PrimaryButton
          title={
            full
              ? 'Session is Full'
              : isPaid
              ? `Book & Pay ${priceDisplay}`
              : registrationRequired
              ? 'Reserve My Spot (Free)'
              : 'Register (Free)'
          }
          onPress={onRegister}
          disabled={full || busy}
          loading={busy}
          accessibilityHint={
            isPaid
              ? `Book this session for ${priceDisplay}`
              : 'Register for this class included with your YMCA membership'
          }
        />
      ) : null}

      {/* Class Forum Button */}
      {onOpenForum ? (
        <Pressable
          onPress={onOpenForum}
          style={[
            styles.forumBtn,
            {
              backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
              borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Open class community chat for ${title}`}
        >
          <Ionicons name="chatbubbles" size={14} color={colors.primary} />
          <AppText style={[styles.forumBtnText, { color: colors.primary }]}>
            Class Community Forum & Chat ›
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    padding: 12,
    gap: 6,
    marginBottom: 10,
    minWidth: 280,
    borderRadius: radii.card,
    borderWidth: 1.5,
  },
  pressableArea: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badgeLeftGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillIncluded: {
    backgroundColor: colors.successBg,
    borderColor: '#BBF7D0',
  },
  pillPaid: {
    backgroundColor: colors.paidBadgeBg,
    borderColor: '#BFDBFE',
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
  starHit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timeBlock: {
    minWidth: 84,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  time: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  durationPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 5,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  capacitySection: {
    gap: 4,
  },
  capacityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  registeredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  registeredPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  spots: {
    fontSize: 12,
    fontWeight: '600',
  },
  spotsLow: {
    fontWeight: '700',
  },
  spotsFull: {
    fontWeight: '700',
  },
  detailsPrompt: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  actionFlex: {
    flex: 1,
  },
  forumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  forumBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
