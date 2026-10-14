import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, EmptyState, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { isCampaignRunning } from '@/domain/enrollmentCampaigns';
import { type EnrollmentCampaign } from '@/domain/types';
import { deskRepo } from '@/repositories/deskRepo';

type Draft = {
  id?: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  mode: 'waive' | 'percent';
  percent: string;
  planIds: string[];
  active: boolean;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function blankDraft(): Draft {
  const today = getDemoToday();
  return { name: '', description: '', startDate: today, endDate: today, mode: 'waive', percent: '50', planIds: [], active: true };
}

function toDraft(c: EnrollmentCampaign): Draft {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    startDate: c.startDate,
    endDate: c.endDate,
    mode: c.waiveEnrollmentFee ? 'waive' : 'percent',
    percent: String(c.enrollmentFeeDiscountPct ?? 50),
    planIds: c.eligiblePlanIds ?? [],
    active: c.active,
  };
}

export default function CampaignsScreen() {
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const plans = useAppConfig().config.membershipPlans;
  const { canEditSection, theme } = useStaffCapabilities();
  const staffId = session?.userId ?? '';
  const allowed = canEditSection('campaigns');
  const today = getDemoToday();

  const [campaigns, setCampaigns] = useState<EnrollmentCampaign[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setCampaigns(await deskRepo.listCampaigns(api));
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => dialog.alert('Error', 'Could not load campaigns.'));
    }, [load])
  );

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return setError('Give the campaign a name.');
    if (!DATE_RE.test(draft.startDate) || !DATE_RE.test(draft.endDate)) return setError('Use dates like 2026-10-31.');
    const pct = Number(draft.percent);
    if (draft.mode === 'percent' && !(pct > 0 && pct <= 100)) return setError('Enter a discount from 1 to 100.');
    setBusy(true);
    try {
      await deskRepo.saveCampaign(
        api,
        {
          id: draft.id,
          name: draft.name.trim(),
          description: draft.description.trim(),
          startDate: draft.startDate,
          endDate: draft.endDate,
          waiveEnrollmentFee: draft.mode === 'waive',
          enrollmentFeeDiscountPct: draft.mode === 'percent' ? pct : undefined,
          eligiblePlanIds: draft.planIds.length > 0 ? draft.planIds : undefined,
          active: draft.active,
        },
        staffId
      );
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the campaign.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: EnrollmentCampaign) => {
    try {
      await deskRepo.saveCampaign(api, { ...c, active: !c.active }, staffId);
      await load();
    } catch (e) {
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not update the campaign.');
    }
  };

  const remove = (c: EnrollmentCampaign) =>
    dialog.show({
      title: 'Delete campaign?',
      message: `${c.name} will stop applying to new memberships. Existing members keep what they were charged.`,
      icon: 'alert',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deskRepo.deleteCampaign(api, c.id, staffId).then(load);
          },
        },
      ],
    });

  const open = (d: Draft) => {
    setError('');
    setDraft(d);
  };

  return (
    <StaffScreen
      subtitle="Enrollment Campaigns"
      allowed={allowed}
      overlay={
        <Sheet visible={draft !== null} title={draft?.id ? 'Edit Campaign' : 'New Campaign'} onClose={() => setDraft(null)}>
          {error ? <ErrorBanner message={error} /> : null}
          {draft ? (
            <>
              <TextField label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Winter Enrollment: Joining Fee Waived" />
              <TextField label="Description (shown to reps)" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
              <TextField label="Starts (YYYY-MM-DD)" value={draft.startDate} onChangeText={(startDate) => setDraft({ ...draft, startDate })} autoCapitalize="none" />
              <TextField label="Ends (YYYY-MM-DD)" value={draft.endDate} onChangeText={(endDate) => setDraft({ ...draft, endDate })} autoCapitalize="none" />
              <FieldLabel>Offer</FieldLabel>
              <ChipRow
                value={draft.mode}
                onChange={(mode) => setDraft({ ...draft, mode })}
                options={[
                  { key: 'waive', label: 'Waive enrollment fee' },
                  { key: 'percent', label: 'Percent off fee' },
                ]}
              />
              {draft.mode === 'percent' ? (
                <TextField label="Percent off" value={draft.percent} onChangeText={(percent) => setDraft({ ...draft, percent })} keyboardType="number-pad" />
              ) : null}
              <FieldLabel>Eligible plans (none selected = all plans)</FieldLabel>
              <View style={styles.chips}>
                {plans.filter((p) => p.active || draft.planIds.includes(p.id)).map((p) => {
                  const on = draft.planIds.includes(p.id);
                  return (
                    <ActionButton
                      key={p.id}
                      label={p.name}
                      color={theme.color}
                      variant={on ? 'solid' : 'outline'}
                      onPress={() =>
                        setDraft({
                          ...draft,
                          planIds: on ? draft.planIds.filter((id) => id !== p.id) : [...draft.planIds, p.id],
                        })
                      }
                    />
                  );
                })}
              </View>
              <PrimaryButton title="Save Campaign" onPress={() => void save()} loading={busy} />
            </>
          ) : null}
        </Sheet>
      }
    >
      <ActionButton label="New Campaign" icon="add" color={theme.color} onPress={() => open(blankDraft())} />
      <SectionCard
        title="Campaigns"
        icon="pricetags"
        accent={theme.color}
        count={campaigns.length}
        subtitle="The best running offer is applied automatically at sign-up"
      >
        {campaigns.length === 0 ? (
          <EmptyState icon="pricetag-outline" text="No campaigns yet. Create one for your next enrollment month." />
        ) : (
          campaigns.map((c) => {
            const running = isCampaignRunning(c, today);
            const upcoming = c.active && c.startDate > today;
            return (
              <View key={c.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
                <View style={styles.top}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: tc.text }]}>{c.name}</Text>
                    <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                      {c.startDate} to {c.endDate} · {c.waiveEnrollmentFee ? 'Fee waived' : `${c.enrollmentFeeDiscountPct ?? 0}% off fee`} ·{' '}
                      {c.eligiblePlanIds?.length ? `${c.eligiblePlanIds.length} plans` : 'All plans'}
                    </Text>
                  </View>
                  <StatusPill
                    label={running ? 'RUNNING' : upcoming ? 'UPCOMING' : c.active ? 'ENDED' : 'OFF'}
                    color={running ? '#15803D' : upcoming ? '#0369A1' : '#475467'}
                    bg={running ? '#DCFCE7' : upcoming ? '#E0F2FE' : '#F1F5F9'}
                  />
                </View>
                {c.description ? <Text style={{ color: tc.text, fontSize: 13 }}>{c.description}</Text> : null}
                <View style={styles.chips}>
                  <ActionButton label="Edit" icon="pencil" color={tc.primary} variant="outline" onPress={() => open(toDraft(c))} />
                  <ActionButton label={c.active ? 'Turn Off' : 'Turn On'} color="#B45309" variant="outline" onPress={() => void toggleActive(c)} />
                  <ActionButton label="Delete" icon="trash" color="#B42318" variant="outline" onPress={() => remove(c)} />
                </View>
              </View>
            );
          })
        )}
      </SectionCard>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
