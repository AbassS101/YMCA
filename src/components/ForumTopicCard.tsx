import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { filterProfanity, FORUM_CATEGORIES, type ForumTopic } from '@/domain/types';
import { UserAvatar } from '@/components/UserAvatar';
import { colors } from '@/theme/colors';

export type ForumTopicCardProps = {
  topic: ForumTopic;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;
  onReport?: () => void;
  onToggleLike: () => void;
  onToggleInterested?: () => void;
  isInterested?: boolean;
  hasRecentlyChatted?: boolean;
  onTogglePin?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
};

export function formatRelativeTime(isoStr: string): string {
  const d = new Date(isoStr);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ForumTopicCardImpl({
  topic,
  currentUserId,
  onPress,
  onLongPress,
  onToggleLike,
  isInterested: isInterestedProp,
  hasRecentlyChatted: chattedProp,
  onToggleInterested,
}: ForumTopicCardProps) {
  const { colors: tc, isDark } = useTheme();
  const category = FORUM_CATEGORIES.find((c) => c.id === topic.category) ?? FORUM_CATEGORIES[0];
  const isLiked = (topic.likedBy ?? []).includes(currentUserId);
  const isInterested =
    isInterestedProp ?? Boolean(currentUserId && (topic.interestedBy ?? []).includes(currentUserId));
  const chatted =
    chattedProp ??
    Boolean(
      currentUserId &&
        ((topic.participantIds ?? []).includes(currentUserId) || topic.lastChattedAtBy?.[currentUserId])
    );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? (isDark ? '#1E293B' : '#F1F5F9') : tc.cardBg,
          borderColor: topic.pinned ? '#D97706' : tc.cardBorder,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open topic ${topic.title}`}
    >
      <View style={[styles.bar, { backgroundColor: category.color }]} />
      <UserAvatar uri={topic.authorAvatarUrl} name={topic.authorName} size={40} />

      <View style={styles.main}>
        <View style={styles.line}>
          {topic.pinned ? <Ionicons name="pin" size={12} color="#D97706" /> : null}
          <Text style={[styles.title, { color: tc.text }]} numberOfLines={1}>
            {filterProfanity(topic.title)}
          </Text>
          <Text style={[styles.time, { color: tc.textMuted }]}>{formatRelativeTime(topic.updatedAt)}</Text>
        </View>
        <Text style={[styles.excerpt, { color: tc.textMuted }]} numberOfLines={1}>
          <Text style={{ fontWeight: '700', color: tc.text }}>{topic.authorName}: </Text>
          {filterProfanity(topic.content)}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.cat, { color: category.color }]}>#{category.label.toLowerCase().replace(/\s+/g, '-')}</Text>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={12} color={tc.textMuted} />
            <Text style={[styles.statText, { color: tc.textMuted }]}>{topic.replyCount ?? 0}</Text>
          </View>
          <Pressable onPress={onToggleLike} hitSlop={8} style={styles.stat} accessibilityLabel="Like topic">
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={13}
              color={isLiked ? '#DC2626' : tc.textMuted}
            />
            <Text style={[styles.statText, { color: isLiked ? '#DC2626' : tc.textMuted }]}>{topic.likes}</Text>
          </Pressable>
          {topic.hasStaffReply ? (
            <View style={styles.stat}>
              <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
              <Text style={[styles.statText, { color: '#16A34A' }]}>Staff replied</Text>
            </View>
          ) : null}
          {chatted ? <Ionicons name="chatbubbles" size={12} color={colors.primary} /> : null}
        </View>
      </View>

      {onToggleInterested ? (
        <Pressable onPress={onToggleInterested} hitSlop={10} accessibilityLabel="Follow topic">
          <Ionicons
            name={isInterested ? 'star' : 'star-outline'}
            size={18}
            color={isInterested ? '#D97706' : tc.textMuted}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const ForumTopicCard = React.memo(ForumTopicCardImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
  time: { fontSize: 11, fontWeight: '600' },
  excerpt: { fontSize: 13 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  cat: { fontSize: 11, fontWeight: '700' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 11, fontWeight: '700' },
});
