import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { centsFromDollars, dollarsFromCents, newSlugId } from '@/domain/adminCenter';
import type { DonationImpactTier } from '@/domain/types';

type TierDraft = { orig: DonationImpactTier | null; amount: string; title: string; impactText: string };
type FundDraft = { id: string | null; name: string };

export default function AdminGuestDonationsScreen() {
  const { colors: tc } = useTheme();
  const guests = useConfigEditor('guestPasses');
  const gifts = useConfigEditor('donations');
  const allowed = guests.allowed && gifts.allowed;

  const [pass, setPass] = useDraftFrom(guests.value, (g) => ({
    passes: String(g.complimentaryPassesPerYear),
    adultPrice: dollarsFromCents(g.dayPassAdultCents),
    youthPrice: dollarsFromCents(g.dayPassYouthSeniorCents),
    windowHours: String(g.conversionWindowHours),
    validText: g.validUntilLabel,
  }));
  const { passes, adultPrice, youthPrice, windowHours, validText } = pass;
  const [gift, setGift] = useDraftFrom(gifts.value, (d) => ({
    tiers: d.tiers.map((t): TierDraft => ({ orig: t, amount: dollarsFromCents(t.amountCents), title: t.title, impactText: t.impactText })),
    funds: d.funds.map((f): FundDraft => ({ id: f.id, name: f.name })),
    minimum: dollarsFromCents(d.minimumGiftCents),
    roundUp: d.roundUpOptionsCents.map(dollarsFromCents).join(', '),
  }));
  const { tiers, funds, minimum, roundUp } = gift;
  const setTiers = (next: TierDraft[]) => setGift({ ...gift, tiers: next });
  const setFunds = (next: FundDraft[]) => setGift({ ...gift, funds: next });

  const saveGuests = async () => {
    const adult = centsFromDollars(adultPrice);
    const youth = centsFromDollars(youthPrice);
    if (adult === null || youth === null) return guests.setError('Enter day pass prices in dollars, like 15 or 15.50.');
    if (!/^\d+$/.test(passes.trim()) || !/^\d+$/.test(windowHours.trim())) {
      return guests.setError('Passes per year and the conversion window must be whole numbers.');
    }
    await guests.save(
      {
        complimentaryPassesPerYear: Number(passes),
        dayPassAdultCents: adult,
        dayPassYouthSeniorCents: youth,
        conversionWindowHours: Number(windowHours),
        validUntilLabel: validText.trim(),
      },
      'Guest pass settings were updated.'
    );
  };

  const saveDonations = async () => {
    const minimumGiftCents = centsFromDollars(minimum);
    if (minimumGiftCents === null || minimumGiftCents === 0) return gifts.setError('Enter the minimum gift in dollars, like 5.');
    const roundUpOptionsCents = roundUp.split(',').filter((t) => t.trim() !== '').map(centsFromDollars);
    if (roundUpOptionsCents.some((c) => c === null)) return gifts.setError('Enter membership add-on amounts in dollars, like 5, 10, 25.');
    const nextTiers: DonationImpactTier[] = [];
    for (const t of tiers) {
      const cents = centsFromDollars(t.amount);
      if (cents === null) return gifts.setError('Enter tier amounts in dollars, like 50.');
      nextTiers.push({ ...(t.orig ?? {}), amountCents: cents, title: t.title.trim(), impactText: t.impactText.trim() });
    }
    const taken = funds.flatMap((f) => (f.id ? [f.id] : []));
    const nextFunds = funds.map((f) => {
      const id = f.id ?? newSlugId(f.name, taken);
      if (!f.id) taken.push(id);
      return { id, name: f.name.trim() };
    });
    await gifts.save(
      { tiers: nextTiers, funds: nextFunds, minimumGiftCents, roundUpOptionsCents: roundUpOptionsCents as number[] },
      'Donation settings were updated.'
    );
  };

  const setTier = (i: number, patch: Partial<TierDraft>) => setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <StaffScreen subtitle="Guest Passes & Donations" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Prices are in dollars. Passes already issued and gifts already made are not changed.
      </Text>

      <SectionCard title="Guest & Day Passes" icon="ticket" accent={guests.accent}>
        {guests.error ? <ErrorBanner message={guests.error} /> : null}
        <TextField label="Complimentary guest passes per member per year" value={passes} onChangeText={(passes) => setPass({ ...pass, passes })} keyboardType="number-pad" />
        <TextField label="Adult day pass ($)" value={adultPrice} onChangeText={(adultPrice) => setPass({ ...pass, adultPrice })} keyboardType="decimal-pad" />
        <TextField label="Youth / senior day pass ($)" value={youthPrice} onChangeText={(youthPrice) => setPass({ ...pass, youthPrice })} keyboardType="decimal-pad" />
        <TextField label="Guest-to-member conversion window (hours)" value={windowHours} onChangeText={(windowHours) => setPass({ ...pass, windowHours })} keyboardType="number-pad" />
        <TextField label="Pass validity text" value={validText} onChangeText={(validText) => setPass({ ...pass, validText })} />
        <PrimaryButton title="Save Guest Passes" onPress={() => void saveGuests()} loading={guests.busy} />
        <ActionButton label="Reset guest passes to defaults" icon="refresh" color="#B42318" variant="outline" onPress={guests.resetToDefaults} />
      </SectionCard>

      <SectionCard title="Donation Tiers" icon="heart" accent={gifts.accent} count={tiers.length}>
        {gifts.error ? <ErrorBanner message={gifts.error} /> : null}
        {tiers.map((t, i) => (
          <View key={i} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <TextField label="Amount ($)" value={t.amount} onChangeText={(amount) => setTier(i, { amount })} keyboardType="decimal-pad" />
            <TextField label="Title" value={t.title} onChangeText={(title) => setTier(i, { title })} />
            <TextField label="Impact text" value={t.impactText} onChangeText={(impactText) => setTier(i, { impactText })} multiline />
            <ActionButton label="Remove tier" icon="trash" color="#B42318" variant="outline" onPress={() => setTiers(tiers.filter((_, j) => j !== i))} />
          </View>
        ))}
        <ActionButton
          label="Add tier"
          icon="add"
          color={gifts.accent}
          variant="outline"
          onPress={() => setTiers([...tiers, { orig: null, amount: '', title: '', impactText: '' }])}
        />
      </SectionCard>

      <SectionCard title="Gift Settings" icon="options" accent={gifts.accent}>
        <TextField label="Minimum gift ($)" value={minimum} onChangeText={(minimum) => setGift({ ...gift, minimum })} keyboardType="decimal-pad" />
        <TextField label="Monthly add-on options when joining ($, comma-separated)" value={roundUp} onChangeText={(roundUp) => setGift({ ...gift, roundUp })} placeholder="5, 10, 25" />
      </SectionCard>

      <SectionCard title="Funds" icon="wallet" accent={gifts.accent} count={funds.length} subtitle="Donors choose where their gift goes. Fund ids stay fixed.">
        {funds.map((f, i) => (
          <TextField
            key={f.id ?? `new-${i}`}
            label={f.id ? `Fund (${f.id})` : 'New fund'}
            value={f.name}
            onChangeText={(name) => setFunds(funds.map((x, j) => (j === i ? { ...x, name } : x)))}
          />
        ))}
        <ActionButton label="Add fund" icon="add" color={gifts.accent} variant="outline" onPress={() => setFunds([...funds, { id: null, name: '' }])} />
      </SectionCard>

      <PrimaryButton title="Save Donations" onPress={() => void saveDonations()} loading={gifts.busy} />
      <ActionButton label="Reset donations to defaults" icon="refresh" color="#B42318" variant="outline" onPress={gifts.resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
});
