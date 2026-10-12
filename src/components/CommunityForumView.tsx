import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { YHeader } from '@/components/YHeader';
import { colors } from '@/theme/colors';

const BRANCH_ID = 'silver-spring';

type FilterTab =
  | 'all'
  | 'interested'
  | 'recently_chatted'
  | 'my_topics'
  | 'chatted_or_created'
  | 'staff_asked'
  | 'staff_answered';

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
  const [showInterestsSelector, setShowInterestsSelector] = useState(false);

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
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedClassItem, setSelectedClassItem] = useState<ScheduleItem | null>(null);
  const [classModalVisible, setClassModalVisible] = useState(false);

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

  // Recently chatted topics list (sorted by most recent chat by current user)
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
      // Category bar filter
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

  const chattedOrCreatedCount = useMemo(() => {
    return topics.filter(
      (t) => t.authorId === currentUserId || hasUserChattedInTopic(t)
    ).length;
  }, [topics, currentUserId, hasUserChattedInTopic]);

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
              General Forum, Discussions & Staff Desk Q&A
            </Text>
          </View>
          {spaceMode === 'general' ? (
            <Pressable
              onPress={() => setNewTopicModalVisible(true)}
              style={[styles.headerNewBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Create new topic"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.headerNewBtnText}>Post</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <YHeader subtitle="YMCA Community Space" />
      )}

      {/* Unread Replies & @Mentions Notification Banner */}
      {unreadForumNotifs.length > 0 ? (
        <Pressable
          onPress={() => void handleOpenNotifItem(unreadForumNotifs[0])}
          style={[
            styles.notifBanner,
            {
              backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
              borderColor: isDark ? '#4338CA' : '#818CF8',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Unread forum notification: ${unreadForumNotifs[0].title}`}
        >
          <View style={[styles.notifIconCircle, { backgroundColor: '#4F46E5' }]}>
            <Ionicons
              name={unreadForumNotifs[0].type === 'forum_mention' ? 'at' : 'chatbubbles'}
              size={15}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifBannerTitle, { color: isDark ? '#E0E7FF' : '#312E81' }]} numberOfLines={1}>
              {unreadForumNotifs[0].title}
              {unreadForumNotifs.length > 1 ? ` (+${unreadForumNotifs.length - 1} more)` : ''}
            </Text>
            <Text style={[styles.notifBannerBody, { color: isDark ? '#A5B4FC' : '#4338CA' }]} numberOfLines={1}>
              {unreadForumNotifs[0].body}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push('/(member)/notifications');
            }}
            style={styles.notifViewAllBtn}
          >
            <Text style={styles.notifViewAllText}>Inbox ›</Text>
          </Pressable>
        </Pressable>
      ) : null}

      {/* Mode Switcher: General Forum vs Class Discussions */}
      <View style={[styles.spaceSwitcherWrap, { backgroundColor: tc.cardBg, borderBottomColor: tc.border }]}>
        <View style={[styles.spaceSwitcher, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Pressable
            onPress={() => setSpaceMode('general')}
            style={[
              styles.spaceSwitchBtn,
              spaceMode === 'general' && {
                backgroundColor: colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="General Community Forum"
          >
            <Ionicons
              name="chatbubbles"
              size={15}
              color={spaceMode === 'general' ? '#FFFFFF' : colors.primary}
            />
            <Text
              style={[
                styles.spaceSwitchBtnText,
                { color: spaceMode === 'general' ? '#FFFFFF' : tc.text },
              ]}
            >
              General Forum ({topics.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSpaceMode('classes')}
            style={[
              styles.spaceSwitchBtn,
              spaceMode === 'classes' && {
                backgroundColor: colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Class Discussions"
          >
            <Ionicons
              name="calendar"
              size={15}
              color={spaceMode === 'classes' ? '#FFFFFF' : colors.primary}
            />
            <Text
              style={[
                styles.spaceSwitchBtnText,
                { color: spaceMode === 'classes' ? '#FFFFFF' : tc.text },
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
          {/* Top Banner & Call to Action */}
          <View style={[styles.topBar, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people" size={18} color={colors.primary} />
                <Text style={[styles.topTitle, { color: tc.text }]}>YMCA General Community Space</Text>
              </View>
              <Text style={[styles.topSubtitle, { color: tc.textMuted }]}>
                Select forums you are interested in, jump into recently chatted threads, and tag members or staff with @.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => setShowInterestsSelector((prev) => !prev)}
                style={[
                  styles.interestsBtn,
                  {
                    backgroundColor: showInterestsSelector
                      ? '#FEF3C7'
                      : isDark
                        ? '#1E293B'
                        : '#F8FAFC',
                    borderColor: '#F59E0B',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Select forums you are interested in"
              >
                <Ionicons name="star" size={15} color="#D97706" />
                <Text style={[styles.interestsBtnText, { color: '#B45309' }]}>
                  Interests ({interests.categories.length + interests.topicIds.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setNewTopicModalVisible(true)}
                style={[styles.newTopicBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Create new forum topic"
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.newTopicBtnText}>New Topic</Text>
              </Pressable>
            </View>
          </View>

          {/* Select Interested Forums Panel */}
          {showInterestsSelector ? (
            <View
              style={[
                styles.interestsPanel,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFBEB',
                  borderColor: '#FCD34D',
                },
              ]}
            >
              <View style={styles.interestsPanelHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="star" size={16} color="#D97706" />
                  <Text style={[styles.interestsPanelTitle, { color: tc.text }]}>
                    Select Forums You Are Interested In
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setActiveFilterTab('interested');
                    setShowInterestsSelector(false);
                  }}
                >
                  <Text style={[styles.filterNowLink, { color: colors.primary }]}>
                    Filter by Interests ›
                  </Text>
                </Pressable>
              </View>
              <Text style={[styles.interestsPanelSub, { color: tc.textMuted }]}>
                Tap forum categories below to follow them (or star individual topics). You will also be notified when people reply in forums you follow.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.interestsCategoryList}
              >
                {FORUM_CATEGORIES.map((cat) => {
                  const isInterestedCat = interests.categories.includes(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => void handleToggleInterestedCategory(cat.id)}
                      style={[
                        styles.interestCatChip,
                        {
                          backgroundColor: isInterestedCat
                            ? '#D97706'
                            : isDark
                              ? tc.cardBg
                              : '#FFFFFF',
                          borderColor: isInterestedCat ? '#B45309' : tc.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${cat.label} forum interest`}
                    >
                      <Ionicons
                        name={isInterestedCat ? 'star' : (cat.icon as any)}
                        size={13}
                        color={isInterestedCat ? '#FFFFFF' : cat.color}
                      />
                      <Text
                        style={[
                          styles.interestCatChipText,
                          { color: isInterestedCat ? '#FFFFFF' : tc.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Search Bar */}
          <View style={[styles.searchRow, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <Ionicons name="search-outline" size={18} color={tc.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: tc.text }]}
              placeholder="Search discussions, topics, @mentions..."
              placeholderTextColor={tc.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={tc.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Primary Filter Tabs */}
          <View style={styles.filterTabsRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { id: 'all', label: `All (${topics.length})`, icon: 'chatbubbles' },
                { id: 'interested', label: `Interested (${interestedCount})`, icon: 'star' },
                {
                  id: 'recently_chatted',
                  label: `Recently Chatted (${recentlyChattedTopics.length})`,
                  icon: 'time',
                },
                { id: 'my_topics', label: `Created by Me (${myTopicsCount})`, icon: 'create' },
                {
                  id: 'chatted_or_created',
                  label: `Chatted & Created (${chattedOrCreatedCount})`,
                  icon: 'flame',
                },
                { id: 'staff_asked', label: '@ Staff Asked', icon: 'at' },
                { id: 'staff_answered', label: '✓ Staff Answered', icon: 'checkmark-circle' },
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.filterTabsContent}
              renderItem={({ item }) => {
                const isSelected = activeFilterTab === item.id;
                return (
                  <Pressable
                    onPress={() => setActiveFilterTab(item.id as FilterTab)}
                    style={[
                      styles.filterTabPill,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDark
                            ? tc.cardBg
                            : '#F1F5F9',
                        borderColor: isSelected ? colors.primary : tc.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${item.label}`}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.filterTabText,
                        { color: isSelected ? '#FFFFFF' : tc.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Category Chips Scroll (includes Interested, Recently Chatted, Created by Me, plus Forum Categories) */}
          <View style={styles.categoriesBar}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { id: 'all', label: 'All Categories', icon: 'apps-outline', color: colors.primary },
                { id: 'interested', label: '⭐ Interested Forums', icon: 'star', color: '#D97706' },
                {
                  id: 'recently_chatted',
                  label: '💬 Recently Chatted',
                  icon: 'chatbubbles',
                  color: '#4F46E5',
                },
                { id: 'my_topics', label: '✍️ Created by Me', icon: 'create', color: '#15803D' },
                ...FORUM_CATEGORIES,
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoriesContent}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.id;
                const isCatInterested = interests.categories.includes(item.id as ForumTopicCategory);
                return (
                  <Pressable
                    onPress={() => setSelectedCategory(item.id as any)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#1E293B'
                            : '#E0F2FE'
                          : isDark
                            ? tc.cardBg
                            : '#FFFFFF',
                        borderColor: isSelected
                          ? colors.primary
                          : isCatInterested
                            ? '#F59E0B'
                            : tc.border,
                      },
                    ]}
                  >
                    {isCatInterested ? (
                      <Ionicons name="star" size={11} color="#D97706" />
                    ) : null}
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: isSelected ? colors.primary : tc.text,
                          fontWeight: isSelected || isCatInterested ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Topic List */}
          <FlatList
            data={filteredTopics}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 80 },
            ]}
            ListHeaderComponent={
              recentlyChattedTopics.length > 0 &&
              activeFilterTab !== 'recently_chatted' &&
              selectedCategory !== 'recently_chatted' ? (
                <View
                  style={[
                    styles.recentChattedSection,
                    {
                      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                      borderColor: isDark ? '#3730A3' : '#C7D2FE',
                    },
                  ]}
                >
                  <View style={styles.recentChattedHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="chatbubbles" size={15} color="#4F46E5" />
                      <Text style={[styles.recentChattedTitle, { color: isDark ? '#E0E7FF' : '#312E81' }]}>
                        Recently Chatted In ({recentlyChattedTopics.length})
                      </Text>
                    </View>
                    <Pressable onPress={() => setActiveFilterTab('recently_chatted')}>
                      <Text style={styles.recentChattedFilterLink}>Filter All ›</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentChattedScroll}
                  >
                    {recentlyChattedTopics.map((rt) => (
                      <Pressable
                        key={rt.id}
                        onPress={() => openTopicDetail(rt)}
                        style={[
                          styles.recentChattedChip,
                          {
                            backgroundColor: isDark ? tc.cardBg : '#FFFFFF',
                            borderColor: isDark ? '#4338CA' : '#A5B4FC',
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Recently chatted forum: ${rt.title}`}
                      >
                        <Text
                          style={[styles.recentChattedChipTitle, { color: tc.text }]}
                          numberOfLines={1}
                        >
                          {rt.title}
                        </Text>
                        <View style={styles.recentChattedChipMeta}>
                          <Ionicons name="chatbubble-ellipses" size={11} color="#4F46E5" />
                          <Text style={styles.recentChattedChipReplies}>
                            {rt.replyCount} {rt.replyCount === 1 ? 'reply' : 'replies'}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyText, { color: tc.textMuted }]}>Loading community discussions...</Text>
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={44} color={tc.textMuted} />
                  <Text style={[styles.emptyTitle, { color: tc.text }]}>No Topics Found</Text>
                  <Text style={[styles.emptySub, { color: tc.textMuted }]}>
                    {searchQuery
                      ? `No topics match "${searchQuery}". Try different keywords.`
                      : activeFilterTab === 'interested' || selectedCategory === 'interested'
                        ? 'You have no matching interested forums yet. Tap "Interests" above or star topics you want to follow!'
                        : activeFilterTab === 'recently_chatted' || selectedCategory === 'recently_chatted'
                          ? "You haven't chatted in any forum threads yet. Reply to a discussion to see it here!"
                          : activeFilterTab === 'chatted_or_created'
                            ? "You haven't chatted in or created any topics yet."
                            : activeFilterTab === 'staff_asked'
                              ? 'No topics currently tag staff for inquiries.'
                              : activeFilterTab === 'staff_answered'
                                ? 'No topics have staff responses yet.'
                                : activeFilterTab === 'my_topics' || selectedCategory === 'my_topics'
                                  ? "You haven't posted any topics yet. Start a discussion!"
                                  : 'Be the first to start a conversation in our YMCA community!'}
                  </Text>
                  <Pressable
                    onPress={() => setNewTopicModalVisible(true)}
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
                onToggleLike={() => void handleToggleLike(item)}
                onToggleInterested={() => void handleToggleInterestedTopic(item)}
                onTogglePin={() => void handleTogglePin(item)}
                onDelete={() => void handleDeleteTopic(item.id)}
              />
            )}
          />
        </>
      ) : (
        /* ===================== CLASS DISCUSSIONS MODE ===================== */
        <>
          {/* Class Discussions Top Banner */}
          <View style={[styles.topBar, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="fitness" size={18} color={colors.primary} />
                <Text style={[styles.topTitle, { color: tc.text }]}>Class Chats & Announcements</Text>
              </View>
              <Text style={[styles.topSubtitle, { color: tc.textMuted }]}>
                Filter by classes you are interested in or recently chatted in, and tag instructors or classmates with @.
              </Text>
            </View>
          </View>

          {/* Class Search Bar */}
          <View style={[styles.searchRow, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <Ionicons name="search-outline" size={18} color={tc.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: tc.text }]}
              placeholder="Search classes, instructors, or rooms..."
              placeholderTextColor={tc.textMuted}
              value={classSearch}
              onChangeText={setClassSearch}
            />
            {classSearch ? (
              <Pressable onPress={() => setClassSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={tc.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Class Filter Tabs */}
          <View style={styles.filterTabsRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { id: 'all', label: `All Classes (${classes.length})`, icon: 'calendar' },
                {
                  id: 'interested',
                  label: `Interested (${interests.classIds.length})`,
                  icon: 'star',
                },
                {
                  id: 'recently_chatted',
                  label: `Recently Chatted (${recentlyChattedClassIds.length})`,
                  icon: 'chatbubbles',
                },
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.filterTabsContent}
              renderItem={({ item }) => {
                const isSelected = activeClassFilterTab === item.id;
                return (
                  <Pressable
                    onPress={() => setActiveClassFilterTab(item.id as ClassFilterTab)}
                    style={[
                      styles.filterTabPill,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDark
                            ? tc.cardBg
                            : '#F1F5F9',
                        borderColor: isSelected ? colors.primary : tc.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.filterTabText,
                        { color: isSelected ? '#FFFFFF' : tc.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
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
            ListHeaderComponent={
              recentlyChattedClasses.length > 0 && activeClassFilterTab !== 'recently_chatted' ? (
                <View
                  style={[
                    styles.recentChattedSection,
                    {
                      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                      borderColor: isDark ? '#3730A3' : '#C7D2FE',
                    },
                  ]}
                >
                  <View style={styles.recentChattedHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="chatbubbles" size={15} color="#4F46E5" />
                      <Text style={[styles.recentChattedTitle, { color: isDark ? '#E0E7FF' : '#312E81' }]}>
                        Recently Chatted Classes ({recentlyChattedClasses.length})
                      </Text>
                    </View>
                    <Pressable onPress={() => setActiveClassFilterTab('recently_chatted')}>
                      <Text style={styles.recentChattedFilterLink}>Filter All ›</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentChattedScroll}
                  >
                    {recentlyChattedClasses.map((rc) => (
                      <Pressable
                        key={rc.id}
                        onPress={() => openClassForum(rc)}
                        style={[
                          styles.recentChattedChip,
                          {
                            backgroundColor: isDark ? tc.cardBg : '#FFFFFF',
                            borderColor: isDark ? '#4338CA' : '#A5B4FC',
                          },
                        ]}
                      >
                        <Text
                          style={[styles.recentChattedChipTitle, { color: tc.text }]}
                          numberOfLines={1}
                        >
                          {rc.title}
                        </Text>
                        <Text style={styles.recentChattedChipReplies} numberOfLines={1}>
                          {rc.instructorName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null
            }
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
                      ? 'Star classes you are interested in to filter them here.'
                      : activeClassFilterTab === 'recently_chatted'
                        ? "You haven't posted in any class chats yet."
                        : 'No class discussions match your search.'}
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
                      borderColor: isClassInterested ? '#F59E0B' : tc.cardBorder,
                      borderWidth: isClassInterested ? 1.5 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat for ${item.title}`}
                >
                  <View style={styles.classCardLeft}>
                    <View style={[styles.classIconCircle, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.classCardTitle, { color: tc.text }]}>{item.title}</Text>
                        {hasChattedClass ? (
                          <View style={[styles.classChattedBadge, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                            <Ionicons name="chatbubbles" size={10} color="#4F46E5" />
                            <Text style={styles.classChattedBadgeText}>Recently Chatted</Text>
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
                              ? '#422006'
                              : '#FEF3C7'
                            : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                          borderColor: isClassInterested ? '#F59E0B' : tc.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isClassInterested ? 'Interested in class chat' : 'Mark class chat as Interested'
                      }
                    >
                      <Ionicons
                        name={isClassInterested ? 'star' : 'star-outline'}
                        size={14}
                        color={isClassInterested ? '#D97706' : tc.textMuted}
                      />
                    </Pressable>
                    <Text style={[styles.classCardActionText, { color: colors.primary }]}>Open Chat ›</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}

      {/* NEW TOPIC MODAL */}
      <NewTopicModal
        visible={newTopicModalVisible}
        onClose={() => setNewTopicModalVisible(false)}
        canPin={canManage}
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
    paddingHorizontal: 12,
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
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  notifIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  notifViewAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  notifViewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  spaceSwitcherWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spaceSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  spaceSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  spaceSwitchBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  topSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  interestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  interestsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  interestsPanel: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  interestsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interestsPanelTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterNowLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  interestsPanelSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  interestsCategoryList: {
    gap: 8,
    paddingTop: 4,
  },
  interestCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  interestCatChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  newTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  newTopicBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.button,
    borderWidth: 1,
    minHeight: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterTabsRow: {
    paddingTop: 8,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesBar: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 11,
  },
  recentChattedSection: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  recentChattedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentChattedTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  recentChattedFilterLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  recentChattedScroll: {
    gap: 8,
  },
  recentChattedChip: {
    width: 195,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  recentChattedChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentChattedChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentChattedChipReplies: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  listContent: {
    padding: 16,
    gap: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
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
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  classCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classCardTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    color: '#4F46E5',
  },
  classCardInstructor: {
    fontSize: 12,
  },
  classCardTime: {
    fontSize: 11,
    fontWeight: '600',
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
  classCardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
