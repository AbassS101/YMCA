import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        {/* Community Forum & Staff Inquiries Banner */}
        <Pressable
          onPress={() => router.push('/(member)/community-forum')}
          style={({ pressed }) => [styles.forumCard, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open Community Forum and Staff Inquiries"
        >
          <View style={styles.forumIconWrap}>
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.forumTitle}>Community Forum</Text>
              <View style={styles.staffTagPill}>
                <Text style={styles.staffTagPillText}>@ STAFF INQUIRIES</Text>
              </View>
            </View>
            <Text style={styles.forumSub}>
              Browse topics, answer @ staff questions, and pin branch notices
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        <Text style={styles.sectionHeader}>Direct Member Messages</Text>

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
  forumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    padding: 14,
    gap: 12,
    marginBottom: 6,
  },
  forumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  staffTagPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  staffTagPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  forumSub: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
