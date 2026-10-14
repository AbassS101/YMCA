import { StyleSheet, Text, View } from 'react-native';

import { CallScript } from '@/components/desk/CallScript';
import { callPhone } from '@/components/desk/BillingIssueCard';
import { ActionButton, StatusPill } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { salesCallScript } from '@/domain/callScripts';
import { formatShortDate } from '@/domain/displayDates';
import { useAppConfig } from '@/context/AppConfigContext';
import type { EnrollmentCampaign, Lead, LeadStatus } from '@/domain/types';
import { radii } from '@/theme/typography';

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'NEW', color: '#0369A1', bg: '#E0F2FE' },
  contacted: { label: 'CONTACTED', color: '#4338CA', bg: '#E0E7FF' },
  tour_scheduled: { label: 'TOUR', color: '#7C3AED', bg: '#F5F3FF' },
  follow_up: { label: 'FOLLOW UP', color: '#B45309', bg: '#FEF3C7' },
  won: { label: 'WON', color: '#15803D', bg: '#DCFCE7' },
  lost: { label: 'LOST', color: '#475467', bg: '#F1F5F9' },
};

export function LeadCard({
  lead,
  repName,
  campaign,
  onLog,
  onOpen,
}: {
  lead: Lead;
  repName: string;
  campaign?: EnrollmentCampaign | null;
  onLog: () => void;
  onOpen?: () => void;
}) {
  const { colors: tc } = useTheme();
  const meta = LEAD_STATUS_META[lead.status];
  const plan = useAppConfig().config.membershipPlans.find((p) => p.id === lead.interestPlanId);
  return (
    <View style={[styles.card, { borderColor: tc.cardBorder }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: tc.text }]} onPress={onOpen} accessibilityRole={onOpen ? 'link' : undefined}>
            {lead.name}
          </Text>
          <Text style={[styles.meta, { color: tc.textMuted }]}>
            {lead.phone || lead.email} · {plan?.name ?? 'No plan picked'}
          </Text>
          {lead.nextFollowUpDate ? (
            <Text style={[styles.meta, { color: tc.textMuted }]}>Follow up {formatShortDate(lead.nextFollowUpDate)}</Text>
          ) : null}
        </View>
        <StatusPill label={meta.label} color={meta.color} bg={meta.bg} />
      </View>
      <CallScript script={salesCallScript({ lead, repName, campaign, planName: plan?.name })} />
      <View style={styles.actions}>
        {lead.phone ? <ActionButton label="Call" icon="call" color="#15803D" onPress={() => callPhone(lead.phone)} /> : null}
        <ActionButton label="Log Call" icon="create-outline" color={tc.primary} variant="outline" onPress={onLog} />
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
