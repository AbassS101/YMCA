import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    default:
      return { label: 'NOTIFICATION', bg: '#F1F5F9', text: '#64748B' };
  }
}

type TabKey = 'all' | 'mentions_replies' | 'announcements' | 'events' | 'membership';

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

  const handleMarkAllRead = async () => {
    try {
      await notificationRepo.markAllRead(api, userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (!notif.read) {
      await notificationRepo.markRead(api, notif.id, userId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }

    if (notif.link) {
      router.push(notif.link as any);
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
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
  }, [notifications, activeTab]);

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
              onPress={() => router.push('/(member)/notification-settings')}
              style={[styles.settingsBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityRole="button"
              accessibilityLabel="Notification Settings"
            >
              <Ionicons name="settings-outline" size={14} color={colors.primary} />
              <AppText style={[styles.settingsBtnText, { color: colors.primary }]}>
                Settings
              </AppText>
            </Pressable>

            {unreadCount > 0 ? (
              <Pressable
                onPress={() => void handleMarkAllRead()}
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
        {announcements.filter((a) => a.pinned).length > 0 ? (
          <View style={styles.pinnedSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="megaphone" size={18} color={colors.primary} />
              <AppText style={[styles.sectionHeading, { color: colors.text }]}>
                Branch Notices & Alerts
              </AppText>
            </View>

            {announcements
              .filter((a) => a.pinned)
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

                  {ann.actionUrl ? (
                    <Pressable
                      onPress={() => router.push(ann.actionUrl as any)}
                      style={[styles.annActionBtn, { backgroundColor: colors.primaryLight }]}
                    >
                      <AppText style={[styles.annActionText, { color: colors.primary }]}>
                        {ann.actionLabel || 'Learn More'} ›
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
          </View>
        ) : null}

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'all', label: `All (${notifications.length})` },
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
              You have no notifications in this category. We will notify you when new announcements, mentions, or schedule updates occur.
            </AppText>
          </View>
        ) : (
          filteredNotifications.map((notif) => {
            const badge = badgeForType(notif.type);
            return (
              <Pressable
                key={notif.id}
                onPress={() => void handleNotificationPress(notif)}
                style={({ pressed }) => [
                  styles.notifCard,
                  cardTheme,
                  !notif.read && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? '#0F233A' : '#F0F9FF',
                  },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${notif.title}, ${notif.read ? 'read' : 'unread'}`}
              >
                <View style={styles.notifRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: notif.read
                          ? colors.primaryLight
                          : colors.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconForType(notif.type)}
                      size={20}
                      color={notif.read ? colors.primary : '#FFFFFF'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.notifBadgeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: isDark ? '#1E293B' : badge.bg }]}>
                        <AppText style={[styles.typeBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </AppText>
                      </View>
                      {!notif.read ? <View style={styles.unreadDot} /> : null}
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
                      {notif.link ? (
                        <AppText style={[styles.notifLink, { color: colors.primary }]}>
                          {notif.type.startsWith('forum') || notif.type === 'staff_inquiry'
                            ? 'Open Discussion ›'
                            : 'View details ›'}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTime: {
    fontSize: 11,
  },
  notifLink: {
    fontSize: 12,
    fontWeight: '700',
  },
});
