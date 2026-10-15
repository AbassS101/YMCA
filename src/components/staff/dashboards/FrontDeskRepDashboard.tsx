import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BillingIssueCard, callPhone } from '@/components/desk/BillingIssueCard';
import { LeadCard } from '@/components/desk/LeadCard';
import { LeadFormSheet } from '@/components/desk/LeadFormSheet';
import { LogContactSheet } from '@/components/desk/LogContactSheet';
import { SignInConsole } from '@/components/desk/SignInConsole';
import { UpdateCardSheet } from '@/components/desk/UpdateCardSheet';
import { KpiRow } from '@/components/staff/KpiTile';
import { PersonaHero } from '@/components/staff/PersonaHero';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { ActionButton, EmptyState, ListRow, SectionCard } from '@/components/staff/SectionCard';
import { useAppConfig } from '@/context/AppConfigContext';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { campaignHeadline } from '@/domain/enrollmentCampaigns';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import type { BillingIssueRow, ContactPurpose } from '@/domain/types';
import { deskRepo } from '@/repositories/deskRepo';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

import { DashboardScaffold } from './DashboardScaffold';
import { formatLongDate } from './format';
import { useDeskData } from './useDeskData';

type LogTarget = { title: string; memberId?: string; leadId?: string; purpose: ContactPurpose };

