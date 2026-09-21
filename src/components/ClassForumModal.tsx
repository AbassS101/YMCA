import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MentionAutocomplete } from '@/components/MentionAutocomplete';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { isAdminRole, type ClassForumPost, type ScheduleItem, type Staff } from '@/domain/types';
import { classForumRepo } from '@/repositories/classForumRepo';
import { UserAvatar } from '@/components/UserAvatar';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

function formatClassDate(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatClassTime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export type ClassForumModalProps = {
  visible: boolean;
  onClose: () => void;
  scheduleItem: ScheduleItem | null;
};

export function ClassForumModal({
  visible,
  onClose,
  scheduleItem,
}: ClassForumModalProps) {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const { multiplier } = useAccessibility();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<ClassForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [pinNewPost, setPinNewPost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [memberProfileName, setMemberProfileName] = useState<string>('');

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
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

  const currentUserId = session?.userId ?? '';
  const currentUserRole = session?.role ?? 'member';

  // Load current user details to get accurate display name and avatar
  useEffect(() => {
    if (!visible || !api || !currentUserId) return;
    void (async () => {
      try {
        if (currentUserRole === 'member') {
          const m = await api.getMember(currentUserId);
          setMemberProfileName(m.name);
        } else {
          const s = await api.getStaff(currentUserId);
          setStaffProfile(s);
        }
      } catch {
        // use fallback names
      }
    })();
  }, [api, currentUserId, currentUserRole, visible]);

  // Determine manager privileges
  const isITAdmin = currentUserRole === 'it_admin';
  const isStaffAdmin = currentUserRole === 'staff_admin' || currentUserRole === 'admin';
  const isOverallAdmin = isAdminRole(currentUserRole);

  const isClassTrainer = Boolean(
    currentUserRole === 'trainer' &&
      scheduleItem &&
      (scheduleItem.staffId === currentUserId ||
        (staffProfile?.name &&
          scheduleItem.instructorName.toLowerCase().includes(staffProfile.name.toLowerCase())))
  );

  const isClassManager = isOverallAdmin || isClassTrainer;

  const loadPosts = useCallback(async () => {
    if (!scheduleItem || !api) return;
    setLoading(true);
    try {
      const list = await classForumRepo.list(api, scheduleItem.id);
      setPosts(list);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [api, scheduleItem]);

  useEffect(() => {
    if (visible && scheduleItem) {
      void loadPosts();
    }
  }, [visible, scheduleItem, loadPosts]);

  const handleSendPost = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !scheduleItem || !api) return;

    setSubmitting(true);
    try {
      let authorName = memberProfileName || 'YMCA Member';
      let avatarUrl: string | undefined = undefined;

      if (currentUserRole !== 'member' && staffProfile) {
        authorName = staffProfile.name;
        avatarUrl = staffProfile.avatarUrl;
      }

      await classForumRepo.create(api, {
        classId: scheduleItem.id,
        authorId: currentUserId,
        authorName,
        authorRole: currentUserRole,
        authorAvatarUrl: avatarUrl,
        content: trimmed,
        pinned: isClassManager && pinNewPost,
      });

      setInputText('');
      setPinNewPost(false);
      await loadPosts();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not post message.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (post: ClassForumPost) => {
    if (!api) return;
    Alert.alert(
      'Delete Post',
      'Are you sure you want to remove this message from the class forum?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await classForumRepo.delete(api, post.id, currentUserId);
              await loadPosts();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete post.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = async (post: ClassForumPost) => {
    if (!api) return;
    try {
      await classForumRepo.togglePin(api, post.id, currentUserId);
      await loadPosts();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update pin status.');
    }
  };

  if (!scheduleItem) return null;

  const pinnedPosts = posts.filter((p) => p.pinned);
  const regularPosts = posts.filter((p) => !p.pinned);

  function roleBadge(role: string) {
    if (role === 'it_admin') {
      return { label: 'IT Admin', bg: '#F5F3FF', text: '#7C3AED', icon: 'shield-checkmark' };
    }
    if (role === 'staff_admin' || role === 'admin') {
      return { label: 'Staff Admin', bg: '#EFF6FF', text: colors.primary, icon: 'shield' };
    }
    if (role === 'trainer') {
      return { label: 'Trainer / Instructor', bg: '#F0FDF4', text: '#15803D', icon: 'barbell' };
    }
    return { label: 'Class Member', bg: '#F1F5F9', text: '#64748B', icon: 'person' };
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.modalScreen, { backgroundColor: tc.background }]}>
        {/* HEADER */}
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
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: tc.text }]} numberOfLines={1}>
                {scheduleItem.title}
              </Text>
            </View>
            <Text style={[styles.headerMeta, { color: tc.textMuted }]} numberOfLines={1}>
              {scheduleItem.instructorName} · {formatClassDate(scheduleItem.start)} · {formatClassTime(scheduleItem.start)} - {formatClassTime(scheduleItem.end)}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close class forum"
          >
            <Ionicons name="close-circle" size={28} color={tc.textMuted} />
          </Pressable>
        </View>

        {/* Link to General Community Forum */}
        <Pressable
          onPress={() => {
            onClose();
            router.push('/(member)/community-forum');
          }}
          style={[
            styles.generalForumNotice,
            {
              backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
              borderColor: isDark ? '#4338CA' : '#DDD6FE',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Looking for general community discussions? Open General Community Forum"
        >
          <Ionicons name="chatbubbles" size={16} color="#7C3AED" />
          <Text style={[styles.generalForumNoticeText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
            This chat is for {scheduleItem.title}. Looking for general YMCA topics? <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Open General Forum ›</Text>
          </Text>
        </Pressable>

        {/* FORUM MANAGEMENT STATUS BANNER */}
        <View
          style={[
            styles.managerBanner,
            {
              backgroundColor: isClassManager
                ? isITAdmin
                  ? '#FAF5FF'
                  : '#EFF6FF'
                : isDark
                  ? '#1E293B'
                  : '#F8FAFC',
              borderColor: isClassManager
                ? isITAdmin
                  ? '#C084FC'
                  : '#93C5FD'
                : tc.border,
            },
          ]}
        >
          <Ionicons
            name={isClassManager ? 'shield-checkmark' : 'people'}
            size={18}
            color={
              isClassManager
                ? isITAdmin
                  ? '#7C3AED'
                  : colors.primary
                : tc.textMuted
            }
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.managerBannerTitle,
                {
                  color: isClassManager
                    ? isITAdmin
                      ? '#7C3AED'
                      : colors.primary
                    : tc.text,
                },
              ]}
            >
              {isITAdmin
                ? 'IT Administrator · Full Community Moderation'
                : isStaffAdmin
                  ? 'Staff Administrator · Full Community Moderation'
                  : isClassTrainer
                    ? `Class Instructor (${scheduleItem.instructorName}) · Moderator`
                    : 'Class Community Forum & Discussion'}
            </Text>
            <Text style={[styles.managerBannerDesc, { color: tc.textMuted }]}>
              {isClassManager
                ? 'You can pin announcements and moderate community discussions for this class.'
                : `Managed by ${scheduleItem.instructorName} & YMCA IT Administration.`}
            </Text>
          </View>
        </View>

        {/* POSTS LIST */}
        <ScrollView
          contentContainerStyle={styles.postsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {loading && posts.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: tc.textMuted }]}>
                Loading class forum...
              </Text>
            </View>
          ) : null}

          {/* PINNED ANNOUNCEMENTS */}
          {pinnedPosts.length > 0 ? (
            <View style={{ gap: 10, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pin" size={16} color={colors.primary} />
                <Text style={[styles.pinnedHeader, { color: colors.primary }]}>
                  Pinned Announcements ({pinnedPosts.length})
                </Text>
              </View>
              {pinnedPosts.map((post) => renderPostCard(post, true))}
            </View>
          ) : null}

          {/* REGULAR COMMUNITY POSTS */}
          {regularPosts.length > 0 ? (
            <View style={{ gap: 10 }}>
              {pinnedPosts.length > 0 ? (
                <Text style={[styles.sectionHeader, { color: tc.textMuted }]}>
                  Community Discussion
                </Text>
              ) : null}
              {regularPosts.map((post) => renderPostCard(post, false))}
            </View>
          ) : null}

          {posts.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={38} color={tc.textMuted} />
              <Text style={[styles.emptyTitle, { color: tc.text }]}>No Messages Yet</Text>
              <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>
                Be the first to say hello, ask the instructor a question, or coordinate with classmates!
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* MESSAGE COMPOSER */}
        <View
          style={[
            styles.composerWrap,
            {
              backgroundColor: tc.cardBg,
              borderColor: tc.border,
              paddingBottom:
                keyboardVisible && keyboardHeight > 0
                  ? keyboardHeight
                  : keyboardVisible && Platform.OS === 'android'
                    ? 280
                    : Math.max(insets.bottom, 12),
            },
          ]}
        >
          {isClassManager ? (
            <View style={styles.pinToggleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pin-outline" size={16} color={colors.primary} />
                <Text style={[styles.pinToggleText, { color: tc.text }]}>
                  Pin as Instructor Announcement
                </Text>
              </View>
              <Switch
                value={pinNewPost}
                onValueChange={setPinNewPost}
                trackColor={{ false: '#E2E8F0', true: colors.primaryLight }}
                thumbColor={pinNewPost ? colors.primary : '#FFFFFF'}
              />
            </View>
          ) : null}

          {/* Discord-style Mention Autocomplete Popup */}
          <MentionAutocomplete
            text={inputText}
            onSelect={(cand, newText) => setInputText(newText)}
          />

          <View style={styles.inputRow}>
            {keyboardVisible || isFocused ? (
              <Pressable
                onPress={handleDismissKeyboard}
                style={({ pressed }) => [
                  styles.dismissKeyboardBtn,
                  {
                    backgroundColor: pressed
                      ? colors.primaryLight
                      : isDark
                        ? '#1E293B'
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
                  backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                  color: tc.text,
                  borderColor: tc.border,
                  fontSize: Math.round(15 * multiplier),
                  lineHeight: Math.round(20 * multiplier),
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                isClassManager
                  ? 'Post an update, tip, or announcement (type @ to tag)...'
                  : 'Ask instructor, share tips, or chat (type @ to tag)...'
              }
              placeholderTextColor={tc.textMuted}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={() => void handleSendPost()}
              disabled={submitting || inputText.trim() === ''}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.primary : tc.border,
                },
              ]}
              accessibilityLabel="Send message"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  function renderPostCard(post: ClassForumPost, isPinnedNotice: boolean) {
    const isAuthor = post.authorId === currentUserId;
    const canDelete = isAuthor || isClassManager;
    const badge = roleBadge(post.authorRole);

    return (
      <View
        key={post.id}
        style={[
          styles.postCard,
          {
            backgroundColor: isPinnedNotice
              ? isDark
                ? '#1E1B4B'
                : '#F5F3FF'
              : tc.cardBg,
            borderColor: isPinnedNotice ? '#A78BFA' : tc.cardBorder,
            borderWidth: isPinnedNotice ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.postTopRow}>
          <UserAvatar
            uri={post.authorAvatarUrl}
            name={post.authorName}
            size={36}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.authorName, { color: tc.text }]}>
                {post.authorName}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                <Ionicons name={badge.icon as any} size={11} color={badge.text} />
                <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
              {post.pinned ? (
                <View style={[styles.roleBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="pin" size={10} color="#D97706" />
                  <Text style={[styles.roleBadgeText, { color: '#B45309' }]}>PINNED</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.postDate, { color: tc.textMuted }]}>
              {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
              {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Action buttons (Pin/Unpin & Delete) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isClassManager ? (
              <Pressable
                onPress={() => void handleTogglePin(post)}
                style={styles.actionIconButton}
                hitSlop={8}
                accessibilityLabel={post.pinned ? 'Unpin announcement' : 'Pin announcement'}
              >
                <Ionicons
                  name={post.pinned ? 'pin' : 'pin-outline'}
                  size={18}
                  color={post.pinned ? '#D97706' : tc.textMuted}
                />
              </Pressable>
            ) : null}

            {canDelete ? (
              <Pressable
                onPress={() => void handleDeletePost(post)}
                style={styles.actionIconButton}
                hitSlop={8}
                accessibilityLabel="Delete message"
              >
                <Ionicons name="trash-outline" size={17} color={colors.scarlet} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={[styles.postContent, { color: tc.text }]}>
          {post.content}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  modalScreen: {
    flex: 1,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  managerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  managerBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  managerBannerDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  postsScroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  pinnedHeader: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  postCard: {
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  postTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  postDate: {
    fontSize: 11,
    marginTop: 2,
  },
  actionIconButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  composerWrap: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  pinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  pinToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 90,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissKeyboardBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  generalForumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  generalForumNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
