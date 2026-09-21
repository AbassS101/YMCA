import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { tokenizePaymentInput } from '@/domain/paymentTokenizer';
import {
  YMCA_MEMBERSHIP_PLANS,
  type MembershipPlan,
} from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

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

  const selectedPlan =
    YMCA_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? YMCA_MEMBERSHIP_PLANS[0];

  const totalFirstMonthCents = selectedPlan.monthlyAmountCents + donationCents;

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
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText style={[styles.planOptionName, { color: colors.text }]}>
                          {plan.name}
                        </AppText>
                        {plan.badge ? (
                          <View style={[styles.miniBadge, { backgroundColor: colors.primaryLight }]}>
                            <AppText style={[styles.miniBadgeText, { color: colors.primary }]}>
                              {plan.badge}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                      <AppText style={[styles.planOptionSub, { color: colors.textMuted }]}>
                        {plan.subtitle}
                      </AppText>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
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
              placeholder="e.g. Jordan Hale"
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
          </View>

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

            <View style={styles.summaryRow}>
              <AppText style={{ color: colors.textMuted, fontSize: 14 }}>
                Joiner Fee / Signup Fee
              </AppText>
              <AppText style={{ color: colors.success, fontWeight: '700', fontSize: 15 }}>
                $0.00 (Waived)
              </AppText>
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
  planOptionName: {
    fontSize: 17,
    fontWeight: '800',
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
