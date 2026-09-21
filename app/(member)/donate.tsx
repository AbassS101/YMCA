import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { tokenizePaymentInput } from '@/domain/paymentTokenizer';
import {
  YMCA_CASE_FOR_SUPPORT_2026,
  YMCA_COMMUNITY_FUNDS,
  YMCA_DONATION_TIERS,
  type Donation,
  type DonationFrequency,
} from '@/domain/types';
import { donationRepo } from '@/repositories/donationRepo';
import { membershipRepo } from '@/repositories/membershipRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

const TIER_TO_FUND_MAP: Record<number, string> = {
  5000: 'livestrong',
  10000: 'parkinsons',
  17500: 'summer-camp',
  25000: 'aquatics',
  50000: 'child-care',
  100000: 'available-to-all',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DonateScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [frequency, setFrequency] = useState<DonationFrequency>('one-time');
  const [selectedAmountCents, setSelectedAmountCents] = useState<number>(10000); // $100 default (Pedaling for Parkinson's)
  const [isCustom, setIsCustom] = useState(false);
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [selectedFundId, setSelectedFundId] = useState<string>('parkinsons');
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');

  // Payment method
  const [useCardOnFile, setUseCardOnFile] = useState(true);
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('4242');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newCvc, setNewCvc] = useState('');
  const [newZip, setNewZip] = useState('');

  // Tribute / Dedication
  const [isDedication, setIsDedication] = useState(false);
  const [tributeType, setTributeType] = useState<'honor' | 'memory'>('honor');
  const [tributeName, setTributeName] = useState('');
  const [tributeMessage, setTributeMessage] = useState('');

  const [pastDonations, setPastDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success Tax Receipt Modal
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [confirmedDonation, setConfirmedDonation] = useState<Donation | null>(null);

  const load = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const [member, membership, donations] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
        donationRepo.list(api, memberId),
      ]);
      setDonorName(member.name);
      setDonorEmail(member.email);
      setCardBrand(membership.paymentBrand || 'Visa');
      setCardLast4(membership.paymentLast4 || '4242');
      setPastDonations(donations);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const effectiveAmountCents = isCustom
    ? Math.round((parseFloat(customAmountStr) || 0) * 100)
    : selectedAmountCents;

  const currentTier = YMCA_DONATION_TIERS.find((t) => t.amountCents === effectiveAmountCents);
  const selectedFund =
    YMCA_COMMUNITY_FUNDS.find((f) => f.id === selectedFundId) ?? YMCA_COMMUNITY_FUNDS[0];

  const handleSelectTier = (amountCents: number) => {
    setIsCustom(false);
    setSelectedAmountCents(amountCents);
    const matchingFund = TIER_TO_FUND_MAP[amountCents];
    if (matchingFund) {
      setSelectedFundId(matchingFund);
    }
  };

  const handleDonate = async () => {
    setError(null);

    if (effectiveAmountCents < 500) {
      setError('Please enter a minimum donation of $5.00.');
      return;
    }

    if (!donorName.trim()) {
      setError('Please provide your name for the tax receipt.');
      return;
    }

    if (!donorEmail.trim() || !donorEmail.includes('@')) {
      setError('Please provide a valid email address for receipt delivery.');
      return;
    }

    let finalBrand = cardBrand;
    let finalLast4 = cardLast4;

    if (!useCardOnFile) {
      const tokenized = tokenizePaymentInput({
        cardNumber: newCardNumber,
        expiry: newExpiry,
        cvc: newCvc,
        postalCode: newZip,
      });

      if (!tokenized.valid) {
        setError(tokenized.error || 'Please check your payment card information.');
        return;
      }
      finalBrand = tokenized.brand;
      finalLast4 = tokenized.last4;
    }

    setSubmitting(true);
    try {
      const donation = await donationRepo.create(api, {
        memberId: memberId || undefined,
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        amountCents: effectiveAmountCents,
        frequency,
        designation: selectedFund.name,
        dedication:
          isDedication && tributeName.trim()
            ? {
                tributeType,
                name: tributeName.trim(),
                message: tributeMessage.trim() || undefined,
              }
            : undefined,
        paymentBrand: finalBrand,
        paymentLast4: finalLast4,
      });

      setConfirmedDonation(donation);
      setReceiptModalVisible(true);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not process donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Support Our Community (Give)" showActions={false} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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

          {/* Case for Support 2026 Hero Card */}
          <View style={[styles.heroCard, { backgroundColor: colors.primaryDark }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Ionicons name="heart" size={24} color="#EF4444" />
              <AppText style={styles.heroCaseBadge}>Case for Support 2026</AppText>
            </View>
            <AppText style={styles.heroTitle}>
              {YMCA_CASE_FOR_SUPPORT_2026.title}
            </AppText>

            <View style={styles.missionCard}>
              <AppText style={styles.missionLabel}>OUR MISSION</AppText>
              <AppText style={styles.missionText}>
                {YMCA_CASE_FOR_SUPPORT_2026.mission}
              </AppText>
            </View>

            {/* Expandable Case for Support Details */}
            <Pressable
              onPress={() => setShowCaseDetails(!showCaseDetails)}
              style={styles.expandDetailsBtn}
              accessibilityRole="button"
            >
              <Ionicons
                name={showCaseDetails ? 'chevron-up-circle' : 'information-circle-outline'}
                size={18}
                color="#6EE7B7"
              />
              <AppText style={styles.expandDetailsText}>
                {showCaseDetails ? 'Hide Case Details' : 'Read Our Cause, Goal & Commitments'}
              </AppText>
            </Pressable>

            {showCaseDetails ? (
              <View style={styles.caseDetailsBox}>
                <View style={styles.caseSubSection}>
                  <AppText style={styles.caseSubHeading}>OUR CAUSE</AppText>
                  <AppText style={styles.caseSubText}>
                    {YMCA_CASE_FOR_SUPPORT_2026.cause}
                  </AppText>
                </View>

                <View style={styles.caseSubSection}>
                  <AppText style={styles.caseSubHeading}>OUR GOAL</AppText>
                  <AppText style={styles.caseSubText}>
                    {YMCA_CASE_FOR_SUPPORT_2026.goal}
                  </AppText>
                </View>

                <View style={styles.caseSubSection}>
                  <AppText style={styles.caseSubHeading}>OUR COMMITMENT</AppText>
                  {YMCA_CASE_FOR_SUPPORT_2026.commitments.map((c) => (
                    <View key={c.id} style={styles.commitmentRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#38BDF8" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.commitmentTitle}>{c.title}</AppText>
                        <AppText style={styles.commitmentDesc}>{c.description}</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.taxPill}>
              <Ionicons name="shield-checkmark" size={14} color="#6EE7B7" />
              <AppText style={styles.taxPillText}>
                501(c)(3) Tax-Exempt Non-Profit · EIN #53-0196605
              </AppText>
            </View>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          {/* Frequency Toggle: One-time vs Monthly */}
          <View style={[styles.frequencyRow, cardTheme]}>
            <Pressable
              onPress={() => setFrequency('one-time')}
              style={[
                styles.frequencyBtn,
                frequency === 'one-time' && {
                  backgroundColor: colors.primary,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: frequency === 'one-time' }}
            >
              <AppText
                style={[
                  styles.frequencyBtnText,
                  { color: frequency === 'one-time' ? '#FFFFFF' : colors.text },
                ]}
              >
                One-Time Gift
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setFrequency('monthly')}
              style={[
                styles.frequencyBtn,
                frequency === 'monthly' && {
                  backgroundColor: colors.primary,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: frequency === 'monthly' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name="repeat"
                  size={16}
                  color={frequency === 'monthly' ? '#FFFFFF' : colors.primary}
                />
                <AppText
                  style={[
                    styles.frequencyBtnText,
                    { color: frequency === 'monthly' ? '#FFFFFF' : colors.text },
                  ]}
                >
                  Monthly Sustainer
                </AppText>
              </View>
            </Pressable>
          </View>

          {/* 2026 Recommended Giving Levels */}
          <View style={{ marginBottom: 12 }}>
            <AppText style={[styles.sectionHeading, { color: colors.text, marginBottom: 2 }]}>
              2026 Recommended Giving Levels
            </AppText>
            <AppText style={{ fontSize: 13, color: colors.textMuted }}>
              Targeted support directly addressing Montgomery County health & community needs
            </AppText>
          </View>

          <View style={styles.tierGrid}>
            {YMCA_DONATION_TIERS.map((tier) => {
              const active = !isCustom && selectedAmountCents === tier.amountCents;
              return (
                <Pressable
                  key={tier.amountCents}
                  onPress={() => handleSelectTier(tier.amountCents)}
                  style={[
                    styles.tierBtn,
                    cardTheme,
                    active && {
                      borderColor: colors.primary,
                      borderWidth: 2,
                      backgroundColor: isDark ? colors.primaryLight : '#EFF6FF',
                    },
                  ]}
                >
                  <AppText style={[styles.tierPrice, { color: colors.primary }]}>
                    ${tier.amountCents / 100}
                  </AppText>
                  <AppText style={[styles.tierTitle, { color: colors.text }]} numberOfLines={2}>
                    {tier.title}
                  </AppText>
                  {tier.subtitle ? (
                    <AppText style={styles.tierSubtitle} numberOfLines={1}>
                      {tier.subtitle}
                    </AppText>
                  ) : null}
                  {tier.badge ? (
                    <View style={[styles.popularBadge, { backgroundColor: colors.goldBg }]}>
                      <AppText style={{ color: '#B45309', fontSize: 10, fontWeight: '700' }}>
                        {tier.badge}
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setIsCustom(true)}
              style={[
                styles.tierBtn,
                cardTheme,
                isCustom && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                  backgroundColor: isDark ? colors.primaryLight : '#EFF6FF',
                },
              ]}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
              <AppText style={[styles.tierTitle, { color: colors.text, marginTop: 4 }]}>
                Custom Amount
              </AppText>
              <AppText style={styles.tierSubtitle}>Any Amount Helps</AppText>
            </Pressable>
          </View>

          {isCustom ? (
            <View style={{ marginTop: 12 }}>
              <TextField
                label="Enter Custom Dollar Amount ($)"
                value={customAmountStr}
                onChangeText={setCustomAmountStr}
                placeholder="e.g. 75"
                keyboardType="numeric"
              />
            </View>
          ) : null}

          {/* WHERE YOUR DONATIONS GO: Deep Dive on Issue, Response & Impact */}
          {currentTier ? (
            <View
              style={[
                styles.whereDonationsGoCard,
                cardTheme,
                { borderColor: colors.primary },
              ]}
            >
              <View style={styles.whereHeader}>
                <Ionicons name="compass-outline" size={20} color={colors.primary} />
                <AppText style={[styles.whereHeaderTitle, { color: colors.primary }]}>
                  WHERE YOUR DONATIONS GO
                </AppText>
              </View>

              <AppText style={[styles.whereProgramTitle, { color: colors.text }]}>
                {currentTier.title} — ${currentTier.amountCents / 100}
                {frequency === 'monthly' ? '/month' : ''}
              </AppText>

              {/* The Issue */}
              {currentTier.issue ? (
                <View style={styles.issueBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                    <AppText style={styles.issueHeading}>The Issue in Montgomery County:</AppText>
                  </View>
                  <AppText style={[styles.issueText, { color: colors.text }]}>
                    {currentTier.issue}
                  </AppText>
                </View>
              ) : null}

              {/* The Y's Response */}
              {currentTier.response ? (
                <View style={styles.responseBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#0284C7" />
                    <AppText style={styles.responseHeading}>The Y’s Response:</AppText>
                  </View>
                  <AppText style={[styles.responseText, { color: colors.text }]}>
                    {currentTier.response}
                  </AppText>
                </View>
              ) : null}

              {/* Community Impact */}
              <View
                style={[
                  styles.impactBox,
                  { backgroundColor: isDark ? '#14314E' : '#EFF6FF', borderColor: colors.primary },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <AppText style={[styles.impactHeading, { color: colors.primary }]}>
                    Your Direct Community Impact:
                  </AppText>
                </View>
                <AppText style={[styles.impactBody, { color: colors.text }]}>
                  {currentTier.impactText}
                </AppText>
              </View>
            </View>
          ) : isCustom && effectiveAmountCents > 0 ? (
            <View
              style={[
                styles.whereDonationsGoCard,
                cardTheme,
                { borderColor: colors.primary },
              ]}
            >
              <View style={styles.whereHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <AppText style={[styles.whereHeaderTitle, { color: colors.primary }]}>
                  COMMUNITY IMPACT
                </AppText>
              </View>
              <AppText style={[styles.whereProgramTitle, { color: colors.text }]}>
                Custom Gift of {formatCents(effectiveAmountCents)}
                {frequency === 'monthly' ? '/month' : ''}
              </AppText>
              <AppText style={[styles.impactBody, { color: colors.text, marginTop: 6 }]}>
                Your generous gift directly empowers YMCA Silver Spring’s critical community initiatives—supporting chronic disease wellness, water safety, child care subsidies, and open access for families throughout Montgomery County.
              </AppText>
            </View>
          ) : null}

          {/* County Tagline Banner */}
          <View style={[styles.taglineCard, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <AppText style={[styles.taglineText, { color: colors.text }]}>
              "{YMCA_CASE_FOR_SUPPORT_2026.tagline}"
            </AppText>
          </View>

          {/* Fund Designation */}
          <AppText style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>
            Designate Your Gift
          </AppText>

          <View style={styles.fundsWrap}>
            {YMCA_COMMUNITY_FUNDS.map((fund) => {
              const active = selectedFundId === fund.id;
              return (
                <Pressable
                  key={fund.id}
                  onPress={() => setSelectedFundId(fund.id)}
                  style={[
                    styles.fundRow,
                    cardTheme,
                    active && {
                      borderColor: colors.primary,
                      backgroundColor: isDark ? colors.primaryLight : '#F0F9FF',
                    },
                  ]}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? colors.primary : colors.muted}
                  />
                  <AppText style={[styles.fundText, { color: colors.text }]}>
                    {fund.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Tribute / Dedication Option */}
          <View style={[styles.dedicationToggleCard, cardTheme]}>
            <Pressable
              onPress={() => setIsDedication(!isDedication)}
              style={styles.dedicationHeaderRow}
            >
              <Ionicons
                name={isDedication ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.primary}
              />
              <AppText style={[styles.dedicationHeading, { color: colors.text }]}>
                Make this gift in honor or in memory of someone
              </AppText>
            </Pressable>

            {isDedication ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => setTributeType('honor')}
                    style={[
                      styles.tributeChip,
                      tributeType === 'honor' && { backgroundColor: colors.primary },
                    ]}
                  >
                    <AppText
                      style={{
                        color: tributeType === 'honor' ? '#FFFFFF' : colors.text,
                        fontWeight: '700',
                      }}
                    >
                      In Honor Of
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setTributeType('memory')}
                    style={[
                      styles.tributeChip,
                      tributeType === 'memory' && { backgroundColor: colors.primary },
                    ]}
                  >
                    <AppText
                      style={{
                        color: tributeType === 'memory' ? '#FFFFFF' : colors.text,
                        fontWeight: '700',
                      }}
                    >
                      In Memory Of
                    </AppText>
                  </Pressable>
                </View>

                <TextField
                  label="Honoree Name"
                  value={tributeName}
                  onChangeText={setTributeName}
                  placeholder="e.g. Coach David or Mary Smith"
                />
                <TextField
                  label="Tribute Message (Optional)"
                  value={tributeMessage}
                  onChangeText={setTributeMessage}
                  placeholder="Share a message or note..."
                  multiline
                  numberOfLines={2}
                />
              </View>
            ) : null}
          </View>

          {/* Donor & Payment Information */}
          <AppText style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>
            Donor & Payment Information
          </AppText>

          <View style={[styles.sectionCard, cardTheme]}>
            <TextField
              label="Donor Name (for tax receipt) *"
              value={donorName}
              onChangeText={setDonorName}
            />
            <TextField
              label="Receipt Email Address *"
              value={donorEmail}
              onChangeText={setDonorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {memberId ? (
              <View style={{ marginTop: 8 }}>
                <Pressable
                  onPress={() => setUseCardOnFile(!useCardOnFile)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
                >
                  <Ionicons
                    name={useCardOnFile ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={colors.primary}
                  />
                  <AppText style={{ fontSize: 14, color: colors.text, fontWeight: '600' }}>
                    Use Membership Card on File ({cardBrand} •••• {cardLast4})
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {!useCardOnFile || !memberId ? (
              <View style={{ gap: 10, marginTop: 6 }}>
                <TextField
                  label="Card Number *"
                  value={newCardNumber}
                  onChangeText={setNewCardNumber}
                  placeholder="•••• •••• •••• ••••"
                  keyboardType="number-pad"
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Expires (MM/YY) *"
                      value={newExpiry}
                      onChangeText={setNewExpiry}
                      placeholder="12/28"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="CVC *"
                      value={newCvc}
                      onChangeText={setNewCvc}
                      placeholder="123"
                      keyboardType="number-pad"
                      secureTextEntry
                    />
                  </View>
                </View>
                <TextField
                  label="Billing Zip Code *"
                  value={newZip}
                  onChangeText={setNewZip}
                  placeholder="20910"
                />
              </View>
            ) : null}
          </View>

          {/* Donation Summary & Submit */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.summaryRow}>
              <AppText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                Total {frequency === 'monthly' ? 'Monthly Sustaining Gift' : 'Gift Amount'}:
              </AppText>
              <AppText style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>
                {formatCents(effectiveAmountCents)}
                {frequency === 'monthly' ? '/mo' : ''}
              </AppText>
            </View>

            <AppText style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 16 }}>
              YMCA of Metropolitan Washington is an accredited 501(c)(3) organization. No goods or services were provided in exchange for this contribution; it is 100% tax-deductible to the full extent of the law.
            </AppText>

            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                title={`Donate ${formatCents(effectiveAmountCents)} Now`}
                onPress={() => void handleDonate()}
                loading={submitting}
              />
            </View>
          </View>

          {/* Past Giving History */}
          {pastDonations.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <AppText style={[styles.sectionHeading, { color: colors.text }]}>
                Your Giving History
              </AppText>
              {pastDonations.map((d) => (
                <View key={d.id} style={[styles.historyCard, cardTheme]}>
                  <View style={styles.historyTop}>
                    <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
                      {formatCents(d.amountCents)} ({d.frequency})
                    </AppText>
                    <AppText style={{ fontSize: 12, color: colors.textMuted }}>
                      {formatDate(d.createdAt)}
                    </AppText>
                  </View>
                  <AppText style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>
                    {d.designation}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                    Tax Receipt #{d.receiptNumber} · Charged to {d.paymentBrand} •••• {d.paymentLast4}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Tax Receipt Success Modal */}
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptModal, cardTheme]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.successIconCircle, { backgroundColor: colors.successBg }]}>
                <Ionicons name="checkmark" size={32} color={colors.success} />
              </View>
              <AppText style={[styles.receiptHeading, { color: colors.text }]}>
                Thank You for Your Gift!
              </AppText>
              <AppText style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Official 501(c)(3) Charitable Tax Receipt
              </AppText>
            </View>

            {confirmedDonation ? (
              <View style={[styles.receiptBox, { borderColor: colors.border, backgroundColor: isDark ? '#142033' : '#F8FAFC' }]}>
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Receipt Number:</AppText>
                  <AppText style={styles.receiptVal}>{confirmedDonation.receiptNumber}</AppText>
                </View>
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Tax ID (EIN):</AppText>
                  <AppText style={styles.receiptVal}>{confirmedDonation.taxDeductibleId}</AppText>
                </View>
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Gift Amount:</AppText>
                  <AppText style={[styles.receiptVal, { color: colors.primary, fontWeight: '800' }]}>
                    {formatCents(confirmedDonation.amountCents)} ({confirmedDonation.frequency})
                  </AppText>
                </View>
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Designated Fund:</AppText>
                  <AppText style={styles.receiptVal}>{confirmedDonation.designation}</AppText>
                </View>
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Donor:</AppText>
                  <AppText style={styles.receiptVal}>{confirmedDonation.donorName}</AppText>
                </View>
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Payment Method:</AppText>
                  <AppText style={styles.receiptVal}>
                    {confirmedDonation.paymentBrand} •••• {confirmedDonation.paymentLast4}
                  </AppText>
                </View>
              </View>
            ) : null}

            <AppText style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginVertical: 12, lineHeight: 15 }}>
              A confirmation email and PDF tax receipt have been dispatched to {confirmedDonation?.donorEmail}. Thank you for strengthening the YMCA Silver Spring community!
            </AppText>

            <PrimaryButton
              title="Done"
              onPress={() => {
                setReceiptModalVisible(false);
                router.back();
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 50,
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
  heroCard: {
    borderRadius: radii.md,
    padding: 18,
    marginBottom: 16,
  },
  heroCaseBadge: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 12,
  },
  missionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  missionLabel: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  missionText: {
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 18,
  },
  expandDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    marginBottom: 10,
  },
  expandDetailsText: {
    color: '#6EE7B7',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  caseDetailsBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  caseSubSection: {
    gap: 4,
  },
  caseSubHeading: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  caseSubText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 17,
  },
  commitmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  commitmentTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  commitmentDesc: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  taxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0F2C59',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  taxPillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  frequencyRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 4,
    marginBottom: 18,
  },
  frequencyBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  frequencyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  tierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tierBtn: {
    width: '48%',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardStyle,
  },
  tierPrice: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  tierTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tierSubtitle: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  popularBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  whereDonationsGoCard: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 14,
    gap: 10,
    ...cardStyle,
  },
  whereHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whereHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  whereProgramTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  issueBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  issueHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  issueText: {
    fontSize: 12,
    lineHeight: 17,
  },
  responseBox: {
    backgroundColor: 'rgba(2, 132, 199, 0.07)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  responseHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.3,
  },
  responseText: {
    fontSize: 12,
    lineHeight: 17,
  },
  impactBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  impactHeading: {
    fontSize: 12,
    fontWeight: '800',
  },
  impactBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  taglineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    flex: 1,
  },
  fundsWrap: {
    gap: 8,
  },
  fundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
    ...cardStyle,
  },
  fundText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dedicationToggleCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
    ...cardStyle,
  },
  dedicationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dedicationHeading: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  tributeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sectionCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    ...cardStyle,
  },
  summaryCard: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 20,
    ...cardStyle,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    ...cardStyle,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  receiptModal: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    ...cardStyle,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptHeading: {
    fontSize: 20,
    fontWeight: '800',
  },
  receiptBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '65%',
  },
});
