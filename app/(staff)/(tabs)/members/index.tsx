import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { formatShortDate } from '@/domain/displayDates';
import type { Member, Membership } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { membershipRepo } from '@/repositories/membershipRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type MemberRow = { member: Member; membership: Membership };

function statusLabel(status: Member['status']): string {
  return status === 'active' ? 'Active' : 'Cancellation pending';
}

export default function StaffMembersScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      const members = await api.listAssignedMembers(staffId);
      const withMembership = await Promise.all(
        members.map(async (member) => ({
          member,
          membership: await membershipRepo.getMembership(api, member.id),
        }))
      );
      withMembership.sort((a, b) => a.member.name.localeCompare(b.member.name));
      setRows(withMembership);
    } catch {
      setError(true);
    }
  }, [api, staffId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.member.name.toLowerCase().includes(q) ||
        row.member.email.toLowerCase().includes(q) ||
        row.member.membershipId.includes(q)
    );
  }, [query, rows]);

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Members" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <View style={styles.searchWrap}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {rows.length === 0 ? 'No assigned members.' : 'No matches for your search.'}
          </Text>
        ) : (
          filtered.map(({ member, membership }) => (
            <Pressable
              key={member.id}
              onPress={() => router.push(`/(staff)/members/${member.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.meta}>
                {member.type} · {statusLabel(member.status)}
              </Text>
              <Text style={styles.meta}>Next bill {formatShortDate(membership.nextBillingDate)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
    paddingBottom: 32,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  rowPressed: {
    backgroundColor: colors.offWhite,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  meta: {
    ...typography.body,
    color: colors.muted,
  },
});
