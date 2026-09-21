import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ClassCard } from '@/components/ClassCard';
import { ClassForumModal } from '@/components/ClassForumModal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PaymentCheckoutModal } from '@/components/PaymentCheckoutModal';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { ClassRegistration, Membership, ScheduleCategory, ScheduleItem } from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { savedClassesRepo } from '@/repositories/savedClassesRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { colors } from '@/theme/colors';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';
const SCREEN_WIDTH = Dimensions.get('window').width;

type FilterKey = ScheduleCategory | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Classes' },
  { key: 'seniors', label: 'Seniors / AOA' },
  { key: 'groupEx', label: 'Group Exercise' },
  { key: 'swim', label: 'Swim & Aquatics' },
  { key: 'event', label: 'Events' },
  { key: 'childWatch', label: 'Child Watch' },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatDayPill(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function dayKey(isoStart: string): string {
  return isoStart.slice(0, 10);
}

export default function MemberSchedulesScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [category, setCategory] = useState<FilterKey>('all');
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [allWeekItems, setAllWeekItems] = useState<ScheduleItem[]>([]);
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dayIndex, setDayIndex] = useState(0);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<ScheduleItem | null>(null);
  const [selectedForumClass, setSelectedForumClass] = useState<ScheduleItem | null>(null);
  const [forumModalVisible, setForumModalVisible] = useState(false);

  const weekDays = useMemo(() => {
    const today = getDemoToday();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const to = addDays(today, 6);
      const [schedules, weekSchedules, regs, saved, mem] = await Promise.all([
        scheduleRepo.list(api, {
          branchId: BRANCH_ID,
          from: today,
          to,
          category: category === 'all' ? undefined : category,
        }),
        scheduleRepo.list(api, {
          branchId: BRANCH_ID,
          from: today,
          to,
        }),
        registrationRepo.listMine(api, memberId),
        savedClassesRepo.list(memberId),
        membershipRepo.getMembership(api, memberId),
      ]);
      schedules.sort((a, b) => a.start.localeCompare(b.start));
      weekSchedules.sort((a, b) => a.start.localeCompare(b.start));
      setItems(schedules);
      setAllWeekItems(weekSchedules);
      setRegistrations(regs);
      setSavedIds(new Set(saved.map((s) => s.scheduleItemId)));
      setMembership(mem);

      const counts: Record<string, number> = {};
      await Promise.all(
        weekSchedules.map(async (item) => {
          const roster = await registrationRepo.roster(api, item.id);
          counts[item.id] = roster.length;
        })
      );
      setRosterCounts(counts);
    } catch {
      setError(true);
    }
  }, [api, category, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const registeredMap = useMemo(() => {
    const map = new Map<string, ClassRegistration>();
    for (const r of registrations) {
      map.set(r.scheduleItemId, r);
    }
    return map;
  }, [registrations]);

  const goDay = (next: number) => {
    const clamped = Math.max(0, Math.min(6, next));
    setDayIndex(clamped);
  };

  const activeDay = weekDays[dayIndex];
  const currentDayItems = useMemo(
    () => items.filter((i) => dayKey(i.start) === activeDay),
    [items, activeDay]
  );

  const onToggleStar = async (scheduleItemId: string) => {
    if (memberId === '') {
      return;
    }
    await savedClassesRepo.toggle(memberId, scheduleItemId);
    await load();
  };

  const handleBookingPress = (item: ScheduleItem) => {
    const isPaid = (item.priceCents ?? 0) > 0;
    if (isPaid) {
      // Open Payment Checkout Modal
      setCheckoutItem(item);
    } else {
      // Free included class registration
      confirmFreeRegister(item);
    }
  };

  const confirmFreeRegister = (item: ScheduleItem) => {
    dialog.show({
      title: 'Register for class?',
      message: `${item.title}\n${formatDayLabel(dayKey(item.start))} at ${formatClassTime(item.start)}\n\nIncluded with your membership ($0.00).`,
      icon: 'calendar',
      buttons: [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Register Free',
          style: 'default',
          onPress: () => void doRegister(item),
        },
      ],
    });
  };

  const doRegister = async (item: ScheduleItem) => {
    if (memberId === '') {
      return;
    }
    setBusyId(item.id);
    try {
      await registrationRepo.register(api, memberId, item.id);
      await load();
      const isPaid = (item.priceCents ?? 0) > 0;
      if (isPaid) {
        dialog.show({
          title: 'Booking & Payment Confirmed!',
          message: `You are booked for ${item.title}!\nPayment of $${((item.priceCents ?? 0) / 100).toFixed(2)} charged to ${membership?.paymentBrand ?? 'Card'} ending in ••${membership?.paymentLast4 ?? '4242'}.\n\nA confirmation receipt has been added to your account.`,
          icon: 'checkmark',
          buttons: [{ text: 'Great!', style: 'default' }],
        });
      } else {
        dialog.show({
          title: 'Registration Confirmed!',
          message: `You are registered for ${item.title} on ${formatDayLabel(dayKey(item.start))} at ${formatClassTime(item.start)}.`,
          icon: 'checkmark',
          buttons: [{ text: 'Awesome', style: 'default' }],
        });
      }
    } catch (e) {
      dialog.show({
        title: 'Could not register',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = (item: ScheduleItem) => {
    const reg = registeredMap.get(item.id);
    const paidAmountCents = reg?.paidAmountCents ?? 0;
    const wasPaid = paidAmountCents > 0;

    dialog.show({
      title: wasPaid ? 'Cancel Paid Booking?' : 'Cancel Registration?',
      message: wasPaid
        ? `Cancel your booking for ${item.title} on ${formatDayLabel(dayKey(item.start))}?\n\nA full refund of $${(paidAmountCents / 100).toFixed(2)} will be credited back to your ${reg?.paymentLast4 ? `card ending in ••${reg.paymentLast4}` : 'card on file'}.`
        : `Remove yourself from ${item.title} on ${formatDayLabel(dayKey(item.start))}?`,
      icon: 'trash',
      buttons: [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: wasPaid ? 'Cancel & Refund' : 'Cancel Registration',
          style: 'destructive',
          onPress: () => void doCancel(item),
        },
      ],
    });
  };

  const doCancel = async (item: ScheduleItem) => {
    if (memberId === '') {
      return;
    }
    setBusyId(item.id);
    try {
      await registrationRepo.cancel(api, memberId, item.id);
      await load();
    } catch (e) {
      dialog.show({
        title: 'Could not cancel',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusyId(null);
    }
  };

  const confirmChange = (item: ScheduleItem) => {
    const alternatives = allWeekItems.filter(
      (other) =>
        other.title === item.title &&
        other.id !== item.id &&
        !registeredMap.has(other.id) &&
        (rosterCounts[other.id] ?? 0) < other.capacity
    );
    if (alternatives.length === 0) {
      dialog.show({
        title: 'No other times',
        message: `There are no other open ${item.title} sessions this week you can switch to.`,
        icon: 'info',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    dialog.show({
      title: 'Change to another session',
      message: 'Pick a different open session of the same class.',
      icon: 'calendar',
      buttons: [
        ...alternatives.map((alt) => ({
          text: `${formatDayLabel(dayKey(alt.start))} · ${formatClassTime(alt.start)}`,
          style: 'default' as const,
          onPress: () => void doChange(item, alt),
        })),
        { text: 'Keep current', style: 'cancel' as const },
      ],
    });
  };

  const doChange = async (from: ScheduleItem, to: ScheduleItem) => {
    if (memberId === '') {
      return;
    }
    setBusyId(from.id);
    try {
      await registrationRepo.change(api, memberId, from, to);
      await load();
      const newDay = weekDays.indexOf(dayKey(to.start));
      if (newDay >= 0) {
        goDay(newDay);
      }
    } catch (e) {
      dialog.show({
        title: 'Could not change',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Class & Program Schedules" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      {/* Category Filter Chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.key === category;
          return (
            <Pressable
              key={f.key}
              onPress={() => setCategory(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.cardBg,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={f.label}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? '#FFFFFF' : colors.text },
                  active && { fontWeight: '700' },
                ]}
                allowFontScaling
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Dedicated General Community Forum Callout */}
      <Pressable
        onPress={() => router.push('/(member)/community-forum')}
        style={[
          styles.generalForumBanner,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Looking for General Community Forum? Open General Forum"
      >
        <View style={[styles.generalForumIconWrap, { backgroundColor: isDark ? '#1E3A8A' : '#E0F2FE' }]}>
          <Ionicons name="chatbubbles" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.generalForumBannerTitle, { color: colors.text }]}>
              General Community Forum
            </Text>
            <View style={[styles.generalForumBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.generalForumBadgeText, { color: colors.primary }]}>BRANCH-WIDE</Text>
            </View>
          </View>
          <Text style={[styles.generalForumBannerSub, { color: colors.textMuted }]} numberOfLines={1}>
            Looking for non-class chat? Visit General Forum for tips & @ staff
          </Text>
        </View>
        <Text style={[styles.generalForumAction, { color: colors.primary }]}>Open ›</Text>
      </Pressable>

      {/* Quick Day Selector Tabs */}
      <View style={styles.dayTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsScroll}
        >
          {weekDays.map((d, idx) => {
            const active = idx === dayIndex;
            return (
              <Pressable
                key={d}
                onPress={() => goDay(idx)}
                style={[
                  styles.dayTab,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.cardBg,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={formatDayLabel(d)}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    {
                      color: active
                        ? isDark
                          ? colors.primary
                          : colors.primaryDark
                        : colors.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                  allowFontScaling
                >
                  {idx === 0 ? 'Today' : formatDayPill(d)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Accessible Day Navigation Bar */}
      <View style={styles.dayNav}>
        <Pressable
          onPress={() => goDay(dayIndex - 1)}
          disabled={dayIndex === 0}
          style={[
            styles.dayBtn,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
            dayIndex === 0 && styles.dayBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <Text style={[styles.dayBtnText, { color: colors.primary }]} allowFontScaling>
            ‹ Prev Day
          </Text>
        </Pressable>

        <View style={styles.dayLabelBlock}>
          {dayIndex === 0 ? (
            <View style={[styles.todayPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.todayPillText, { color: colors.primary }]}>TODAY</Text>
            </View>
          ) : null}
          <Text
            style={[styles.dayLabel, { color: colors.text }]}
            allowFontScaling
            accessibilityRole="header"
          >
            {formatDayLabel(activeDay)}
          </Text>
        </View>

        <Pressable
          onPress={() => goDay(dayIndex + 1)}
          disabled={dayIndex === 6}
          style={[
            styles.dayBtn,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
            dayIndex === 6 && styles.dayBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Text style={[styles.dayBtnText, { color: colors.primary }]} allowFontScaling>
            Next Day ›
          </Text>
        </Pressable>
      </View>

      {/* Smooth Vertical Class Schedule List */}
      <FlatList
        data={currentDayItems}
        keyExtractor={(i) => i.id}
        style={styles.classList}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator
        ListEmptyComponent={
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]} allowFontScaling>
              No sessions scheduled
            </Text>
            <Text style={[styles.empty, { color: colors.textMuted }]} allowFontScaling>
              There are no sessions for this filter on {formatDayLabel(activeDay)}. Try selecting "All Classes" or another day.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const reg = registeredMap.get(item.id);
          const registered = reg != null && reg.status === 'registered';
          const taken = rosterCounts[item.id] ?? 0;
          const spotsLeft = Math.max(0, item.capacity - taken);
          return (
            <View style={styles.cardItem}>
              <ClassCard
                time={formatClassTime(item.start)}
                title={item.title}
                location={item.location}
                instructor={item.instructorName}
                spotsLeft={spotsLeft}
                registered={registered}
                starred={savedIds.has(item.id)}
                priceCents={item.priceCents}
                isSpecialEvent={item.isSpecialEvent}
                seniorFriendly={item.seniorFriendly}
                paidAmountCents={reg?.paidAmountCents}
                onToggleStar={() => void onToggleStar(item.id)}
                onRegister={() => handleBookingPress(item)}
                onChange={() => confirmChange(item)}
                onCancel={() => confirmCancel(item)}
                onOpenForum={() => {
                  setSelectedForumClass(item);
                  setForumModalVisible(true);
                }}
                busy={busyId === item.id}
              />
            </View>
          );
        }}
      />

      {/* Payment Checkout Modal for Paid Classes & Special Events */}
      <PaymentCheckoutModal
        visible={checkoutItem !== null}
        item={checkoutItem}
        dayLabel={checkoutItem ? formatDayLabel(dayKey(checkoutItem.start)) : ''}
        timeLabel={checkoutItem ? formatClassTime(checkoutItem.start) : ''}
        paymentBrand={membership?.paymentBrand ?? 'Visa'}
        paymentLast4={membership?.paymentLast4 ?? '4242'}
        busy={busyId === checkoutItem?.id}
        onConfirm={() => {
          if (checkoutItem) {
            const itemToBook = checkoutItem;
            setCheckoutItem(null);
            void doRegister(itemToBook);
          }
        }}
        onClose={() => setCheckoutItem(null)}
      />

      {/* CLASS FORUM & COMMUNITY CHAT MODAL */}
      <ClassForumModal
        visible={forumModalVisible}
        onClose={() => setForumModalVisible(false)}
        scheduleItem={selectedForumClass}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.nearBlack,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  dayBtn: {
    minHeight: tapTarget,
    minWidth: 92,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnDisabled: {
    opacity: 0.35,
  },
  dayBtnText: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.primary,
  },
  dayLabelBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  todayPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  dayLabel: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.nearBlack,
    textAlign: 'center',
  },
  dayTabsWrapper: {
    paddingBottom: spacing.xs,
  },
  dayTabsScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.chip,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  dayTabText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.nearBlack,
  },
  dayTabTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  classList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardItem: {
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.xl,
    marginVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 18,
    color: colors.nearBlack,
  },
  empty: {
    ...typography.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  generalForumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 10,
  },
  generalForumIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generalForumBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  generalForumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  generalForumBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  generalForumBannerSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  generalForumAction: {
    fontSize: 13,
    fontWeight: '700',
  },
});
