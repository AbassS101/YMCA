import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { MessageThread } from '@/components/MessageThread';
import { YHeader } from '@/components/YHeader';
import type { Message, Staff } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { messageRepo } from '@/repositories/messageRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

function branchLabel(branchId: string): string {
  if (branchId === 'silver-spring') {
    return 'YMCA Silver Spring';
  }
  return branchId;
}

function resolveThreadId(
  threads: { id: string; memberId: string; staffId: string }[],
  memberId: string,
  trainer: Staff | null
): string | null {
  if (trainer) {
    const match = threads.find((t) => t.memberId === memberId && t.staffId === trainer.id);
    if (match) {
      return match.id;
    }
  }
  const memberThread = threads.find((t) => t.memberId === memberId);
  return memberThread?.id ?? null;
}

export default function MemberTrainersScreen() {
  const { session, api } = useSession();
  const memberId = session?.userId ?? '';

  const [trainer, setTrainer] = useState<Staff | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const [assigned, threads] = await Promise.all([
        api.getAssignedTrainer(memberId),
        messageRepo.listThreads(api, memberId),
      ]);
      setTrainer(assigned);
      const resolvedId = resolveThreadId(threads, memberId, assigned);
      setThreadId(resolvedId);
      if (resolvedId) {
        const list = await messageRepo.listMessages(api, resolvedId);
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages(list);
      } else {
        setMessages([]);
      }
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onSend = useCallback(
    async (body: string) => {
      if (memberId === '' || threadId === null) {
        return;
      }
      const sent = await messageRepo.sendMessage(api, {
        threadId,
        fromId: memberId,
        body,
      });
      setMessages((prev) => [...prev, sent]);
    },
    [api, memberId, threadId]
  );

  const headerSubtitle = trainer ? 'Trainers' : 'Wellness desk';
  const contactFirstName = trainer?.name.split(' ')[0] ?? 'Wellness desk';
  const emptyHint = useMemo(
    () => (trainer ? `Say hello to ${contactFirstName}.` : 'Say hello to Wellness desk.'),
    [trainer, contactFirstName]
  );

  const cardName = trainer?.name ?? 'Wellness desk';
  const cardRole = trainer?.roleLabel ?? 'Member support';
  const cardBranch = branchLabel(trainer?.homeBranchId ?? 'silver-spring');

  return (
    <View style={styles.screen}>
      <YHeader subtitle={headerSubtitle} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <View style={styles.card}>
        <Text style={styles.cardName}>{cardName}</Text>
        <Text style={styles.cardRole}>{cardRole}</Text>
        <Text style={styles.cardBranch}>{cardBranch}</Text>
      </View>
      {threadId ? (
        <MessageThread
          messages={messages}
          currentUserId={memberId}
          onSend={(body) => void onSend(body)}
          emptyHint={emptyHint}
        />
      ) : (
        <View style={styles.noThread}>
          <Text style={styles.muted}>Messaging is unavailable right now.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cardName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  cardRole: {
    ...typography.body,
    color: colors.nearBlack,
  },
  cardBranch: {
    ...typography.label,
    color: colors.muted,
    marginTop: 4,
  },
  noThread: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  muted: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
});
