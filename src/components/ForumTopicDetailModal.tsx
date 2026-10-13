import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MentionAutocomplete } from '@/components/MentionAutocomplete';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import {
  containsProfanity,
  filterProfanity,
  FORUM_CATEGORIES,
  type ForumReply,
  type ForumTopic,
  type StaffRole,
  type UserRole,
} from '@/domain/types';
import { forumRepo } from '@/repositories/forumRepo';
import { UserAvatar } from '@/components/UserAvatar';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

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

const QUICK_REACTION_TEMPLATES = [
  'Thanks for the info! 🙌',
  'Great tip, will try tomorrow! 💪',
  'See you there! 👍',
  'Count me in! 🎾',
];

const REPORT_REASONS = [
  'Profanity / Inappropriate Language',
  'Harassment or Disrespectful Behavior',
  'Spam or Promotional Content',
  'Safety / Community Guidelines Violation',
];

type ActionSheetTarget = {
  targetType: 'topic' | 'reply';
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  canDelete: boolean;
  deleteRoleLabel?: string;
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

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
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
  const { colors: tc, isDark } = useTheme();
  const { multiplier } = useAccessibility();

  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [topicOverride, setTopicOverride] = useState<ForumTopic | null>(null);

  // Hold-down action & IT report sheet state
  const [actionTarget, setActionTarget] = useState<ActionSheetTarget | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccessTicket, setReportSuccessTicket] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const currentTopic =
    topicOverride && topicOverride.id === topic?.id ? topicOverride : topic;
  const topicId = currentTopic?.id;

  // Keyboard show/hide listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setIsFocused(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleDismissKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsFocused(false);
    setKeyboardVisible(false);
    setKeyboardHeight(0);
  };

  useEffect(() => {
    let active = true;
    if (visible && topicId && api) {
      forumRepo
        .listReplies(api, topicId)
        .then((list) => {
          if (active) {
            setReplies(list);
          }
        })
        .catch(() => {
          // ignore
        });
    }
    if (!visible) {
      setActionTarget(null);
      setReportSuccessTicket(null);
    }
    return () => {
      active = false;
    };
  }, [visible, topicId, api]);

  if (!currentTopic) return null;

  const isStaffUser =
    currentUserRole === 'staff' ||
    currentUserRole === 'trainer' ||
    currentUserRole === 'admin' ||
    currentUserRole === 'staff_admin' ||
    currentUserRole === 'it_admin';

  const isTopicAuthor = currentTopic.authorId === currentUserId;
  const isTopicLiked = (currentTopic.likedBy ?? []).includes(currentUserId);
  const isTopicInterested = (currentTopic.interestedBy ?? []).includes(currentUserId);
  const hasUserChatted =
    (currentTopic.participantIds ?? []).includes(currentUserId) ||
    Boolean(currentTopic.lastChattedAtBy?.[currentUserId]);
  const categoryConfig =
    FORUM_CATEGORIES.find((c) => c.id === currentTopic.category) ?? FORUM_CATEGORIES[0];
  const topicBadge = roleBadge(currentTopic.authorRole);
  const mentionDisplayNames = Array.from(
    new Set([...(currentTopic.mentionedStaffNames ?? []), ...(currentTopic.mentionedUserNames ?? [])])
  );

  const hasProfanityInDraft = containsProfanity(replyText);

  const openTopicActionSheet = () => {
    setSelectedReason(REPORT_REASONS[0]);
    setReportDetails('');
    setReportSuccessTicket(null);
    setActionTarget({
      targetType: 'topic',
      id: currentTopic.id,
      authorId: currentTopic.authorId,
      authorName: currentTopic.authorName,
      content: `${currentTopic.title} — ${currentTopic.content}`,
      canDelete: isTopicAuthor || isStaffUser,
      deleteRoleLabel: isTopicAuthor
        ? 'Thread Owner'
        : currentUserRole === 'it_admin'
          ? 'IT Admin'
          : currentUserRole === 'trainer'
            ? 'Trainer Moderator'
            : 'Staff Moderator',
    });
  };

  const openReplyActionSheet = (reply: ForumReply) => {
    const isReplyAuthor = reply.authorId === currentUserId;
    const canDelete = isReplyAuthor || isTopicAuthor || isStaffUser;
    const deleteRoleLabel = isReplyAuthor
      ? 'Your Reply'
      : isTopicAuthor
        ? 'Thread Owner'
        : currentUserRole === 'it_admin'
          ? 'IT Admin'
          : currentUserRole === 'trainer'
            ? 'Trainer Moderator'
            : 'Staff Moderator';

    setSelectedReason(REPORT_REASONS[0]);
    setReportDetails('');
    setReportSuccessTicket(null);
    setActionTarget({
      targetType: 'reply',
      id: reply.id,
      authorId: reply.authorId,
      authorName: reply.authorName,
      content: reply.content,
      canDelete,
      deleteRoleLabel,
    });
  };

  const handleSubmitReport = async () => {
    if (!actionTarget || !api || !currentUserId) return;
    setSubmittingReport(true);
    try {
      const { ticket } = await forumRepo.reportContent(api, {
        reporterId: currentUserId,
        reporterName: currentUserName,
        reporterRole: currentUserRole,
        targetType: actionTarget.targetType,
        targetId: actionTarget.id,
        targetAuthorId: actionTarget.authorId,
        targetAuthorName: actionTarget.authorName,
        targetContent: actionTarget.content,
        contextTitle: currentTopic.title,
        reason: selectedReason,
        details: reportDetails,
      });
      setReportSuccessTicket(ticket.ticketNumber);
    } catch {
      // noop
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleToggleTopicLike = async () => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleLikeTopic(api, currentTopic.id, currentUserId);
      setTopicOverride(updated);
      onTopicUpdated?.(updated);
    } catch {
      // noop
    }
  };

  const handleToggleTopicInterested = async () => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleInterestedTopic(api, currentTopic.id, currentUserId);
      setTopicOverride(updated);
      onTopicUpdated?.(updated);
    } catch {
      // noop
    }
  };

  const handleToggleTopicPin = async () => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.togglePinTopic(api, currentTopic.id, currentUserId);
      setTopicOverride(updated);
      onTopicUpdated?.(updated);
    } catch {
      // noop
    }
  };

  const handleDeleteTopic = async () => {
    if (!api || !currentUserId) return;
    try {
      await forumRepo.deleteTopic(api, currentTopic.id, currentUserId);
      setActionTarget(null);
      onTopicDeleted?.(currentTopic.id);
      onClose();
    } catch {
      // noop
    }
  };

  const handleQuickReactionPress = (tmpl: string) => {
    if (keyboardVisible || isFocused) {
      setReplyText((prev) => (prev ? `${prev} ${tmpl}` : tmpl));
      return;
    }
    void handleSendReply(tmpl);
  };

  const handleSendReply = async (customText?: string) => {
    const rawText = (customText ?? replyText).trim();
    if (!rawText || !api || !currentUserId) return;
    const text = filterProfanity(rawText);

    setSubmittingReply(true);
    try {
      const mentionedStaffIds: string[] = [];
      const lower = text.toLowerCase();
      if (lower.includes('@alex') || lower.includes('@doc') || lower.includes('@staff-alex')) mentionedStaffIds.push('staff-alex');
      if (lower.includes('@sarah') || lower.includes('@jane doe') || lower.includes('@staff-sarah')) mentionedStaffIds.push('staff-sarah');
      if (lower.includes('@celine') || lower.includes('@staff-celine')) mentionedStaffIds.push('staff-celine');
      if (lower.includes('@marcus') || lower.includes('@billy') || lower.includes('@desk') || lower.includes('@staff-desk'))
        mentionedStaffIds.push('staff-desk');
      if (lower.includes('@david') || lower.includes('@abass') || lower.includes('@it') || lower.includes('@staff-itadmin'))
        mentionedStaffIds.push('staff-itadmin');
      if (
        lower.includes('@jane') ||
        lower.includes('@patricia') ||
        lower.includes('@pat') ||
        lower.includes('@david') ||
        lower.includes('@staff-admin')
      )
        mentionedStaffIds.push('staff-admin');
      if (lower.includes('@all staff') || lower.includes('@staff-all'))
        mentionedStaffIds.push('staff-all');

      const newReply = await forumRepo.createReply(api, {
        topicId: currentTopic.id,
        content: text,
        authorId: currentUserId,
        authorName: currentUserName,
        authorRole: currentUserRole,
        authorAvatarUrl: currentUserAvatarUrl,
        isStaffReply: isStaffUser,
        mentionedStaffIds,
      });

      setReplies((prev) => [...prev, newReply]);
      setReplyText('');

      const refreshed = await forumRepo.getTopic(api, currentTopic.id).catch(() => null);
      const nowIso = newReply.createdAt || new Date().toISOString();
      const baseTopic = topicOverride && topicOverride.id === currentTopic.id ? topicOverride : currentTopic;
      const updatedTopic: ForumTopic =
        refreshed ?? {
          ...baseTopic,
          replyCount: (baseTopic.replyCount ?? 0) + 1,
          hasStaffReply: baseTopic.hasStaffReply || isStaffUser,
          updatedAt: nowIso,
          participantIds: Array.from(new Set([...(baseTopic.participantIds ?? []), currentUserId])),
          lastChattedAtBy: {
            ...(baseTopic.lastChattedAtBy ?? {}),
            [currentUserId]: nowIso,
          },
        };

      setTopicOverride(updatedTopic);
      onTopicUpdated?.(updatedTopic);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch {
      // noop
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleReplyLike = async (reply: ForumReply) => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleLikeReply(api, reply.id, currentUserId);
      setReplies((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      // noop
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!api || !currentUserId) return;
    try {
      await forumRepo.deleteReply(api, replyId, currentUserId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setActionTarget(null);
      const nextTopic = topicOverride && topicOverride.id === currentTopic.id
        ? {
            ...topicOverride,
            replyCount: Math.max(0, (topicOverride.replyCount ?? 1) - 1),
          }
        : {
            ...currentTopic,
            replyCount: Math.max(0, (currentTopic.replyCount ?? 1) - 1),
          };
      setTopicOverride(nextTopic);
      onTopicUpdated?.(nextTopic);
    } catch {
      // noop
    }
  };

  const bottomPadding =
    keyboardVisible && keyboardHeight > 0
      ? keyboardHeight
      : keyboardVisible && Platform.OS === 'android'
        ? 280
        : Math.max(insets.bottom, 10);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: tc.background }]}>
        {/* Compact Header (No Excess Top Whitespace) */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: tc.cardBg,
              borderColor: tc.border,
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: Math.max(14, insets.left),
              paddingRight: Math.max(14, insets.right),
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to forum topics"
          >
            <Ionicons name="arrow-back" size={21} color={tc.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View
              style={[
                styles.headerCategoryPill,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name={categoryConfig.icon as any} size={12} color={categoryConfig.color} />
              <Text style={[styles.headerCategoryText, { color: categoryConfig.color }]}>
                {categoryConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => void handleToggleTopicInterested()}
              hitSlop={8}
              style={[
                styles.headerActionBtn,
                isTopicInterested && { backgroundColor: isDark ? '#2E2211' : '#FEF3C7', borderRadius: 8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isTopicInterested ? 'Remove from Interested' : 'Bookmark topic as Interested'
              }
            >
              <Ionicons
                name={isTopicInterested ? 'star' : 'star-outline'}
                size={18}
                color={isTopicInterested ? '#D97706' : tc.textMuted}
              />
            </Pressable>

            <Pressable
              onPress={openTopicActionSheet}
              hitSlop={8}
              style={styles.headerActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Report topic to IT or moderate"
            >
              <Ionicons name="flag-outline" size={17} color={tc.textMuted} />
            </Pressable>

            {isStaffUser ? (
              <Pressable
                onPress={() => void handleToggleTopicPin()}
                hitSlop={8}
                style={styles.headerActionBtn}
                accessibilityLabel={currentTopic.pinned ? 'Unpin topic' : 'Pin topic'}
              >
                <Ionicons
                  name={currentTopic.pinned ? 'pin' : 'pin-outline'}
                  size={17}
                  color={currentTopic.pinned ? '#D97706' : tc.textMuted}
                />
              </Pressable>
            ) : null}

            {isTopicAuthor || isStaffUser ? (
              <Pressable
                onPress={() => void handleDeleteTopic()}
                hitSlop={8}
                style={styles.headerActionBtn}
                accessibilityLabel="Delete topic"
              >
                <Ionicons name="trash-outline" size={17} color={colors.scarlet} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Scrollable Content (Topic + Replies) */}
        <View style={[styles.flex, { paddingBottom: bottomPadding }]}>
          <FlatList
            ref={flatListRef}
            data={replies}
            keyExtractor={(r) => r.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.topicHeaderContainer}>
                {/* Main Topic Hero Card (Long-press to Report or Delete) */}
                <Pressable
                  onLongPress={openTopicActionSheet}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.topicCard,
                    {
                      backgroundColor: tc.cardBg,
                      borderColor: currentTopic.pinned
                        ? isDark
                          ? '#D97706'
                          : '#FDE68A'
                        : tc.cardBorder,
                      borderWidth: 1,
                    },
                    pressed && { opacity: 0.96 },
                  ]}
                  accessibilityHint="Hold down to report topic to IT or moderate"
                >
                  {/* Topic Author Header */}
                  <View style={styles.authorRow}>
                    <UserAvatar
                      uri={currentTopic.authorAvatarUrl}
                      name={currentTopic.authorName}
                      size={40}
                    />
                    <View style={styles.authorMeta}>
                      <View style={styles.nameAndBadge}>
                        <Text style={[styles.authorName, { color: tc.text }]}>
                          {currentTopic.authorName}
                        </Text>
                        {topicBadge.isStaff ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.primary}
                          />
                        ) : null}
                        <View style={[styles.roleBadge, { backgroundColor: topicBadge.bg }]}>
                          <Ionicons name={topicBadge.icon as any} size={9} color={topicBadge.text} />
                          <Text style={[styles.roleBadgeText, { color: topicBadge.text }]}>
                            {topicBadge.label}
                          </Text>
                        </View>
                        {isTopicAuthor ? (
                          <View
                            style={[
                              styles.roleBadge,
                              { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                            ]}
                          >
                            <Text style={[styles.roleBadgeText, { color: tc.text }]}>
                              THREAD OWNER
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.timeAndCatSub}>
                        <Text style={[styles.postDate, { color: tc.textMuted }]}>
                          {formatTime(currentTopic.createdAt)}
                        </Text>
                        {hasUserChatted ? (
                          <View
                            style={[
                              styles.roleBadge,
                              {
                                backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                              },
                            ]}
                          >
                            <Ionicons
                              name="chatbubbles"
                              size={9}
                              color={isDark ? '#60A5FA' : '#1D4ED8'}
                            />
                            <Text
                              style={[
                                styles.roleBadgeText,
                                { color: isDark ? '#60A5FA' : '#1D4ED8' },
                              ]}
                            >
                              YOU CHATTED HERE
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Title & Body (Profanity Filtered) */}
                  <Text style={[styles.topicTitle, { color: tc.text }]}>
                    {filterProfanity(currentTopic.title)}
                  </Text>
                  <Text style={[styles.topicBody, { color: tc.text }]}>
                    {filterProfanity(currentTopic.content)}
                  </Text>

                  {/* Mention Box */}
                  {mentionDisplayNames.length > 0 ? (
                    <View
                      style={[
                        styles.mentionBox,
                        {
                          backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                          borderColor: isDark ? '#1E3A8A' : '#DBEAFE',
                        },
                      ]}
                    >
                      <Ionicons name="at-circle" size={17} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.mentionBoxTitle, { color: colors.primary }]}>
                          Tagged Members & Staff:
                        </Text>
                        <Text style={[styles.mentionBoxNames, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                          {mentionDisplayNames.join(', ')}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Like, Interested & Report Footer */}
                  <View style={[styles.topicFooter, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => void handleToggleTopicLike()}
                        style={({ pressed }) => [
                          styles.likeBtn,
                          {
                            backgroundColor: isTopicLiked
                              ? isDark
                                ? '#7F1D1D'
                                : '#FEE2E2'
                              : isDark
                                ? '#1E293B'
                                : '#F1F5F9',
                            borderColor: isTopicLiked ? '#F87171' : tc.border,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={isTopicLiked ? 'heart' : 'heart-outline'}
                          size={15}
                          color={isTopicLiked ? '#DC2626' : tc.textMuted}
                        />
                        <Text style={[styles.likeCount, { color: isTopicLiked ? '#DC2626' : tc.text }]}>
                          {currentTopic.likes} {currentTopic.likes === 1 ? 'Like' : 'Likes'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => void handleToggleTopicInterested()}
                        style={({ pressed }) => [
                          styles.likeBtn,
                          {
                            backgroundColor: isTopicInterested
                              ? isDark
                                ? '#2E2211'
                                : '#FFFBEB'
                              : isDark
                                ? '#1E293B'
                                : '#F1F5F9',
                            borderColor: isTopicInterested
                              ? isDark
                                ? '#B45309'
                                : '#FDE68A'
                              : tc.border,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isTopicInterested ? 'Interested in this topic' : 'Bookmark topic as Interested'
                        }
                      >
                        <Ionicons
                          name={isTopicInterested ? 'star' : 'star-outline'}
                          size={14}
                          color={isTopicInterested ? '#D97706' : tc.textMuted}
                        />
                        <Text
                          style={[
                            styles.likeCount,
                            {
                              color: isTopicInterested
                                ? isDark
                                  ? '#FBBF24'
                                  : '#92400E'
                                : tc.text,
                            },
                          ]}
                        >
                          {isTopicInterested ? 'Following' : 'Follow'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={openTopicActionSheet}
                        style={({ pressed }) => [
                          styles.likeBtn,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: tc.border,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Report topic to IT"
                      >
                        <Ionicons name="flag-outline" size={13} color={tc.textMuted} />
                        <Text style={[styles.likeCount, { color: tc.textMuted }]}>Report</Text>
                      </Pressable>
                    </View>

                    <Text style={[styles.repliesCountLabel, { color: tc.textMuted }]}>
                      {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </Text>
                  </View>
                </Pressable>

                {/* Section Header + Hold-Down Hint */}
                <View style={styles.repliesSectionHeader}>
                  <Text style={[styles.repliesSectionTitle, { color: tc.text }]}>
                    Replies & Discussion ({replies.length})
                  </Text>
                  <Text style={[styles.repliesSectionHint, { color: tc.textMuted }]}>
                    Hold down any reply or topic to report to IT or delete
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.emptyRepliesBox, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={34} color={tc.textMuted} />
                <Text style={[styles.emptyRepliesTitle, { color: tc.text }]}>No Replies Yet</Text>
                <Text style={[styles.emptyRepliesSubtitle, { color: tc.textMuted }]}>
                  Be the first to share advice, answer questions, or connect with the community below!
                </Text>
              </View>
            }
            renderItem={({ item: reply }) => {
              const replyBadge = roleBadge(reply.authorRole);
              const isReplyAuthor = reply.authorId === currentUserId;
              const canDeleteReply = isReplyAuthor || isTopicAuthor || isStaffUser;
              const isReplyLiked = (reply.likedBy ?? []).includes(currentUserId);

              return (
                <Pressable
                  onLongPress={() => openReplyActionSheet(reply)}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.replyCard,
                    {
                      backgroundColor: reply.isStaffReply
                        ? isDark
                          ? '#064E3B'
                          : '#ECFDF5'
                        : tc.cardBg,
                      borderColor: reply.isStaffReply
                        ? isDark
                          ? '#047857'
                          : '#A7F3D0'
                        : tc.cardBorder,
                      borderWidth: reply.isStaffReply ? 1.5 : 1,
                    },
                    pressed && { opacity: 0.94 },
                  ]}
                  accessibilityHint="Hold down to report reply to IT or delete"
                >
                  {/* Official Staff Response Banner */}
                  {reply.isStaffReply ? (
                    <View style={styles.staffResponseBanner}>
                      <Ionicons
                        name="shield-checkmark"
                        size={13}
                        color={isDark ? '#34D399' : '#047857'}
                      />
                      <Text style={[styles.staffResponseBannerText, { color: isDark ? '#34D399' : '#047857' }]}>
                        OFFICIAL YMCA STAFF RESPONSE
                      </Text>
                    </View>
                  ) : null}

                  {/* Reply Author Row */}
                  <View style={styles.replyAuthorRow}>
                    <UserAvatar uri={reply.authorAvatarUrl} name={reply.authorName} size={32} />
                    <View style={styles.replyAuthorMeta}>
                      <View style={styles.replyNameRow}>
                        <Text style={[styles.replyAuthorName, { color: tc.text }]}>
                          {reply.authorName}
                        </Text>
                        {replyBadge.isStaff ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={13}
                            color={colors.primary}
                          />
                        ) : null}
                        <View style={[styles.roleBadge, { backgroundColor: replyBadge.bg }]}>
                          <Ionicons name={replyBadge.icon as any} size={8} color={replyBadge.text} />
                          <Text style={[styles.roleBadgeText, { color: replyBadge.text }]}>
                            {replyBadge.label}
                          </Text>
                        </View>
                        {reply.authorId === currentTopic.authorId ? (
                          <View
                            style={[
                              styles.roleBadge,
                              { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                            ]}
                          >
                            <Text style={[styles.roleBadgeText, { color: tc.text }]}>OP</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.replyDate, { color: tc.textMuted }]}>
                        {formatTime(reply.createdAt)}
                      </Text>
                    </View>

                    {/* Report & Delete reply actions (Author, Thread Owner, Trainer, or IT/Staff Admin) */}
                    <View style={styles.replyTopRightActions}>
                      <Pressable
                        onPress={() => openReplyActionSheet(reply)}
                        hitSlop={8}
                        style={styles.replyActionIconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Report reply by ${reply.authorName} to IT`}
                      >
                        <Ionicons name="flag-outline" size={14} color={tc.textMuted} />
                      </Pressable>

                      {canDeleteReply ? (
                        <Pressable
                          onPress={() => void handleDeleteReply(reply.id)}
                          hitSlop={8}
                          style={styles.replyActionIconBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Delete reply"
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.scarlet} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {/* Reply Content (Profanity Filtered) */}
                  <Text style={[styles.replyContent, { color: tc.text }]}>
                    {filterProfanity(reply.content)}
                  </Text>

                  {/* Reply Footer Like Button */}
                  <View style={styles.replyFooter}>
                    <Pressable
                      onPress={() => void handleToggleReplyLike(reply)}
                      style={({ pressed }) => [
                        styles.replyLikePill,
                        {
                          backgroundColor: isReplyLiked
                            ? isDark
                              ? '#7F1D1D'
                              : '#FEE2E2'
                            : isDark
                              ? '#1E293B'
                              : '#F1F5F9',
                          borderColor: isReplyLiked ? '#F87171' : tc.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={isReplyLiked ? 'heart' : 'heart-outline'}
                        size={13}
                        color={isReplyLiked ? '#DC2626' : tc.textMuted}
                      />
                      <Text style={[styles.replyLikeText, { color: isReplyLiked ? '#DC2626' : tc.text }]}>
                        {reply.likes}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            }}
          />

          {/* Fixed Reply Composer at Bottom */}
          <View
            style={[
              styles.composerBar,
              {
                backgroundColor: tc.cardBg,
                borderTopColor: tc.border,
              },
            ]}
          >
            {/* Profanity Filter Live Notice */}
            {hasProfanityInDraft ? (
              <View
                style={[
                  styles.profanityNoticeBar,
                  {
                    backgroundColor: isDark ? '#422006' : '#FEF3C7',
                    borderColor: isDark ? '#B45309' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={14} color="#D97706" />
                <Text style={[styles.profanityNoticeText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                  YMCA Family-Friendly Filter: Profanity will be automatically censored (****).
                </Text>
              </View>
            ) : null}

            {/* Mention Autocomplete Popup */}
            <MentionAutocomplete
              text={replyText}
              onSelect={(cand, newText) => setReplyText(newText)}
            />

            {/* Quick 1-Tap Response Chips */}
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReactionsScroll}
            >
              {QUICK_REACTION_TEMPLATES.map((tmpl) => (
                <Pressable
                  key={tmpl}
                  onPress={() => handleQuickReactionPress(tmpl)}
                  style={[
                    styles.quickReactionChip,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: tc.border,
                    },
                  ]}
                >
                  <Text style={[styles.quickReactionChipText, { color: tc.text }]}>{tmpl}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Quick @ mention helper */}
            <View style={styles.quickMentionRow}>
              <Text style={[styles.quickMentionLabel, { color: tc.textMuted }]}>Tag:</Text>
              {['@All Staff Desk', '@Doc', '@Billy Deveaux', '@Jane Doe'].map((mention) => (
                <Pressable
                  key={mention}
                  onPress={() => setReplyText((prev) => (prev ? `${prev} ${mention} ` : `${mention} `))}
                  style={[
                    styles.quickMentionChip,
                    { backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF', borderColor: isDark ? '#1E3A8A' : '#BFDBFE' },
                  ]}
                >
                  <Text style={[styles.quickMentionChipText, { color: colors.primary }]}>{mention}</Text>
                </Pressable>
              ))}
            </View>

            {/* Input Row */}
            <View style={styles.composerInputRow}>
              {keyboardVisible || isFocused ? (
                <Pressable
                  onPress={handleDismissKeyboard}
                  style={({ pressed }) => [
                    styles.dismissKeyboardBtn,
                    {
                      backgroundColor: pressed
                        ? colors.primaryLight
                        : isDark
                          ? tc.background
                          : '#F1F5F9',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss keyboard"
                  hitSlop={8}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </Pressable>
              ) : null}

              <TextInput
                ref={inputRef}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[
                  styles.composerInput,
                  {
                    backgroundColor: tc.cardBg,
                    color: tc.text,
                    borderColor: tc.border,
                    fontSize: Math.round(15 * multiplier),
                    lineHeight: Math.round(20 * multiplier),
                  },
                ]}
                placeholder={
                  isStaffUser
                    ? 'Reply as official YMCA staff (type @ to tag)...'
                    : 'Write a reply or answer (type @ to tag)...'
                }
                placeholderTextColor={tc.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={1000}
              />

              <Pressable
                onPress={() => void handleSendReply()}
                disabled={submittingReply || !replyText.trim()}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: replyText.trim() ? colors.primary : tc.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send reply"
              >
                {submittingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={17} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* HOLD-DOWN REPORT TO IT & MODERATION SHEET MODAL */}
        <Modal
          visible={Boolean(actionTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => setActionTarget(null)}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setActionTarget(null)}>
            <Pressable
              style={[styles.sheetCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              {actionTarget ? (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons name="shield-half" size={20} color={colors.primary} />
                      <Text style={[styles.sheetTitle, { color: tc.text }]}>
                        {actionTarget.targetType === 'topic' ? 'Topic Options & IT Report' : 'Reply Options & IT Report'}
                      </Text>
                    </View>
                    <Pressable onPress={() => setActionTarget(null)} hitSlop={8}>
                      <Ionicons name="close" size={22} color={tc.textMuted} />
                    </Pressable>
                  </View>

                  <View
                    style={[
                      styles.sheetPreviewBox,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: tc.border,
                      },
                    ]}
                  >
                    <Text style={[styles.sheetPreviewAuthor, { color: tc.text }]}>
                      Posted by {actionTarget.authorName}
                    </Text>
                    <Text
                      style={[styles.sheetPreviewContent, { color: tc.textMuted }]}
                      numberOfLines={2}
                    >
                      "{filterProfanity(actionTarget.content)}"
                    </Text>
                  </View>

                  {/* Delete Option (for Reply Author, Thread Owner, Class Trainer, or IT/Staff Admin) */}
                  {actionTarget.canDelete ? (
                    <Pressable
                      onPress={() => {
                        if (actionTarget.targetType === 'topic') {
                          void handleDeleteTopic();
                        } else {
                          void handleDeleteReply(actionTarget.id);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.sheetDeleteBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${actionTarget.targetType}`}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetDeleteBtnTitle}>
                          Delete {actionTarget.targetType === 'topic' ? 'Discussion Topic' : 'Reply'}
                        </Text>
                        <Text style={styles.sheetDeleteBtnSub}>
                          Authorized as {actionTarget.deleteRoleLabel}
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}

                  {/* Report to IT Ticket Section */}
                  {reportSuccessTicket ? (
                    <View
                      style={[
                        styles.reportSuccessBox,
                        {
                          backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                          borderColor: isDark ? '#047857' : '#A7F3D0',
                        },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#15803D" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.reportSuccessTitle, { color: isDark ? '#34D399' : '#065F46' }]}>
                          IT Ticket #{reportSuccessTicket} Sent!
                        </Text>
                        <Text style={[styles.reportSuccessSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                          YMCA IT Systems (David Miller) has received your report and opened a support ticket for moderation review.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setActionTarget(null)}
                        style={[styles.doneReportBtn, { backgroundColor: '#15803D' }]}
                      >
                        <Text style={styles.doneReportBtnText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.reportFormWrap}>
                      <Text style={[styles.reportSectionLabel, { color: tc.text }]}>
                        Report to YMCA IT Support (Sends Ticket):
                      </Text>
                      <View style={styles.reasonsList}>
                        {REPORT_REASONS.map((reason) => {
                          const selected = selectedReason === reason;
                          return (
                            <Pressable
                              key={reason}
                              onPress={() => setSelectedReason(reason)}
                              style={[
                                styles.reasonOption,
                                {
                                  backgroundColor: selected
                                    ? isDark
                                      ? '#0C2A4A'
                                    : '#EFF6FF'
                                    : isDark
                                      ? '#1E293B'
                                      : '#F8FAFC',
                                  borderColor: selected ? colors.primary : tc.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                size={16}
                                color={selected ? colors.primary : tc.textMuted}
                              />
                              <Text
                                style={[
                                  styles.reasonOptionText,
                                  {
                                    color: selected ? colors.primary : tc.text,
                                    fontWeight: selected ? '700' : '500',
                                  },
                                ]}
                              >
                                {reason}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <TextInput
                        style={[
                          styles.reportNotesInput,
                          {
                            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                            color: tc.text,
                            borderColor: tc.border,
                          },
                        ]}
                        placeholder="Optional details for IT Support..."
                        placeholderTextColor={tc.textMuted}
                        value={reportDetails}
                        onChangeText={setReportDetails}
                        maxLength={250}
                      />

                      <Pressable
                        onPress={() => void handleSubmitReport()}
                        disabled={submittingReport}
                        style={({ pressed }) => [
                          styles.submitReportBtn,
                          { backgroundColor: colors.primary },
                          pressed && { opacity: 0.9 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Submit report and send ticket to IT"
                      >
                        {submittingReport ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="flag" size={16} color="#FFFFFF" />
                            <Text style={styles.submitReportBtnText}>
                              Report & Send Ticket to IT
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerCategoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionBtn: {
    minWidth: 34,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },
  topicHeaderContainer: {
    gap: 10,
    marginBottom: 2,
  },
  topicCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  nameAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  timeAndCatSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  postDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  topicBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  mentionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  mentionBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  mentionBoxNames: {
    fontSize: 12,
    fontWeight: '600',
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  repliesCountLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  repliesSectionHeader: {
    marginTop: 2,
    gap: 2,
  },
  repliesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  repliesSectionHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyRepliesBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  emptyRepliesTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyRepliesSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  replyCard: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  staffResponseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  staffResponseBannerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyAuthorMeta: {
    flex: 1,
    gap: 1,
  },
  replyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  replyAuthorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  replyDate: {
    fontSize: 10,
  },
  replyTopRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionIconBtn: {
    padding: 4,
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  replyLikePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  replyLikeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  composerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 7,
  },
  profanityNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  profanityNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  quickReactionsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  quickReactionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickReactionChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickMentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickMentionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickMentionChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickMentionChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dismissKeyboardBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheetCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetPreviewBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  sheetPreviewAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetPreviewContent: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  sheetDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  sheetDeleteBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
  },
  sheetDeleteBtnSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  reportFormWrap: {
    gap: 8,
  },
  reportSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  reasonsList: {
    gap: 6,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  reasonOptionText: {
    fontSize: 13,
  },
  reportNotesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  submitReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 2,
  },
  submitReportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reportSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportSuccessTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reportSuccessSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  doneReportBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  doneReportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
