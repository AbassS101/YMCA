import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { MessageThread } from '@/components/MessageThread';
import { YHeader } from '@/components/YHeader';
import type { Member, Message } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { messageRepo } from '@/repositories/messageRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export default function StaffThreadScreen() {
  const router = useRouter();
  const { threadId: threadIdParam } = useLocalSearchParams<{ threadId: string }>();
  const threadId = threadIdParam ?? '';
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (threadId === '' || staffId === '') {
      return;
    }
    try {
      setError(false);
      const threads = await messageRepo.listThreads(api, staffId);
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) {
        setMember(null);
        setMessages([]);
        return;
      }
      const [list, nextMember] = await Promise.all([
        messageRepo.listMessages(api, threadId),
        api.getMember(thread.memberId),
      ]);
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setMessages(list);
      setMember(nextMember);
    } catch {
      setError(true);
    }
  }, [api, staffId, threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSend = useCallback(
    async (body: string) => {
      if (staffId === '' || threadId === '') {
        return;
      }
      const sent = await messageRepo.sendMessage(api, {
        threadId,
        fromId: staffId,
        body,
      });
      setMessages((prev) => [...prev, sent]);
    },
    [api, staffId, threadId]
  );

  const contactFirstName = member?.name.split(' ')[0] ?? 'member';

  return (
    <View style={styles.screen}>
      <YHeader subtitle={member?.name ?? 'Messages'} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <Pressable
        onPress={() => router.back()}
        style={styles.backWrap}
        accessibilityRole="button"
      >
        <Text style={styles.back}>← Inbox</Text>
      </Pressable>
      {threadId ? (
        <MessageThread
          messages={messages}
          currentUserId={staffId}
          onSend={(body) => void onSend(body)}
          emptyHint={`Reply to ${contactFirstName}.`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  backWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  back: {
    ...typography.body,
    color: colors.scarlet,
    fontWeight: '600',
  },
});
