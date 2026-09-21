import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  YMCA_MEMBERSHIP_PLANS,
  type Member,
  type Membership,
  type MembershipPlan,
} from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatBillingDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ChangeMembershipScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('adult');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    try {
      setError(false);
      setLoading(true);
      const [nextMember, nextMembership] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
      ]);
      setMember(nextMember);
      setMembership(nextMembership);

      // Match selected plan to current rateName if exists
      const match = YMCA_MEMBERSHIP_PLANS.find(
        (p) => p.name.toLowerCase() === nextMembership.rateName.toLowerCase()
      );
      if (match) {
        setSelectedPlanId(match.id);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const [timing, setTiming] = useState<'next_cycle' | 'immediate'>('next_cycle');
  const [cancelingScheduled, setCancelingScheduled] = useState(false);

  const currentPlan = YMCA_MEMBERSHIP_PLANS.find(
    (p) => p.name.toLowerCase() === (membership?.rateName ?? 'adult').toLowerCase()
  ) ?? YMCA_MEMBERSHIP_PLANS[0];

  const selectedPlan = YMCA_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? currentPlan;

  const isCurrent = currentPlan.id === selectedPlan.id;

  const priceDiff = selectedPlan.monthlyAmountCents - (membership?.monthlyAmountCents ?? 0);

  function handleConfirmChange() {
    if (!memberId || isCurrent) return;
    const effectiveDate = membership?.nextBillingDate || '2026-10-12';

    if (timing === 'next_cycle') {
      dialog.show({
        title: 'Schedule Switch for Next Month',
        message: `Schedule switch from ${currentPlan.name} (${formatCents(
          currentPlan.monthlyAmountCents
        )}/mo) to ${selectedPlan.name} (${formatCents(
          selectedPlan.monthlyAmountCents
        )}/mo)?\n\nYour new rate and plan will take effect on ${formatBillingDate(
          effectiveDate
        )}. You will remain on ${currentPlan.name} until then with no unexpected charges today!`,
        icon: 'info',
        buttons: [
          { text: 'Keep Current Plan', style: 'cancel' },
          {
            text: 'Schedule Switch',
            onPress: () => {
              void executePlanChange(true);
            },
          },
        ],
      });
    } else {
      dialog.show({
        title: 'Confirm Immediate Switch',
        message: `Switch your plan immediately from ${currentPlan.name} (${formatCents(
          currentPlan.monthlyAmountCents
        )}/mo) to ${selectedPlan.name} (${formatCents(
          selectedPlan.monthlyAmountCents
        )}/mo)?\n\nYour benefits and updated monthly rate will take effect immediately today!`,
        icon: 'info',
        buttons: [
          { text: 'Keep Current Plan', style: 'cancel' },
          {
            text: 'Switch Now',
            onPress: () => {
              void executePlanChange(false);
            },
          },
        ],
      });
    }
  }

  async function executePlanChange(forNextMonth: boolean) {
    setSubmitting(true);
    try {
      if (forNextMonth) {
        const effectiveDate = membership?.nextBillingDate || '2026-10-12';
        const updated = await membershipRepo.scheduleMembershipChange(
          api,
          memberId,
          selectedPlan.name,
          selectedPlan.monthlyAmountCents,
          effectiveDate
        );
        setMembership(updated);
        dialog.alert(
          'Switch Scheduled for Next Month!',
          `Your membership plan switch to ${selectedPlan.name} has been scheduled for ${formatBillingDate(
            effectiveDate
          )}. You will receive a notification when it takes effect.`,
          [{ text: 'Done', onPress: () => router.back() }],
          'checkmark'
        );
      } else {
        const updated = await membershipRepo.changeMembership(
          api,
          memberId,
          selectedPlan.name,
          selectedPlan.monthlyAmountCents
        );
        setMembership(updated);
        dialog.alert(
          'Plan Updated Immediately!',
          `Your membership has been successfully updated to ${selectedPlan.name}. You now have full access to all ${selectedPlan.name} features and privileges at YMCA Silver Spring.`,
          [{ text: 'Done', onPress: () => router.back() }],
          'checkmark'
        );
      }
    } catch (err: any) {
      dialog.alert(
        'Error',
        err?.message ?? 'Could not change membership. Please speak with the Silver Spring wellness desk.',
        [{ text: 'OK' }],
        'alert'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelScheduled() {
    setCancelingScheduled(true);
    try {
      const updated = await membershipRepo.cancelScheduledChange(api, memberId);
      setMembership(updated);
      dialog.alert(
        'Scheduled Switch Cancelled',
        'Your scheduled plan switch has been cancelled. You will continue on your current plan.',
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not cancel scheduled switch.');
    } finally {
      setCancelingScheduled(false);
    }
  }

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Change Membership" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Link */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Account"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>Back to Account</AppText>
        </Pressable>

        {/* Current Plan Overview */}
        {membership && (
          <View style={[styles.currentCard, cardTheme]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <AppText style={[styles.currentHeaderLabel, { color: colors.textMuted }]}>
                  CURRENT ACTIVE PLAN
                </AppText>
                <AppText style={[styles.currentPlanTitle, { color: colors.text }]}>
                  {membership.rateName}
                </AppText>
              </View>
              <View style={[styles.rateBadge, { backgroundColor: colors.primaryLight }]}>
                <AppText style={[styles.rateBadgeText, { color: isDark ? colors.primary : colors.primaryDark }]}>
                  {formatCents(membership.monthlyAmountCents)}/mo
                </AppText>
              </View>
            </View>

            <AppText style={[styles.currentMeta, { color: colors.textMuted }]}>
              Billed monthly to {membership.paymentBrand} •••• {membership.paymentLast4}
            </AppText>
            <AppText style={[styles.currentMeta, { color: colors.textMuted }]}>
              Next recurring charge: {formatBillingDate(membership.nextBillingDate)}
            </AppText>
          </View>
        )}

        {/* Pending Change Banner if active */}
        {membership?.pendingChange ? (
          <View
            style={[
              styles.currentCard,
              {
                backgroundColor: colors.goldBg,
                borderColor: colors.gold,
                borderWidth: 1.5,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="time" size={20} color={colors.gold} />
              <AppText style={{ fontSize: 16, fontWeight: '700', color: '#92400E' }}>
                Pending Plan Change Scheduled
              </AppText>
            </View>
            <AppText style={{ fontSize: 14, color: '#78350F', lineHeight: 20 }}>
              Your switch to <Text style={{ fontWeight: '700' }}>{membership.pendingChange.planName}</Text> ($
              {(membership.pendingChange.monthlyAmountCents / 100).toFixed(2)}/mo) is scheduled for{' '}
              <Text style={{ fontWeight: '700' }}>{formatBillingDate(membership.pendingChange.effectiveDate)}</Text>.
            </AppText>
            <Pressable
              onPress={handleCancelScheduled}
              disabled={cancelingScheduled}
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#D97706',
              }}
            >
              <AppText style={{ color: '#B45309', fontWeight: '700', fontSize: 13 }}>
                {cancelingScheduled ? 'Cancelling...' : 'Cancel Scheduled Switch'}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Plan Selection Header */}
        <View style={styles.introBlock}>
          <AppText style={[styles.introTitle, { color: colors.text }]}>
            Choose a YMCA Silver Spring Plan
          </AppText>
          <AppText style={[styles.introSubtitle, { color: colors.textMuted }]}>
            All memberships include full access to the fitness center, heated outdoor & indoor pools, over 40 free group classes, pickleball, and Nationwide Reciprocity. No long-term contracts.
          </AppText>
        </View>

        {/* Plan Cards */}
        {YMCA_MEMBERSHIP_PLANS.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const isPlanCurrent = plan.name.toLowerCase() === (membership?.rateName ?? '').toLowerCase();

          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlanId(plan.id)}
              style={({ pressed }) => [
                styles.planCard,
                cardTheme,
                isSelected && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                  backgroundColor: isDark ? '#1C2638' : '#F0F9FF',
                },
                pressed && { opacity: 0.92 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${plan.name} plan, ${formatCents(plan.monthlyAmountCents)} per month`}
            >
              {/* Top Badges */}
              <View style={styles.planBadgeRow}>
                {plan.badge && (
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: plan.recommended ? colors.gold : colors.accentTeal,
                      },
                    ]}
                  >
                    <AppText style={styles.pillBadgeText}>{plan.badge}</AppText>
                  </View>
                )}
                {isPlanCurrent && (
                  <View style={[styles.currentPill, { backgroundColor: colors.primaryLight }]}>
                    <AppText
                      style={[
                        styles.currentPillText,
                        { color: isDark ? colors.primary : colors.primaryDark },
                      ]}
                    >
                      CURRENT PLAN
                    </AppText>
                  </View>
                )}
              </View>

              {/* Title & Price */}
              <View style={styles.planHeaderRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.planTitle, { color: colors.text }]}>{plan.name}</AppText>
                  <AppText style={[styles.planSubtitle, { color: colors.textMuted }]}>
                    {plan.subtitle}
                  </AppText>
                </View>

                <View style={styles.priceColumn}>
                  <AppText style={[styles.priceAmount, { color: colors.text }]}>
                    {formatCents(plan.monthlyAmountCents)}
                  </AppText>
                  <AppText style={[styles.priceInterval, { color: colors.textMuted }]}>
                    /month
                  </AppText>
                </View>
              </View>

              {/* Description */}
              <AppText style={[styles.planDescription, { color: colors.text }]}>
                {plan.description}
              </AppText>

              {/* Feature Checklist */}
              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isSelected ? colors.primary : colors.success}
                    />
                    <AppText style={[styles.featureText, { color: colors.text }]}>
                      {feature}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Select Indicator */}
              <View style={styles.selectRow}>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <View style={styles.radioInnerDot} />}
                </View>
                <AppText
                  style={[
                    styles.radioLabel,
                    {
                      color: isSelected ? colors.primary : colors.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {isPlanCurrent
                    ? 'Your current active tier'
                    : isSelected
                    ? 'Selected for switch'
                    : 'Tap to choose this plan'}
                </AppText>
              </View>
            </Pressable>
          );
        })}

        {/* Insurance Coverage Information */}
        <View style={[styles.insuranceCard, cardTheme]}>
          <View style={styles.insuranceHeader}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            <AppText style={[styles.insuranceTitle, { color: colors.text }]}>
              Insurance Wellness Benefits
            </AppText>
          </View>
          <AppText style={[styles.insuranceText, { color: colors.textMuted }]}>
            Do you have SilverSneakers, Renew Active, or Silver & Fit through Medicare or your health insurance? Your YMCA Silver Spring membership may be 100% covered at no charge to you!
          </AppText>
          <AppText style={[styles.insuranceHelp, { color: colors.text }]}>
            Bring your health insurance card or fitness confirmation ID to the Silver Spring Member Services desk (or call 301-585-2120) to verify your eligibility on the spot.
          </AppText>
        </View>

        {/* Change Confirmation Bottom Bar */}
        {!isCurrent && (
          <View style={[styles.bottomBar, cardTheme]}>
            <View style={styles.diffSummary}>
              <AppText style={[styles.diffLabel, { color: colors.textMuted }]}>
                Billing Adjustment:
              </AppText>
              <AppText
                style={[
                  styles.diffValue,
                  { color: priceDiff > 0 ? colors.text : colors.success },
                ]}
              >
                {priceDiff > 0 ? `+${formatCents(priceDiff)}/mo` : `${formatCents(priceDiff)}/mo`}
              </AppText>
            </View>

            {/* Timing Selector: Next Month vs Immediate */}
            <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 10, marginBottom: 6 }}>
              When should this change take effect?
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Pressable
                onPress={() => setTiming('next_cycle')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: timing === 'next_cycle' ? colors.primary : colors.border,
                  backgroundColor: timing === 'next_cycle' ? colors.primaryLight : colors.cardBg,
                  alignItems: 'center',
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: timing === 'next_cycle' ? colors.primary : colors.text,
                    textAlign: 'center',
                  }}
                >
                  Next Billing Cycle
                </AppText>
                <AppText style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {membership?.nextBillingDate ? formatBillingDate(membership.nextBillingDate) : 'Next Month'}
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setTiming('immediate')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: timing === 'immediate' ? colors.primary : colors.border,
                  backgroundColor: timing === 'immediate' ? colors.primaryLight : colors.cardBg,
                  alignItems: 'center',
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: timing === 'immediate' ? colors.primary : colors.text,
                    textAlign: 'center',
                  }}
                >
                  Immediately
                </AppText>
                <AppText style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Apply Today
                </AppText>
              </Pressable>
            </View>

            <AppText style={[styles.effectiveNote, { color: colors.textMuted }]}>
              {timing === 'next_cycle'
                ? `Starts on ${membership?.nextBillingDate ? formatBillingDate(membership.nextBillingDate) : 'your next billing date'}. No extra charge today.`
                : 'Takes effect immediately today. Prorated difference will be applied.'}
            </AppText>
            <PrimaryButton
              title={
                timing === 'next_cycle'
                  ? `Schedule Switch for Next Month`
                  : `Switch Immediately to ${selectedPlan.name}`
              }
              onPress={() => void handleConfirmChange()}
              loading={submitting}
              accessibilityHint="Confirms membership plan switch"
            />
          </View>
        )}
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
    paddingBottom: spacing.xl * 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backText: {
    ...typography.body,
    fontWeight: '700',
  },
  currentCard: {
    ...cardStyle,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  currentHeaderLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  currentPlanTitle: {
    ...typography.title,
    fontSize: 22,
  },
  rateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.chip,
  },
  rateBadgeText: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  currentMeta: {
    ...typography.body,
    fontSize: 14,
  },
  introBlock: {
    gap: 6,
    marginTop: 4,
  },
  introTitle: {
    ...typography.title,
    fontSize: 20,
  },
  introSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  planCard: {
    ...cardStyle,
    gap: 10,
    borderWidth: 1.5,
  },
  planBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.chip,
  },
  pillBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  currentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.chip,
  },
  currentPillText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    ...typography.title,
    fontSize: 19,
  },
  planSubtitle: {
    ...typography.body,
    fontSize: 14,
    marginTop: 2,
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
  },
  priceInterval: {
    ...typography.caption,
    fontSize: 12,
  },
  planDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  featuresList: {
    gap: 6,
    marginVertical: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    ...typography.body,
    fontSize: 14,
    flex: 1,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  radioLabel: {
    ...typography.body,
    fontSize: 14,
  },
  insuranceCard: {
    ...cardStyle,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  insuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insuranceTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  insuranceText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  insuranceHelp: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bottomBar: {
    ...cardStyle,
    gap: 12,
    borderWidth: 2,
    borderColor: '#0284C7',
    marginTop: 8,
  },
  diffSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diffLabel: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  diffValue: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
  },
  effectiveNote: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
});
