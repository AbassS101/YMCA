import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import {
  filterProfanity,
  FORUM_CATEGORIES,
  type ForumTopic,
  type UserRole,
  type StaffRole,
} from '@/domain/types';
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

function roleBadge(role?: UserRole | StaffRole | string) {
  if (role === 'admin' || role === 'it_admin' || role === 'staff_admin') {
    return { label: 'STAFF ADMIN', bg: '#EDE9FE', text: '#6D28D9', icon: 'shield-checkmark', isStaff: true };
  }
  if (role === 'trainer') {
    return { label: 'TRAINER', bg: '#DCFCE7', text: '#15803D', icon: 'barbell', isStaff: true };
  }
  if (role === 'staff' || role === 'desk') {
    return { label: 'STAFF DESK', bg: '#E0F2FE', text: '#0284C7', icon: 'business', isStaff: true };
  }
  return { label: 'MEMBER', bg: '#F1F5F9', text: '#475569', icon: 'person', isStaff: false };
}

function formatRelativeTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ForumTopicCard({
  topic,
  currentUserId,
  onPress,
  onLongPress,
  onReport,
  onToggleLike,
  onToggleInterested,
  isInterested: isInterestedProp,
  hasRecentlyChatted: hasRecentlyChattedProp,
  onTogglePin,
  onDelete,
  canManage = false,
}: ForumTopicCardProps) {
  const { colors: tc, isDark } = useTheme();

  const isLiked = (topic.likedBy ?? []).includes(currentUserId);
  const isInterested =
    isInterestedProp ?? Boolean(currentUserId && (topic.interestedBy ?? []).includes(currentUserId));
  const hasRecentlyChatted =
    hasRecentlyChattedProp ??
    Boolean(
      currentUserId &&
        ((topic.participantIds ?? []).includes(currentUserId) ||
          Boolean(topic.lastChattedAtBy?.[currentUserId]))
    );
  const categoryConfig = FORUM_CATEGORIES.find((c) => c.id === topic.category) ?? FORUM_CATEGORIES[0];
  const badge = roleBadge(topic.authorRole);
  const isAuthor = Boolean(currentUserId && topic.authorId === currentUserId);

  const mentionDisplayNames = Array.from(
    new Set([...(topic.mentionedStaffNames ?? []), ...(topic.mentionedUserNames ?? [])])
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress ?? onReport}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tc.cardBg,
          borderColor: topic.pinned
            ? isDark
              ? '#D97706'
              : '#FDE68A'
            : tc.cardBorder,
          borderWidth: 1,
        },
        topic.pinned && styles.pinnedGlow,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Forum topic: ${filterProfanity(topic.title)}. ${topic.replyCount} replies. Tap to open discussion, hold down to report or moderate.`}
    >
      {/* Top Meta Bar: Author & Primary Badges */}
      <View style={styles.topMetaRow}>
        <View style={styles.authorCluster}>
          <UserAvatar uri={topic.authorAvatarUrl} name={topic.authorName} size={36} />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: tc.text }]} numberOfLines={1}>
                {topic.authorName}
              </Text>
              {badge.isStaff ? (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.primary}
                  style={styles.verifiedCheck}
                />
              ) : null}
              <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                <Ionicons name={badge.icon as any} size={9} color={badge.text} />
                <Text style={[styles.roleBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>
            <View style={styles.timeAndCatRow}>
              <Text style={[styles.timeAgo, { color: tc.textMuted }]}>
                {formatRelativeTime(topic.createdAt)}
              </Text>
              <Text style={[styles.metaDot, { color: tc.textMuted }]}>•</Text>
              <View style={styles.inlineCat}>
                <Ionicons name={categoryConfig.icon as any} size={11} color={categoryConfig.color} />
                <Text style={[styles.inlineCatText, { color: categoryConfig.color }]}>
                  {categoryConfig.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Action Top-Right Controls */}
        <View style={styles.topRightActions}>
          {onToggleInterested ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleInterested();
              }}
              hitSlop={8}
              style={[
                styles.bookmarkBtn,
                {
                  backgroundColor: isInterested
                    ? isDark
                      ? '#2E2211'
                      : '#FEF3C7'
                    : isDark
                      ? '#1E293B'
                      : '#F8FAFC',
                  borderColor: isInterested
                    ? isDark
                      ? '#B45309'
                      : '#FDE68A'
                    : tc.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isInterested
                  ? 'Interested in this forum. Tap to unfollow'
                  : 'Bookmark as interested to follow and filter'
              }
            >
              <Ionicons
                name={isInterested ? 'star' : 'star-outline'}
                size={14}
                color={isInterested ? '#D97706' : tc.textMuted}
              />
            </Pressable>
          ) : null}

          {onReport ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onReport();
              }}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={`Report topic ${topic.title} to IT`}
            >
              <Ionicons name="flag-outline" size={14} color={tc.textMuted} />
            </Pressable>
          ) : null}

          {canManage && onTogglePin ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={topic.pinned ? 'Unpin topic' : 'Pin topic'}
            >
              <Ionicons
                name={topic.pinned ? 'pin' : 'pin-outline'}
                size={15}
                color={topic.pinned ? '#D97706' : tc.textMuted}
              />
            </Pressable>
          ) : null}

          {(isAuthor || canManage) && onDelete ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel="Delete topic"
            >
              <Ionicons name="trash-outline" size={15} color={colors.scarlet} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Pill Badges Row (Pinned / Staff Answered / Activity) */}
      {(topic.pinned || topic.hasStaffReply || hasRecentlyChatted || isAuthor) && (
        <View style={styles.badgeRow}>
          {topic.pinned ? (
            <View
              style={[
                styles.pinnedPill,
                {
                  backgroundColor: isDark ? '#422006' : '#FEF3C7',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="pin" size={11} color="#B45309" />
              <Text style={styles.pinnedPillText}>PINNED TO TOP</Text>
            </View>
          ) : null}

          {topic.hasStaffReply ? (
            <View
              style={[
                styles.staffAnsweredBadge,
                {
                  backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                  borderColor: isDark ? '#047857' : '#A7F3D0',
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={11} color={isDark ? '#34D399' : '#047857'} />
              <Text style={[styles.staffAnsweredText, { color: isDark ? '#34D399' : '#047857' }]}>
                Official Staff Answered
              </Text>
            </View>
          ) : null}

          {hasRecentlyChatted ? (
            <View
              style={[
                styles.activityBadge,
                {
                  backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                  borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
                },
              ]}
            >
              <Ionicons name="chatbubbles" size={11} color={isDark ? '#60A5FA' : '#1D4ED8'} />
              <Text style={[styles.activityBadgeText, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}>
                You Chatted Here
              </Text>
            </View>
          ) : null}

          {isAuthor ? (
            <View
              style={[
                styles.activityBadge,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Ionicons name="create-outline" size={11} color={isDark ? '#94A3B8' : '#475569'} />
              <Text style={[styles.activityBadgeText, { color: isDark ? '#94A3B8' : '#475569' }]}>
                Created by You
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Topic Title */}
      <Text style={[styles.title, { color: tc.text }]} numberOfLines={2}>
        {filterProfanity(topic.title)}
      </Text>

      {/* Topic Content Snippet */}
      <Text style={[styles.content, { color: tc.textMuted }]} numberOfLines={2}>
        {filterProfanity(topic.content)}
      </Text>

      {/* Highlighted @ Mention Tag Row */}
      {mentionDisplayNames.length > 0 ? (
        <View
          style={[
            styles.mentionContainer,
            {
              backgroundColor: isDark ? '#0C2A4A' : '#F0F7FF',
              borderColor: isDark ? '#1E3A8A' : '#D0E3F0',
            },
          ]}
        >
          <Ionicons name="at-circle" size={14} color={colors.primary} />
          <Text style={[styles.mentionLabel, { color: colors.primary }]}>Tagged:</Text>
          <Text
            style={[styles.mentionNames, { color: isDark ? '#93C5FD' : '#004B7A' }]}
            numberOfLines={1}
          >
            {mentionDisplayNames.join(', ')}
          </Text>
        </View>
      ) : null}

      {/* Footer Stats & Quick Engagement Bar */}
      <View style={[styles.footerRow, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
        <View style={styles.statsLeft}>
          {/* Like Button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            style={({ pressed }) => [
              styles.statPill,
              {
                backgroundColor: isLiked
                  ? isDark
                    ? '#7F1D1D'
                    : '#FEE2E2'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
                borderColor: isLiked ? '#F87171' : tc.border,
              },
              pressed && styles.btnPressed,
            ]}
            hitSlop={6}
            accessibilityLabel={`${topic.likes} likes. Tap to like or unlike`}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={14}
              color={isLiked ? '#DC2626' : tc.textMuted}
            />
            <Text
              style={[
                styles.statCount,
                { color: isLiked ? '#DC2626' : tc.text },
              ]}
            >
              {topic.likes}
            </Text>
          </Pressable>

          {/* Reply Count */}
          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: tc.border,
              },
            ]}
          >
            <Ionicons name="chatbubble-outline" size={13} color={tc.textMuted} />
            <Text style={[styles.statCount, { color: tc.text }]}>
              {topic.replyCount} {topic.replyCount === 1 ? 'reply' : 'replies'}
            </Text>
          </View>
        </View>

        {/* View Discussion Prompt Pill */}
        <View style={styles.viewDiscussion}>
          <Text style={[styles.viewDiscussionText, { color: colors.primary }]}>
            Join Thread
          </Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 9,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  pinnedGlow: {
    shadowColor: '#D97706',
    shadowOpacity: 0.08,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  authorMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  verifiedCheck: {
    marginRight: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timeAndCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  timeAgo: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
  },
  inlineCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineCatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  bookmarkBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pinnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pinnedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  staffAnsweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  staffAnsweredText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 1,
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
  },
  mentionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  mentionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  mentionNames: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 2,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnPressed: {
    opacity: 0.75,
  },
  statCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewDiscussion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewDiscussionText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
