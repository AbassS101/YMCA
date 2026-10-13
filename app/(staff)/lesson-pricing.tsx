import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { AQUATICS_CLASSES } from '@/domain/aquaticsGuideData';
import { DEFAULT_LESSON_PRICING } from '@/domain/lessonPricing';
import { isAdminRole, type LessonPricing } from '@/domain/types';
import { pricingRepo } from '@/repositories/lessonRepo';
import { radii, spacing, tapTarget } from '@/theme/typography';

type Pair = { full: string; program: string };

const toDollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const DAYS = ['Monday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function LessonPricingScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors } = useTheme();
  const isAdmin = isAdminRole(session?.role);

  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({ t30: '', t60: '', s30: '', s60: '' });
  const [overrides, setOverrides] = useState<Record<string, Pair>>({});
  const [bulk, setBulk] = useState<Pair>({ full: '112', program: '185' });

  const apply = useCallback((p: LessonPricing) => {
    setFields({
      t30: toDollars(p.training[30]),
      t60: toDollars(p.training[60]),
      s30: toDollars(p.swim[30]),
      s60: toDollars(p.swim[60]),
    });
    const next: Record<string, Pair> = {};
    for (const [id, o] of Object.entries(p.swimClassOverrides)) {
      next[id] = { full: toDollars(o.fullCents), program: toDollars(o.programCents) };
    }
    setOverrides(next);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(false);
      apply(await pricingRepo.get(api));
    } catch {
      setError(true);
    }
  }, [api, apply]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = async () => {
    const t30 = toCents(fields.t30);
    const t60 = toCents(fields.t60);
    const s30 = toCents(fields.s30);
    const s60 = toCents(fields.s60);
    if (t30 === null || t60 === null || s30 === null || s60 === null) {
      dialog.show({
        title: 'Check prices',
        message: 'Enter a valid dollar amount (0 or more) for every lesson price.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    const classOverrides: LessonPricing['swimClassOverrides'] = {};
    for (const [id, pair] of Object.entries(overrides)) {
      const full = toCents(pair.full);
      const program = toCents(pair.program);
      if (full !== null && program !== null) {
        classOverrides[id] = { fullCents: full, programCents: program };
      }
    }
    setBusy(true);
    try {
      await pricingRepo.update(api, {
        training: { 30: t30, 60: t60 },
        swim: { 30: s30, 60: s60 },
        swimClassOverrides: classOverrides,
      });
      dialog.show({
        title: 'Pricing saved',
        message: 'New prices apply to bookings made from now on.',
        icon: 'checkmark',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (e) {
      dialog.show({
        title: 'Could not save',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    apply({
      ...DEFAULT_LESSON_PRICING,
      swimClassOverrides: {},
    });
    setBulk({ full: '112', program: '185' });
  };

  const applyBulk = () => {
    if (toCents(bulk.full) === null || toCents(bulk.program) === null) {
      return;
    }
    const next = { ...overrides };
    for (const c of AQUATICS_CLASSES) {
      if (!c.isFree && c.stageCode !== 'Masters') {
        next[c.id] = { ...bulk };
      }
    }
    setOverrides(next);
  };

  const input = (value: string, onChange: (v: string) => void, label: string) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      accessibilityLabel={label}
      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBg }]}
    />
  );

  if (!isAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <YHeader subtitle="Lesson pricing" />
        <Text style={{ color: colors.text, padding: spacing.md, fontSize: 16 }}>
          Only administrators can edit lesson pricing.
        </Text>
      </View>
    );
  }


  const row = (label: string, a: React.ReactNode, b?: React.ReactNode) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]} allowFontScaling>
        {label}
      </Text>
      {a}
      {b}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Lesson pricing" />
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '600' }}>‹ Back</Text>
      </Pressable>
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card title="Private lessons (USD)">
          {row('Personal training 30 min', input(fields.t30, (v) => setFields((f) => ({ ...f, t30: v })), 'Training 30 minute price'))}
          {row('Personal training 60 min', input(fields.t60, (v) => setFields((f) => ({ ...f, t60: v })), 'Training 60 minute price'))}
          {row('Private swim 30 min', input(fields.s30, (v) => setFields((f) => ({ ...f, s30: v })), 'Swim 30 minute price'))}
          {row('Private swim 60 min', input(fields.s60, (v) => setFields((f) => ({ ...f, s60: v })), 'Swim 60 minute price'))}
        </Card>

        <Card title="Swim class defaults">
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Sets every standard 8-week class (not Masters, not the free Friday class). Guide default is $112
            Full / $185 Program.
          </Text>
          {row(
            'Full / Program',
            input(bulk.full, (v) => setBulk((b) => ({ ...b, full: v })), 'Bulk full member price'),
            input(bulk.program, (v) => setBulk((b) => ({ ...b, program: v })), 'Bulk program member price')
          )}
          <SecondaryButton title="Apply to all standard classes" onPress={applyBulk} />
        </Card>

        {DAYS.map((day) => (
          <Card key={day} title={`${day} classes (Full / Program)`}>
            {AQUATICS_CLASSES.filter((c) => c.day === day).map((c) => {
              const o = overrides[c.id];
              const free = Boolean(c.isFree);
              return (
                <View key={c.id} style={{ gap: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} allowFontScaling>
                    {c.startTime} {c.title}
                  </Text>
                  {free ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Free class (always $0)</Text>
                  ) : (
                    <View style={styles.row}>
                      {input(
                        o?.full ?? String(c.fullMemberPrice),
                        (v) =>
                          setOverrides((s) => ({
                            ...s,
                            [c.id]: { full: v, program: s[c.id]?.program ?? String(c.programMemberPrice) },
                          })),
                        `${c.title} full member price`
                      )}
                      {input(
                        o?.program ?? String(c.programMemberPrice),
                        (v) =>
                          setOverrides((s) => ({
                            ...s,
                            [c.id]: { full: s[c.id]?.full ?? String(c.fullMemberPrice), program: v },
                          })),
                        `${c.title} program member price`
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        ))}

        <PrimaryButton title="Save pricing" onPress={() => void save()} loading={busy} />
        <SecondaryButton title="Reset to guide prices" onPress={reset} disabled={busy} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { minHeight: tapTarget, paddingHorizontal: spacing.md, justifyContent: 'center' },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: spacing.xs },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { flex: 1, fontSize: 14 },
  input: {
    flex: 1,
    minWidth: 80,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 16,
  },
});
