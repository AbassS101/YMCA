import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
  isAdminRole,
  type ForumTopic,
  type ForumTopicCategory,
  type ScheduleItem,
} from '@/domain/types';
import { radii } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';
import { forumRepo } from '@/repositories/forumRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { ForumTopicCard } from '@/components/ForumTopicCard';
import { NewTopicModal } from '@/components/NewTopicModal';
import { ForumTopicDetailModal } from '@/components/ForumTopicDetailModal';
import { ClassForumModal } from '@/components/ClassForumModal';
import { YHeader } from '@/components/YHeader';
import { colors } from '@/theme/colors';

type FilterTab = 'all' | 'staff_asked' | 'staff_answered' | 'my_topics';
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<ForumTopicCategory | 'all'>('all');

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
      const [topicList, classList] = await Promise.all([
        forumRepo.listTopics(api),
        scheduleRepo.listAll(api, BRANCH_ID).catch(() => []),
      ]);
      setTopics(topicList);
      setClasses(classList);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

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

  // Filtered topics
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      if (selectedCategory !== 'all' && topic.category !== selectedCategory) {
        return false;
      }
      if (activeFilterTab === 'staff_asked' && (!topic.mentionedStaffIds || topic.mentionedStaffIds.length === 0)) {
        return false;
      }
      if (activeFilterTab === 'staff_answered' && !topic.hasStaffReply) {
        return false;
      }
      if (activeFilterTab === 'my_topics' && topic.authorId !== currentUserId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = topic.title.toLowerCase().includes(q);
        const matchBody = topic.content.toLowerCase().includes(q);
        const matchAuthor = topic.authorName.toLowerCase().includes(q);
        const matchStaff = topic.mentionedStaffNames?.some((n) => n.toLowerCase().includes(q));
        if (!matchTitle && !matchBody && !matchAuthor && !matchStaff) {
          return false;
        }
      }
      return true;
    });
  }, [topics, selectedCategory, activeFilterTab, searchQuery, currentUserId]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    if (!classSearch.trim()) return classes;
    const q = classSearch.toLowerCase();
    return classes.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.instructorName.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
    );
  }, [classes, classSearch]);

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
                Open discussion space for all members. Ask questions, share workout tips, and tag staff with @.
              </Text>
            </View>
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

          {/* Search Bar */}
          <View style={[styles.searchRow, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <Ionicons name="search-outline" size={18} color={tc.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: tc.text }]}
              placeholder="Search discussions, topics, staff questions..."
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
                { id: 'all', label: 'All Discussions', icon: 'chatbubbles' },
                { id: 'staff_asked', label: '@ Staff Asked', icon: 'at' },
                { id: 'staff_answered', label: '✓ Staff Answered', icon: 'checkmark-circle' },
                { id: 'my_topics', label: 'My Topics', icon: 'person' },
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

          {/* Category Chips Scroll */}
          <View style={styles.categoriesBar}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: 'all', label: 'All Categories', icon: 'apps-outline', color: colors.primary }, ...FORUM_CATEGORIES]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoriesContent}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.id;
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
                        borderColor: isSelected ? colors.primary : tc.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: isSelected ? colors.primary : tc.text,
                          fontWeight: isSelected ? '700' : '500',
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
                      : activeFilterTab === 'staff_asked'
                        ? 'No topics currently tag staff for inquiries.'
                        : activeFilterTab === 'staff_answered'
                          ? 'No topics have staff responses yet.'
                          : activeFilterTab === 'my_topics'
                            ? "You haven't posted any topics yet. Start a discussion!"
                            : 'Be the first to start a conversation in our YMCA community!'}
                  </Text>
                  <Pressable
                    onPress={() => setNewTopicModalVisible(true)}
                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyActionBtnText}>Create First Topic</Text>
                  </Pressable>
                </View>
              )
            }
            renderItem={({ item }) => (
              <ForumTopicCard
                topic={item}
                currentUserId={currentUserId}
                canManage={canManage}
                onPress={() => openTopicDetail(item)}
                onToggleLike={() => void handleToggleLike(item)}
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
                Chat with classmates and instructors for all scheduled group fitness classes.
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
                    No class discussions match your search.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openClassForum(item)}
                style={[
                  styles.classCard,
                  { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open chat for ${item.title}`}
              >
                <View style={styles.classCardLeft}>
                  <View style={[styles.classIconCircle, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.classCardTitle, { color: tc.text }]}>{item.title}</Text>
                    <Text style={[styles.classCardInstructor, { color: tc.textMuted }]}>
                      {item.instructorName} · {item.location}
                    </Text>
                    <Text style={[styles.classCardTime, { color: colors.primary }]}>
                      {formatClassDay(item.start)} at {formatClassTime(item.start)}
                    </Text>
                  </View>
                </View>
                <View style={styles.classCardAction}>
                  <Text style={[styles.classCardActionText, { color: colors.primary }]}>Open Chat ›</Text>
                </View>
              </Pressable>
            )}
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
  classCardInstructor: {
    fontSize: 12,
  },
  classCardTime: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  classCardAction: {
    paddingLeft: 4,
  },
  classCardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
