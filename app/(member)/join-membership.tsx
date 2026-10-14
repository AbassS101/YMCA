import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import {
  ageOn,
  canHoldSoloMembership,
  isFamilyPlan,
  validateHousehold,
} from '@/domain/householdAccess';
import { tokenizePaymentInput } from '@/domain/paymentTokenizer';
import {
  YMCA_MEMBERSHIP_PLANS,
  effectiveEnrollmentFeeCents,
  type EnrollmentCampaign,
  type MembershipPlan,
} from '@/domain/types';
import { getDemoToday } from '@/domain/demoClock';
import { campaignHeadline } from '@/domain/enrollmentCampaigns';
import { membershipRepo } from '@/repositories/membershipRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

type FamilyDraft = { name: string; birthDate: string; email: string };

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const DONATION_OPTIONS = [
  { cents: 0, label: 'No add-on' },
  { cents: 500, label: '+$5/mo' },
  { cents: 1000, label: '+$10/mo' },
  { cents: 2500, label: '+$25/mo' },
];

export default function JoinMembershipScreen() {
  const router = useRouter();
  const { session, api, login } = useSession();
  const { colors, isDark } = useTheme();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('adult');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [donationCents, setDonationCents] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<EnrollmentCampaign | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getActiveCampaign(getDemoToday())
      .then((c) => {
        if (!cancelled) setCampaign(c);
      })
      .catch(() => {
        if (!cancelled) setCampaign(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const [birthDate, setBirthDate] = useState('');
  const [family, setFamily] = useState<FamilyDraft[]>([]);

  const selectedPlan =
    YMCA_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? YMCA_MEMBERSHIP_PLANS[0];
  const familyPlan = isFamilyPlan(selectedPlan);
  const validBirth = /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim());
  const buyerCheck = validBirth
    ? canHoldSoloMembership(birthDate.trim(), selectedPlan.id, getDemoToday())
    : null;
  const updateFamily = (idx: number, patch: Partial<FamilyDraft>) =>
    setFamily((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const isGuestConverting = session?.role === 'guest';
  const enrollmentFeeDueCents = effectiveEnrollmentFeeCents(selectedPlan, {
    waiveEnrollmentFee: isGuestConverting,
    campaign,
  });
  const campaignDiscountApplies =
    campaign !== null &&
    effectiveEnrollmentFeeCents(selectedPlan, { campaign }) < selectedPlan.enrollmentFeeCents;

  const totalFirstMonthCents =
    selectedPlan.monthlyAmountCents + enrollmentFeeDueCents + donationCents;

  const handlePurchase = async () => {
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedAddress) {
      setFormError('Please fill in all personal information fields.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!validBirth) {
      setFormError('Enter your birth date as YYYY-MM-DD.');
      return;
    }
    if (buyerCheck && !buyerCheck.ok) {
      setFormError(buyerCheck.reason);
      return;
    }
    const householdMembers = familyPlan
      ? family
          .filter((f) => f.name.trim() !== '' || f.birthDate.trim() !== '')
          .map((f) => ({
            name: f.name.trim(),
            birthDate: f.birthDate.trim(),
            email: f.email.trim() || undefined,
          }))
      : [];
    if (householdMembers.some((f) => f.name === '' || !/^\d{4}-\d{2}-\d{2}$/.test(f.birthDate))) {
      setFormError('Each family member needs a name and a birth date (YYYY-MM-DD).');
      return;
    }
    if (householdMembers.length > 0) {
      const people = [{ birthDate: birthDate.trim() }, ...householdMembers];
      const household = validateHousehold(selectedPlan.id, people, getDemoToday());
      if (!household.ok) {
        setFormError(household.reason);
        return;
      }
    }

    const tokenized = tokenizePaymentInput({
      cardNumber,
      expiry,
      cvc,
      postalCode,
    });

    if (!tokenized.valid) {
      setFormError(tokenized.error ?? 'Please check your payment card details.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await membershipRepo.buyMembership(api, {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        planId: selectedPlan.id,
        payment: {
          brand: tokenized.brand,
          last4: tokenized.last4,
        },
        donationCents: donationCents > 0 ? donationCents : undefined,
        waiveEnrollmentFee: isGuestConverting,
        campaignId: campaign?.id,
        birthDate: birthDate.trim(),
        householdMembers: householdMembers.length > 0 ? householdMembers : undefined,
      });

      // If not logged in, automatically log in as the newly created member!
      if (!session) {
        try {
          await login(trimmedEmail, 'ymca-demo');
        } catch {
          // ignore
        }
      }

      dialog.alert(
        'Welcome to YMCA Silver Spring!',
        `Your ${selectedPlan.name} membership has been activated! Your Membership Barcode ID is #${result.member.membershipId}.\n\nYour first monthly draft of ${formatCents(
          totalFirstMonthCents
        )} was successfully authorized to ${tokenized.brand} •••• ${tokenized.last4}. Full facility, pool, and group fitness privileges begin immediately!`,
        [
          {
            text: 'Go to Member Home',
            onPress: () => {
              router.replace('/(member)/home');
            },
          },
        ],
        'checkmark'
      );
    } catch (err: any) {
      setFormError(err?.message || 'Could not complete membership purchase. Please try again.');
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
      <YHeader subtitle="Join YMCA Silver Spring" showActions={false} />

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

          {/* Hero Banner */}
          <View style={[styles.heroCard, { backgroundColor: colors.primaryDark }]}>
            <AppText style={styles.heroTitle}>Join Our Community Today</AppText>
            <AppText style={styles.heroSubtitle}>
              Experience heated outdoor & indoor pools, over 40 weekly classes, cutting-edge fitness equipment, JOOLA pickleball, saunas, and Nationwide Reciprocity. No joiner fee, no contracts.
            </AppText>
          </View>

          {formError ? <ErrorBanner message={formError} /> : null}

          {/* Step 1: Select Plan */}
          <AppText style={[styles.stepTitle, { color: colors.text }]}>
            1. Select Your Membership Plan
          </AppText>

          <View style={styles.plansWrap}>
            {YMCA_MEMBERSHIP_PLANS.map((plan) => {
              const selected = plan.id === selectedPlanId;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  style={[
                    styles.planOptionCard,
                    cardTheme,
                    selected && {
                      borderColor: colors.primary,
                      borderWidth: 2,
                      backgroundColor: isDark ? colors.primaryLight : '#F0F9FF',
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.planOptionTop}>
                    <View style={styles.planOptionLeft}>
                      <AppText style={[styles.planOptionName, { color: colors.text }]}>
                        {plan.name}
                      </AppText>
                      {plan.badge ? (
                        <View
                          style={[
                            styles.miniBadge,
                            {
                              backgroundColor: plan.recommended
                                ? colors.gold
                                : colors.primaryLight,
                            },
                          ]}
                        >
                          <AppText
                            style={[
                              styles.miniBadgeText,
                              {
                                color: plan.recommended ? '#FFFFFF' : colors.primary,
                              },
                            ]}
                          >
                            {plan.badge}
                          </AppText>
                        </View>
                      ) : null}
                      <AppText style={[styles.planOptionSub, { color: colors.textMuted }]}>
                        {plan.subtitle}
                      </AppText>
                    </View>

                    <View style={styles.planOptionPriceCol}>
                      <AppText style={[styles.planOptionPrice, { color: colors.primary }]}>
                        {formatCents(plan.monthlyAmountCents)}
                      </AppText>
                      <AppText style={[styles.planOptionPeriod, { color: colors.textMuted }]}>
                        /month
                      </AppText>
                    </View>
                  </View>

                  <AppText style={[styles.planOptionDesc, { color: colors.text }]}>
                    {plan.description}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Step 2: Personal Information */}
          <AppText style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
            2. Personal Information
          </AppText>

          <View style={[styles.sectionCard, cardTheme]}>
            <TextField
              label="Full Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
              autoCapitalize="words"
            />
            <TextField
              label="Email Address *"
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. jordan@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Phone Number *"
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. (301) 555-0142"
              keyboardType="phone-pad"
            />
            <TextField
              label="Home Address *"
              value={address}
              onChangeText={setAddress}
              placeholder="Street address, city, state, zip"
            />
            <TextField
              label="Your Birth Date (YYYY-MM-DD) *"
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="e.g. 1985-06-30"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
            {buyerCheck && !buyerCheck.ok ? <ErrorBanner message={buyerCheck.reason} /> : null}
          </View>

          {familyPlan ? (
            <View style={[styles.sectionCard, cardTheme, { marginTop: 12 }]}>
              <AppText style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                Add family members
              </AppText>
              <AppText style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                You pay for the plan. Everyone gets their own barcode ID. Children under 13 can use the pool, take
                lessons and use Child Watch. Ages 13-17 can use the gym after a trainer orientation. Add an email for
                anyone 13 or older who should have their own app login.
              </AppText>
              {family.map((f, idx) => (
                <View key={idx} style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                  <TextField
                    label={`Person ${idx + 1} name`}
                    value={f.name}
                    onChangeText={(v) => updateFamily(idx, { name: v })}
                    autoCapitalize="words"
                  />
                  <TextField
                    label="Birth date (YYYY-MM-DD)"
                    value={f.birthDate}
                    onChangeText={(v) => updateFamily(idx, { birthDate: v })}
                    keyboardType="numbers-and-punctuation"
                    autoCorrect={false}
                  />
                  {/^\d{4}-\d{2}-\d{2}$/.test(f.birthDate.trim()) && ageOn(f.birthDate.trim(), getDemoToday()) >= 13 ? (
                    <TextField
                      label="Email (optional, gives them their own login)"
                      value={f.email}
                      onChangeText={(v) => updateFamily(idx, { email: v })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  ) : null}
                  <Pressable
                    onPress={() => setFamily((prev) => prev.filter((_, i) => i !== idx))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove person ${idx + 1}`}
                  >
                    <AppText style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>Remove</AppText>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() => setFamily((prev) => [...prev, { name: '', birthDate: '', email: '' }])}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <AppText style={{ color: colors.primary, fontWeight: '700' }}>Add a person</AppText>
              </Pressable>
            </View>
          ) : null}

          {/* Step 3: Payment Card */}
          <AppText style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
            3. Payment Details
          </AppText>

          <View style={[styles.sectionCard, cardTheme]}>
            <TextField
              label="Card Number *"
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="4242 •••• •••• 4242"
              keyboardType="number-pad"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Expires (MM/YY) *"
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="12/28"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="CVC / CVV *"
                  value={cvc}
                  onChangeText={setCvc}
                  placeholder="123"
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
            </View>
            <TextField
              label="Billing Zip Code *"
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="20910"
              keyboardType="number-pad"
            />
          </View>

          {/* Step 4: Optional Monthly Community Gift */}
          <AppText style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
            4. Support Community Health (Optional)
          </AppText>

          <View style={[styles.sectionCard, cardTheme]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Ionicons name="heart" size={24} color="#DC2626" />
              <AppText style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                Round up for YMCA Open Doors Financial Aid
              </AppText>
            </View>
            <AppText style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 12 }}>
              YMCA Silver Spring provides subsidized wellness memberships to local families and seniors in need. Add a tax-deductible monthly donation to your draft:
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DONATION_OPTIONS.map((opt) => {
                const active = donationCents === opt.cents;
                return (
                  <Pressable
                    key={opt.cents}
                    onPress={() => setDonationCents(opt.cents)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primaryLight : colors.cardBg,
                      alignItems: 'center',
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: active ? colors.primary : colors.text,
                      }}
                    >
                      {opt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Order Summary & Submit */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <AppText style={[styles.summaryHeading, { color: colors.text }]}>
              Membership Summary
            </AppText>
            <View style={styles.summaryRow}>
              <AppText style={{ color: colors.textMuted, fontSize: 14 }}>
                {selectedPlan.name} Membership
              </AppText>
              <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                {formatCents(selectedPlan.monthlyAmountCents)}/mo
              </AppText>
            </View>

            {donationCents > 0 ? (
              <View style={styles.summaryRow}>
                <AppText style={{ color: colors.textMuted, fontSize: 14 }}>
                  Monthly Open Doors Donation
                </AppText>
                <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                  +{formatCents(donationCents)}/mo
                </AppText>
              </View>
            ) : null}

            {isGuestConverting ? (
              <View style={[styles.guestFeeBanner, { backgroundColor: isDark ? '#14532D33' : '#DCFCE7', borderColor: colors.success }]}>
                <AppText style={{ color: colors.success, fontSize: 13, fontWeight: '700' }}>
                  Guest pass benefit: one-time enrollment fee waived
                </AppText>
              </View>
            ) : campaignDiscountApplies ? (
              <View style={[styles.guestFeeBanner, { backgroundColor: isDark ? '#78350F33' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                <AppText style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13, fontWeight: '700' }}>
                  {campaign ? campaignHeadline(campaign) : ''}
                </AppText>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <AppText style={{ color: colors.textMuted, fontSize: 14 }}>
                Enrollment Fee (one-time)
              </AppText>
              {enrollmentFeeDueCents === 0 && selectedPlan.enrollmentFeeCents > 0 ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText
                    style={{
                      color: colors.textMuted,
                      fontSize: 12,
                      textDecorationLine: 'line-through',
                    }}
                  >
                    {formatCents(selectedPlan.enrollmentFeeCents)}
                  </AppText>
                  <AppText style={{ color: colors.success, fontWeight: '700', fontSize: 15 }}>
                    $0.00 (Waived)
                  </AppText>
                </View>
              ) : (
                <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                  {formatCents(enrollmentFeeDueCents)}
                </AppText>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.summaryRow}>
              <AppText style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
                Total Due Today:
              </AppText>
              <AppText style={{ color: colors.primary, fontWeight: '800', fontSize: 20 }}>
                {formatCents(totalFirstMonthCents)}
              </AppText>
            </View>

            <AppText style={[styles.termsText, { color: colors.textMuted }]}>
              By completing this purchase, you authorize YMCA Silver Spring to charge your payment method monthly. You may change or cancel your membership with 30 days notice at any time.
            </AppText>

            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                title={`Buy & Activate ${selectedPlan.name}`}
                onPress={() => void handlePurchase()}
                loading={submitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  stepTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  plansWrap: {
    gap: 12,
  },
  planOptionCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    ...cardStyle,
  },
  planOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  planOptionLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  planOptionPriceCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  planOptionName: {
    fontSize: 17,
    fontWeight: '800',
  },
  miniBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  planOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  planOptionPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  planOptionPeriod: {
    fontSize: 11,
  },
  planOptionDesc: {
    fontSize: 13,
    lineHeight: 18,
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
    padding: 18,
    marginTop: 24,
    ...cardStyle,
  },
  summaryHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  guestFeeBanner: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  termsText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
});

