import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { cancelRequestedCopy, formatShortDate } from '@/domain/displayDates';
import type { Member, Membership, Thread } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { membershipRepo } from '@/repositories/membershipRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StaffMemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = id ?? '';
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (memberId === '' || staffId === '') {
      return;
    }
    try {
      setError(false);
      const [nextMember, nextMembership, threads] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
        messageRepo.listThreads(api, staffId),
      ]);
      const thread = threads.find((t: Thread) => t.memberId === memberId && t.staffId === staffId);
      setMember(nextMember);
      setMembership(nextMembership);
      setThreadId(thread?.id ?? null);
    } catch {
      setError(true);
    }
  }, [api, memberId, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelBanner =
    member?.status === 'cancel_pending' &&
    membership?.lastBillDate != null &&
    membership.cancelEffectiveDate != null
      ? cancelRequestedCopy(membership.lastBillDate, membership.cancelEffectiveDate)
      : null;

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Member" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        {member ? (
          <View style={styles.card}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.meta}>{member.email}</Text>
            <Text style={styles.meta}>{member.phone}</Text>
          </View>
        ) : null}

        {member && membership ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Membership</Text>
            <Text style={styles.row}>ID {member.membershipId}</Text>
            <Text style={styles.row}>
              {member.type} · {formatCents(membership.monthlyAmountCents)}/mo
            </Text>
            <Text style={styles.row}>
              Status: {member.status === 'active' ? 'Active' : 'Cancellation pending'}
            </Text>
            <Text style={styles.row}>
              Next bill {formatShortDate(membership.nextBillingDate)}
            </Text>
            {cancelBanner ? <Text style={styles.cancelBanner}>{cancelBanner}</Text> : null}
          </View>
        ) : null}

        {threadId ? (
          <PrimaryButton
            title="Open message thread"
            onPress={() => router.push(`/(staff)/messages/${threadId}`)}
          />
        ) : (
          <Text style={styles.muted}>No message thread for this member.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  back: {
    ...typography.body,
    color: colors.scarlet,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  meta: {
    ...typography.body,
    color: colors.muted,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
    marginBottom: 4,
  },
  row: {
    ...typography.body,
    color: colors.nearBlack,
  },
  cancelBanner: {
    ...typography.body,
    color: colors.scarlet,
    marginTop: 8,
    fontWeight: '600',
  },
  muted: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
});
