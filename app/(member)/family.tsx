import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { MemberCheckInCard } from '@/components/MemberCheckInCard';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import {
  ageBand,
  ageOn,
  bandLabel,
  facilityAccess,
  FACILITY_LABELS,
  type AccessStatus,
  type FacilityKey,
} from '@/domain/householdAccess';
import type { HouseholdView, Member } from '@/domain/types';
import { householdRepo } from '@/repositories/householdRepo';
import { radii, spacing } from '@/theme/typography';

type Draft = { id?: string; name: string; birthDate: string; email: string; allergies: string };
const EMPTY_DRAFT: Draft = { name: '', birthDate: '', email: '', allergies: '' };
const FACILITY_ORDER: FacilityKey[] = ['gym', 'pool', 'groupEx', 'swimLessons', 'childWatch', 'pickleball'];

export default function FamilyScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc } = useTheme();
  const meId = session?.userId ?? '';

  const [household, setHousehold] = useState<HouseholdView | null>(null);
  const [cardFor, setCardFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const today = getDemoToday();
  const isPrimary = household?.primary.id === meId;

  const load = useCallback(async () => {
    if (!meId) return;
    try {
      setHousehold(await householdRepo.get(api, meId));
    } catch {
      setHousehold(null);
    }
  }, [api, meId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const fail = (e: unknown) => {
    const message = e instanceof Error ? e.message : 'Please try again.';
    const needsUpgrade = /upgrade|Family II/i.test(message);
    dialog.show({
      title: needsUpgrade ? 'Plan limit reached' : 'Family plan',
      message,
      icon: 'alert',
      buttons: needsUpgrade
        ? [
            { text: 'Not now', style: 'cancel' },
            { text: 'Change plan', style: 'default', onPress: () => router.push('/(member)/change-membership') },
          ]
        : [{ text: 'OK', style: 'default' }],
    });
  };

  const save = async () => {
    if (!draft || !household) return;
    const name = draft.name.trim();
    const birthDate = draft.birthDate.trim();
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      fail(new Error('Enter a name and a birth date as YYYY-MM-DD.'));
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await householdRepo.update(api, household.primary.id, draft.id, {
          name,
          birthDate,
          allergies: draft.allergies,
        });
      } else {
        await householdRepo.add(api, household.primary.id, {
          name,
          birthDate,
          email: draft.email.trim() || undefined,
          allergies: draft.allergies.trim() || undefined,
        });
      }
      setDraft(null);
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = (m: Member) => {
    dialog.show({
      title: `Remove ${m.name}?`,
      message: 'They will lose access under this plan and their barcode will stop working.',
      icon: 'alert',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                if (!household) return;
                await householdRepo.remove(api, household.primary.id, m.id);
                setDraft(null);
                await load();
              } catch (e) {
                fail(e);
              }
            })();
          },
        },
      ],
    });
  };

  const statusColor = (s: AccessStatus) =>
    s === 'allowed' ? tc.success : s === 'needs_orientation' ? '#B45309' : tc.textMuted;
  const statusIcon = (s: AccessStatus) =>
    s === 'allowed' ? 'checkmark-circle' : s === 'needs_orientation' ? 'alert-circle' : 'close-circle';

  const card = { backgroundColor: tc.cardBg, borderColor: tc.border };
  const draftAge = draft && /^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate.trim()) ? ageOn(draft.birthDate.trim(), today) : null;

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Family & Household" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color={tc.primary} />
          <Text style={{ color: tc.primary, fontWeight: '700' }}>Back</Text>
        </Pressable>

        {!household ? (
          <View style={[styles.card, card]}>
            <Text style={[styles.h2, { color: tc.text }]}>No family plan</Text>
            <Text style={[styles.body, { color: tc.textMuted }]}>
              Family I and Family II plans let one person pay for everyone in the household. Each person gets their own
              barcode ID.
            </Text>
            <Pressable
              onPress={() => router.push('/(member)/join-membership')}
              style={[styles.bigBtn, { backgroundColor: tc.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.bigBtnText}>See family plans</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.card, card]}>
              <Text style={[styles.h1, { color: tc.text }]}>{household.primary.type} plan</Text>
              <Text style={[styles.body, { color: tc.textMuted }]}>
                Paid by {household.primary.name} · {household.members.length}{' '}
                {household.members.length === 1 ? 'person' : 'people'} on the plan
              </Text>
              {isPrimary ? (
                <Pressable
                  onPress={() => setDraft({ ...EMPTY_DRAFT })}
                  style={[styles.bigBtn, { backgroundColor: tc.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add a person to the plan"
                >
                  <Text style={styles.bigBtnText}>Add a person</Text>
                </Pressable>
              ) : null}
            </View>

            {household.members.map((m) => {
              const access = facilityAccess(m, today);
              const band = m.birthDate ? ageBand(m.birthDate, today) : 'adult';
              const needsOrientation = access.gym.status === 'needs_orientation';
              const showing = cardFor === m.id;
              return (
                <View key={m.id} style={[styles.card, card]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.h2, { color: tc.text }]}>
                        {m.name}
                        {m.id === meId ? ' (you)' : ''}
                      </Text>
                      <Text style={[styles.body, { color: tc.textMuted }]}>
                        {m.householdRole === 'primary' ? 'Primary · ' : ''}
                        {m.birthDate ? `${ageOn(m.birthDate, today)} yrs · ` : ''}
                        {bandLabel(band)} · ID #{m.membershipId}
                        {m.hasLogin ? '' : ' · no separate login'}
                      </Text>
                    </View>
                    {isPrimary && m.id !== household.primary.id ? (
                      <Pressable
                        onPress={() =>
                          setDraft({
                            id: m.id,
                            name: m.name,
                            birthDate: m.birthDate ?? '',
                            email: m.email,
                            allergies: m.allergies ?? '',
                          })
                        }
                        hitSlop={8}
                        accessibilityLabel={`Edit ${m.name}`}
                      >
                        <Ionicons name="create-outline" size={20} color={tc.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.badges}>
                    {FACILITY_ORDER.filter((k) => !(k === 'childWatch' && band !== 'child')).map((k) => (
                      <View key={k} style={[styles.badge, { borderColor: statusColor(access[k].status) }]}>
                        <Ionicons name={statusIcon(access[k].status)} size={13} color={statusColor(access[k].status)} />
                        <Text style={{ color: statusColor(access[k].status), fontSize: 12, fontWeight: '700' }}>
                          {FACILITY_LABELS[k]}
                          {access[k].status === 'needs_orientation' ? ': orientation first' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {needsOrientation ? (
                    <View style={styles.orientation}>
                      <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 13 }}>
                        Ages 13-17 can use the gym after an orientation with a trainer. Book one to unlock the fitness
                        center and a scannable card.
                      </Text>
                      <Pressable
                        onPress={() => router.push('/(member)/(tabs)/staff')}
                        accessibilityRole="button"
                        accessibilityLabel="Book gym orientation with a trainer"
                      >
                        <Text style={{ color: tc.primary, fontWeight: '800' }}>Book orientation with a trainer</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => setCardFor(showing ? null : m.id)}
                    style={[styles.bigBtn, { backgroundColor: showing ? tc.border : tc.primary }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.bigBtnText, showing && { color: tc.text }]}>
                      {showing ? 'Hide card' : `Show ${m.name.split(' ')[0]}'s card`}
                    </Text>
                  </Pressable>
                  {showing ? <MemberCheckInCard member={m} primaryName={household.primary.name} /> : null}
                </View>
              );
            })}

            {!isPrimary ? (
              <Text style={[styles.body, { color: tc.textMuted }]}>
                Only {household.primary.name} can add or remove people and manage billing.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: tc.cardBg }]}>
            <Text style={[styles.h1, { color: tc.text }]}>{draft?.id ? 'Edit person' : 'Add a person'}</Text>
            <TextField
              label="Full name"
              value={draft?.name ?? ''}
              onChangeText={(t) => setDraft((d) => (d ? { ...d, name: t } : d))}
              autoCapitalize="words"
            />
            <TextField
              label="Birth date (YYYY-MM-DD)"
              value={draft?.birthDate ?? ''}
              onChangeText={(t) => setDraft((d) => (d ? { ...d, birthDate: t } : d))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!draft?.id && draftAge !== null && draftAge >= 13 ? (
              <TextField
                label="Email (optional, gives them their own login)"
                value={draft?.email ?? ''}
                onChangeText={(t) => setDraft((d) => (d ? { ...d, email: t } : d))}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            ) : null}
            <TextField
              label="Allergies / notes (optional)"
              value={draft?.allergies ?? ''}
              onChangeText={(t) => setDraft((d) => (d ? { ...d, allergies: t } : d))}
            />
            {draftAge !== null ? (
              <Text style={[styles.body, { color: tc.textMuted }]}>
                {draftAge < 13
                  ? 'Under 13: pool, swim lessons and Child Watch. No gym. Their card shows in your app.'
                  : draftAge < 18
                    ? 'Ages 13-17: pool and classes now, gym after an orientation with a trainer. Gets their own card.'
                    : 'Adult: full access under the plan, with their own card.'}
              </Text>
            ) : null}
            <Pressable
              onPress={() => void save()}
              disabled={saving}
              style={[styles.bigBtn, { backgroundColor: tc.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.bigBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
            {draft?.id && household ? (
              <Pressable
                onPress={() => {
                  const m = household.members.find((x) => x.id === draft.id);
                  if (m) confirmRemove(m);
                }}
                style={styles.linkBtn}
              >
                <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Remove from plan</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setDraft(null)} style={styles.linkBtn}>
              <Text style={{ color: tc.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: 12, paddingBottom: 110 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: { borderWidth: 1, borderRadius: radii.card, padding: 14, gap: 8 },
  h1: { fontSize: 20, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  orientation: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
  bigBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  bigBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { padding: 16, gap: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});
