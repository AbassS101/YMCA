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
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  YMCA_MEMBERSHIP_PLANS,
  type Member,
  type Membership,
} from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ManageMembershipScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelingChange, setCancelingChange] = useState(false);
  const [rescindingCancel, setRescindingCancel] = useState(false);
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

  const currentPlan =
    YMCA_MEMBERSHIP_PLANS.find(
      (p) => p.name.toLowerCase() === (membership?.rateName ?? '').toLowerCase()
    ) ?? YMCA_MEMBERSHIP_PLANS[0];

  const handleCancelPendingChange = () => {
    dialog.show({
      title: 'Cancel Scheduled Plan Change?',
      message: `Do you want to cancel your scheduled switch to ${membership?.pendingChange?.planName}? You will remain on the ${membership?.rateName} plan ($${((membership?.monthlyAmountCents ?? 0) / 100).toFixed(2)}/mo).`,
      buttons: [
        { text: 'Keep Scheduled Switch', style: 'cancel' },
        {
          text: 'Cancel Switch',
          style: 'destructive',
          onPress: async () => {
            setCancelingChange(true);
            try {
              const updated = await membershipRepo.cancelScheduledChange(api, memberId);
              setMembership(updated);
              dialog.alert(
                'Change Cancelled',
                'Your scheduled plan switch has been cancelled. You will continue with your current plan.',
                [{ text: 'OK' }],
                'checkmark'
              );
            } catch (err: any) {
              dialog.alert('Error', err?.message || 'Could not cancel scheduled switch.');
            } finally {
              setCancelingChange(false);
            }
          },
        },
      ],
    });
  };

  const handleRescindCancel = () => {
    dialog.show({
      title: 'Keep Your YMCA Membership?',
      message:
        'Rescinding your cancellation notice will keep your YMCA Silver Spring membership fully active with no interruption in facility or pool access.',
      buttons: [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Keep My Membership',
          onPress: async () => {
            setRescindingCancel(true);
            try {
              const updated = await membershipRepo.rescindCancel(api, memberId);
              setMember(updated);
              await load();
              dialog.alert(
                'Welcome Back!',
                'Your membership remains active. Thank you for staying part of the YMCA family!',
                [{ text: 'Great!' }],
                'checkmark'
              );
            } catch (err: any) {
              dialog.alert('Error', err?.message || 'Could not restore membership.');
            } finally {
              setRescindingCancel(false);
            }
          },
        },
      ],
    });
  };

  const isCancelPending = member?.status === 'cancel_pending';
  const hasPendingChange = Boolean(membership?.pendingChange);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Manage Membership" />

      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>
            Back
          </AppText>
        </Pressable>

        {loading && !member ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : member && membership ? (
          <>
            {/* Cancellation Pending Banner */}
            {isCancelPending ? (
              <View
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: colors.dangerBg,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <View style={styles.alertHeaderRow}>
                  <Ionicons name="alert-circle" size={24} color={colors.danger} />
                  <AppText style={[styles.alertTitle, { color: colors.danger }]}>
                    Cancellation Notice Pending
                  </AppText>
                </View>
                <AppText style={[styles.alertBody, { color: colors.text }]}>
                  Your membership is scheduled to conclude on{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {membership.cancelEffectiveDate
                      ? formatDate(membership.cancelEffectiveDate)
                      : 'the end of your billing cycle'}
                  </Text>
                  . You have complete facility, heated pool, and group fitness privileges until then.
                </AppText>
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton
                    title={rescindingCancel ? 'Restoring...' : 'Keep My Membership (Rescind)'}
                    onPress={handleRescindCancel}
                    loading={rescindingCancel}
                  />
                </View>
              </View>
            ) : null}

            {/* Scheduled Plan Change Banner */}
            {hasPendingChange && membership.pendingChange ? (
              <View
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: colors.goldBg,
                    borderColor: colors.gold,
                  },
                ]}
              >
                <View style={styles.alertHeaderRow}>
                  <Ionicons name="time" size={24} color={colors.gold} />
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.alertTitle, { color: '#92400E' }]}>
                      Plan Change Scheduled for Next Month
                    </AppText>
                    <AppText style={[styles.alertSub, { color: '#78350F' }]}>
                      Effective {formatDate(membership.pendingChange.effectiveDate)}
                    </AppText>
                  </View>
                </View>
                <AppText style={[styles.alertBody, { color: '#78350F', marginTop: 8 }]}>
                  Your membership will automatically switch from {membership.rateName} to{' '}
                  <Text style={{ fontWeight: '700' }}>{membership.pendingChange.planName}</Text> at{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {formatCents(membership.pendingChange.monthlyAmountCents)}/mo
                  </Text>{' '}
                  on your next billing date.
                </AppText>
                <View style={{ marginTop: 12 }}>
                  <SecondaryButton
                    title={cancelingChange ? 'Cancelling...' : 'Cancel Scheduled Change'}
                    onPress={handleCancelPendingChange}
                    loading={cancelingChange}
                  />
                </View>
              </View>
            ) : null}

            {/* Current Plan Overview Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.planHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isCancelPending
                            ? colors.dangerBg
                            : colors.successBg,
                        },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.statusText,
                          {
                            color: isCancelPending ? colors.danger : colors.success,
                          },
                        ]}
                      >
                        {isCancelPending ? 'CANCELLATION PENDING' : 'ACTIVE MEMBER'}
                      </AppText>
                    </View>
                    {currentPlan.badge ? (
                      <View style={[styles.planBadge, { backgroundColor: colors.primaryLight }]}>
                        <AppText style={[styles.planBadgeText, { color: colors.primary }]}>
                          {currentPlan.badge}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  <AppText style={[styles.planTitle, { color: colors.text }]}>
                    {membership.rateName} Plan
                  </AppText>
                  <AppText style={[styles.planSubtitle, { color: colors.textMuted }]}>
                    {currentPlan.subtitle}
                  </AppText>
                </View>

                <View style={styles.priceCol}>
                  <AppText style={[styles.priceCents, { color: colors.primary }]}>
                    {formatCents(membership.monthlyAmountCents)}
                  </AppText>
                  <AppText style={[styles.priceFrequency, { color: colors.textMuted }]}>
                    per month
                  </AppText>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <AppText style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Next Monthly Draft
                  </AppText>
                  <AppText style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(membership.nextBillingDate)}
                  </AppText>
                </View>

                <View style={styles.detailItem}>
                  <AppText style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Payment On File
                  </AppText>
                  <AppText style={[styles.detailValue, { color: colors.text }]}>
                    {membership.paymentBrand} •••• {membership.paymentLast4}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <AppText style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Member ID
                  </AppText>
                  <AppText style={[styles.detailValue, { color: colors.text }]}>
                    {member.membershipId}
                  </AppText>
                </View>

                <View style={styles.detailItem}>
                  <AppText style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Home Branch
                  </AppText>
                  <AppText style={[styles.detailValue, { color: colors.text }]}>
                    YMCA Silver Spring
                  </AppText>
                </View>
              </View>
            </View>

            {/* Quick Actions Hub */}
            <AppText style={[styles.sectionHeading, { color: colors.text }]}>
              Membership Actions
            </AppText>

            <View style={styles.actionsGrid}>
              <Pressable
                onPress={() => router.push('/(member)/change-membership')}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Change or switch membership plan"
              >
                <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
                </View>
                <AppText style={[styles.actionTitle, { color: colors.text }]}>
                  Change Plan
                </AppText>
                <AppText style={[styles.actionDesc, { color: colors.textMuted }]}>
                  Switch tier immediately or schedule for next month
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(member)/update-payment')}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Update payment method"
              >
                <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="card" size={24} color={colors.primary} />
                </View>
                <AppText style={[styles.actionTitle, { color: colors.text }]}>
                  Update Payment
                </AppText>
                <AppText style={[styles.actionDesc, { color: colors.textMuted }]}>
                  Change credit or debit card for monthly draft
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(member)/join-membership')}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Buy or add a membership"
              >
                <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="add-circle" size={24} color={colors.accentTeal} />
                </View>
                <AppText style={[styles.actionTitle, { color: colors.text }]}>
                  Buy / Add Plan
                </AppText>
                <AppText style={[styles.actionDesc, { color: colors.textMuted }]}>
                  Add family members or explore other tiers
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(member)/cancel')}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel membership"
              >
                <View style={[styles.actionIconCircle, { backgroundColor: colors.dangerBg }]}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </View>
                <AppText style={[styles.actionTitle, { color: colors.danger }]}>
                  Cancel Plan
                </AppText>
                <AppText style={[styles.actionDesc, { color: colors.textMuted }]}>
                  Submit 30-day cancellation notice
                </AppText>
              </Pressable>
            </View>

            {/* Plan Benefits Checklist */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginTop: 16 },
              ]}
            >
              <AppText style={[styles.cardHeading, { color: colors.text }]}>
                Included with Your {currentPlan.name} Plan
              </AppText>
              {currentPlan.features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <AppText style={[styles.featureText, { color: colors.text }]}>
                    {feature}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Giving Back / Support Community */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary, marginTop: 16 },
              ]}
            >
              <View style={styles.supportRow}>
                <Ionicons name="heart" size={28} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.supportTitle, { color: colors.primaryDark }]}>
                    Support YMCA Open Doors Aid
                  </AppText>
                  <AppText style={[styles.supportDesc, { color: colors.text }]}>
                    Your tax-deductible donation ensures community families have access to YMCA wellness and youth programs.
                  </AppText>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Make a Donation"
                  onPress={() => router.push('/(member)/donate')}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  alertCard: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  alertTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
  },
  alertSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  alertBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    ...cardStyle,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planTitle: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '800',
  },
  planSubtitle: {
    ...typography.body,
    fontSize: 13,
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  priceCents: {
    fontSize: 24,
    fontWeight: '800',
  },
  priceFrequency: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeading: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    ...cardStyle,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardHeading: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  supportDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