export function FrontDeskRepDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api } = useSession();
  const { config } = useAppConfig();
  const { colors: tc } = useTheme();
  const { can, theme } = useStaffCapabilities();
  const canBilling = can('handleBillingIssues');
  const canLeads = can('manageLeads');
  const data = useDeskData(staffId, canBilling, canLeads);
  const { profile, rows, checkedInToday, billing, followUps, openLeads, campaign, todayKpis, monthKpis } = data;
  const repName = profile?.name ?? 'your Y membership rep';
  const today = getDemoToday();

  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const [cardTarget, setCardTarget] = useState<BillingIssueRow | null>(null);
  const [leadSheet, setLeadSheet] = useState(false);

  return (
    <DashboardScaffold
      subtitle="Front Desk Membership Representative"
      error={data.error}
      onRetry={() => void data.reload()}
    >
      <PersonaHero
        theme={theme}
        name={profile?.name ?? 'Front Desk'}
        avatarUrl={profile?.avatarUrl}
        roleLabel={profile?.roleLabel}
        dateLabel={formatLongDate(today)}
      >
        <KpiRow
          items={[
            { label: 'Sign-Ins Today', value: checkedInToday.size, icon: 'scan', color: '#15803D' },
            { label: 'Calls Today', value: todayKpis?.calls ?? 0, icon: 'call', color: theme.color },
            { label: 'Billing Issues', value: billing.length, icon: 'card', color: colors.scarlet },
            { label: 'Sold This Month', value: monthKpis?.membershipsSold ?? 0, icon: 'ribbon', color: '#D97706' },
          ]}
        />
      </PersonaHero>

      {campaign ? (
        <View style={[styles.promo, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={styles.promoTitle}>{campaignHeadline(campaign)}</Text>
          <Text style={styles.promoBody}>
            Mention it to every guest and walk-in. {campaign.description}
          </Text>
        </View>
      ) : null}

      <QuickActionBar
        actions={[
          { key: 'sale', label: 'New Sale', icon: 'person-add-outline', onPress: () => router.push('/(staff)/members'), color: theme.color },
          ...(canLeads
            ? [
                { key: 'lead', label: 'New Lead', icon: 'megaphone-outline' as const, onPress: () => setLeadSheet(true), color: '#7C3AED' },
                { key: 'leads', label: 'Pipeline', icon: 'funnel-outline' as const, onPress: () => router.push('/(staff)/leads'), color: '#0284C7' },
              ]
            : []),
          ...(config.featureToggles.childWatch
            ? [{ key: 'childwatch', label: 'Child Watch', icon: 'happy-outline' as const, onPress: () => router.push('/(staff)/child-watch'), color: '#D97706' }]
            : []),
          { key: 'hours', label: 'Trainer Hours', icon: 'time-outline', onPress: () => router.push('/(staff)/trainer-availability'), color: '#15803D' },
          { key: 'msg', label: 'Messages', icon: 'mail-outline', onPress: () => router.push('/(staff)/messages'), color: '#15803D' },
          { key: 'maint', label: 'Report to Maintenance', icon: 'construct-outline', onPress: () => router.push('/(staff)/maintenance'), color: '#B45309' },
        ]}
      />

      <SignInConsole
        staffId={staffId}
        rows={rows}
        checkedInToday={checkedInToday}
        accent={theme.color}
        canHandleBilling={canBilling}
        onChanged={data.reload}
      />

      {canBilling ? (
        <SectionCard
          title="Billing Issues to Call"
          icon="card"
          accent={colors.scarlet}
          count={billing.length}
          subtitle="Declined cards and past-due accounts"
          actionLabel="All"
          onAction={() => router.push('/(staff)/billing-issues')}
        >
          {billing.length === 0 ? (
            <EmptyState icon="happy-outline" text="No billing issues. Every card is current." />
          ) : (
            billing.slice(0, 4).map((row) => (
              <BillingIssueCard
                key={row.member.id}
                row={row}
                repName={repName}
                onOpen={() => router.push(`/(staff)/members/${row.member.id}`)}
                onLog={() => setLogTarget({ title: `Log call: ${row.member.name}`, memberId: row.member.id, purpose: 'billing' })}
                onUpdateCard={() => setCardTarget(row)}
              />
            ))
          )}
        </SectionCard>
      ) : null}

      <SectionCard title="Follow-Ups Due" icon="alarm" accent="#D97706" count={followUps.length} subtitle="Callbacks and voicemails to return">
        {followUps.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" text="No follow-ups are due." />
        ) : (
          followUps.slice(0, 6).map((f) => (
            <ListRow
              key={f.key}
              title={f.name}
              subtitle={f.reason}
              meta={`Due ${formatShortDate(f.date)}${f.date < today ? ' (overdue)' : ''}`}
              onPress={() => (f.kind === 'member' ? router.push(`/(staff)/members/${f.id}`) : router.push('/(staff)/leads'))}
              right={<ActionButton label="Call" icon="call" color="#15803D" onPress={() => callPhone(f.phone)} />}
            />
          ))
        )}
      </SectionCard>

      {canLeads ? (
        <SectionCard
          title="Sales Call List"
          icon="trending-up"
          accent="#7C3AED"
          count={openLeads.length}
          subtitle={campaign ? `Promo: ${campaign.name}` : 'Open leads, soonest follow-up first'}
          actionLabel="Pipeline"
          onAction={() => router.push('/(staff)/leads')}
        >
          {openLeads.length === 0 ? (
            <EmptyState icon="people-outline" text="No open leads. Add one from a walk-in or a guest pass." />
          ) : (
            openLeads.slice(0, 4).map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                repName={repName}
                campaign={campaign}
                onLog={() => setLogTarget({ title: `Log call: ${lead.name}`, leadId: lead.id, purpose: 'sales' })}
              />
            ))
          )}
        </SectionCard>
      ) : null}

      <LogContactSheet
        visible={logTarget !== null}
        title={logTarget?.title ?? ''}
        memberId={logTarget?.memberId}
        leadId={logTarget?.leadId}
        defaultPurpose={logTarget?.purpose}
        onClose={() => setLogTarget(null)}
        onSave={async (input) => {
          await deskRepo.logContact(api, input, staffId);
          setLogTarget(null);
          await data.reload();
        }}
      />

      <UpdateCardSheet
        visible={cardTarget !== null}
        memberName={cardTarget?.member.name ?? ''}
        currentLast4={cardTarget?.membership.paymentLast4}
        onClose={() => setCardTarget(null)}
        onSubmit={async (payment) => {
          if (!cardTarget) return;
          await deskRepo.resolveBillingIssue(api, cardTarget.member.id, payment, staffId);
          const name = cardTarget.member.name;
          setCardTarget(null);
          dialog.alert('Card Updated', `${name}'s billing issue is cleared.`, [{ text: 'OK' }], 'checkmark');
          await data.reload();
        }}
      />

      <LeadFormSheet
        visible={leadSheet}
        onClose={() => setLeadSheet(false)}
        onSave={async (values) => {
          await deskRepo.createLead(api, { ...values, assignedStaffId: staffId }, staffId);
          setLeadSheet(false);
          await data.reload();
        }}
      />
    </DashboardScaffold>
  );
}

const styles = StyleSheet.create({
  promo: { borderWidth: 1, borderRadius: radii.md, padding: 12, gap: 4 },
  promoTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  promoBody: { fontSize: 12, color: '#92400E' },
});
