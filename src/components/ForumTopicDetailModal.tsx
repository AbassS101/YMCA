import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
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
  FORUM_CATEGORIES,
  type ForumReply,
  type ForumTopic,
  type UserRole,
  type StaffRole,
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
  const categoryConfig =
    FORUM_CATEGORIES.find((c) => c.id === currentTopic.category) ?? FORUM_CATEGORIES[0];
  const topicBadge = roleBadge(currentTopic.authorRole);

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
      onTopicDeleted?.(currentTopic.id);
      onClose();
    } catch {
      // noop
    }
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !api || !currentUserId) return;

    setSubmittingReply(true);
    try {
      // Check for mentioned staff in reply
      const mentionedStaffIds: string[] = [];
      const lower = text.toLowerCase();
      if (lower.includes('@alex') || lower.includes('@staff-alex')) mentionedStaffIds.push('staff-alex');
      if (lower.includes('@sarah') || lower.includes('@staff-sarah')) mentionedStaffIds.push('staff-sarah');
      if (lower.includes('@marcus') || lower.includes('@desk') || lower.includes('@staff-desk'))
        mentionedStaffIds.push('staff-desk');
      if (lower.includes('@david') || lower.includes('@it') || lower.includes('@staff-itadmin'))
        mentionedStaffIds.push('staff-itadmin');
      if (lower.includes('@patricia') || lower.includes('@pat') || lower.includes('@staff-admin'))
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
      setTopicOverride((prev) =>
        prev
          ? {
              ...prev,
              replyCount: (prev.replyCount ?? 0) + 1,
              hasStaffReply: prev.hasStaffReply || isStaffUser,
            }
          : currentTopic
            ? {
                ...currentTopic,
                replyCount: (currentTopic.replyCount ?? 0) + 1,
                hasStaffReply: currentTopic.hasStaffReply || isStaffUser,
              }
            : null
      );

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
      setTopicOverride((prev) =>
        prev
          ? {
              ...prev,
              replyCount: Math.max(0, (prev.replyCount ?? 1) - 1),
            }
          : currentTopic
            ? {
                ...currentTopic,
                replyCount: Math.max(0, (currentTopic.replyCount ?? 1) - 1),
              }
            : null
      );
    } catch {
      // noop
    }
  };

  const bottomPadding =
    keyboardVisible && keyboardHeight > 0
      ? keyboardHeight
      : keyboardVisible && Platform.OS === 'android'
        ? 280
        : Math.max(insets.bottom, 12);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: tc.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: tc.cardBg,
              borderColor: tc.border,
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20) + 4,
              paddingLeft: Math.max(16, insets.left),
              paddingRight: Math.max(16, insets.right),
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
            <Ionicons name="arrow-back" size={22} color={tc.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={[styles.headerCategoryPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name={categoryConfig.icon as any} size={11} color={categoryConfig.color} />
              <Text style={[styles.headerCategoryText, { color: categoryConfig.color }]}>
                {categoryConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isStaffUser ? (
              <Pressable
                onPress={() => void handleToggleTopicPin()}
                hitSlop={8}
                style={styles.headerActionBtn}
                accessibilityLabel={currentTopic.pinned ? 'Unpin topic' : 'Pin topic'}
              >
                <Ionicons
                  name={currentTopic.pinned ? 'pin' : 'pin-outline'}
                  size={18}
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
                <Ionicons name="trash-outline" size={18} color={colors.scarlet} />
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
                {/* Main Topic Card */}
                <View
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: tc.cardBg,
                      borderColor: currentTopic.pinned ? '#F59E0B' : tc.cardBorder,
                      borderWidth: currentTopic.pinned ? 1.5 : 1,
                    },
                  ]}
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
                        <View style={[styles.roleBadge, { backgroundColor: topicBadge.bg }]}>
                          <Ionicons name={topicBadge.icon as any} size={10} color={topicBadge.text} />
                          <Text style={[styles.roleBadgeText, { color: topicBadge.text }]}>
                            {topicBadge.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.postDate, { color: tc.textMuted }]}>
                        {formatTime(currentTopic.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Body */}
                  <Text style={[styles.topicTitle, { color: tc.text }]}>{currentTopic.title}</Text>
                  <Text style={[styles.topicBody, { color: tc.text }]}>{currentTopic.content}</Text>

                  {/* Mention Box */}
                  {currentTopic.mentionedStaffNames && currentTopic.mentionedStaffNames.length > 0 ? (
                    <View
                      style={[
                        styles.mentionBox,
                        {
                          backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                          borderColor: isDark ? '#4338CA' : '#C7D2FE',
                        },
                      ]}
                    >
                      <Ionicons name="at-circle" size={18} color="#4F46E5" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mentionBoxTitle}>Tagged Staff:</Text>
                        <Text style={styles.mentionBoxNames}>
                          {currentTopic.mentionedStaffNames.join(', ')}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Like Button & Stats */}
                  <View style={[styles.topicFooter, { borderTopColor: tc.border }]}>
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
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={isTopicLiked ? 'heart' : 'heart-outline'}
                        size={16}
                        color={isTopicLiked ? '#DC2626' : tc.textMuted}
                      />
                      <Text style={[styles.likeCount, { color: isTopicLiked ? '#DC2626' : tc.text }]}>
                        {currentTopic.likes} {currentTopic.likes === 1 ? 'Like' : 'Likes'}
                      </Text>
                    </Pressable>

                    <Text style={[styles.repliesCountLabel, { color: tc.textMuted }]}>
                      {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </Text>
                  </View>
                </View>

                {/* Section Header */}
                <View style={styles.repliesSectionHeader}>
                  <Text style={[styles.repliesSectionTitle, { color: tc.text }]}>
                    Discussion & Answers
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyRepliesBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={tc.textMuted} />
                <Text style={[styles.emptyRepliesTitle, { color: tc.text }]}>No Replies Yet</Text>
                <Text style={[styles.emptyRepliesSubtitle, { color: tc.textMuted }]}>
                  Be the first to share an answer, workout tip, or message the community below!
                </Text>
              </View>
            }
            renderItem={({ item: reply }) => {
              const replyBadge = roleBadge(reply.authorRole);
              const isReplyAuthor = reply.authorId === currentUserId;
              const isReplyLiked = (reply.likedBy ?? []).includes(currentUserId);

              return (
                <View
                  style={[
                    styles.replyCard,
                    {
                      backgroundColor: reply.isStaffReply
                        ? isDark
                          ? '#064E3B'
                          : '#F0FDF4'
                        : tc.cardBg,
                      borderColor: reply.isStaffReply ? '#22C55E' : tc.cardBorder,
                      borderWidth: reply.isStaffReply ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Official Staff Response Banner */}
                  {reply.isStaffReply ? (
                    <View style={styles.staffResponseBanner}>
                      <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
                      <Text style={styles.staffResponseBannerText}>OFFICIAL YMCA RESPONSE</Text>
                    </View>
                  ) : null}

                  {/* Reply Author Row */}
                  <View style={styles.replyAuthorRow}>
                    <UserAvatar uri={reply.authorAvatarUrl} name={reply.authorName} size={30} />
                    <View style={styles.replyAuthorMeta}>
                      <View style={styles.replyNameRow}>
                        <Text style={[styles.replyAuthorName, { color: tc.text }]}>
                          {reply.authorName}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: replyBadge.bg }]}>
                          <Ionicons name={replyBadge.icon as any} size={9} color={replyBadge.text} />
                          <Text style={[styles.roleBadgeText, { color: replyBadge.text }]}>
                            {replyBadge.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.replyDate, { color: tc.textMuted }]}>
                        {formatTime(reply.createdAt)}
                      </Text>
                    </View>

                    {/* Delete reply if author or admin */}
                    {isReplyAuthor || isStaffUser ? (
                      <Pressable
                        onPress={() => void handleDeleteReply(reply.id)}
                        hitSlop={8}
                        style={styles.replyDeleteBtn}
                        accessibilityLabel="Delete reply"
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.scarlet} />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Reply Content */}
                  <Text style={[styles.replyContent, { color: tc.text }]}>{reply.content}</Text>

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
                </View>
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
            {/* Mention Autocomplete Popup */}
            <MentionAutocomplete
              text={replyText}
              onSelect={(cand, newText) => setReplyText(newText)}
            />

            {/* Quick @ mention helper */}
            <View style={styles.quickMentionRow}>
              <Text style={[styles.quickMentionLabel, { color: tc.textMuted }]}>Quick Mention:</Text>
              {['@All Staff Desk', '@Alex Rivera', '@David Miller'].map((mention) => (
                <Pressable
                  key={mention}
                  onPress={() => setReplyText((prev) => (prev ? `${prev} ${mention} ` : `${mention} `))}
                  style={[styles.quickMentionChip, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}
                >
                  <Text style={styles.quickMentionChipText}>{mention}</Text>
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
                  accessibilityLabel="Put keyboard down"
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
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
    gap: 10,
  },
  headerActionBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  topicHeaderContainer: {
    gap: 14,
    marginBottom: 4,
  },
  topicCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
  authorName: {
    fontSize: 15,
    fontWeight: '700',
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
    color: '#4F46E5',
  },
  mentionBoxNames: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730A3',
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
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
    marginTop: 4,
  },
  repliesSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyRepliesBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyRepliesTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyRepliesSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  replyCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  staffResponseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  },
  replyAuthorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  replyDate: {
    fontSize: 10,
  },
  replyDeleteBtn: {
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
  },
  replyLikeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  composerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  quickMentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickMentionLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  quickMentionChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  quickMentionChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
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
});
