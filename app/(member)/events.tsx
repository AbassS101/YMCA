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
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import {
  type ClassRegistration,
  type ScheduleItem,
} from '@/domain/types';
import { notificationRepo } from '@/repositories/notificationRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function formatEventTime(isoStart: string, isoEnd: string): string {
  const start = new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const end = new Date(isoEnd).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${start} – ${end}`;
}

function formatEventDate(isoStart: string): string {
  const d = new Date(isoStart);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatCents(cents?: number): string {
  if (!cents || cents === 0) return 'Free with Membership';
  return `$${(cents / 100).toFixed(2)}`;
}

type EventFilter = 'all' | 'free' | 'special' | 'my_rsvps';

export default function EventsScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const today = getDemoToday();
      const nextMonth = new Date(today);
      nextMonth.setDate(nextMonth.getDate() + 30);
      const to = nextMonth.toISOString().slice(0, 10);

      const [allSchedules, myRegs] = await Promise.all([
        scheduleRepo.list(api, { branchId: BRANCH_ID, from: '2026-09-14', to }),
        memberId ? registrationRepo.listMine(api, memberId) : Promise.resolve([]),
      ]);

      const eventItems = allSchedules.filter(
        (s) => s.category === 'event' || s.isSpecialEvent
      );
      setEvents(eventItems);
      setRegistrations(myRegs);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const registeredEventIds = useMemo(
    () => new Set(registrations.map((r) => r.scheduleItemId)),
    [registrations]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      if (filter === 'free') {
        return !item.priceCents || item.priceCents === 0;
      }
      if (filter === 'special') {
        return item.isSpecialEvent || (item.priceCents && item.priceCents > 0);
      }
      if (filter === 'my_rsvps') {
        return registeredEventIds.has(item.id);
      }
      return true;
    });
  }, [events, filter, registeredEventIds]);

  const handleRSVP = async (item: ScheduleItem) => {
    if (!memberId) {
      router.push('/login');
      return;
    }

    const isRegistered = registeredEventIds.has(item.id);
    if (isRegistered) {
      dialog.show({
        title: 'Cancel Event RSVP?',
        message: `Are you sure you want to cancel your registration for ${item.title}?`,
        buttons: [
          { text: 'Keep RSVP', style: 'cancel' },
          {
            text: 'Cancel Registration',
            style: 'destructive',
            onPress: async () => {
              setActioningId(item.id);
              try {
                await registrationRepo.cancel(api, memberId, item.id);
                await load();
                dialog.alert('Cancelled', 'Your event registration was cancelled.', [{ text: 'OK' }]);
              } catch (err: any) {
                dialog.alert('Error', err?.message || 'Could not cancel RSVP.');
              } finally {
                setActioningId(null);
              }
            },
          },
        ],
      });
      return;
    }

    const isPaid = (item.priceCents ?? 0) > 0;
    dialog.show({
      title: isPaid ? 'Register for Ticketed Event' : 'Confirm Event RSVP',
      message: `${item.title}\n\nDate: ${formatEventDate(item.start)} (${formatEventTime(
        item.start,
        item.end
      )})\nLocation: ${item.location}\nFee: ${formatCents(item.priceCents)}\n\n${
        isPaid
          ? 'Ticket fee will be charged to your payment card on file.'
          : 'Included at no extra charge with your YMCA membership.'
      }\n\nA calendar reminder notification will be sent to your account.`,
      buttons: [
        { text: 'Close', style: 'cancel' },
        {
          text: isPaid ? `Confirm & Pay ${formatCents(item.priceCents)}` : 'Confirm RSVP',
          onPress: async () => {
            setActioningId(item.id);
            try {
              await registrationRepo.register(api, memberId, item.id);
              // Send an in-app reminder notification!
              await notificationRepo.send(api, {
                userId: memberId,
                title: `Event RSVP: ${item.title}`,
                body: `You are registered for ${item.title} on ${formatEventDate(
                  item.start
                )} at ${item.location}. Reminder notification set!`,
                type: 'event',
                relatedId: item.id,
                link: '/(member)/events',
              });

              await load();
              dialog.alert(
                "You're Registered!",
                `We look forward to seeing you at ${item.title}. A confirmation alert has been added to your notifications.`,
                [{ text: 'Great!' }],
                'checkmark'
              );
            } catch (err: any) {
              dialog.alert('Registration Failed', err?.message || 'Could not complete RSVP.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ],
    });
  };

  const handleNotifyMe = async (item: ScheduleItem) => {
    if (!memberId) return;
    try {
      await notificationRepo.send(api, {
        userId: memberId,
        title: `Reminder Set: ${item.title}`,
        body: `We will notify you before ${item.title} on ${formatEventDate(item.start)} (${formatEventTime(item.start, item.end)}).`,
        type: 'event',
        relatedId: item.id,
        link: '/(member)/events',
      });
      dialog.alert('Notification Alert Set', `You will receive a notification reminder for ${item.title}.`, [{ text: 'OK' }], 'checkmark');
    } catch {
      dialog.alert('Error', 'Could not set event reminder.');
    }
  };

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Community Events & Noticeboard" />

      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
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

        {/* Hero banner */}
        <View style={[styles.heroCard, { backgroundColor: colors.primaryDark }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Ionicons name="calendar" size={24} color="#FFFFFF" />
            <AppText style={styles.heroTitle}>YMCA Community Events</AppText>
          </View>
          <AppText style={styles.heroDesc}>
            Connect, celebrate, and stay active with workshops, charity races, family expos, and senior socials at YMCA Silver Spring.
          </AppText>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            { key: 'all', label: 'All Events' },
            { key: 'free', label: 'Free / Included' },
            { key: 'special', label: 'Special & Charity' },
            { key: 'my_rsvps', label: `My RSVPs (${registeredEventIds.size})` },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key as EventFilter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.cardBg,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText
                  style={[
                    styles.filterText,
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
        </ScrollView>

        {loading && events.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredEvents.length === 0 ? (
          <View style={[styles.emptyCard, cardTheme]}>
            <Ionicons name="calendar-outline" size={40} color={colors.muted} />
            <AppText style={[styles.emptyTitle, { color: colors.text }]}>
              No Events Found
            </AppText>
            <AppText style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {filter === 'my_rsvps'
                ? "You haven't registered for any events yet. Check out the community calendar!"
                : 'No upcoming events currently match this filter.'}
            </AppText>
          </View>
        ) : (
          filteredEvents.map((item) => {
            const isRegistered = registeredEventIds.has(item.id);
            const isPaid = (item.priceCents ?? 0) > 0;
            const isActing = actioningId === item.id;

            return (
              <View key={item.id} style={[styles.eventCard, cardTheme]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: isPaid ? colors.paidBadgeBg : colors.successBg,
                          },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.categoryBadgeText,
                            {
                              color: isPaid ? colors.paidBadge : colors.success,
                            },
                          ]}
                        >
                          {isPaid ? 'SPECIAL TICKETED' : 'INCLUDED / FREE'}
                        </AppText>
                      </View>

                      {isRegistered ? (
                        <View style={[styles.categoryBadge, { backgroundColor: '#DCFCE7' }]}>
                          <AppText style={[styles.categoryBadgeText, { color: '#166534' }]}>
                            ✓ REGISTERED
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <AppText style={[styles.eventTitle, { color: colors.text }]}>
                      {item.title}
                    </AppText>
                  </View>
                </View>

                {item.description ? (
                  <AppText style={[styles.eventDesc, { color: colors.textMuted }]}>
                    {item.description}
                  </AppText>
                ) : null}

                <View style={[styles.metaGrid, { borderColor: colors.border }]}>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <AppText style={[styles.metaText, { color: colors.text }]}>
                      {formatEventDate(item.start)} · {formatEventTime(item.start, item.end)}
                    </AppText>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                    <AppText style={[styles.metaText, { color: colors.text }]}>
                      {item.location} (Silver Spring Branch)
                    </AppText>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                    <AppText style={[styles.metaText, { color: colors.text, fontWeight: '700' }]}>
                      {formatCents(item.priceCents)}
                    </AppText>
                  </View>

                  {item.instructorName ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="person-outline" size={16} color={colors.primary} />
                      <AppText style={[styles.metaText, { color: colors.textMuted }]}>
                        Hosted by {item.instructorName}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() => void handleNotifyMe(item)}
                    style={[styles.bellBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
                    accessibilityRole="button"
                    accessibilityLabel="Notify Me reminder"
                  >
                    <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                    <AppText style={[styles.bellText, { color: colors.primary }]}>
                      Remind Me
                    </AppText>
                  </Pressable>

                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      title={
                        isActing
                          ? 'Updating...'
                          : isRegistered
                          ? 'Cancel RSVP'
                          : isPaid
                          ? `Register (${formatCents(item.priceCents)})`
                          : 'RSVP for Event'
                      }
                      onPress={() => void handleRSVP(item)}
                      loading={isActing}
                    />
                  </View>
                </View>
              </View>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  heroCard: {
    borderRadius: radii.md,
    padding: 18,
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroDesc: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  eventCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...cardStyle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  eventDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaGrid: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 6,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bellText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
