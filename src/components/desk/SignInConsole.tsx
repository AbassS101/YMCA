import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { UserAvatar } from '@/components/UserAvatar';
import { DeskAlertPills } from '@/components/desk/DeskAlertPills';
import { UpdateCardSheet } from '@/components/desk/UpdateCardSheet';
import { ActionButton, EmptyState, ListRow, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { getDemoToday } from '@/domain/demoClock';
import { deskAlertsFor, hasBlockingAlert } from '@/domain/deskAlerts';
import { accessSummary } from '@/domain/householdAccess';
import type { Member, Membership } from '@/domain/types';
import { arrivalRepo } from '@/repositories/arrivalRepo';
import { deskRepo } from '@/repositories/deskRepo';

export type MemberRow = { member: Member; membership: Membership | null };

export function matchesMemberQuery(m: Member, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const digits = q.replace(/\D/g, '');
  return (
    m.name.toLowerCase().includes(q) ||
    m.membershipId.toLowerCase().includes(q) ||
    m.email.toLowerCase().includes(q) ||
    (digits.length >= 3 && m.phone.replace(/\D/g, '').includes(digits))
  );
}

/** Greet and sign-in console: search, see desk alerts, check in (alerting the member's trainers). */
export function SignInConsole({
  staffId,
  rows,
  checkedInToday,
  accent,
  canHandleBilling,
  onChanged,
}: {
  staffId: string;
  rows: MemberRow[];
  checkedInToday: Set<string>;
  accent: string;
  canHandleBilling: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { api } = useSession();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cardFor, setCardFor] = useState<MemberRow | null>(null);
  const today = getDemoToday();

  const results = useMemo(
    () => rows.filter(({ member }) => matchesMemberQuery(member, query)).slice(0, 5),
    [rows, query]
  );

  const performCheckIn = async (member: Member) => {
    setBusyId(member.id);
    try {
      const result = await arrivalRepo.checkIn(api, member.id, { source: 'desk', staffId, note: 'Front desk check-in' });
      const trainerLine =
        result.notifiedStaffNames.length > 0
          ? ` ${result.notifiedStaffNames.join(', ')} ${result.notifiedStaffNames.length === 1 ? 'has' : 'have'} been notified.`
          : '';
      const accessLine = member.householdId ? `\n\n${accessSummary(member, getDemoToday())}` : '';
      dialog.alert(
        result.isNewCheckIn ? 'Checked In' : 'Already Checked In',
        result.isNewCheckIn
          ? `${member.name} is checked in. ${result.streakProfile.totalCheckIns} total visits.${trainerLine}${accessLine}`
          : `${member.name} already checked in today.${trainerLine}${accessLine}`,
        [{ text: 'OK' }],
        'checkmark'
      );
      await onChanged();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not record check-in.');
    } finally {
      setBusyId(null);
    }
  };

  const checkIn = (row: MemberRow) => {
    const alerts = deskAlertsFor(row.member, row.membership, today);
    if (!hasBlockingAlert(alerts)) {
      void performCheckIn(row.member);
      return;
    }
    const top = alerts[0];
    const billingIssue = alerts.some((a) => a.kind === 'card_declined' || a.kind === 'past_due');
    dialog.show({
      title: `${row.member.name}: ${top.label}`,
      message: `${alerts.filter((a) => a.blocking).map((a) => a.detail).join('\n')}\n\nResolve this with the member before they go in, or check them in anyway.`,
      icon: 'alert',
      buttons: [
        ...(billingIssue && canHandleBilling
          ? [{ text: 'Update card now', onPress: () => setCardFor(row) }]
          : []),
        { text: 'Open profile', onPress: () => router.push(`/(staff)/members/${row.member.id}`) },
        { text: 'Check in anyway', onPress: () => void performCheckIn(row.member) },
        { text: 'Cancel', style: 'cancel' as const },
      ],
    });
  };

  return (
    <>
      <SectionCard title="Greet & Sign In" icon="scan" accent={accent} subtitle="Search by name, member ID, email or phone">
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. Jordan or 448291"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search members to check in"
        />
        {query.trim() === '' ? null : results.length === 0 ? (
          <EmptyState icon="search-outline" text="No members match that search." />
        ) : (
          results.map((row) => {
            const { member, membership } = row;
            const alerts = deskAlertsFor(member, membership, today);
            const checked = checkedInToday.has(member.id);
            return (
              <ListRow
                key={member.id}
                title={member.name}
                subtitle={`${member.membershipId} · ${member.type}`}
                meta={alerts[0]?.detail}
                left={<UserAvatar uri={member.avatarUrl} name={member.name} size={38} />}
                onPress={() => router.push(`/(staff)/members/${member.id}`)}
                right={
                  <View style={styles.rightCol}>
                    <DeskAlertPills alerts={alerts} />
                    {checked ? (
                      <StatusPill label="IN TODAY" color="#15803D" bg="#DCFCE7" />
                    ) : (
                      <ActionButton
                        label="Check In"
                        icon="log-in-outline"
                        color="#15803D"
                        loading={busyId === member.id}
                        onPress={() => checkIn(row)}
                      />
                    )}
                  </View>
                }
              />
            );
          })
        )}
      </SectionCard>

      <UpdateCardSheet
        visible={cardFor !== null}
        memberName={cardFor?.member.name ?? ''}
        currentLast4={cardFor?.membership?.paymentLast4}
        onClose={() => setCardFor(null)}
        onSubmit={async (payment) => {
          if (!cardFor) return;
          await deskRepo.resolveBillingIssue(api, cardFor.member.id, payment, staffId);
          const name = cardFor.member.name;
          setCardFor(null);
          dialog.alert('Card Updated', `${name}'s billing issue is cleared.`, [{ text: 'OK' }], 'checkmark');
          await onChanged();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  rightCol: { alignItems: 'flex-end', gap: 6, maxWidth: 150 },
});
