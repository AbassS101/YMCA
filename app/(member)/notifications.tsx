import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { AppText } from '@/components/AppText';
import { ErrorBanner } from '@/components/ErrorBanner';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type {
  Announcement,
  AppNotification,
  NotificationType,
} from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { notificationRepo } from '@/repositories/notificationRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function iconForType(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'forum_mention':
      return 'at-circle';
    case 'forum_reply':
      return 'chatbubbles';
    case 'class_forum':
      return 'fitness';
    case 'staff_inquiry':
      return 'business';
    case 'announcement':
      return 'megaphone-outline';
    case 'event':
      return 'calendar-outline';
    case 'membership':
      return 'card-outline';
    case 'donation':
      return 'heart-outline';
    case 'client_arrival':
      return 'walk';
    case 'billing':
      return 'card';
    default:
      return 'notifications-outline';
  }
}

function badgeForType(type: NotificationType): { label: string; bg: string; text: string } {
  switch (type) {
    case 'forum_mention':
      return { label: '@ MENTION', bg: '#EEF2FF', text: '#4F46E5' };
    case 'forum_reply':
      return { label: 'TOPIC REPLY', bg: '#F0FDF4', text: '#16A34A' };
    case 'class_forum':
      return { label: 'CLASS CHAT', bg: '#FEF3C7', text: '#D97706' };
    case 'staff_inquiry':
      return { label: '@ STAFF DESK', bg: '#FCE7F3', text: '#DB2777' };
    case 'announcement':
      return { label: 'BRANCH NOTICE', bg: '#E0F2FE', text: '#0284C7' };
    case 'event':
      return { label: 'EVENT REMINDER', bg: '#EDE9FE', text: '#7C3AED' };
    case 'membership':
      return { label: 'MEMBERSHIP', bg: '#F1F5F9', text: '#475569' };
    case 'donation':
      return { label: 'DONATION', bg: '#FEE2E2', text: '#DC2626' };
    case 'client_arrival':
      return { label: 'CLIENT ARRIVED', bg: '#DCFCE7', text: '#15803D' };
    case 'billing':
      return { label: 'BILLING', bg: '#FEF3C7', text: '#B45309' };
    default:
      return { label: 'NOTIFICATION', bg: '#F1F5F9', text: '#64748B' };
  }
}

type TabKey = 'all' | 'mentions_replies' | 'announcements' | 'events' | 'membership';
type ViewMode = 'unread' | 'all';

const UNDO_WINDOW_MS = 6000;
const noticeStorageKey = (userId: string) => `notices_read_${userId}`;

type UndoToast = { id: number; message: string; undo: () => void };
type PendingAction = { timer: ReturnType<typeof setTimeout>; commit: () => void };

