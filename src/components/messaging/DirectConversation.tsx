import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { UserAvatar } from '@/components/UserAvatar';
import { ChatView } from '@/components/chat/ChatView';
import { roleTag } from '@/components/chat/ChatMessageRow';
import { directMessageSource, type DirectParticipant } from '@/components/chat/chatSources';
import { useChatTheme } from '@/components/chat/chatTheme';
import type { ChatIdentity } from '@/components/chat/chatTypes';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { messageRepo } from '@/repositories/messageRepo';
import { resolvePerson } from './resolvePerson';

type Props = {
  threadId: string;
  /** Where "back" goes when there is no history. */
  fallbackHref: string;
};

/**
 * Forum-style direct conversation between a member and a staff member.
 * Used by both the staff and member apps so each side clearly sees who they are talking to.
 */
export function DirectConversation({ threadId, fallbackHref }: Props) {
  const router = useRouter();
  const theme = useChatTheme();
  const { session, api } = useSession();
  const myId = session?.userId ?? '';

  const [people, setPeople] = useState<Record<string, DirectParticipant> | null>(null);
  const [otherId, setOtherId] = useState('');
  const [otherSubtitle, setOtherSubtitle] = useState('');
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!myId || !threadId) return;
      try {
        const threads = await messageRepo.listThreads(api, myId);
        const thread = threads.find((t) => t.id === threadId);
        if (!thread) {
          if (alive) setMissing(true);
          return;
        }
        const theirId = thread.memberId === myId ? thread.staffId : thread.memberId;
        const [mePerson, them] = await Promise.all([
          resolvePerson(api, myId),
          resolvePerson(api, theirId),
        ]);
        if (!alive) return;
        setOtherId(theirId);
        setOtherSubtitle(them.subtitle);
        setPeople({ [mePerson.id]: mePerson, [them.id]: them });
      } catch {
        if (alive) setMissing(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, myId, threadId]);

  const iAmStaff = Boolean(people && people[myId]?.isStaff);
  const other = people ? people[otherId] : undefined;
  const mine = people?.[myId];
  const staffRoleLabel = otherSubtitle || 'YMCA Staff';
  const me = useMemo<ChatIdentity>(
    () => ({
      userId: myId,
      name: mine?.name ?? 'Me',
      role: mine?.role ?? session?.role ?? 'member',
      avatarUrl: mine?.avatarUrl,
      isStaff: Boolean(mine?.isStaff),
    }),
    [myId, mine, session?.role]
  );

  const source = useMemo(
    () =>
      people && other
        ? directMessageSource(
            api,
            threadId,
            me,
            people,
            `Direct message: ${mine?.name ?? 'User'} & ${other.name}`
          )
        : null,
    [api, threadId, me, people, other, mine]
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref as never);
  };

  const tag = other?.isStaff ? roleTag(String(other.role)) ?? { label: 'STAFF', color: '#0284C7' } : null;
  const firstName = other?.name.split(' ')[0] ?? '';

  const intro = other ? (
    <View style={[styles.intro, { borderBottomColor: theme.border }]}>
      <UserAvatar uri={other.avatarUrl} name={other.name} size={64} />
      <Text style={[styles.introName, { color: theme.text }]}>{other.name}</Text>
      {other.isStaff ? (
        <View style={[styles.staffPill, { backgroundColor: theme.reactionActiveBg }]}>
          <Ionicons name="shield-checkmark" size={13} color={theme.accent} />
          <Text style={[styles.staffPillText, { color: theme.accent }]}>
            YMCA Staff · {staffRoleLabel}
          </Text>
        </View>
      ) : (
        <View style={[styles.staffPill, { backgroundColor: theme.reactionBg }]}>
          <Ionicons name="person" size={13} color={theme.muted} />
          <Text style={[styles.staffPillText, { color: theme.muted }]}>YMCA Member</Text>
        </View>
      )}
      <Text style={[styles.introHint, { color: theme.muted }]}>
        {iAmStaff
          ? `Private conversation. ${firstName} will see that this message is from YMCA staff.`
          : `Private conversation with YMCA staff. Only you and ${firstName} can see these messages.`}
      </Text>
    </View>
  ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <YHeader subtitle={other?.name ?? 'Messages'} />
      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to messages"
        >
          <Ionicons name="arrow-back" size={21} color={theme.text} />
        </Pressable>
        {other ? <UserAvatar uri={other.avatarUrl} name={other.name} size={32} /> : null}
        <View style={styles.barText}>
          <View style={styles.nameLine}>
            <Text style={[styles.barName, { color: theme.text }]} numberOfLines={1}>
              {other?.name ?? 'Conversation'}
            </Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: tag.color }]}>
                <Text style={styles.tagText}>{tag.label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.barSub, { color: theme.muted }]} numberOfLines={1}>
            {other?.isStaff ? `YMCA Staff · ${staffRoleLabel}` : 'Member'}
          </Text>
        </View>
      </View>

      {missing ? (
        <Text style={[styles.missing, { color: theme.muted }]}>
          This conversation could not be found.
        </Text>
      ) : (
        <ChatView
          source={source}
          me={me}
          enabled={Boolean(source)}
          header={intro}
          placeholder={iAmStaff ? `Message ${firstName} as YMCA staff` : `Message ${firstName || 'staff'}`}
          maxLength={1000}
          emptyTitle="No messages yet"
          emptySubtitle={
            iAmStaff
              ? `Say hello to ${firstName || 'your member'}.`
              : 'Ask a question or say hello - staff will reply here.'
          }
          canDelete={(m) => m.authorId === myId}
          deleteLabel={() => 'Delete your message'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  barText: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  barName: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  barSub: { fontSize: 11 },
  tag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  intro: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  introName: { fontSize: 18, fontWeight: '800' },
  staffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staffPillText: { fontSize: 12, fontWeight: '700' },
  introHint: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  missing: { textAlign: 'center', padding: 32, fontSize: 14 },
});
