import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { computeCancelDates } from '@/domain/cancelDates';
import { getDemoToday } from '@/domain/demoClock';
import { cancelRequestedCopy, formatShortDate } from '@/domain/displayDates';
import type { Member, Membership } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { membershipRepo } from '@/repositories/membershipRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type Step = 'form' | 'confirm';

export default function CancelMembershipScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: themeColors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rescinding, setRescinding] = useState(false);
  const [error, setError] = useState(false);

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

  const pending =
    member?.status === 'cancel_pending' &&
    membership?.lastBillDate != null &&
    membership.cancelEffectiveDate != null;

  const previewDates = useMemo(() => {
    if (!membership) {
      return null;
    }
    return computeCancelDates({
      nextBillingDate: membership.nextBillingDate,
      requestedAt: getDemoToday(),
      previousBillingDate: membership.lastBillDate,
    });
  }, [membership]);

  async function handleSubmit() {
    if (pending || member == null) {
      return;
    }
    setFormError(null);
    if (reason.trim() === '') {
      setFormError('Please share a reason for canceling.');
      return;
    }
    setLoading(true);
    try {
      await membershipRepo.submitCancel(api, memberId, {
        reason: reason.trim(),
        requestedAt: getDemoToday(),
      });
      await load();
      router.back();
    } catch {
      setFormError('Cancel notice was already submitted or could not be saved.');
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleRescind() {
    setRescinding(true);
    try {
      await membershipRepo.rescindCancel(api, memberId);
      await load();
      router.back();
    } catch {
      setFormError('Could not restore membership.');
    } finally {
      setRescinding(false);
    }
  }

  function goConfirm() {
    setFormError(null);
    if (reason.trim() === '') {
      setFormError('Please share a reason for canceling.');
      return;
    }
    setStep('confirm');
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.background }]}>
      <YHeader subtitle="Cancel membership" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={[styles.back, { color: themeColors.primary }]}>← Back to Account</Text>
          </Pressable>

          {error ? <ErrorBanner onRetry={() => void load()} /> : null}

          {pending && membership ? (
            <View style={[styles.banner, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={styles.bannerText}>
                {cancelRequestedCopy(membership.lastBillDate!, membership.cancelEffectiveDate!)}
              </Text>
              <Text style={[styles.muted, { color: themeColors.muted, marginBottom: 12 }]}>
                A second cancel request cannot be submitted.
              </Text>
              <PrimaryButton
                title={rescinding ? 'Restoring...' : 'Keep My Membership (Rescind Cancellation)'}
                onPress={() => void handleRescind()}
                loading={rescinding}
              />
            </View>
          ) : null}

          {!pending && member && membership ? (
            <>
              {step === 'form' ? (
                <>
                  <Text style={[styles.lead, { color: themeColors.nearBlack }]}>
                    YMCA DC requires written notice one calendar month before your monthly draft.
                  </Text>
                  <TextField label="Name" value={member.name} editable={false} />
                  <TextField label="Membership ID" value={member.membershipId} editable={false} />
                  <TextField label="Address" value={member.address} editable={false} />
                  <TextField label="Phone" value={member.phone} editable={false} />
                  <TextField label="Email" value={member.email} editable={false} />
                  <TextField
                    label="Reason for canceling"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={3}
                  />
                  {formError ? <Text style={styles.error}>{formError}</Text> : null}
                  <PrimaryButton title="Review dates" onPress={goConfirm} />
                </>
              ) : previewDates ? (
                <>
                  <Text style={[styles.sectionTitle, { color: themeColors.nearBlack }]}>Confirm cancellation</Text>
                  <Text style={[styles.body, { color: themeColors.nearBlack }]}>
                    Based on today ({formatShortDate(getDemoToday())}) and your next billing date (
                    {formatShortDate(membership.nextBillingDate)}):
                  </Text>
                  <View style={[styles.datesCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <Text style={[styles.body, { color: themeColors.nearBlack }]}>
                      Last bill:{' '}
                      {previewDates.lastBillDate === ''
                        ? 'none remaining'
                        : formatShortDate(previewDates.lastBillDate)}
                    </Text>
                    <Text style={[styles.body, { color: themeColors.nearBlack }]}>
                      Access through: {formatShortDate(previewDates.accessThrough)}
                    </Text>
                    <Text style={[styles.muted, { color: themeColors.muted }]}>
                      Notice deadline was {formatShortDate(previewDates.noticeDeadline)}.
                    </Text>
                  </View>
                  {formError ? <Text style={styles.error}>{formError}</Text> : null}
                  <PrimaryButton
                    title="Submit cancel notice"
                    onPress={() => void handleSubmit()}
                    loading={loading}
                  />
                  <Pressable onPress={() => setStep('form')} accessibilityRole="button">
                    <Text style={[styles.link, { color: themeColors.primary }]}>Edit reason</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  back: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  lead: {
    ...typography.body,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  body: {
    ...typography.body,
  },
  muted: {
    ...typography.body,
  },
  datesCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  bannerText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
  link: {
    ...typography.body,
    textAlign: 'center',
    fontWeight: '700',
  },
});
