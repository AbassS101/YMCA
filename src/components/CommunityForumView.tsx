import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  FORUM_CATEGORIES,
  type AppNotification,
  type ForumTopic,
  type ForumTopicCategory,
  type ScheduleItem,
  type UserForumInterests,
} from '@/domain/types';
import { radii } from '@/theme/typography';
import { forumRepo } from '@/repositories/forumRepo';
import { classForumRepo } from '@/repositories/classForumRepo';
import { notificationRepo } from '@/repositories/notificationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { ForumTopicCard } from '@/components/ForumTopicCard';
import { NewTopicModal } from '@/components/NewTopicModal';
import { ForumTopicDetailModal } from '@/components/ForumTopicDetailModal';
import { ClassForumModal } from '@/components/ClassForumModal';
import { ReportContentSheet } from '@/components/chat/ReportContentSheet';
import { YHeader } from '@/components/YHeader';
import { colors } from '@/theme/colors';

const BRANCH_ID = 'silver-spring';

type FilterTab =
  | 'all'
  | 'interested'
  | 'recently_chatted'
  | 'staff_answered'
  | 'staff_asked'
  | 'my_topics'
  | 'chatted_or_created';

type ClassFilterTab = 'all' | 'interested' | 'recently_chatted';
type SpaceMode = 'general' | 'classes';

export type CommunityForumViewProps = {
  isTabScreen?: boolean;
  onBack?: () => void;
};

