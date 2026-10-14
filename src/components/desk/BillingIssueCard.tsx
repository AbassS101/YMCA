import { Linking, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { CallScript } from '@/components/desk/CallScript';
import { ActionButton, StatusPill } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { billingCallScript } from '@/domain/callScripts';
import type { BillingIssueRow } from '@/domain/types';
import { radii } from '@/theme/typography';

export function callPhone(phone: string): void {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits) void Linking.openURL(`tel:${digits}`);
}

export function BillingIssueCard({
  row,
  repName,
  onLog,
  onUpdateCard,
  onOpen,
}: {
  row: BillingIssueRow;
  repName: string;
  onLog: () => void;
  onUpdateCard: () => void;
  onOpen: () => void;
}) {
  const { colors: tc } = useTheme();
  const { member, membership } = row;
  const issue = membership.billingIssue;
  const declined = membership.billingStatus === 'declined';
  const due = ((issue?.amountDueCents ?? 0) / 100).toFixed(2);
  return (
    <View style={[styles.card, { borderColor: tc.cardBorder }]}>
      <View style={styles.top}>
        <UserAvatar uri={member.avatarUrl} name={member.name} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: tc.text }]} onPress={onOpen} accessibilityRole="link">
            {member.name}
          </Text>
          <Text style={[styles.meta, { color: tc.textMuted }]}>
            {member.phone} · {membership.paymentBrand} ending {membership.paymentLast4}
          </Text>
          <Text style={[styles.meta, { color: tc.textMuted }]}>
            ${due} due · {issue?.attempts ?? 0} attempt{(issue?.attempts ?? 0) === 1 ? '' : 's'} · {issue?.reason ?? 'Payment issue'}
          </Text>
        </View>
        <StatusPill label={declined ? 'DECLINED' : 'PAST DUE'} color="#B42318" bg="#FEE2E2" />
      </View>
      <CallScript
        script={billingCallScript({
          memberName: member.name,
          kind: declined ? 'card_declined' : 'past_due',
          amountDueCents: issue?.amountDueCents ?? 0,
          repName,
          reason: issue?.reason,
        })}
      />
      <View style={styles.actions}>
        <ActionButton label="Call" icon="call" color="#15803D" onPress={() => callPhone(member.phone)} />
        <ActionButton label="Log Outcome" icon="create-outline" color={tc.primary} variant="outline" onPress={onLog} />
        <ActionButton label="Update Card" icon="card-outline" color="#B45309" variant="outline" onPress={onUpdateCard} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.md, padding: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
