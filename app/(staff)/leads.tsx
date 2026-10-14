import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { LEAD_STATUS_META, LeadCard } from '@/components/desk/LeadCard';
import { LeadFormSheet } from '@/components/desk/LeadFormSheet';
import { LogContactSheet } from '@/components/desk/LogContactSheet';
import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, EmptyState, SectionCard } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import { campaignHeadline } from '@/domain/enrollmentCampaigns';
import { tokenizePaymentInput } from '@/domain/paymentTokenizer';
import {
  effectiveEnrollmentFeeCents,
  type EnrollmentCampaign,
  type Lead,
  type LeadStatus,
  type MemberContact,
  type Staff,
} from '@/domain/types';
import { deskRepo } from '@/repositories/deskRepo';

type StageFilter = 'open' | LeadStatus;

const STAGES: { key: StageFilter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'tour_scheduled', label: 'Tour' },
  { key: 'follow_up', label: 'Follow up' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const MOVE_TARGETS: LeadStatus[] = ['contacted', 'tour_scheduled', 'follow_up', 'lost'];

export default function LeadsScreen() {
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const { can, theme } = useStaffCapabilities();
  const staffId = session?.userId ?? '';
  const allowed = can('manageLeads');
  const canSell = can('sellMemberships');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<MemberContact[]>([]);
  const [campaign, setCampaign] = useState<EnrollmentCampaign | null>(null);
  const [me, setMe] = useState<Staff | null>(null);
  const [stage, setStage] = useState<StageFilter>('open');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [logFor, setLogFor] = useState<Lead | null>(null);
  const [convertFor, setConvertFor] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState(false);

  const load = useCallback(async () => {
    if (!allowed || !staffId) return;
    const [list, active, staff, allContacts] = await Promise.all([
      deskRepo.listLeads(api, staffId),
      deskRepo.activeCampaign(api),
      api.getStaff(staffId).catch(() => null),
      deskRepo.listContacts(api),
    ]);
    setLeads(list);
    setCampaign(active);
    setMe(staff);
    setContacts(allContacts.filter((c) => c.leadId));
  }, [api, staffId, allowed]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => dialog.alert('Error', 'Could not load leads.'));
    }, [load])
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const inStage = stage === 'open' ? !['won', 'lost'].includes(l.status) : l.status === stage;
      return inStage && (!q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.email.toLowerCase().includes(q));
    });
  }, [leads, stage, query]);

  const move = async (lead: Lead, status: LeadStatus) => {
    try {
      await deskRepo.updateLead(api, lead.id, { status }, staffId);
      await load();
    } catch (e) {
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not update the lead.');
    }
  };

  return (
    <StaffScreen
      subtitle="Sales Pipeline"
      allowed={allowed}
      overlay={
        <>
          <LogContactSheet
            visible={logFor !== null}
            title={`Log call: ${logFor?.name ?? ''}`}
            leadId={logFor?.id}
            defaultPurpose="sales"
            onClose={() => setLogFor(null)}
            onSave={async (input) => {
              await deskRepo.logContact(api, input, staffId);
              setLogFor(null);
              await load();
            }}
          />
          <LeadFormSheet
            visible={newLead}
            onClose={() => setNewLead(false)}
            onSave={async (values) => {
              await deskRepo.createLead(api, { ...values, assignedStaffId: staffId }, staffId);
              setNewLead(false);
              await load();
            }}
          />
          <ConvertLeadSheet
            lead={convertFor}
            campaign={campaign}
            onClose={() => setConvertFor(null)}
            onConvert={async (input) => {
              if (!convertFor) return;
              const result = await deskRepo.convertLead(api, convertFor.id, input, staffId);
              const name = convertFor.name;
              setConvertFor(null);
              dialog.alert(
                'Membership Sold',
                `${name} is now a member. Enrollment fee: $${(result.enrollmentFeeCents / 100).toFixed(2)}${
                  result.campaign ? ` (${result.campaign.name})` : ''
                }.`,
                [{ text: 'OK' }],
                'checkmark'
              );
              await load();
            }}
          />
        </>
      }
    >
      {campaign ? (
        <View style={styles.promo}>
          <Text style={styles.promoText}>{campaignHeadline(campaign)}</Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <ActionButton label="New Lead" icon="add" color={theme.color} onPress={() => setNewLead(true)} />
        <TextField value={query} onChangeText={setQuery} placeholder="Search leads by name, phone or email" autoCapitalize="none" />
        <ChipRow options={STAGES} value={stage} onChange={setStage} />
      </View>

      <SectionCard title="Leads" icon="funnel" accent={theme.color} count={shown.length}>
        {shown.length === 0 ? (
          <EmptyState icon="people-outline" text="No leads in this stage." />
        ) : (
          shown.map((lead) => {
            const expanded = openId === lead.id;
            const history = contacts.filter((c) => c.leadId === lead.id);
            const closed = lead.status === 'won' || lead.status === 'lost';
            return (
              <View key={lead.id} style={{ gap: 8 }}>
                <LeadCard
                  lead={lead}
                  repName={me?.name ?? 'your Y membership rep'}
                  campaign={campaign}
                  onOpen={() => setOpenId(expanded ? null : lead.id)}
                  onLog={() => setLogFor(lead)}
                />
                {expanded ? (
                  <View style={[styles.detail, { borderColor: tc.cardBorder }]}>
                    <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                      Source: {lead.source.replace('_', ' ')} · Added {formatShortDate(lead.createdAt)}
                    </Text>
                    {lead.notes ? <Text style={{ color: tc.text, fontSize: 13 }}>{lead.notes}</Text> : null}
                    {!closed ? (
                      <>
                        <FieldLabel>Move to stage</FieldLabel>
                        <View style={styles.row}>
                          {MOVE_TARGETS.filter((s) => s !== lead.status).map((s) => (
                            <ActionButton
                              key={s}
                              label={LEAD_STATUS_META[s].label}
                              color={LEAD_STATUS_META[s].color}
                              variant="outline"
                              onPress={() => void move(lead, s)}
                            />
                          ))}
                        </View>
                        {canSell ? (
                          <ActionButton label="Convert to Member" icon="ribbon" color="#15803D" onPress={() => setConvertFor(lead)} />
                        ) : null}
                      </>
                    ) : null}
                    <FieldLabel>Contact history</FieldLabel>
                    {history.length === 0 ? (
                      <Text style={{ color: tc.textMuted, fontSize: 12 }}>No contacts logged yet.</Text>
                    ) : (
                      history.map((c) => (
                        <Text key={c.id} style={{ color: tc.text, fontSize: 12 }}>
                          {formatShortDate(c.createdAt)} · {c.staffName} · {c.channel.replace('_', ' ')} · {c.outcome.replace('_', ' ')}
                          {c.notes ? `: ${c.notes}` : ''}
                        </Text>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </SectionCard>
    </StaffScreen>
  );
}

function ConvertLeadSheet({
  lead,
  campaign,
  onClose,
  onConvert,
}: {
  lead: Lead | null;
  campaign: EnrollmentCampaign | null;
  onClose: () => void;
  onConvert: (input: { planId: string; payment: { brand: string; last4: string } }) => Promise<void>;
}) {
  const { colors: tc } = useTheme();
  const [planId, setPlanId] = useState('adult');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (lead) {
      setPlanId(lead.interestPlanId ?? 'adult');
      setNumber('');
      setExpiry('');
      setCvc('');
      setError('');
    }
  }, [lead]);

  const offeredPlans = useAppConfig().config.membershipPlans.filter((p) => p.active);
  const plan = offeredPlans.find((p) => p.id === planId) ?? offeredPlans[0];
  const today = getDemoToday();
  const running = campaign && campaign.active && today >= campaign.startDate && today <= campaign.endDate ? campaign : null;
  const fee = effectiveEnrollmentFeeCents(plan, { campaign: running });
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;

  const submit = async () => {
    const token = tokenizePaymentInput({ cardNumber: number, expiry, cvc });
    if (!token.valid) return setError(token.error ?? 'Check the card details.');
    setBusy(true);
    try {
      await onConvert({ planId: plan.id, payment: { brand: token.brand, last4: token.last4 } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete the sale.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={lead !== null} title={`Sell membership: ${lead?.name ?? ''}`} onClose={onClose}>
      {error ? <ErrorBanner message={error} /> : null}
      <FieldLabel>Plan</FieldLabel>
      <ChipRow options={offeredPlans.map((p) => ({ key: p.id, label: p.name }))} value={plan.id} onChange={setPlanId} />
      <View style={[styles.summary, { borderColor: tc.cardBorder }]}>
        <Text style={{ color: tc.text, fontWeight: '700' }}>
          {plan.name}: {money(plan.monthlyAmountCents)}/mo
        </Text>
        <Text style={{ color: tc.text }}>
          Enrollment fee: {money(fee)}
          {fee < plan.enrollmentFeeCents ? ` (was ${money(plan.enrollmentFeeCents)}${running ? `, ${running.name}` : ''})` : ''}
        </Text>
      </View>
      <TextField label="Card number" value={number} onChangeText={setNumber} keyboardType="number-pad" placeholder="4242 4242 4242 4242" />
      <TextField label="Expiry (MM/YY)" value={expiry} onChangeText={setExpiry} keyboardType="number-pad" placeholder="08/29" />
      <TextField label="CVC" value={cvc} onChangeText={setCvc} keyboardType="number-pad" secureTextEntry placeholder="123" />
      <PrimaryButton title={`Sell for ${money(fee + plan.monthlyAmountCents)} today`} onPress={() => void submit()} loading={busy} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  promo: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 12, padding: 12 },
  promoText: { color: '#92400E', fontWeight: '800', fontSize: 13 },
  detail: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
});
