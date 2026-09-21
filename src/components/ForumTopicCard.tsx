import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { FORUM_CATEGORIES, type ForumTopic, type UserRole, type StaffRole } from '@/domain/types';
import { UserAvatar } from '@/components/UserAvatar';
import { colors } from '@/theme/colors';

type ForumTopicCardProps = {
  topic: ForumTopic;
  currentUserId: string;
  onPress: () => void;
  onToggleLike: () => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
};

function roleBadge(role?: UserRole | StaffRole | string) {
  if (role === 'admin' || role === 'it_admin' || role === 'staff_admin') {
    return { label: 'STAFF ADMIN', bg: '#EDE9FE', text: '#6D28D9', icon: 'shield-checkmark' };
  }
  if (role === 'trainer') {
    return { label: 'TRAINER', bg: '#DCFCE7', text: '#15803D', icon: 'barbell' };
  }
  if (role === 'staff' || role === 'desk') {
    return { label: 'STAFF DESK', bg: '#E0F2FE', text: '#0284C7', icon: 'business' };
  }
  return { label: 'MEMBER', bg: '#F1F5F9', text: '#475569', icon: 'person' };
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
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ForumTopicCard({
  topic,
  currentUserId,
  onPress,
  onToggleLike,
  onTogglePin,
  onDelete,
  canManage = false,
}: ForumTopicCardProps) {
  const { colors: tc, isDark } = useTheme();

  const isLiked = (topic.likedBy ?? []).includes(currentUserId);
  const categoryConfig = FORUM_CATEGORIES.find((c) => c.id === topic.category) ?? FORUM_CATEGORIES[0];
  const badge = roleBadge(topic.authorRole);
  const isAuthor = topic.authorId === currentUserId;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tc.cardBg,
          borderColor: topic.pinned ? (isDark ? '#F59E0B' : '#FBBF24') : tc.cardBorder,
          borderWidth: topic.pinned ? 1.5 : 1,
        },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Forum topic: ${topic.title}`}
    >
      {/* Pinned & Category Header Bar */}
      <View style={styles.categoryRow}>
        <View style={styles.categoryLeft}>
          {topic.pinned ? (
            <View style={styles.pinnedPill}>
              <Ionicons name="pin" size={11} color="#B45309" />
              <Text style={styles.pinnedPillText}>PINNED</Text>
            </View>
          ) : null}

          <View style={[styles.categoryPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name={categoryConfig.icon as any} size={12} color={categoryConfig.color} />
            <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
          </View>
        </View>

        {topic.hasStaffReply ? (
          <View style={[styles.staffAnsweredBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
            <Text style={[styles.staffAnsweredText, { color: '#16A34A' }]}>Staff Replied</Text>
          </View>
        ) : null}
      </View>

      {/* Author Row */}
      <View style={styles.authorRow}>
        <UserAvatar uri={topic.authorAvatarUrl} name={topic.authorName} size={32} />
        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <Text style={[styles.authorName, { color: tc.text }]} numberOfLines={1}>
              {topic.authorName}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
              <Ionicons name={badge.icon as any} size={10} color={badge.text} />
              <Text style={[styles.roleBadgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={[styles.timeAgo, { color: tc.textMuted }]}>
            {formatRelativeTime(topic.createdAt)}
          </Text>
        </View>

        {/* Action Controls for Author/Staff */}
        <View style={styles.headerActions}>
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
                size={16}
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
              <Ionicons name="trash-outline" size={16} color={colors.scarlet} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Topic Title */}
      <Text style={[styles.title, { color: tc.text }]} numberOfLines={2}>
        {topic.title}
      </Text>

      {/* Topic Content Snippet */}
      <Text style={[styles.content, { color: tc.textMuted }]} numberOfLines={2}>
        {topic.content}
      </Text>

      {/* Highlighted @ Staff Mention Pill */}
      {topic.mentionedStaffNames && topic.mentionedStaffNames.length > 0 ? (
        <View style={[styles.mentionContainer, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
          <Ionicons name="at-circle" size={15} color="#4F46E5" />
          <Text style={styles.mentionLabel}>Asked:</Text>
          <Text style={styles.mentionNames} numberOfLines={1}>
            {topic.mentionedStaffNames.join(', ')}
          </Text>
        </View>
      ) : null}

      {/* Footer Stats Row */}
      <View style={[styles.footerRow, { borderTopColor: tc.border }]}>
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
              },
              pressed && styles.btnPressed,
            ]}
            hitSlop={6}
            accessibilityLabel={`${topic.likes} likes. Tap to like or unlike`}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={15}
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
              { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
            ]}
          >
            <Ionicons name="chatbubble-outline" size={14} color={tc.textMuted} />
            <Text style={[styles.statCount, { color: tc.text }]}>
              {topic.replyCount} {topic.replyCount === 1 ? 'reply' : 'replies'}
            </Text>
          </View>
        </View>

        <View style={styles.viewDiscussion}>
          <Text style={[styles.viewDiscussionText, { color: colors.primary }]}>
            Join Discussion →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pinnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pinnedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  staffAnsweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  staffAnsweredText: {
    fontSize: 10,
    fontWeight: '700',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
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
  timeAgo: {
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
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
    color: '#4F46E5',
  },
  mentionNames: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#4338CA',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  btnPressed: {
    opacity: 0.7,
  },
  statCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewDiscussion: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDiscussionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
