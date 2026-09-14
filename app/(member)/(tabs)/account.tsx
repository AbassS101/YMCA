import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { cancelRequestedCopy } from '@/domain/displayDates';
import type { Member, Membership } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { membershipRepo } from '@/repositories/membershipRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: Member['status']): string {
  return status === 'active' ? 'Active' : 'Cancellation pending';
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      accessibilityRole="button"
    >
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export default function MemberAccountScreen() {
  const router = useRouter();
  const { session, api, logout } = useSession();
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

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Account" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
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
            <Text style={styles.row}>Status: {statusLabel(member.status)}</Text>
            {cancelBanner ? <Text style={styles.cancelBanner}>{cancelBanner}</Text> : null}
          </View>
        ) : null}

        {membership ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment method</Text>
            <Text style={styles.row}>
              {membership.paymentBrand} •••• {membership.paymentLast4}
            </Text>
          </View>
        ) : null}

        <View style={styles.menu}>
          <MenuRow
            label="Update payment method"
            onPress={() => router.push('/(member)/update-payment')}
          />
          <MenuRow
            label="Cancel membership"
            onPress={() => router.push('/(member)/cancel')}
          />
          <MenuRow label="About" onPress={() => router.push('/(member)/about')} />
        </View>

        <PrimaryButton title="Log out" onPress={() => void handleLogout()} loading={loggingOut} />
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
  menu: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowPressed: {
    backgroundColor: colors.offWhite,
  },
  menuLabel: {
    ...typography.body,
    color: colors.nearBlack,
  },
  menuChevron: {
    ...typography.body,
    color: colors.muted,
    fontSize: 22,
    lineHeight: 22,
  },
});
