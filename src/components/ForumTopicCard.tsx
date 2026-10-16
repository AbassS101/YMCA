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
      <View style={styles.topRow}>
        <UserAvatar uri={topic.authorAvatarUrl} name={topic.authorName} size={24} />
        <Text style={[styles.author, { color: tc.text }]} numberOfLines={1}>
          {topic.authorName}
        </Text>
        <Text style={[styles.time, { color: tc.textMuted }]}>· {formatRelativeTime(topic.updatedAt)}</Text>
        <View style={{ flex: 1 }} />
        {topic.pinned ? (
          <View style={[styles.badge, { backgroundColor: isDark ? '#2E2211' : '#FEF3C7' }]}>
            <Ionicons name="pin" size={10} color="#D97706" />
            <Text style={[styles.badgeText, { color: isDark ? '#FBBF24' : '#92400E' }]}>Pinned</Text>
          </View>
        ) : null}
        {onToggleInterested ? (
          <Pressable onPress={onToggleInterested} hitSlop={10} accessibilityLabel="Follow topic">
            <Ionicons
              name={isInterested ? 'star' : 'star-outline'}
              size={18}
              color={isInterested ? '#D97706' : tc.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.title, { color: tc.text }]} numberOfLines={2}>
        {filterProfanity(topic.title)}
      </Text>
      <Text style={[styles.excerpt, { color: tc.textMuted }]} numberOfLines={2}>
        {filterProfanity(topic.content)}
      </Text>

      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: `${category.color}1F` }]}>
          <Ionicons name={category.icon as any} size={11} color={category.color} />
          <Text style={[styles.badgeText, { color: category.color }]}>{category.label}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onToggleLike}
          hitSlop={8}
          style={[styles.pill, { backgroundColor: isLiked ? '#FEE2E2' : isDark ? '#1E293B' : '#F1F5F9' }]}
          accessibilityLabel="Like topic"
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={14} color={isLiked ? '#DC2626' : tc.textMuted} />
          <Text style={[styles.statText, { color: isLiked ? '#DC2626' : tc.textMuted }]}>{topic.likes}</Text>
        </Pressable>
        <View style={[styles.pill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Ionicons name="chatbubble-outline" size={13} color={tc.textMuted} />
          <Text style={[styles.statText, { color: tc.textMuted }]}>{topic.replyCount ?? 0}</Text>
        </View>
        {topic.hasStaffReply ? (
          <View style={[styles.pill, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
            <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
            <Text style={[styles.statText, { color: '#16A34A' }]}>Staff</Text>
          </View>
        ) : null}
        {chatted ? <Ionicons name="chatbubbles" size={13} color={colors.primary} /> : null}
      </View>
    </Pressable>
  );
}

export const ForumTopicCard = React.memo(ForumTopicCardImpl);

const styles = StyleSheet.create({
  row: {
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 12, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  excerpt: { fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 },
  statText: { fontSize: 12, fontWeight: '700' },
});
