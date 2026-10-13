import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';
import { ChatView } from '@/components/chat/ChatView';
import { RichText } from '@/components/chat/RichText';
import { ReportContentSheet } from '@/components/chat/ReportContentSheet';
import { roleTag } from '@/components/chat/ChatMessageRow';
import { forumSource } from '@/components/chat/chatSources';
import { useChatTheme } from '@/components/chat/chatTheme';
import { isStaffRole, type ChatIdentity, type ChatMessage } from '@/components/chat/chatTypes';
import { FORUM_CATEGORIES, type ForumTopic, type UserRole } from '@/domain/types';
import { forumRepo } from '@/repositories/forumRepo';
import { colors } from '@/theme/colors';

type ForumTopicDetailModalProps = {
  visible: boolean;
  topic: ForumTopic | null;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: UserRole | string;
  currentUserName: string;
  currentUserAvatarUrl?: string;
  api: any;
  onTopicUpdated?: (updated: ForumTopic) => void;
  onTopicDeleted?: (topicId: string) => void;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ForumTopicDetailModal({
  visible,
  topic,
  onClose,
  currentUserId,
  currentUserRole,
  currentUserName,
  currentUserAvatarUrl,
  api,
  onTopicUpdated,
  onTopicDeleted,
}: ForumTopicDetailModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useChatTheme();
  const [topicOverride, setTopicOverride] = useState<ForumTopic | null>(null);
  const [reportingTopic, setReportingTopic] = useState(false);

  const currentTopic = topicOverride && topicOverride.id === topic?.id ? topicOverride : topic;
  const topicId = currentTopic?.id;
  const topicTitle = currentTopic?.title;

  const isStaffUser = isStaffRole(String(currentUserRole));
  const me = useMemo<ChatIdentity>(
    () => ({
      userId: currentUserId,
      name: currentUserName,
      role: currentUserRole,
      avatarUrl: currentUserAvatarUrl,
      isStaff: isStaffUser,
    }),
    [currentUserId, currentUserName, currentUserRole, currentUserAvatarUrl, isStaffUser]
  );

  const source = useMemo(
    () =>
      api && topicId
        ? forumSource(api, { id: topicId, title: topicTitle ?? '' } as ForumTopic, me)
        : null,
    [api, topicId, topicTitle, me]
  );

  if (!currentTopic) return null;

  const isTopicAuthor = currentTopic.authorId === currentUserId;
  const isLiked = (currentTopic.likedBy ?? []).includes(currentUserId);
  const isFollowing = (currentTopic.interestedBy ?? []).includes(currentUserId);
  const category = FORUM_CATEGORIES.find((c) => c.id === currentTopic.category) ?? FORUM_CATEGORIES[0];
  const tag = roleTag(String(currentTopic.authorRole));

  const apply = (updated: ForumTopic) => {
    setTopicOverride(updated);
    onTopicUpdated?.(updated);
  };

  const run = async (fn: () => Promise<ForumTopic>) => {
    if (!api || !currentUserId) return;
    try {
      apply(await fn());
    } catch {
      // noop
    }
  };

  const closeAll = () => {
    setReportingTopic(false);
    onClose();
  };

  const handleDeleteTopic = async () => {
    if (!api || !currentUserId) return;
    try {
      await forumRepo.deleteTopic(api, currentTopic.id, currentUserId);
      onTopicDeleted?.(currentTopic.id);
      closeAll();
    } catch {
      // noop
    }
  };

  const handleSent = async (m: ChatMessage) => {
    const refreshed = await forumRepo.getTopic(api, currentTopic.id).catch(() => null);
    const base = currentTopic;
    apply(
      refreshed ?? {
        ...base,
        replyCount: (base.replyCount ?? 0) + 1,
        hasStaffReply: base.hasStaffReply || m.isStaff,
        updatedAt: m.createdAt,
        participantIds: Array.from(new Set([...(base.participantIds ?? []), currentUserId])),
        lastChattedAtBy: { ...(base.lastChattedAtBy ?? {}), [currentUserId]: m.createdAt },
      }
    );
  };

  const handleRemoved = () => {
    apply({ ...currentTopic, replyCount: Math.max(0, (currentTopic.replyCount ?? 1) - 1) });
  };

  const mentionNames = Array.from(
    new Set([...(currentTopic.mentionedStaffNames ?? []), ...(currentTopic.mentionedUserNames ?? [])])
  );

  const opBlock = (
    <View style={[styles.op, { borderBottomColor: theme.border }]}>
      <View style={styles.opAuthor}>
        <UserAvatar uri={currentTopic.authorAvatarUrl} name={currentTopic.authorName} size={42} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameLine}>
            <Text style={[styles.opName, { color: theme.text }]}>{currentTopic.authorName}</Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: tag.color }]}>
                <Text style={styles.tagText}>{tag.label}</Text>
              </View>
            ) : null}
            <View style={[styles.tag, { backgroundColor: theme.reactionBg }]}>
              <Text style={[styles.tagText, { color: theme.muted }]}>OP</Text>
            </View>
          </View>
          <Text style={{ color: theme.muted, fontSize: 11 }}>{formatWhen(currentTopic.createdAt)}</Text>
        </View>
      </View>

      <Text style={[styles.opTitle, { color: theme.text }]}>{currentTopic.title}</Text>
      <RichText text={currentTopic.content} theme={theme} />

      {mentionNames.length > 0 ? (
        <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>
          @ {mentionNames.join(', ')}
        </Text>
      ) : null}

      <View style={styles.opActions}>
        <Pressable
          onPress={() => void run(() => forumRepo.toggleLikeTopic(api, currentTopic.id, currentUserId))}
          style={[styles.pill, { backgroundColor: isLiked ? '#FEE2E2' : theme.reactionBg }]}
          accessibilityRole="button"
          accessibilityLabel="Like topic"
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={15} color={isLiked ? '#DC2626' : theme.muted} />
          <Text style={[styles.pillText, { color: isLiked ? '#DC2626' : theme.text }]}>{currentTopic.likes}</Text>
        </Pressable>
        <View style={[styles.pill, { backgroundColor: theme.reactionBg }]}>
          <Ionicons name="chatbubble-outline" size={14} color={theme.muted} />
          <Text style={[styles.pillText, { color: theme.text }]}>{currentTopic.replyCount ?? 0}</Text>
        </View>
        <Pressable
          onPress={() => void run(() => forumRepo.toggleInterestedTopic(api, currentTopic.id, currentUserId))}
          style={[styles.pill, { backgroundColor: isFollowing ? '#FEF3C7' : theme.reactionBg }]}
          accessibilityRole="button"
        >
          <Ionicons name={isFollowing ? 'star' : 'star-outline'} size={14} color={isFollowing ? '#D97706' : theme.muted} />
          <Text style={[styles.pillText, { color: isFollowing ? '#92400E' : theme.text }]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={closeAll}
    >
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingLeft: Math.max(10, insets.left),
              paddingRight: Math.max(10, insets.right),
            },
          ]}
        >
          <Pressable onPress={closeAll} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={21} color={theme.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Ionicons name={category.icon as any} size={14} color={category.color} />
            <Text style={[styles.headerText, { color: theme.text }]} numberOfLines={1}>
              {currentTopic.title}
            </Text>
          </View>
          {isStaffUser ? (
            <Pressable
              onPress={() => void run(() => forumRepo.togglePinTopic(api, currentTopic.id, currentUserId))}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={currentTopic.pinned ? 'Unpin topic' : 'Pin topic'}
            >
              <Ionicons
                name={currentTopic.pinned ? 'pin' : 'pin-outline'}
                size={18}
                color={currentTopic.pinned ? '#D97706' : theme.muted}
              />
            </Pressable>
          ) : null}
          {!isTopicAuthor ? (
            <Pressable onPress={() => setReportingTopic(true)} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Report topic">
              <Ionicons name="flag-outline" size={18} color={theme.muted} />
            </Pressable>
          ) : null}
          {isTopicAuthor || isStaffUser ? (
            <Pressable onPress={() => void handleDeleteTopic()} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Delete topic">
              <Ionicons name="trash-outline" size={18} color={colors.scarlet} />
            </Pressable>
          ) : null}
        </View>

        <ChatView
          source={source}
          me={me}
          enabled={visible}
          header={opBlock}
          placeholder={isStaffUser ? 'Reply as YMCA staff (@ to tag)' : 'Message this thread (@ to tag)'}
          maxLength={1000}
          emptyTitle="No replies yet"
          emptySubtitle="Start the conversation - share advice or answer the question."
          canDelete={(m) => m.authorId === currentUserId || isTopicAuthor || isStaffUser}
          deleteLabel={(m) =>
            m.authorId === currentUserId ? 'Delete your message' : isTopicAuthor ? 'Delete (thread owner)' : 'Delete (moderator)'
          }
          onSent={(m) => void handleSent(m)}
          onRemoved={handleRemoved}
        />

        <ReportContentSheet
          visible={reportingTopic}
          authorName={currentTopic.authorName}
          content={`${currentTopic.title} - ${currentTopic.content}`}
          onClose={() => setReportingTopic(false)}
          onSubmit={async (reason, details) => {
            const { ticket } = await forumRepo.reportContent(api, {
              reporterId: currentUserId,
              reporterName: currentUserName,
              reporterRole: currentUserRole,
              targetType: 'topic',
              targetId: currentTopic.id,
              targetAuthorId: currentTopic.authorId,
              targetAuthorName: currentTopic.authorName,
              targetContent: `${currentTopic.title} — ${currentTopic.content}`,
              contextTitle: currentTopic.title,
              reason,
              details,
            });
            return ticket.ticketNumber;
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  headerText: { flex: 1, fontSize: 15, fontWeight: '800' },
  op: { paddingHorizontal: 14, paddingVertical: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  opAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  opName: { fontSize: 15, fontWeight: '800' },
  tag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  opTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  opActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  pillText: { fontSize: 12, fontWeight: '700' },
});
