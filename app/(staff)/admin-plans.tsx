import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, EmptyState, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor } from '@/context/useConfigEditor';
import { centsFromDollars, dollarsFromCents, newSlugId, optionalWholeNumber, planSubtitleForFee } from '@/domain/adminCenter';
import type { AppConfigPlan } from '@/domain/appConfig';
import { formatCents } from '@/domain/lessonPricing';

type Draft = {
  id?: string;
  name: string;
  price: string;
  fee: string;
  ageRange: string;
  description: string;
  features: string;
  minAge: string;
  maxAge: string;
  active: boolean;
};

const blankDraft = (): Draft => ({
  name: '',
  price: '',
  fee: '',
  ageRange: '',
  description: '',
  features: '',
  minAge: '',
  maxAge: '',
  active: true,
});

const toDraft = (p: AppConfigPlan): Draft => ({
  id: p.id,
  name: p.name,
  price: dollarsFromCents(p.monthlyAmountCents),
  fee: dollarsFromCents(p.enrollmentFeeCents),
  ageRange: p.ageRange,
  description: p.description,
  features: p.features.join('\n'),
  minAge: p.minAge === undefined ? '' : String(p.minAge),
  maxAge: p.maxAge === undefined ? '' : String(p.maxAge),
  active: p.active,
});

export default function AdminPlansScreen() {
  const { colors: tc } = useTheme();
  const { value: plans, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('membershipPlans');
  const [draft, setDraft] = useState<Draft | null>(null);

  const open = (d: Draft) => {
    setError('');
    setDraft(d);
  };

  const submit = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    const price = centsFromDollars(draft.price);
    const fee = centsFromDollars(draft.fee);
    const minAge = optionalWholeNumber(draft.minAge);
    const maxAge = optionalWholeNumber(draft.maxAge);
    if (!name) return setError('Give the plan a name.');
    if (price === null || fee === null) return setError('Enter prices in dollars, like 59 or 59.50.');
    if (Number.isNaN(minAge) || Number.isNaN(maxAge)) return setError('Ages must be whole numbers, or left blank.');
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) return setError('Minimum age cannot be above the maximum age.');
    const features = draft.features.split('\n').map((f) => f.trim()).filter(Boolean);
    const existing = plans.find((p) => p.id === draft.id);
    const fields = {
      name,
      monthlyAmountCents: price,
      enrollmentFeeCents: fee,
      ageRange: draft.ageRange.trim(),
      description: draft.description.trim(),
      features,
      minAge,
      maxAge,
      active: draft.active,
    };
    const next: AppConfigPlan[] = existing
      ? plans.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                ...fields,
                subtitle: planSubtitleForFee(p.subtitle, fee),
                legacyNames: name === p.name ? p.legacyNames : [...(p.legacyNames ?? []), p.name],
              }
            : p
        )
      : [
          ...plans,
          {
            ...fields,
            id: newSlugId(name, plans.map((p) => p.id)),
            subtitle: `${fields.ageRange || 'All ages'} - ${formatCents(fee)} enrollment fee`,
          },
        ];
    if (await save(next, existing ? `${name} was updated.` : `${name} was added.`)) setDraft(null);
  };

  const toggleActive = (plan: AppConfigPlan) => void save(plans.map((p) => (p.id === plan.id ? { ...p, active: !p.active } : p)));

  return (
    <StaffScreen
      subtitle="Membership Plans & Fees"
      allowed={allowed}
      overlay={
        <Sheet visible={draft !== null} title={draft?.id ? 'Edit Plan' : 'New Plan'} onClose={() => setDraft(null)}>
          {error ? <ErrorBanner message={error} /> : null}
          {draft ? (
            <>
              <TextField label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Summer Pass" />
              <TextField label="Monthly price ($)" value={draft.price} onChangeText={(price) => setDraft({ ...draft, price })} keyboardType="decimal-pad" />
              <TextField label="Enrollment fee ($)" value={draft.fee} onChangeText={(fee) => setDraft({ ...draft, fee })} keyboardType="decimal-pad" />
              <TextField label="Age range (shown to members)" value={draft.ageRange} onChangeText={(ageRange) => setDraft({ ...draft, ageRange })} placeholder="18 to 22" />
              <TextField label="Description" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
              <TextField label="Features (one per line)" value={draft.features} onChangeText={(features) => setDraft({ ...draft, features })} multiline />
              <TextField label="Minimum age (optional)" value={draft.minAge} onChangeText={(minAge) => setDraft({ ...draft, minAge })} keyboardType="number-pad" />
              <TextField label="Maximum age (optional)" value={draft.maxAge} onChangeText={(maxAge) => setDraft({ ...draft, maxAge })} keyboardType="number-pad" />
              <FieldLabel>Offered to new members</FieldLabel>
              <ChipRow
                value={draft.active ? 'on' : 'off'}
                onChange={(key) => setDraft({ ...draft, active: key === 'on' })}
                options={[
                  { key: 'on', label: 'Active' },
                  { key: 'off', label: 'Retired' },
                ]}
              />
              <PrimaryButton title="Save Plan" onPress={() => void submit()} loading={busy} />
            </>
          ) : null}
        </Sheet>
      }
    >
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Price and fee changes apply to new sign-ups and plan changes. Existing members keep their current rate. Plans cannot be
        deleted; retire a plan to stop offering it.
      </Text>
      {error && !draft ? <ErrorBanner message={error} /> : null}
      <ActionButton label="Add Plan" icon="add" color={accent} onPress={() => open(blankDraft())} />
      <SectionCard title="Membership Plans" icon="card" accent={accent} count={plans.length}>
        {plans.length === 0 ? (
          <EmptyState icon="card-outline" text="No plans yet." />
        ) : (
          plans.map((p) => (
            <View key={p.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: tc.text }]}>{p.name}</Text>
                  <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                    {formatCents(p.monthlyAmountCents)}/mo · {formatCents(p.enrollmentFeeCents)} enrollment · {p.ageRange}
                    {p.minAge !== undefined || p.maxAge !== undefined ? ` · ages ${p.minAge ?? 0}-${p.maxAge ?? 'up'}` : ''}
                  </Text>
                </View>
                <StatusPill label={p.active ? 'ACTIVE' : 'RETIRED'} color={p.active ? '#15803D' : '#475467'} bg={p.active ? '#DCFCE7' : '#F1F5F9'} />
              </View>
              <View style={styles.chips}>
                <ActionButton label="Edit" icon="pencil" color={tc.primary} variant="outline" onPress={() => open(toDraft(p))} />
                <ActionButton label={p.active ? 'Retire' : 'Reactivate'} color="#B45309" variant="outline" onPress={() => toggleActive(p)} />
              </View>
            </View>
          ))
        )}
      </SectionCard>
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
