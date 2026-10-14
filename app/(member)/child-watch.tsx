import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  CHILD_WATCH_INFO,
  MAX_MINUTES_PER_DAY,
  ageInWeeks,
  demoNow,
  describeStatus,
  formatAge,
  getStatusAt,
  minutesUsedToday,
  MIN_AGE_WEEKS,
} from '@/domain/childWatch';
import type { ChildProfile, ChildWatchVisit } from '@/domain/types';
import { childWatchRepo } from '@/repositories/childWatchRepo';
import { radii, spacing } from '@/theme/typography';

type Draft = { id?: string; firstName: string; lastName: string; birthDate: string; allergies: string };
const EMPTY_DRAFT: Draft = { firstName: '', lastName: '', birthDate: '', allergies: '' };

export default function ChildWatchScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { colors: tc } = useTheme();
  const memberId = session?.userId ?? '';

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [visits, setVisits] = useState<ChildWatchVisit[]>([]);
  const [deskCheckedIn, setDeskCheckedIn] = useState(false);
  const [now, setNow] = useState(demoNow());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    if (memberId === '') return;
    setNow(demoNow());
    const [kids, v, desk] = await Promise.all([
      childWatchRepo.listChildren(memberId),
      childWatchRepo.allVisits(),
      childWatchRepo.hasDeskCheckInToday(memberId),
    ]);
    setChildren(kids);
    setVisits(v);
    setDeskCheckedIn(desk);
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const status = useMemo(() => getStatusAt(now), [now]);
  const statusColor = status.state === 'open' ? tc.success : status.state === 'signInClosed' ? '#D97706' : tc.textMuted;

  const fail = (e: unknown) =>
    dialog.show({
      title: 'Child Watch',
      message: e instanceof Error ? e.message : 'Please try again.',
      icon: 'alert',
      buttons: [{ text: 'OK', style: 'default' }],
    });

  const onSignIn = async (child: ChildProfile) => {
    setBusyId(child.id);
    try {
      const visit = await childWatchRepo.signIn(child.id, 'member');
      dialog.show({
        title: `${child.firstName} is signed in`,
        message: `Pickup code: ${visit.pickupCode}\n\nMaximum of 2 hours per day. Parents must remain in the building.`,
        icon: 'checkmark',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const onSignOut = async (visit: ChildWatchVisit) => {
    setBusyId(visit.childId);
    try {
      await childWatchRepo.signOut(visit.id, 'member');
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    const first = draft.firstName.trim();
    if (first === '' || !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate.trim())) {
      fail(new Error('Enter a first name and a birth date as YYYY-MM-DD.'));
      return;
    }
    if (ageInWeeks(draft.birthDate.trim(), now) < 0) {
      fail(new Error('Birth date cannot be in the future.'));
      return;
    }
    try {
      await childWatchRepo.saveChild({
        id: draft.id,
        memberId,
        firstName: first,
        lastName: draft.lastName.trim(),
        birthDate: draft.birthDate.trim(),
        allergies: draft.allergies.trim() || undefined,
      });
      setDraft(null);
      await load();
    } catch (e) {
      fail(e);
    }
  };

  const removeChild = async (child: ChildProfile) => {
    try {
      await childWatchRepo.removeChild(child.id);
      setDraft(null);
      await load();
    } catch (e) {
      fail(e);
    }
  };

  const card = { backgroundColor: tc.cardBg, borderColor: tc.border };

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Child Watch" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color={tc.primary} />
          <Text style={{ color: tc.primary, fontWeight: '700' }}>Back</Text>
        </Pressable>

        <View style={[styles.statusBanner, { borderColor: statusColor, backgroundColor: tc.cardBg }]}>
          <Ionicons name="happy-outline" size={26} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{describeStatus(status)}</Text>
        </View>

        <View style={[styles.card, card]}>
          <Text style={[styles.h1, { color: tc.text }]}>{CHILD_WATCH_INFO.title}</Text>
          <Text style={[styles.body, { color: tc.text }]}>{CHILD_WATCH_INFO.intro}</Text>
          <Text style={[styles.h2, { color: tc.text }]}>{CHILD_WATCH_INFO.ages}</Text>
          {CHILD_WATCH_INFO.hoursLines.map((l) => (
            <Text key={l} style={[styles.body, { color: tc.text }]}>
              {l}
            </Text>
          ))}
          <Text style={[styles.body, { color: tc.textMuted }]}>{CHILD_WATCH_INFO.closedLine}</Text>
          <Text style={[styles.body, { color: tc.text, fontWeight: '700' }]}>{CHILD_WATCH_INFO.cutoff}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: tc.primaryLight, borderColor: tc.primary }]}>
          <Text style={[styles.h2, { color: tc.primaryDark }]}>{CHILD_WATCH_INFO.noteTitle}</Text>
          <Text style={[styles.body, { color: tc.primaryDark }]}>{CHILD_WATCH_INFO.note}</Text>
        </View>

        <View style={[styles.card, card]}>
          <Text style={[styles.body, { color: tc.text }]}>
            {CHILD_WATCH_INFO.contactText}
            <Text
              style={{ color: tc.primary, fontWeight: '700' }}
              onPress={() => void Linking.openURL(`mailto:${CHILD_WATCH_INFO.contactEmail}`)}
              accessibilityRole="link"
            >
              {CHILD_WATCH_INFO.contactEmail}
            </Text>
            .
          </Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={[styles.h1, { color: tc.text }]}>My Kids</Text>
          <Pressable
            onPress={() => setDraft({ ...EMPTY_DRAFT })}
            style={[styles.smallBtn, { backgroundColor: tc.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Add child"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.smallBtnText}>Add child</Text>
          </Pressable>
        </View>

        {!deskCheckedIn ? (
          <Text style={[styles.warn]}>Check in at the Y Membership Desk first, then you can sign your kids in.</Text>
        ) : null}

        {children.length === 0 ? (
          <Text style={[styles.body, { color: tc.textMuted }]}>No children added yet.</Text>
        ) : null}

        {children.map((child) => {
          const active = visits.find((v) => v.childId === child.id && !v.signedOutAt);
          const used = minutesUsedToday(visits, child.id, now);
          const left = Math.max(0, MAX_MINUTES_PER_DAY - used);
          const tooYoung = ageInWeeks(child.birthDate, now) < MIN_AGE_WEEKS;
          const canSignIn = status.state === 'open' && deskCheckedIn && !tooYoung && left > 0;
          return (
            <View key={child.id} style={[styles.card, card]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.h2, { color: tc.text }]}>
                    {child.firstName} {child.lastName}
                  </Text>
                  <Text style={[styles.body, { color: tc.textMuted }]}>
                    {formatAge(child.birthDate, now)} · {left} min left today
                    {child.allergies ? ` · Allergies: ${child.allergies}` : ''}
                  </Text>
                  {active ? (
                    <Text style={[styles.body, { color: tc.success, fontWeight: '700' }]}>
                      In Child Watch · pickup code {active.pickupCode}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => setDraft({ id: child.id, firstName: child.firstName, lastName: child.lastName, birthDate: child.birthDate, allergies: child.allergies ?? '' })} hitSlop={8} accessibilityLabel={`Edit ${child.firstName}`}>
                  <Ionicons name="create-outline" size={20} color={tc.textMuted} />
                </Pressable>
              </View>
              {active ? (
                <Pressable
                  onPress={() => void onSignOut(active)}
                  disabled={busyId === child.id}
                  style={[styles.bigBtn, { backgroundColor: '#B45309' }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.bigBtnText}>Sign Out</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void onSignIn(child)}
                  disabled={!canSignIn || busyId === child.id}
                  style={[styles.bigBtn, { backgroundColor: canSignIn ? tc.primary : tc.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSignIn }}
                >
                  <Text style={styles.bigBtnText}>Sign In</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: tc.cardBg }]}>
            <Text style={[styles.h1, { color: tc.text }]}>{draft?.id ? 'Edit child' : 'Add child'}</Text>
            {(
              [
                ['firstName', 'First name'],
                ['lastName', 'Last name'],
                ['birthDate', 'Birth date (YYYY-MM-DD)'],
                ['allergies', 'Allergies (optional)'],
              ] as const
            ).map(([key, label]) => (
              <TextInput
                key={key}
                value={draft?.[key] ?? ''}
                onChangeText={(t) => setDraft((d) => (d ? { ...d, [key]: t } : d))}
                placeholder={label}
                placeholderTextColor={tc.textMuted}
                style={[styles.input, { color: tc.text, borderColor: tc.border }]}
                autoCapitalize={key === 'birthDate' ? 'none' : 'words'}
              />
            ))}
            <Pressable onPress={() => void saveDraft()} style={[styles.bigBtn, { backgroundColor: tc.primary }]} accessibilityRole="button">
              <Text style={styles.bigBtnText}>Save</Text>
            </Pressable>
            {draft?.id ? (
              <Pressable
                onPress={() => {
                  const c = children.find((k) => k.id === draft.id);
                  if (c) void removeChild(c);
                }}
                style={styles.linkBtn}
              >
                <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Remove child</Text>
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
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radii.card, borderWidth: 2 },
  statusText: { fontSize: 16, fontWeight: '800', flex: 1 },
  card: { borderWidth: 1, borderRadius: radii.card, padding: 14, gap: 6 },
  h1: { fontSize: 20, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  warn: { color: '#B45309', fontWeight: '700', fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  smallBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  bigBtn: { marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  bigBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { padding: 18, gap: 10, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