function formatClassTime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatClassDay(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function CommunityForumView({ isTabScreen = false, onBack }: CommunityForumViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const currentUserId = session?.userId ?? '';
  const currentUserRole = session?.role ?? 'member';

  const [spaceMode, setSpaceMode] = useState<SpaceMode>('general');
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [classes, setClasses] = useState<ScheduleItem[]>([]);
  const [interests, setInterests] = useState<UserForumInterests>({
    userId: currentUserId,
    categories: [],
    topicIds: [],
    classIds: [],
  });
  const [recentlyChattedClassIds, setRecentlyChattedClassIds] = useState<string[]>([]);
  const [unreadForumNotifs, setUnreadForumNotifs] = useState<AppNotification[]>([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [dismissedNotifBanner, setDismissedNotifBanner] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');
  const [activeClassFilterTab, setActiveClassFilterTab] = useState<ClassFilterTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<
    ForumTopicCategory | 'all' | 'interested' | 'recently_chatted' | 'my_topics'
  >('all');

  // Modals
  const [newTopicModalVisible, setNewTopicModalVisible] = useState(false);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>(undefined);
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedClassItem, setSelectedClassItem] = useState<ScheduleItem | null>(null);
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [reportingTopic, setReportingTopic] = useState<ForumTopic | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // User profiles
  const [userName, setUserName] = useState('YMCA Member');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!api || !currentUserId) return;
    void (async () => {
      try {
        if (currentUserRole === 'member') {
          const m = await api.getMember(currentUserId);
          setUserName(m.name);
          setUserAvatar(m.avatarUrl);
        } else {
          const s = await api.getStaff(currentUserId);
          setUserName(s.name);
          setUserAvatar(s.avatarUrl);
        }
      } catch {
        // fallback
      }
    })();
  }, [api, currentUserId, currentUserRole]);

  const canManage =
    currentUserRole === 'admin' ||
    currentUserRole === 'staff_admin' ||
    currentUserRole === 'it_admin' ||
    currentUserRole === 'staff' ||
    currentUserRole === 'trainer';

  const loadData = useCallback(async () => {
    if (!api) return;
    try {
      const [topicList, classList, userInterests, chattedClassIds, notifList] = await Promise.all([
        forumRepo.listTopics(api),
        scheduleRepo.listAll(api, BRANCH_ID).catch(() => []),
        currentUserId
          ? forumRepo.getInterests(api, currentUserId).catch(() => ({
              userId: currentUserId,
              categories: [],
              topicIds: [],
              classIds: [],
            }))
          : Promise.resolve({
              userId: '',
              categories: [],
              topicIds: [],
              classIds: [],
            }),
        currentUserId
          ? classForumRepo.listRecentlyChattedClassIds(api, currentUserId).catch(() => [])
          : Promise.resolve([]),
        currentUserId
          ? notificationRepo.list(api, currentUserId).catch(() => [])
          : Promise.resolve([]),
      ]);
      setTopics(topicList);
      setClasses(classList);
      setInterests(userInterests);
      setRecentlyChattedClassIds(chattedClassIds);
      setUnreadForumNotifs(
        notifList.filter(
          (n) =>
            !n.read &&
            (n.type === 'forum_mention' ||
              n.type === 'forum_reply' ||
              n.type === 'staff_inquiry' ||
              n.type === 'class_forum')
        )
      );
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Helper checks for topic status relative to currentUserId
  const isTopicInterested = useCallback(
    (topic: ForumTopic) => {
      if (!currentUserId) return false;
      return (
        (topic.interestedBy ?? []).includes(currentUserId) ||
        interests.topicIds.includes(topic.id) ||
        interests.categories.includes(topic.category)
      );
    },
    [currentUserId, interests]
  );

  const isTopicDirectInterested = useCallback(
    (topic: ForumTopic) => {
      if (!currentUserId) return false;
      return (
        (topic.interestedBy ?? []).includes(currentUserId) ||
        interests.topicIds.includes(topic.id)
      );
    },
    [currentUserId, interests]
  );

  const hasUserChattedInTopic = useCallback(
    (topic: ForumTopic) => {
      if (!currentUserId) return false;
      return (
        (topic.participantIds ?? []).includes(currentUserId) ||
        Boolean(topic.lastChattedAtBy?.[currentUserId])
      );
    },
    [currentUserId]
  );

  // Recently chatted topics list
  const recentlyChattedTopics = useMemo(() => {
    if (!currentUserId) return [];
    return topics
      .filter((t) => hasUserChattedInTopic(t))
      .sort((a, b) => {
        const aTime = a.lastChattedAtBy?.[currentUserId] ?? a.updatedAt;
        const bTime = b.lastChattedAtBy?.[currentUserId] ?? b.updatedAt;
        return bTime.localeCompare(aTime);
      });
  }, [topics, currentUserId, hasUserChattedInTopic]);

  // Recently chatted classes list
  const recentlyChattedClasses = useMemo(() => {
    if (recentlyChattedClassIds.length === 0) return [];
    const byId = new Map(classes.map((c) => [c.id, c]));
    return recentlyChattedClassIds
      .map((id) => byId.get(id))
      .filter((c): c is ScheduleItem => Boolean(c));
  }, [classes, recentlyChattedClassIds]);

  // Filtered topics
  const filteredTopics = useMemo(() => {
    const list = topics.filter((topic) => {
      // Category filter
      if (selectedCategory === 'interested') {
        if (!isTopicInterested(topic)) return false;
      } else if (selectedCategory === 'recently_chatted') {
        if (!hasUserChattedInTopic(topic)) return false;
      } else if (selectedCategory === 'my_topics') {
        if (topic.authorId !== currentUserId) return false;
      } else if (selectedCategory !== 'all' && topic.category !== selectedCategory) {
        return false;
      }

      // Primary Filter Tab
      if (activeFilterTab === 'interested' && !isTopicInterested(topic)) {
        return false;
      }
      if (activeFilterTab === 'recently_chatted' && !hasUserChattedInTopic(topic)) {
        return false;
      }
      if (activeFilterTab === 'my_topics' && topic.authorId !== currentUserId) {
        return false;
      }
      if (
        activeFilterTab === 'chatted_or_created' &&
        topic.authorId !== currentUserId &&
        !hasUserChattedInTopic(topic)
      ) {
        return false;
      }
      if (
        activeFilterTab === 'staff_asked' &&
        (!topic.mentionedStaffIds || topic.mentionedStaffIds.length === 0)
      ) {
        return false;
      }
      if (activeFilterTab === 'staff_answered' && !topic.hasStaffReply) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = topic.title.toLowerCase().includes(q);
        const matchBody = topic.content.toLowerCase().includes(q);
        const matchAuthor = topic.authorName.toLowerCase().includes(q);
        const matchStaff = topic.mentionedStaffNames?.some((n) => n.toLowerCase().includes(q));
        const matchUsers = topic.mentionedUserNames?.some((n) => n.toLowerCase().includes(q));
        if (!matchTitle && !matchBody && !matchAuthor && !matchStaff && !matchUsers) {
          return false;
        }
      }
      return true;
    });

    if (activeFilterTab === 'recently_chatted' || selectedCategory === 'recently_chatted') {
      return [...list].sort((a, b) => {
        const aTime = a.lastChattedAtBy?.[currentUserId] ?? a.updatedAt;
        const bTime = b.lastChattedAtBy?.[currentUserId] ?? b.updatedAt;
        return bTime.localeCompare(aTime);
      });
    }

    return list;
  }, [
    topics,
    selectedCategory,
    activeFilterTab,
    searchQuery,
    currentUserId,
    isTopicInterested,
    hasUserChattedInTopic,
  ]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (activeClassFilterTab === 'interested' && !interests.classIds.includes(c.id)) {
        return false;
      }
      if (activeClassFilterTab === 'recently_chatted' && !recentlyChattedClassIds.includes(c.id)) {
        return false;
      }
      if (classSearch.trim()) {
        const q = classSearch.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.instructorName.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [classes, classSearch, activeClassFilterTab, interests.classIds, recentlyChattedClassIds]);

  const handleCreateTopic = async (data: {
    title: string;
    content: string;
    category: ForumTopicCategory;
    pinned: boolean;
    mentionedStaffIds: string[];
    mentionedStaffNames: string[];
  }) => {
    if (!api || !currentUserId) return;
    const created = await forumRepo.createTopic(api, {
      ...data,
      authorId: currentUserId,
      authorName: userName,
      authorRole: currentUserRole,
      authorAvatarUrl: userAvatar,
    });
    setTopics((prev) => [created, ...prev]);
  };

  const handleToggleLike = async (topic: ForumTopic) => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleLikeTopic(api, topic.id, currentUserId);
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTopic?.id === updated.id) {
        setSelectedTopic(updated);
      }
    } catch {
      // noop
    }
  };

  const handleToggleInterestedTopic = async (topic: ForumTopic) => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleInterestedTopic(api, topic.id, currentUserId);
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTopic?.id === updated.id) {
        setSelectedTopic(updated);
      }
      const nextInterests = await forumRepo.getInterests(api, currentUserId);
      setInterests(nextInterests);
    } catch {
      // noop
    }
  };

  const handleToggleInterestedCategory = async (category: ForumTopicCategory) => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleInterestedCategory(api, currentUserId, category);
      setInterests(updated);
    } catch {
      // noop
    }
  };

  const handleToggleInterestedClass = async (classId: string) => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.toggleInterestedClass(api, currentUserId, classId);
      setInterests(updated);
    } catch {
      // noop
    }
  };

  const handleTogglePin = async (topic: ForumTopic) => {
    if (!api || !currentUserId) return;
    try {
      const updated = await forumRepo.togglePinTopic(api, topic.id, currentUserId);
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTopic?.id === updated.id) {
        setSelectedTopic(updated);
      }
    } catch {
      // noop
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!api || !currentUserId) return;
    try {
      await forumRepo.deleteTopic(api, topicId, currentUserId);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(null);
        setDetailModalVisible(false);
      }
    } catch {
      // noop
    }
  };

  const openTopicDetail = (topic: ForumTopic) => {
    setSelectedTopic(topic);
    setDetailModalVisible(true);
  };

  const openClassForum = (item: ScheduleItem) => {
    setSelectedClassItem(item);
    setClassModalVisible(true);
  };

  const handleOpenNotifItem = async (notif: AppNotification) => {
    if (!api || !currentUserId) return;
    try {
      await notificationRepo.markRead(api, notif.id, currentUserId);
      setUnreadForumNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    } catch {
      // ignore
    }

    if (notif.relatedId) {
      const matchTopic = topics.find((t) => t.id === notif.relatedId);
      if (matchTopic) {
        setSpaceMode('general');
        openTopicDetail(matchTopic);
        return;
      }
      const matchClass = classes.find((c) => c.id === notif.relatedId);
      if (matchClass) {
        setSpaceMode('classes');
        openClassForum(matchClass);
        return;
      }
    }
    router.push('/(member)/notifications');
  };

  const interestedCount = useMemo(() => {
    return topics.filter((t) => isTopicInterested(t)).length;
  }, [topics, isTopicInterested]);

  const myTopicsCount = useMemo(() => {
    return topics.filter((t) => t.authorId === currentUserId).length;
  }, [topics, currentUserId]);

  const moreFilterLabel = useMemo(() => {
    if (activeFilterTab === 'staff_answered') return 'Staff answered';
    if (activeFilterTab === 'recently_chatted') return 'Recent';
    if (activeFilterTab === 'my_topics') return 'My posts';
    if (selectedCategory !== 'all') {
      return FORUM_CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? null;
    }
    return null;
  }, [activeFilterTab, selectedCategory]);

  const openNewTopicWithTemplate = (templateId?: string) => {
    setInitialTemplateId(templateId);
    setNewTopicModalVisible(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      {/* Top Header */}
      {!isTabScreen ? (
        <View
          style={[
            styles.stackHeader,
            {
              paddingTop: Math.max(insets.top, 14),
              backgroundColor: tc.cardBg,
              borderBottomColor: tc.border,
            },
          ]}
        >
          <Pressable
            onPress={onBack ?? (() => router.back())}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={tc.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stackHeaderTitle, { color: tc.text }]}>YMCA Community Space</Text>
            <Text style={[styles.stackHeaderSub, { color: tc.textMuted }]}>
              Silver Spring Branch • Members & Staff Desk
            </Text>
          </View>
        </View>
      ) : (
        <YHeader subtitle="YMCA Community Space" />
      )}

      {/* Slim Unread Notifications Toast */}
      {unreadForumNotifs.length > 0 && !dismissedNotifBanner ? (
        <Pressable
          onPress={() => void handleOpenNotifItem(unreadForumNotifs[0])}
          style={[
            styles.notifBanner,
            {
              backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
              borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Unread forum notification: ${unreadForumNotifs[0].title}`}
        >
          <View style={[styles.notifIconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons
              name={unreadForumNotifs[0].type === 'forum_mention' ? 'at' : 'chatbubbles'}
              size={13}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.notifBannerTitle, { color: isDark ? '#E0F2FE' : '#002855' }]} numberOfLines={1}>
              {unreadForumNotifs[0].title}
              {unreadForumNotifs.length > 1 ? ` (+${unreadForumNotifs.length - 1} more)` : ''}
            </Text>
            <Text style={[styles.notifBannerBody, { color: isDark ? '#93C5FD' : '#00609C' }]} numberOfLines={1}>
              {unreadForumNotifs[0].body}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setDismissedNotifBanner(true);
            }}
            hitSlop={8}
            style={styles.notifDismissBtn}
          >
            <Ionicons name="close" size={16} color={tc.textMuted} />
          </Pressable>
        </Pressable>
      ) : null}

      {/* Segmented Mode Switcher: Discussions vs Class Chats */}
      <View style={[styles.spaceSwitcherWrap, { backgroundColor: tc.cardBg, borderBottomColor: tc.border }]}>
        <View style={[styles.spaceSwitcher, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Pressable
            onPress={() => setSpaceMode('general')}
            style={[
              styles.spaceSwitchBtn,
              spaceMode === 'general' && {
                backgroundColor: isDark ? '#00609C' : '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: 0.1,
                shadowRadius: 2.5,
                elevation: 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="General Community Forum"
          >
            <Ionicons
              name="chatbubbles"
              size={15}
              color={spaceMode === 'general' ? (isDark ? '#FFFFFF' : colors.primary) : tc.textMuted}
            />
            <Text
              style={[
                styles.spaceSwitchBtnText,
                {
                  color: spaceMode === 'general' ? (isDark ? '#FFFFFF' : colors.primaryDark) : tc.textMuted,
                  fontWeight: spaceMode === 'general' ? '800' : '600',
                },
              ]}
            >
              Discussions ({topics.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSpaceMode('classes')}
            style={[
              styles.spaceSwitchBtn,
              spaceMode === 'classes' && {
                backgroundColor: isDark ? '#00609C' : '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: 0.1,
                shadowRadius: 2.5,
                elevation: 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Class Discussions"
          >
            <Ionicons
              name="calendar"
              size={15}
              color={spaceMode === 'classes' ? (isDark ? '#FFFFFF' : colors.primary) : tc.textMuted}
            />
            <Text
              style={[
                styles.spaceSwitchBtnText,
                {
                  color: spaceMode === 'classes' ? (isDark ? '#FFFFFF' : colors.primaryDark) : tc.textMuted,
                  fontWeight: spaceMode === 'classes' ? '800' : '600',
                },
              ]}
            >
              Class Chats ({classes.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ===================== GENERAL COMMUNITY FORUM MODE ===================== */}
      {spaceMode === 'general' ? (
        <>
          {/* Streamlined Search & Feed Preferences Bar */}
          <View style={[styles.searchControlRow, { backgroundColor: tc.cardBg }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border }]}>
              <Ionicons name="search-outline" size={17} color={tc.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: tc.text }]}
                placeholder="Search topics, questions, @mentions..."
                placeholderTextColor={tc.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={tc.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Interests & Following Sheet Trigger */}
            <Pressable
              onPress={() => setShowInterestsModal(true)}
              style={[
                styles.interestsPillBtn,
                {
                  backgroundColor: interests.categories.length + interests.topicIds.length > 0
                    ? isDark ? '#2E2211' : '#FEF3C7'
                    : isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: interests.categories.length + interests.topicIds.length > 0
                    ? isDark ? '#B45309' : '#FDE68A'
                    : tc.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Manage following interests"
            >
              <Ionicons
                name={interests.categories.length + interests.topicIds.length > 0 ? 'star' : 'star-outline'}
                size={14}
                color={interests.categories.length + interests.topicIds.length > 0 ? '#D97706' : tc.textMuted}
              />
              <Text
                style={[
                  styles.interestsPillText,
                  {
                    color: interests.categories.length + interests.topicIds.length > 0
                      ? isDark ? '#FBBF24' : '#92400E'
                      : tc.text,
                  },
                ]}
              >
                Interests ({interests.categories.length + interests.topicIds.length})
              </Text>
            </Pressable>
          </View>

          {/* Compact filter row: All / Following / More */}
          <View style={[styles.filterBarContainer, { backgroundColor: tc.cardBg, borderBottomColor: tc.border }]}>
            <View style={styles.filterBarContent}>
              {[
                { key: 'all', label: `All ${topics.length}`, icon: 'apps-outline' as const, color: colors.primary },
                { key: 'interested', label: `Following ${interestedCount}`, icon: 'star' as const, color: '#D97706' },
              ].map((f) => {
                const active = activeFilterTab === f.key && selectedCategory === 'all';
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => {
                      setActiveFilterTab(f.key as FilterTab);
                      setSelectedCategory('all');
                    }}
                    style={[
                      styles.filterPill,
                      active
                        ? { backgroundColor: f.color, borderColor: f.color }
                        : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                    ]}
                  >
                    <Ionicons name={f.icon} size={13} color={active ? '#FFFFFF' : f.color} />
                    <Text style={[styles.filterPillText, { color: active ? '#FFFFFF' : tc.text }]}>{f.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setMoreFiltersOpen(true)}
                style={[
                  styles.filterPill,
                  moreFilterLabel
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel="More filters"
              >
                <Ionicons name="options-outline" size={13} color={moreFilterLabel ? '#FFFFFF' : colors.primary} />
                <Text style={[styles.filterPillText, { color: moreFilterLabel ? '#FFFFFF' : tc.text }]}>
                  {moreFilterLabel ?? 'More'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={moreFilterLabel ? '#FFFFFF' : tc.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Active Filter Clear Tag (if any) */}
          {(searchQuery || activeFilterTab !== 'all' || selectedCategory !== 'all') && (
            <View style={styles.activeFilterTagRow}>
              <Text style={[styles.activeFilterTagText, { color: tc.textMuted }]}>
                Filtered by:{' '}
                <Text style={{ fontWeight: '700', color: tc.text }}>
                  {searchQuery ? `"${searchQuery}"` : ''}
                  {activeFilterTab !== 'all' ? ` [${activeFilterTab.replace('_', ' ')}]` : ''}
                  {selectedCategory !== 'all' ? ` [${selectedCategory}]` : ''}
                </Text>{' '}
                ({filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'})
              </Text>
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilterTab('all');
                  setSelectedCategory('all');
                }}
                hitSlop={6}
              >
                <Text style={[styles.clearFilterLink, { color: colors.primary }]}>Clear All</Text>
              </Pressable>
            </View>
          )}

          {/* Topic Feed */}
          <FlatList
            data={filteredTopics}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 90 },
            ]}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyText, { color: tc.textMuted }]}>Loading community discussions...</Text>
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
                  <Ionicons name="chatbubbles-outline" size={48} color={tc.textMuted} />
                  <Text style={[styles.emptyTitle, { color: tc.text }]}>No Topics Found</Text>
                  <Text style={[styles.emptySub, { color: tc.textMuted }]}>
                    {searchQuery
                      ? `No discussions match "${searchQuery}". Try different keywords.`
                      : activeFilterTab === 'interested'
                        ? 'You have not followed any topics or categories yet. Tap "Interests" above or star topics you like!'
                        : activeFilterTab === 'recently_chatted'
                          ? "You haven't chatted in any topics yet. Reply to a thread to see it here!"
                          : activeFilterTab === 'my_topics'
                            ? "You haven't created any topics yet. Start a discussion!"
                            : 'Be the first to start a conversation in our YMCA community!'}
                  </Text>
                  <Pressable
                    onPress={() => openNewTopicWithTemplate()}
                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyActionBtnText}>Create New Topic</Text>
                  </Pressable>
                </View>
              )
            }
            renderItem={({ item }) => (
              <ForumTopicCard
                topic={item}
                currentUserId={currentUserId}
                canManage={canManage}
                isInterested={isTopicDirectInterested(item) || isTopicInterested(item)}
                hasRecentlyChatted={hasUserChattedInTopic(item)}
                onPress={() => openTopicDetail(item)}
                onLongPress={() => setReportingTopic(item)}
                onReport={() => setReportingTopic(item)}
                onToggleLike={() => void handleToggleLike(item)}
                onToggleInterested={() => void handleToggleInterestedTopic(item)}
                onTogglePin={() => void handleTogglePin(item)}
                onDelete={() => void handleDeleteTopic(item.id)}
              />
            )}
          />

          {/* Floating Action Button (FAB) for Instant Post */}
          <Pressable
            onPress={() => openNewTopicWithTemplate()}
            style={[
              styles.floatingFab,
              {
                backgroundColor: colors.primary,
                bottom: isTabScreen ? 16 : Math.max(insets.bottom, 16),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create new discussion"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.floatingFabText}>New Post</Text>
          </Pressable>
        </>
      ) : (
        /* ===================== CLASS DISCUSSIONS MODE ===================== */
        <>
          {/* Class Search Bar */}
          <View style={[styles.searchControlRow, { backgroundColor: tc.cardBg }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border }]}>
              <Ionicons name="search-outline" size={17} color={tc.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: tc.text }]}
                placeholder="Search class name, instructor, or room..."
                placeholderTextColor={tc.textMuted}
                value={classSearch}
                onChangeText={setClassSearch}
              />
              {classSearch ? (
                <Pressable onPress={() => setClassSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={tc.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Class Filter Tabs */}
          <View style={[styles.filterBarContainer, { backgroundColor: tc.cardBg, borderBottomColor: tc.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBarContent}
            >
              <Pressable
                onPress={() => setActiveClassFilterTab('all')}
                style={[
                  styles.filterPill,
                  activeClassFilterTab === 'all'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                ]}
              >
                <Ionicons
                  name="calendar"
                  size={13}
                  color={activeClassFilterTab === 'all' ? '#FFFFFF' : colors.primary}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: activeClassFilterTab === 'all' ? '#FFFFFF' : tc.text },
                  ]}
                >
                  All Classes ({classes.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveClassFilterTab('interested')}
                style={[
                  styles.filterPill,
                  activeClassFilterTab === 'interested'
                    ? { backgroundColor: '#D97706', borderColor: '#D97706' }
                    : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                ]}
              >
                <Ionicons
                  name="star"
                  size={13}
                  color={activeClassFilterTab === 'interested' ? '#FFFFFF' : '#D97706'}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: activeClassFilterTab === 'interested' ? '#FFFFFF' : tc.text },
                  ]}
                >
                  Starred ({interests.classIds.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveClassFilterTab('recently_chatted')}
                style={[
                  styles.filterPill,
                  activeClassFilterTab === 'recently_chatted'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                ]}
              >
                <Ionicons
                  name="chatbubbles"
                  size={13}
                  color={activeClassFilterTab === 'recently_chatted' ? '#FFFFFF' : colors.primary}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: activeClassFilterTab === 'recently_chatted' ? '#FFFFFF' : tc.text },
                  ]}
                >
                  Recently Chatted ({recentlyChattedClassIds.length})
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* Class List */}
          <FlatList
            data={filteredClasses}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 80 },
            ]}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyText, { color: tc.textMuted }]}>Loading class discussions...</Text>
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
                  <Ionicons name="calendar-outline" size={44} color={tc.textMuted} />
                  <Text style={[styles.emptyTitle, { color: tc.text }]}>No Classes Found</Text>
                  <Text style={[styles.emptySub, { color: tc.textMuted }]}>
                    {activeClassFilterTab === 'interested'
                      ? 'Star classes to filter them here for quick access.'
                      : activeClassFilterTab === 'recently_chatted'
                        ? "You haven't posted in any class chats yet."
                        : 'No class chats match your search query.'}
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const isClassInterested = interests.classIds.includes(item.id);
              const hasChattedClass = recentlyChattedClassIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => openClassForum(item)}
                  style={[
                    styles.classCard,
                    {
                      backgroundColor: tc.cardBg,
                      borderColor: tc.cardBorder,
                      borderWidth: 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat for ${item.title}`}
                >
                  <View style={styles.classCardLeft}>
                    <View style={[styles.classIconCircle, { backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF' }]}>
                      <Ionicons name="chatbubbles" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.classCardTitle, { color: tc.text }]}>{item.title}</Text>
                        {hasChattedClass ? (
                          <View
                            style={[
                              styles.classChattedBadge,
                              {
                                backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                                borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
                              },
                            ]}
                          >
                            <Ionicons
                              name="chatbubbles"
                              size={10}
                              color={isDark ? '#60A5FA' : '#1D4ED8'}
                            />
                            <Text
                              style={[
                                styles.classChattedBadgeText,
                                { color: isDark ? '#60A5FA' : '#1D4ED8' },
                              ]}
                            >
                              Active
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.classCardInstructor, { color: tc.textMuted }]}>
                        {item.instructorName} · {item.location}
                      </Text>
                      <Text style={[styles.classCardTime, { color: colors.primary }]}>
                        {formatClassDay(item.start)} at {formatClassTime(item.start)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.classCardRight}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        void handleToggleInterestedClass(item.id);
                      }}
                      hitSlop={8}
                      style={[
                        styles.classInterestBtn,
                        {
                          backgroundColor: isClassInterested
                            ? isDark
                              ? '#2E2211'
                              : '#FEF3C7'
                            : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                          borderColor: isClassInterested
                            ? isDark
                              ? '#B45309'
                              : '#FDE68A'
                            : tc.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isClassInterested ? 'Interested in class chat' : 'Mark class chat as Interested'
                      }
                    >
                      <Ionicons
                        name={isClassInterested ? 'star' : 'star-outline'}
                        size={15}
                        color={isClassInterested ? '#D97706' : tc.textMuted}
                      />
                    </Pressable>
                    <View style={styles.classOpenBtn}>
                      <Text style={[styles.classCardActionText, { color: colors.primary }]}>Open</Text>
                      <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}

      {/* FEED PREFERENCES & INTERESTS MODAL */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.interestsModalCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <View style={styles.interestsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="star" size={20} color="#D97706" />
                <Text style={[styles.interestsModalTitle, { color: tc.text }]}>
                  Community Feed Preferences
                </Text>
              </View>
              <Pressable onPress={() => setShowInterestsModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={tc.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.interestsModalSub, { color: tc.textMuted }]}>
              Follow topics and categories to customize your feed. You'll receive alerts when members or YMCA staff post updates.
            </Text>

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {FORUM_CATEGORIES.map((cat) => {
                const isCatInterested = interests.categories.includes(cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => void handleToggleInterestedCategory(cat.id)}
                    style={[
                      styles.interestSettingRow,
                      {
                        backgroundColor: isCatInterested
                          ? isDark ? '#2E2211' : '#FFFBEB'
                          : isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isCatInterested
                          ? isDark ? '#B45309' : '#FDE68A'
                          : tc.border,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Ionicons
                        name={cat.icon as any}
                        size={18}
                        color={isCatInterested ? '#D97706' : cat.color}
                      />
                      <Text
                        style={[
                          styles.interestSettingLabel,
                          { color: tc.text, fontWeight: isCatInterested ? '800' : '600' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </View>
                    <Ionicons
                      name={isCatInterested ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isCatInterested ? '#D97706' : tc.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.interestsModalActions}>
              <Pressable
                onPress={() => {
                  setActiveFilterTab('interested');
                  setShowInterestsModal(false);
                }}
                style={[styles.interestsFilterNowBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.interestsFilterNowBtnText}>View Followed Feed</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW TOPIC MODAL */}
      <NewTopicModal
        visible={newTopicModalVisible}
        onClose={() => setNewTopicModalVisible(false)}
        canPin={canManage}
        initialTemplateId={initialTemplateId}
        onSubmit={handleCreateTopic}
      />

      {/* TOPIC DETAIL & THREAD MODAL */}
      <ForumTopicDetailModal
        visible={detailModalVisible}
        topic={selectedTopic}
        onClose={() => setDetailModalVisible(false)}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        currentUserName={userName}
        currentUserAvatarUrl={userAvatar}
        api={api}
        onTopicUpdated={(updated) => {
          setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTopic(updated);
          if (currentUserId) {
            void forumRepo
              .getInterests(api, currentUserId)
              .then(setInterests)
              .catch(() => {});
          }
        }}
        onTopicDeleted={(id) => {
          setTopics((prev) => prev.filter((t) => t.id !== id));
        }}
      />

      {/* CLASS FORUM MODAL */}
      <ClassForumModal
        visible={classModalVisible}
        onClose={() => setClassModalVisible(false)}
        scheduleItem={selectedClassItem}
        isInterested={Boolean(selectedClassItem && interests.classIds.includes(selectedClassItem.id))}
        onToggleInterested={(classId) => void handleToggleInterestedClass(classId)}
        onPostCreated={(classId) => {
          setRecentlyChattedClassIds((prev) => [
            classId,
            ...prev.filter((id) => id !== classId),
          ]);
        }}
      />

      {/* MORE FILTERS MENU */}
      <Modal
        visible={moreFiltersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreFiltersOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMoreFiltersOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.interestsModalCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
          >
            <Text style={[styles.interestsModalTitle, { color: tc.text }]}>Filter discussions</Text>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 6 }}>
              {[
                { tab: 'staff_answered' as FilterTab, label: 'Staff answered', icon: 'shield-checkmark', color: '#15803D' },
                { tab: 'recently_chatted' as FilterTab, label: `Recent activity (${recentlyChattedTopics.length})`, icon: 'time-outline', color: colors.primary },
                { tab: 'my_topics' as FilterTab, label: `My posts (${myTopicsCount})`, icon: 'create-outline', color: colors.primary },
              ].map((o) => (
                <Pressable
                  key={o.tab}
                  onPress={() => {
                    setActiveFilterTab(o.tab);
                    setSelectedCategory('all');
                    setMoreFiltersOpen(false);
                  }}
                  style={[styles.interestSettingRow, { borderColor: activeFilterTab === o.tab ? colors.primary : tc.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={o.icon as any} size={18} color={o.color} />
                    <Text style={[styles.interestSettingLabel, { color: tc.text }]}>{o.label}</Text>
                  </View>
                </Pressable>
              ))}
              <Text style={[styles.interestsModalSub, { color: tc.textMuted, marginTop: 6 }]}>CATEGORIES</Text>
              {FORUM_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setActiveFilterTab('all');
                    setMoreFiltersOpen(false);
                  }}
                  style={[
                    styles.interestSettingRow,
                    { borderColor: selectedCategory === cat.id ? cat.color : tc.border },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                    <Text style={[styles.interestSettingLabel, { color: tc.text }]}>{cat.label}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* TOPIC REPORT (shared sheet) */}
      <ReportContentSheet
        visible={Boolean(reportingTopic)}
        authorName={reportingTopic?.authorName ?? ''}
        content={reportingTopic ? `${reportingTopic.title} - ${reportingTopic.content}` : ''}
        onClose={() => setReportingTopic(null)}
        onSubmit={async (reason, details) => {
          if (!api || !currentUserId || !reportingTopic) throw new Error('not ready');
          const res = await forumRepo.reportContent(api, {
            reporterId: currentUserId,
            reporterName: userName,
            reporterRole: currentUserRole,
            targetType: 'topic',
            targetId: reportingTopic.id,
            targetAuthorId: reportingTopic.authorId,
            targetAuthorName: reportingTopic.authorName,
            targetContent: `${reportingTopic.title} — ${reportingTopic.content}`,
            contextTitle: reportingTopic.title,
            reason,
            details,
          });
          return res.ticket.ticketNumber;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  stackHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  stackHeaderSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
  },
  headerNewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  notifIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  notifBannerBody: {
    fontSize: 11,
    marginTop: 1,
  },
  notifDismissBtn: {
    padding: 4,
  },
  spaceSwitcherWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spaceSwitcher: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  spaceSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  spaceSwitchBtnText: {
    fontSize: 13,
  },
  searchControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  interestsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
  },
  interestsPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterBarContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickPromptContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  promptNewText: {
    fontSize: 11,
    fontWeight: '800',
  },
  promptChipsRow: {
    gap: 6,
    paddingTop: 2,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeFilterTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  activeFilterTagText: {
    fontSize: 12,
  },
  clearFilterLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    marginTop: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingFab: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  floatingFabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
  },
  classCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  classChattedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  classChattedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  classCardInstructor: {
    fontSize: 12,
    fontWeight: '500',
  },
  classCardTime: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  classCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  classInterestBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  classCardActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  interestsModalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  interestsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interestsModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  interestsModalSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  interestSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  interestSettingLabel: {
    fontSize: 13,
  },
  interestsModalActions: {
    paddingTop: 8,
  },
  interestsFilterNowBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  interestsFilterNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
