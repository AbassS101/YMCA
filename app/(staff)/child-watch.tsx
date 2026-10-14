import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import {
  MAX_MINUTES_PER_DAY,
  ROOM_CAPACITY,
  demoNow,
  describeStatus,
  formatAge,
  getStatusAt,
  minutesUsedToday,
} from '@/domain/childWatch';
import type { ChildProfile, ChildWatchVisit, Member } from '@/domain/types';
import { childWatchRepo } from '@/repositories/childWatchRepo';
import { arrivalRepo } from '@/repositories/arrivalRepo';
import { radii, spacing } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

export default function StaffChildWatchScreen() {
  const router = useRouter();
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const { can } = useStaffCapabilities();
  const staffId = session?.userId ?? 'staff';

  const [now, setNow] = useState(demoNow());
  const [visits, setVisits] = useState<ChildWatchVisit[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const [selectedDesk, setSelectedDesk] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setNow(demoNow());
    const [v, kids, all] = await Promise.all([
      childWatchRepo.allVisits(),
      api.listAllMembers(BRANCH_ID).then(async (ms) => {
        const lists = await Promise.all(ms.map((m) => childWatchRepo.listChildren(m.id)));
        // Every adult in a household sees the same children, so de-duplicate by child id.
        return Array.from(new Map(lists.flat().map((c) => [c.id, c])).values());
      }),
      api.listAllMembers(BRANCH_ID),
    ]);
    setVisits(v);
    setChildren(kids);
    setMembers(all);
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const childById = useMemo(() => new Map(children.map((c) => [c.id, c])), [children]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const active = visits.filter((v) => !v.signedOutAt);
  const status = getStatusAt(now);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => !childById.has(m.id))
      .filter((m) => m.name.toLowerCase().includes(q) || m.membershipId.toLowerCase().includes(q))
      .slice(0, 5);
  }, [members, query, childById]);

  const fail = (e: unknown) =>
    dialog.show({
      title: 'Child Watch',
      message: e instanceof Error ? e.message : 'Please try again.',
      icon: 'alert',
      buttons: [{ text: 'OK', style: 'default' }],
    });

  const pick = async (m: Member) => {
    setSelected(m);
    setQuery('');
    setSelectedDesk(await childWatchRepo.hasDeskCheckInToday(m.id));
  };

  const deskCheckIn = async () => {
    if (!selected) return;
    try {
      await arrivalRepo.checkIn(api, selected.id, {
        source: 'child_watch',
        staffId,
        note: 'Front desk check-in',
      });
      setSelectedDesk(true);
    } catch (e) {
      fail(e);
    }
  };

  const signIn = async (child: ChildProfile) => {
    try {
      const visit = await childWatchRepo.signIn(child.id, staffId);
      dialog.alert('Signed in', `${child.firstName} is signed in. Pickup code: ${visit.pickupCode}`);
    } catch (e) {
      fail(e);
    }
    await load();
  };

  const signOut = async (visit: ChildWatchVisit) => {
    try {
      await childWatchRepo.signOut(visit.id, staffId, { pickupCode: codes[visit.id], requireCode: true });
      setCodes((c) => ({ ...c, [visit.id]: '' }));
    } catch (e) {
      fail(e);
    }
    await load();
  };

  if (!can('checkIn')) {
    return (
      <View style={[styles.screen, { backgroundColor: tc.background }]}>
        <YHeader subtitle="Child Watch" />
        <Text style={[styles.body, { color: tc.text, padding: spacing.md }]}>
          You do not have access to Child Watch.
        </Text>
      </View>
    );
  }

  const card = { backgroundColor: tc.cardBg, borderColor: tc.border };
  const selectedKids = selected ? children.filter((c) => c.memberId === selected.id) : [];

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Child Watch Room" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color={tc.primary} />
          <Text style={{ color: tc.primary, fontWeight: '700' }}>Back</Text>
        </Pressable>

        <View style={[styles.card, card]}>
          <Text style={[styles.h1, { color: tc.text }]}>{describeStatus(status)}</Text>
          <Text style={[styles.body, { color: tc.text }]}>
            In the room: {active.length} of {ROOM_CAPACITY}
          </Text>
          <View style={[styles.meterTrack, { backgroundColor: tc.border }]}>
            <View
              style={[
                styles.meterFill,
                { width: `${Math.min(100, (active.length / ROOM_CAPACITY) * 100)}%`, backgroundColor: tc.primary },
              ]}
            />
          </View>
        </View>

        <Text style={[styles.h1, { color: tc.text }]}>Room roster</Text>
        {active.length === 0 ? <Text style={[styles.body, { color: tc.textMuted }]}>No children signed in.</Text> : null}
        {active.map((v) => {
          const child = childById.get(v.childId);
          const parent = memberById.get(v.memberId);
          const used = minutesUsedToday(visits, v.childId, now);
          const closingSoon =
            status.state !== 'closed' && status.closesAt.getTime() - now.getTime() <= 10 * 60000;
          const overdue = used >= MAX_MINUTES_PER_DAY;
          return (
            <View key={v.id} style={[styles.card, card]}>
              <Text style={[styles.h2, { color: tc.text }]}>
                {child ? `${child.firstName} ${child.lastName}` : 'Unknown child'}
                {child ? ` · ${formatAge(child.birthDate, now)}` : ''}
              </Text>
              <Text style={[styles.body, { color: tc.textMuted }]}>
                Parent: {parent?.name ?? v.memberId} · {used}/{MAX_MINUTES_PER_DAY} min
              </Text>
              {child?.allergies ? <Text style={styles.warn}>Allergies: {child.allergies}</Text> : null}
              {overdue ? <Text style={styles.danger}>OVER 2 HOURS – parent pickup needed</Text> : null}
              {!overdue && closingSoon ? <Text style={styles.warn}>Room closing soon</Text> : null}
              <View style={styles.row}>
                <TextInput
                  value={codes[v.id] ?? ''}
                  onChangeText={(t) => setCodes((c) => ({ ...c, [v.id]: t }))}
                  placeholder="Pickup code"
                  placeholderTextColor={tc.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: tc.text, borderColor: tc.border }]}
                />
                <Pressable onPress={() => void signOut(v)} style={[styles.btn, { backgroundColor: '#B45309' }]} accessibilityRole="button">
                  <Text style={styles.btnText}>Sign Out</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={[styles.h1, { color: tc.text }]}>Sign a child in</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search member name or ID"
          placeholderTextColor={tc.textMuted}
          autoCapitalize="none"
          style={[styles.input, { color: tc.text, borderColor: tc.border }]}
        />
        {results.map((m) => (
          <Pressable key={m.id} onPress={() => void pick(m)} style={[styles.card, card]} accessibilityRole="button">
            <Text style={[styles.h2, { color: tc.text }]}>{m.name}</Text>
            <Text style={[styles.body, { color: tc.textMuted }]}>#{m.membershipId}</Text>
          </Pressable>
        ))}

        {selected ? (
          <View style={[styles.card, card]}>
            <Text style={[styles.h2, { color: tc.text }]}>{selected.name}</Text>
            {selectedDesk ? (
              <Text style={[styles.body, { color: tc.success }]}>Checked in at the desk today</Text>
            ) : (
              <Pressable onPress={() => void deskCheckIn()} style={[styles.btn, { backgroundColor: tc.primary }]} accessibilityRole="button">
                <Text style={styles.btnText}>Check in at desk</Text>
              </Pressable>
            )}
            {selectedKids.length === 0 ? (
              <Text style={[styles.body, { color: tc.textMuted }]}>No children on file.</Text>
            ) : null}
            {selectedKids.map((c) => {
              const inRoom = active.some((v) => v.childId === c.id);
              return (
                <View key={c.id} style={styles.rowBetween}>
                  <Text style={[styles.body, { color: tc.text, flex: 1 }]}>
                    {c.firstName} · {formatAge(c.birthDate, now)}
                  </Text>
                  <Pressable
                    onPress={() => void signIn(c)}
                    disabled={inRoom}
                    style={[styles.btn, { backgroundColor: inRoom ? tc.border : tc.primary }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.btnText}>{inRoom ? 'In room' : 'Sign In'}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: 10, paddingBottom: 110 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: { borderWidth: 1, borderRadius: radii.card, padding: 14, gap: 6 },
  h1: { fontSize: 18, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  warn: { color: '#B45309', fontWeight: '700', fontSize: 13 },
  danger: { color: '#B91C1C', fontWeight: '800', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  meterTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  meterFill: { height: 8 },
});