export default function NotificationsScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const userId = session?.userId ?? '';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('unread');
  const [readNoticeIds, setReadNoticeIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<UndoToast | null>(null);
  const pendingRef = useRef<Map<string, PendingAction>>(new Map());
  const toastId = useRef(0);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(false);
      setLoading(true);
      const [notifs, anns] = await Promise.all([
        notificationRepo.list(api, userId),
        announcementRepo.list(api, 'silver-spring'),
      ]);
      setNotifications(notifs);
      setAnnouncements(anns);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Read notices are persisted locally per user.
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(noticeStorageKey(userId))
      .then((raw) => setReadNoticeIds(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => undefined);
  }, [userId]);

  // Actions are held back for a few seconds so they can be undone, then committed.
  const finalize = useCallback((key: string) => {
    const action = pendingRef.current.get(key);
    if (!action) return;
    clearTimeout(action.timer);
    pendingRef.current.delete(key);
    action.commit();
  }, []);

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      for (const key of Array.from(pending.keys())) {
        const action = pending.get(key);
        if (!action) continue;
        clearTimeout(action.timer);
        action.commit();
      }
      pending.clear();
    };
  }, []);

  const scheduleAction = useCallback(
    (ids: string[], message: string, commit: () => void) => {
      const key = `${Date.now()}-${Math.random()}`;
      setPendingIds((prev) => new Set([...prev, ...ids]));
      const release = () =>
        setPendingIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      const timer = setTimeout(() => {
        finalize(key);
        setToast((t) => (t && t.id === toastId.current ? null : t));
      }, UNDO_WINDOW_MS);
      pendingRef.current.set(key, {
        timer,
        commit: () => {
          commit();
          release();
        },
      });
      toastId.current += 1;
      setToast({
        id: toastId.current,
        message,
        undo: () => {
          const action = pendingRef.current.get(key);
          if (action) clearTimeout(action.timer);
          pendingRef.current.delete(key);
          release();
          setToast(null);
        },
      });
    },
    [finalize]
  );

  const commitNoticesRead = useCallback(
    (ids: string[]) => {
      setReadNoticeIds((prev) => {
        const next = new Set([...prev, ...ids]);
        AsyncStorage.setItem(noticeStorageKey(userId), JSON.stringify([...next])).catch(
          () => undefined
        );
        return next;
      });
    },
    [userId]
  );

  const commitNotificationsRead = useCallback(
    (ids: string[]) => {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
      void Promise.all(ids.map((id) => notificationRepo.markRead(api, id, userId))).catch(
        () => setError(true)
      );
    },
    [api, userId]
  );

  const handleMarkNoticeRead = (ann: Announcement) =>
    scheduleAction([`a:${ann.id}`], 'Notice marked as read', () =>
      commitNoticesRead([ann.id])
    );

  const handleMarkNotificationRead = (notif: AppNotification) =>
    scheduleAction([`n:${notif.id}`], 'Marked as read', () =>
      commitNotificationsRead([notif.id])
    );

  const handleMarkAllRead = () => {
    const unreadIds = notifications
      .filter((n) => !n.read && !pendingIds.has(`n:${n.id}`))
      .map((n) => n.id);
    const noticeIds = visibleNotices.map((a) => a.id);
    if (unreadIds.length === 0 && noticeIds.length === 0) return;
    scheduleAction(
      [...unreadIds.map((id) => `n:${id}`), ...noticeIds.map((id) => `a:${id}`)],
      `${unreadIds.length + noticeIds.length} items marked as read`,
      () => {
        if (unreadIds.length) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          void notificationRepo.markAllRead(api, userId).catch(() => setError(true));
        }
        if (noticeIds.length) commitNoticesRead(noticeIds);
      }
    );
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (!notif.read && !pendingIds.has(`n:${notif.id}`)) {
      try {
        await notificationRepo.markRead(api, notif.id, userId);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch {
        // ignore
      }
    }

    if (notif.link) {
      router.push(notif.link as any);
    }
  };

  const isRead = (n: AppNotification) => n.read || pendingIds.has(`n:${n.id}`);

  const visibleNotices = useMemo(
    () =>
      announcements.filter(
        (a) => a.pinned && !readNoticeIds.has(a.id) && !pendingIds.has(`a:${a.id}`)
      ),
    [announcements, readNoticeIds, pendingIds]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !pendingIds.has(`n:${n.id}`)).length,
    [notifications, pendingIds]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (viewMode === 'unread' && (n.read || pendingIds.has(`n:${n.id}`))) return false;
      if (activeTab === 'mentions_replies') {
        return (
          n.type === 'forum_mention' ||
          n.type === 'forum_reply' ||
          n.type === 'class_forum' ||
          n.type === 'staff_inquiry'
        );
      }
      if (activeTab === 'announcements') return n.type === 'announcement';
      if (activeTab === 'events') return n.type === 'event';
      if (activeTab === 'membership') return n.type === 'membership' || n.type === 'donation';
      return true;
    });
  }, [notifications, activeTab, viewMode, pendingIds]);

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Notifications & Notices" showActions={false} />

      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <AppText style={[styles.backText, { color: colors.primary }]}>
              Back
            </AppText>
          </Pressable>

          <View style={styles.topActions}>
            <Pressable
              onPress={() =>
                router.push(
                  (session?.role === 'member' || session?.role === 'guest'
                    ? '/(member)/notification-settings'
                    : '/(staff)/settings') as any,
                )
              }
              style={[styles.settingsBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityRole="button"
              accessibilityLabel="Notification Settings"
            >
              <Ionicons name="settings-outline" size={14} color={colors.primary} />
              <AppText style={[styles.settingsBtnText, { color: colors.primary }]}>
                Settings
              </AppText>
            </Pressable>

            {unreadCount + visibleNotices.length > 0 ? (
              <Pressable
                onPress={handleMarkAllRead}
                style={styles.markReadBtn}
                accessibilityRole="button"
              >
                <AppText style={[styles.markReadText, { color: colors.primary }]}>
                  Mark all read
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Pinned Announcements Board */}
        {visibleNotices.length > 0 ? (
          <View style={styles.pinnedSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="megaphone" size={18} color={colors.primary} />
              <AppText style={[styles.sectionHeading, { color: colors.text }]}>
                Branch Notices & Alerts
              </AppText>
              <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
                <AppText style={styles.countPillText}>{visibleNotices.length}</AppText>
              </View>
            </View>

            {visibleNotices
              .map((ann) => (
                <View
                  key={ann.id}
                  style={[
                    styles.announcementCard,
                    cardTheme,
                    ann.priority === 'high' && {
                      borderColor: colors.gold,
                      borderLeftWidth: 4,
                    },
                  ]}
                >
                  <View style={styles.annHeader}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor:
                            ann.category === 'facility'
                              ? colors.primaryLight
                              : colors.goldBg,
                        },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.categoryBadgeText,
                          {
                            color:
                              ann.category === 'facility'
                                ? colors.primary
                                : '#B45309',
                          },
                        ]}
                      >
                        {ann.category.toUpperCase()} NOTICE
                      </AppText>
                    </View>
                    <AppText style={[styles.timestamp, { color: colors.textMuted }]}>
                      {formatTimestamp(ann.createdAt)}
                    </AppText>
                  </View>

                  <AppText style={[styles.annTitle, { color: colors.text }]}>
                    {ann.title}
                  </AppText>
                  <AppText style={[styles.annBody, { color: colors.text }]}>
                    {ann.body}
                  </AppText>

                  <View style={styles.annActions}>
                    {ann.actionUrl ? (
                      <Pressable
                        onPress={() => router.push(ann.actionUrl as any)}
                        style={[styles.annActionBtn, { backgroundColor: colors.primaryLight }]}
                      >
                        <AppText style={[styles.annActionText, { color: colors.primary }]}>
                          {ann.actionLabel || 'Learn More'} ›
                        </AppText>
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    <Pressable
                      onPress={() => handleMarkNoticeRead(ann)}
                      style={[styles.readBtn, { borderColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark notice ${ann.title} as read`}
                    >
                      <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                      <AppText style={[styles.annActionText, { color: colors.primary }]}>
                        Mark as read
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        ) : null}

        {/* Unread / All toggle */}
        <View style={[styles.segment, { backgroundColor: colors.primaryLight }]}>
          {(
            [
              { key: 'unread', label: `Unread (${unreadCount})` },
              { key: 'all', label: `All (${notifications.length})` },
            ] as const
          ).map((seg) => {
            const active = viewMode === seg.key;
            return (
              <Pressable
                key={seg.key}
                onPress={() => setViewMode(seg.key)}
                style={[styles.segmentItem, active && { backgroundColor: colors.cardBg }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <AppText
                  style={[
                    styles.segmentText,
                    { color: active ? colors.primary : colors.textMuted },
                  ]}
                >
                  {seg.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'all', label: 'Everything' },
            { key: 'mentions_replies', label: '@ Mentions & Replies' },
            { key: 'announcements', label: 'Notices' },
            { key: 'events', label: 'Events' },
            { key: 'membership', label: 'Billing & Plan' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as TabKey)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? colors.primary : colors.cardBg,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText
                  style={[
                    styles.tabChipText,
                    {
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {loading && notifications.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredNotifications.length === 0 ? (
          <View style={[styles.emptyCard, cardTheme]}>
            <Ionicons name="notifications-off-outline" size={44} color={colors.muted} />
            <AppText style={[styles.emptyTitle, { color: colors.text }]}>
              All Caught Up!
            </AppText>
            <AppText style={[styles.emptyDesc, { color: colors.textMuted }]}>
              {viewMode === 'unread'
                ? 'No unread items in this category. Switch to "All" to review earlier notifications.'
                : 'You have no notifications in this category. We will notify you when new announcements, mentions, or schedule updates occur.'}
            </AppText>
          </View>
        ) : (
          filteredNotifications.map((notif) => {
            const badge = badgeForType(notif.type);
            const read = isRead(notif);
            return (
              <Pressable
                key={notif.id}
                onPress={() => void handleNotificationPress(notif)}
                style={({ pressed }) => [
                  styles.notifCard,
                  cardTheme,
                  !read && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? '#0F233A' : '#F0F9FF',
                  },
                  read && { opacity: 0.75 },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${notif.title}, ${read ? 'read' : 'unread'}`}
              >
                <View style={styles.notifRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: read
                          ? colors.primaryLight
                          : colors.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconForType(notif.type)}
                      size={20}
                      color={read ? colors.primary : '#FFFFFF'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.notifBadgeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: isDark ? '#1E293B' : badge.bg }]}>
                        <AppText style={[styles.typeBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </AppText>
                      </View>
                      {!read ? <View style={styles.unreadDot} /> : null}
                    </View>

                    <View style={styles.notifHeader}>
                      <AppText style={[styles.notifTitle, { color: colors.text }]}>
                        {notif.title}
                      </AppText>
                    </View>

                    <AppText style={[styles.notifBody, { color: colors.text }]}>
                      {notif.body}
                    </AppText>

                    <View style={styles.notifFooter}>
                      <AppText style={[styles.notifTime, { color: colors.textMuted }]}>
                        {formatTimestamp(notif.createdAt)}
                      </AppText>
                      {notif.link || !read ? (
                        <View style={styles.notifFooterActions}>
                          {notif.link ? (
                            <AppText style={[styles.notifLink, { color: colors.primary }]}>
                              {notif.type.startsWith('forum') || notif.type === 'staff_inquiry'
                                ? 'Open Discussion ›'
                                : 'View details ›'}
                            </AppText>
                          ) : null}
                          {!read ? (
                            <Pressable
                              onPress={() => handleMarkNotificationRead(notif)}
                              hitSlop={8}
                              style={[styles.readBtn, { borderColor: colors.border, marginTop: 0 }]}
                              accessibilityRole="button"
                              accessibilityLabel={`Mark ${notif.title} as read`}
                            >
                              <Ionicons name="checkmark" size={14} color={colors.primary} />
                              <AppText style={[styles.annActionText, { color: colors.primary }]}>
                                Mark read
                              </AppText>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {toast ? (
        <View
          style={[styles.toast, { backgroundColor: isDark ? '#1E293B' : '#0F172A' }]}
          accessibilityLiveRegion="polite"
        >
          <AppText style={styles.toastText}>{toast.message}</AppText>
          <Pressable
            onPress={toast.undo}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Undo"
          >
            <AppText style={styles.toastUndo}>UNDO</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  settingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  announcementCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...cardStyle,
  },
  annHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 11,
  },
  annTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  annBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  annActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  annActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  countPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  annActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  toastUndo: {
    color: '#7DD3FC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 16,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...cardStyle,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  notifCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...cardStyle,
  },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifFooter: {
    gap: 8,
  },
  notifFooterActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 8,
  },
  notifTime: {
    fontSize: 11,
  },
  notifLink: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
});
