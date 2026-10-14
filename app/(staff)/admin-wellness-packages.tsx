import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { centsFromDollars, dollarsFromCents } from '@/domain/adminCenter';

type TierDraft = { branch: string; community: string; badge: string; note: string };

const dollars = (n: number) => dollarsFromCents(Math.round(n * 100));
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function AdminWellnessPackagesScreen() {
  const { colors: tc } = useTheme();
  const { value: programs, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('wellnessPackages');
  // drafts[programIndex][tierIndex]
  const [drafts, setDrafts] = useDraftFrom(programs, (list) =>
    list.map((p) =>
      p.tiers.map((t): TierDraft => ({
        branch: dollars(t.branchMemberPrice),
        community: dollars(t.communityMemberPrice),
        badge: t.badge ?? '',
        note: t.savingsNote ?? '',
      }))
    )
  );

  const setTier = (pi: number, ti: number, patch: Partial<TierDraft>) =>
    setDrafts(drafts.map((tiers, i) => (i === pi ? tiers.map((t, j) => (j === ti ? { ...t, ...patch } : t)) : tiers)));

  const submit = async () => {
    const next = [];
    for (const [pi, p] of programs.entries()) {
      const tiers = [];
      for (const [ti, t] of p.tiers.entries()) {
        const d = drafts[pi]?.[ti];
        const branch = d && centsFromDollars(d.branch);
        const community = d && centsFromDollars(d.community);
        if (!d || branch === null || community === null) return setError(`${p.shortTitle}, ${t.sessions} session(s): enter prices in dollars, like 55 or 42.50.`);
        // Per-session rates follow from the package totals.
        const perBranch = round2(branch / 100 / t.sessions);
        const perCommunity = round2(community / 100 / t.sessions);
        tiers.push({
          ...t,
          branchMemberPrice: branch / 100,
          communityMemberPrice: community / 100,
          branchMemberPerSession: perBranch,
          communityMemberPerSession: perCommunity,
          ...(t.branchMemberPerPersonPerSession !== undefined && { branchMemberPerPersonPerSession: round2(perBranch / 2) }),
          ...(t.communityMemberPerPersonPerSession !== undefined && { communityMemberPerPersonPerSession: round2(perCommunity / 2) }),
          badge: d.badge.trim() || undefined,
          savingsNote: d.note.trim() || undefined,
        });
      }
      next.push({ ...p, tiers });
    }
    await save(next, 'Wellness packages were updated.');
  };

  return (
    <StaffScreen subtitle="Wellness Packages" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Package totals are in dollars; per-session rates are worked out from them. Update the badge and savings note when a price
        changes. Packages already purchased keep what was paid.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      {programs.map((p, pi) => (
        <SectionCard key={p.id} title={p.title} icon="fitness" accent={accent} count={p.tiers.length}>
          {p.tiers.map((t, ti) => {
            const d = drafts[pi]?.[ti];
            if (!d) return null;
            return (
              <View key={t.sessions} style={[styles.card, { borderColor: tc.cardBorder }]}>
                <Text style={[styles.name, { color: tc.text }]}>
                  {t.sessions} {t.sessions === 1 ? 'session' : 'sessions'}
                </Text>
                <TextField label="Branch member total ($)" value={d.branch} onChangeText={(branch) => setTier(pi, ti, { branch })} keyboardType="decimal-pad" />
                <TextField label="Community member total ($)" value={d.community} onChangeText={(community) => setTier(pi, ti, { community })} keyboardType="decimal-pad" />
                <TextField label="Badge (optional)" value={d.badge} onChangeText={(badge) => setTier(pi, ti, { badge })} />
                <TextField label="Savings note (optional)" value={d.note} onChangeText={(note) => setTier(pi, ti, { note })} />
              </View>
            );
          })}
        </SectionCard>
      ))}
      <PrimaryButton title="Save Wellness Packages" onPress={() => void submit()} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  name: { fontSize: 15, fontWeight: '800' },
});
