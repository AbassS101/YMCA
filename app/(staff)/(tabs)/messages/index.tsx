import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { YHeader } from '@/components/YHeader';
import type { Member, Thread } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { messageRepo } from '@/repositories/messageRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type InboxRow = { thread: Thread; member: Member | null };

export default function StaffMessagesInboxScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [rows, setRows] = useState<InboxRow[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      const threads = await messageRepo.listThreads(api, staffId);
      const withMembers = await Promise.all(
        threads.map(async (thread) => ({
          thread,
          member: await api.getMember(thread.memberId).catch(() => null),
        }))
      );
      withMembers.sort((a, b) =>
        (a.member?.name ?? '').localeCompare(b.member?.name ?? '')
      );
      setRows(withMembers);
    } catch {
      setError(true);
    }
  }, [api, staffId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Messages" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>No conversations yet.</Text>
        ) : (
          rows.map(({ thread, member }) => (
            <Pressable
              key={thread.id}
              onPress={() => router.push(`/(staff)/messages/${thread.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.name}>{member?.name ?? 'Member'}</Text>
              <Text style={styles.meta}>{member?.email ?? thread.memberId}</Text>
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
  list: {
    padding: 16,
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
