import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { ClassCard } from '@/components/ClassCard';
import { ClassDetailModal } from '@/components/ClassDetailModal';
import { ClassForumModal } from '@/components/ClassForumModal';
import { MySessionRequests } from '@/components/booking/MySessionRequests';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PaymentCheckoutModal } from '@/components/PaymentCheckoutModal';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { describeHoursLines } from '@/domain/childWatch';
import { getClassShortSummary, requiresAdvanceRegistration } from '@/domain/classCatalog';
import { getDemoToday } from '@/domain/demoClock';
import type { ClassRegistration, Membership, ScheduleItem } from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { savedClassesRepo } from '@/repositories/savedClassesRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

type FilterChipKey =
  | 'all'
  | 'myBookings'
  | 'favorites'
  | 'regRequired'
  | 'swim'
  | 'groupEx'
  | 'mindBody'
  | 'seniors'
  | 'gym'
  | 'pool'
  | 'freeweight'
  | 'studio'
  | 'circuit'
  | 'event';

const FILTER_CHIPS: { key: FilterChipKey; label: string; icon?: any }[] = [
  { key: 'all', label: 'All Classes' },
  { key: 'favorites', label: 'Starred Reminders', icon: 'star' },
  { key: 'myBookings', label: 'My Bookings', icon: 'checkmark-circle' },
  { key: 'regRequired', label: 'Registration Required' },
  { key: 'swim', label: 'Aquatics' },
  { key: 'groupEx', label: 'Group Fitness' },
  { key: 'mindBody', label: 'Yoga & Mind-Body' },
  { key: 'seniors', label: 'Active Older Adults' },
  { key: 'gym', label: 'Gym' },
  { key: 'pool', label: 'Indoor Pool' },
  { key: 'freeweight', label: 'Free Weight 2' },
  { key: 'studio', label: 'Studio' },
  { key: 'circuit', label: 'Circuit Room' },
  { key: 'event', label: 'Events' },
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

function formatDayPillShort(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const dayName = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const dayNum = d.getDate();
  return `${dayName} ${dayNum}`;
}

function dayKey(isoStart: string): string {
  return isoStart.slice(0, 10);
}

function formatDurationStr(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const mins = Math.round((e - s) / 60000);
    if (mins > 0) return `${mins} min`;
  } catch {
    // fallback
  }
  return '60 min';
}

export default function MemberSchedulesScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { config } = useAppConfig();
  const { colors: tc, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  // Data state
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [allWeekItems, setAllWeekItems] = useState<ScheduleItem[]>([]);
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dayIndex, setDayIndex] = useState(0);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState<FilterChipKey>('all');

  // Modals
  const [checkoutItem, setCheckoutItem] = useState<ScheduleItem | null>(null);
  const [selectedForumClass, setSelectedForumClass] = useState<ScheduleItem | null>(null);
  const [forumModalVisible, setForumModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<ScheduleItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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
      const [weekSchedules, regs, saved, mem] = await Promise.all([
        scheduleRepo.list(api, {
          branchId: BRANCH_ID,
          from: today,
          to,
        }),
        registrationRepo.listMine(api, memberId),
        savedClassesRepo.list(memberId),
        membershipRepo.getMembership(api, memberId),
      ]);
      weekSchedules.sort((a, b) => a.start.localeCompare(b.start));
      setItems(weekSchedules);
      setAllWeekItems(weekSchedules);
      setRegistrations(regs);
      setSavedIds(new Set(saved.map((s) => s.scheduleItemId)));
      setMembership(mem);
      setLoaded(true);
      setLoadTick((t) => t + 1);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, [api, memberId]);

  // Defer the heavy load until the tab transition has finished so the tab bar never freezes.
  useFocusEffect(
    useCallback(() => {
      const handle = setTimeout(() => {
        void load();
      }, 0);
      return () => clearTimeout(handle);
    }, [load])
  );

  // Roster counts only for the selected day (was: every class in the week at once).
  useEffect(() => {
    if (allWeekItems.length === 0) {
      return;
    }
    let cancelled = false;
    const dayItems = allWeekItems.filter((i) => dayKey(i.start) === weekDays[dayIndex]);
    void registrationRepo
      .rosterCounts(
        api,
        dayItems.map((i) => i.id)
      )
      .then((counts) => {
        if (!cancelled) {
          setRosterCounts((prev) => ({ ...prev, ...counts }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, allWeekItems, dayIndex, weekDays, loadTick]);

  const registeredMap = useMemo(() => {
    const map = new Map<string, ClassRegistration>();
    for (const r of registrations) {
      if (r.status === 'registered') {
        map.set(r.scheduleItemId, r);
      }
    }
    return map;
  }, [registrations]);

  const goDay = (next: number) => {
    const clamped = Math.max(0, Math.min(6, next));
    setDayIndex(clamped);
  };

  const activeDay = weekDays[dayIndex];

  // Filtering pipeline
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemDay = dayKey(item.start);

      // Match selected day
      if (itemDay !== activeDay) return false;

      // Filter by active chip
      if (activeChip === 'myBookings') {
        if (!registeredMap.has(item.id)) return false;
      } else if (activeChip === 'favorites') {
        if (!savedIds.has(item.id)) return false;
      } else if (activeChip === 'regRequired') {
        if (!item.registrationRequired) return false;
      } else if (activeChip === 'swim') {
        const titleL = item.title.toLowerCase();
        const isSwim =
          item.category === 'swim' ||
          item.location.toLowerCase().includes('pool') ||
          titleL.includes('water') ||
          titleL.includes('aqua');
        if (!isSwim) return false;
      } else if (activeChip === 'mindBody') {
        const titleL = item.title.toLowerCase();
        const isMind =
          titleL.includes('yoga') ||
          titleL.includes('tai chi') ||
          titleL.includes('qigong') ||
          titleL.includes('balance') ||
          titleL.includes('pilates');
        if (!isMind) return false;
      } else if (activeChip === 'seniors') {
        const isSenior = item.category === 'seniors' || Boolean(item.seniorFriendly);
        if (!isSenior) return false;
      } else if (activeChip === 'groupEx') {
        if (item.category !== 'groupEx') return false;
      } else if (activeChip === 'gym') {
        if (!item.location.toLowerCase().includes('gym')) return false;
      } else if (activeChip === 'pool') {
        if (!item.location.toLowerCase().includes('pool')) return false;
      } else if (activeChip === 'freeweight') {
        if (!item.location.toLowerCase().includes('free weight')) return false;
      } else if (activeChip === 'studio') {
        const locL = item.location.toLowerCase();
        if (!(locL === 'studio' || locL.includes('studio b'))) return false;
      } else if (activeChip === 'circuit') {
        if (!item.location.toLowerCase().includes('circuit')) return false;
      } else if (activeChip === 'event') {
        if (item.category !== 'event' && !item.isSpecialEvent) return false;
      }

      // Text search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesInstructor = item.instructorName.toLowerCase().includes(q);
        const matchesLocation = item.location.toLowerCase().includes(q);
        const matchesSummary = getClassShortSummary(item).toLowerCase().includes(q);
        const matchesDesc = (item.description ?? '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesInstructor && !matchesLocation && !matchesSummary && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeDay, activeChip, searchQuery, registeredMap, savedIds]);

  // Day indicators (dots for booking or saved class)
  const dayStats = useMemo(() => {
    const stats: Record<string, { count: number; hasRegistered: boolean; hasSaved: boolean }> = {};
    for (const d of weekDays) {
      stats[d] = { count: 0, hasRegistered: false, hasSaved: false };
    }
    for (const item of allWeekItems) {
      const d = dayKey(item.start);
      if (stats[d]) {
        stats[d].count += 1;
        if (requiresAdvanceRegistration(item) && registeredMap.has(item.id)) {
          stats[d].hasRegistered = true;
        }
        if (savedIds.has(item.id)) {
          stats[d].hasSaved = true;
        }
      }
    }
    return stats;
  }, [weekDays, allWeekItems, registeredMap, savedIds]);

  const onToggleStar = async (scheduleItemId: string) => {
    if (memberId === '') {
      return;
    }
    // Optimistic: flip the star immediately instead of reloading the whole week.
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleItemId)) next.delete(scheduleItemId);
      else next.add(scheduleItemId);
      return next;
    });
    try {
      await savedClassesRepo.toggle(memberId, scheduleItemId);
    } catch {
      const saved = await savedClassesRepo.list(memberId);
      setSavedIds(new Set(saved.map((s) => s.scheduleItemId)));
    }
  };

  const handleBookingPress = (item: ScheduleItem) => {
    if (!requiresAdvanceRegistration(item)) {
      return;
    }
    const isPaid = (item.priceCents ?? 0) > 0;
    if (isPaid) {
      setCheckoutItem(item);
    } else {
      confirmFreeRegister(item);
    }
  };

  const confirmFreeRegister = (item: ScheduleItem) => {
    dialog.show({
      title: item.registrationRequired ? 'Reserve Spot in Class?' : 'Register for Class?',
      message: `${item.title}\n${formatDayLabel(dayKey(item.start))} · ${formatClassTime(item.start)}\nInstructor: ${item.instructorName} · ${item.location}\n\nIncluded with your YMCA membership ($0.00).`,
      icon: 'calendar',
      buttons: [
        { text: 'Not now', style: 'cancel' },
        {
          text: item.registrationRequired ? 'Reserve Spot' : 'Register Free',
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
          message: `You are booked for ${item.title}!\nPayment of $${((item.priceCents ?? 0) / 100).toFixed(2)} charged to ${membership?.paymentBrand ?? 'Card'} ending in ••${membership?.paymentLast4 ?? '4242'}.\n\nA confirmation receipt has been saved to your account.`,
          icon: 'checkmark',
          buttons: [{ text: 'Great!', style: 'default' }],
        });
      } else {
        dialog.show({
          title: item.registrationRequired ? 'Spot Reserved!' : 'Registration Confirmed!',
          message: `You are confirmed for ${item.title} on ${formatDayLabel(dayKey(item.start))} at ${formatClassTime(item.start)}.\nLocation: ${item.location}.`,
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
      title: wasPaid ? 'Cancel Paid Booking?' : 'Cancel Reservation?',
      message: wasPaid
        ? `Cancel your booking for ${item.title} on ${formatDayLabel(dayKey(item.start))}?\n\nA full refund of $${(paidAmountCents / 100).toFixed(2)} will be credited back to your card on file.`
        : `Remove yourself from ${item.title} on ${formatDayLabel(dayKey(item.start))}? This will open up your spot for other members.`,
      icon: 'trash',
      buttons: [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: wasPaid ? 'Cancel & Refund' : 'Cancel Reservation',
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveChip('all');
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || activeChip !== 'all';

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Class & Program Schedules" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      {/* ========================================================= */}
      {/* PINNED COMPACT TOP SECTION (Maximized Class List Height) */}
      {/* ========================================================= */}
      <View style={[styles.pinnedHeader, { backgroundColor: tc.cardBg, borderBottomColor: tc.border }]}>
        {/* Top Schedule Mode Toggle */}
        <View style={styles.topScheduleToggleRow}>
          <View
            style={[
              styles.topScheduleToggleBtn,
              { backgroundColor: tc.primary },
            ]}
          >
            <Ionicons name="fitness" size={13} color="#FFFFFF" />
            <Text style={styles.topScheduleToggleTextActive}>Group Classes</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(member)/pool-schedule')}
            style={[
              styles.topScheduleToggleBtn,
              styles.topScheduleToggleBtnPool,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: tc.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Switch to Pool and Lane Schedules"
          >
            <Ionicons
              name="water"
              size={13}
              color={tc.primary}
              style={styles.topScheduleToggleIcon}
            />
            <View style={styles.topScheduleToggleLabelStack}>
              <Text
                style={[styles.topScheduleToggleText, styles.topScheduleToggleTextPool, { color: tc.text }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Pool & Lane Schedules
              </Text>
              <View style={[styles.poolBadgePill, { backgroundColor: '#38BDF8' }]}>
                <Text style={styles.poolBadgePillText}>6 LANES</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.fallScheduleRow}>
          <View style={[styles.sessionBadge, { backgroundColor: tc.primaryLight }]}>
            <Text style={[styles.sessionBadgeText, { color: tc.primaryDark }]}>
              FALL 1 SCHEDULE
            </Text>
          </View>
          <Text style={[styles.sessionDateText, { color: tc.textMuted }]}>
            Aug 24 – Nov 11
          </Text>
        </View>

        {/* Compact Day Selector Bar */}
        <View style={styles.dayStripRow}>
          <Pressable
            onPress={() => goDay(dayIndex - 1)}
            disabled={dayIndex === 0}
            style={[styles.arrowBtn, dayIndex === 0 && styles.arrowBtnDisabled]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
          >
            <Ionicons name="chevron-back" size={20} color={dayIndex === 0 ? tc.border : tc.primary} />
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayStripScroll}
          >
            {weekDays.map((d, idx) => {
              const active = idx === dayIndex;
              const stat = dayStats[d] ?? { count: 0, hasRegistered: false, hasSaved: false };
              const isToday = idx === 0;

              return (
                <Pressable
                  key={d}
                  onPress={() => goDay(idx)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: active ? tc.primary : isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: active ? tc.primary : tc.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${formatDayLabel(d)}, ${stat.count} classes scheduled`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text
                      style={[
                        styles.dayPillText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '800' },
                      ]}
                    >
                      {formatDayPillShort(d)}
                    </Text>
                    {isToday ? (
                      <View
                        style={[
                          styles.todayDotBadge,
                          { backgroundColor: active ? '#FFFFFF' : tc.primary },
                        ]}
                      />
                    ) : null}
                  </View>

                  {/* Indicator Dots under day */}
                  <View style={styles.pillDotsRow}>
                    {stat.hasRegistered ? (
                      <View style={[styles.pillDot, { backgroundColor: active ? '#86EFAC' : tc.success }]} />
                    ) : null}
                    {stat.hasSaved ? (
                      <View style={[styles.pillDot, { backgroundColor: active ? '#FDE047' : colors.gold }]} />
                    ) : null}
                    <Text
                      style={[
                        styles.pillCount,
                        { color: active ? '#E2E8F0' : tc.textMuted },
                      ]}
                    >
                      {stat.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => goDay(dayIndex + 1)}
            disabled={dayIndex === 6}
            style={[styles.arrowBtn, dayIndex === 6 && styles.arrowBtnDisabled]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next day"
          >
            <Ionicons name="chevron-forward" size={20} color={dayIndex === 6 ? tc.border : tc.primary} />
          </Pressable>
        </View>

        {/* Compact Search & Filter Row */}
        <View style={styles.searchAndChipsRow}>
          <View style={[styles.compactSearchBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: tc.border }]}>
            <Ionicons name="search" size={15} color={tc.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search classes, Chris, Sue, Gym, Pool..."
              placeholderTextColor={tc.textMuted}
              style={[styles.compactSearchInput, { color: tc.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={tc.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Unified Horizontal Filter Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.unifiedFilterScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeChip === chip.key;
            let countLabel = '';
            if (chip.key === 'myBookings') countLabel = ` (${registrations.length})`;
            if (chip.key === 'favorites') countLabel = ` (${savedIds.size})`;

            return (
              <Pressable
                key={chip.key}
                onPress={() => setActiveChip(chip.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? tc.primary : isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: active ? tc.primary : tc.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${chip.label}${countLabel}`}
              >
                {chip.icon ? (
                  <Ionicons
                    name={chip.icon}
                    size={12}
                    color={active ? '#FFFFFF' : chip.key === 'myBookings' ? tc.success : colors.gold}
                  />
                ) : null}
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : tc.text },
                    active && { fontWeight: '700' },
                  ]}
                >
                  {chip.label}
                  {countLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ========================================================= */}
      {/* EXPANSIVE SCROLLING CLASS LIST (HERO VIEWPORT)            */}
      {/* ========================================================= */}
      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        style={styles.classList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.listHeaderWrapper}>
            <MySessionRequests />
            {/* Quick Community Forum Banner (Scrolls naturally with list) */}
            {config.featureToggles.communityForum ? (
            <Pressable
              onPress={() => router.push('/(member)/community-forum')}
              style={[
                styles.slimForumBanner,
                { backgroundColor: tc.cardBg, borderColor: tc.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Branch Community Forum"
            >
              <View style={[styles.slimForumIconWrap, { backgroundColor: isDark ? '#1E3A8A' : '#E0F2FE' }]}>
                <Ionicons name="chatbubbles" size={14} color={tc.primary} />
              </View>
              <Text style={[styles.slimForumText, { color: tc.text }]} numberOfLines={1}>
                Have a question or looking to connect? <Text style={{ color: tc.primary, fontWeight: '700' }}>Open Community Forum ›</Text>
              </Text>
            </Pressable>
            ) : null}

            {/* Dedicated Aquatics Pool Schedule Callout Banner */}
            {activeChip === 'swim' || activeChip === 'pool' || activeChip === 'all' ? (
              <Pressable
                onPress={() => router.push('/(member)/pool-schedule')}
                style={[
                  styles.poolScheduleBanner,
                  {
                    backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                    borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="View Official 6-Lane Pool Schedules"
              >
                <View style={[styles.poolBannerIconWrap, { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' }]}>
                  <Ionicons name="water" size={16} color={tc.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.poolBannerTitle, { color: tc.text }]}>
                      Indoor & Outdoor Pool Schedules
                    </Text>
                    <View style={[styles.poolBadge, { backgroundColor: '#38BDF8' }]}>
                      <Text style={styles.poolBadgeText}>OCT 05, 2026</Text>
                    </View>
                  </View>
                  <Text style={[styles.poolBannerSub, { color: tc.textMuted }]} numberOfLines={1}>
                    6-Lane allocations, lap swimming hours, water fitness & water polo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={tc.primary} />
              </Pressable>
            ) : null}

            {/* Child Watch is a service, not a class */}
            {config.featureToggles.childWatch ? (
            <Pressable
              onPress={() => router.push('/(member)/child-watch')}
              style={[styles.slimForumBanner, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
              accessibilityRole="button"
              accessibilityLabel="Open Child Watch hours and sign-in"
            >
              <View style={[styles.slimForumIconWrap, { backgroundColor: isDark ? '#1E3A8A' : '#E0F2FE' }]}>
                <Ionicons name="happy-outline" size={14} color={tc.primary} />
              </View>
              <Text style={[styles.slimForumText, { color: tc.text }]} numberOfLines={1}>
                Free Child Watch · {describeHoursLines(config.childWatch.hours).filter((l) => !l.closed).map((l) => l.text).join(' · ')} <Text style={{ color: tc.primary, fontWeight: '700' }}>Details ›</Text>
              </Text>
            </Pressable>
            ) : null}

            {/* Day heading: makes it clear which single day the list below shows */}
            <View style={styles.dayHeadingRow}>
              <Text style={[styles.dayHeadingText, { color: tc.text }]}>
                {dayIndex === 0 ? 'Today · ' : dayIndex === 1 ? 'Tomorrow · ' : ''}
                {formatDayLabel(activeDay)}
              </Text>
              {loaded ? (
                <Text style={[styles.dayHeadingCount, { color: tc.textMuted }]}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'class' : 'classes'}
                </Text>
              ) : (
                <ActivityIndicator size="small" color={tc.primary} />
              )}
            </View>

            {/* Filter Status Reset Pill if filters are active */}
            {hasActiveFilters ? (
              <View style={styles.activeFilterNoticeRow}>
                <Text style={[styles.activeFilterNoticeText, { color: tc.textMuted }]}>
                  Showing {filteredItems.length} matching {activeChip !== 'all' ? `"${activeChip}"` : ''}{searchQuery ? ` "${searchQuery}"` : ''}
                </Text>
                <Pressable onPress={clearAllFilters} hitSlop={6}>
                  <Text style={[styles.clearFilterText, { color: tc.primary }]}>Clear filters</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loaded && !error ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: tc.cardBg, borderColor: tc.border },
              ]}
              accessibilityRole="progressbar"
              accessibilityLabel="Loading classes"
            >
              <ActivityIndicator size="large" color={tc.primary} />
              <Text style={[styles.emptyTitle, { color: tc.text }]}>Loading classes…</Text>
            </View>
          ) : (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: tc.cardBg, borderColor: tc.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={42} color={tc.textMuted} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>
              No Classes Matching Filter
            </Text>
            <Text style={[styles.empty, { color: tc.textMuted }]}>
              {hasActiveFilters
                ? 'Try clearing your search query or selecting "All Classes" to see everything scheduled.'
                : `There are no scheduled sessions for ${formatDayLabel(activeDay)}.`}
            </Text>

            {hasActiveFilters ? (
              <Pressable
                onPress={clearAllFilters}
                style={[styles.resetBtn, { backgroundColor: tc.primaryLight, borderColor: tc.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Reset all filters"
              >
                <Ionicons name="refresh" size={15} color={tc.primary} />
                <Text style={[styles.resetBtnText, { color: tc.primary }]}>
                  Show All Classes
                </Text>
              </Pressable>
            ) : null}
          </View>
          )
        }
        renderItem={({ item }) => {
          const canRegister = requiresAdvanceRegistration(item);
          const reg = canRegister ? registeredMap.get(item.id) : undefined;
          const registered = canRegister && reg != null && reg.status === 'registered';
          const taken = rosterCounts[item.id] ?? 0;
          const spotsLeft = Math.max(0, item.capacity - taken);
          const durationStr = formatDurationStr(item.start, item.end);

          return (
            <View style={styles.cardItem}>
              <ClassCard
                time={formatClassTime(item.start)}
                title={item.title}
                location={item.location}
                instructor={item.instructorName}
                spotsLeft={spotsLeft}
                capacity={item.capacity}
                registered={registered}
                starred={savedIds.has(item.id)}
                priceCents={item.priceCents}
                isSpecialEvent={item.isSpecialEvent}
                seniorFriendly={item.seniorFriendly}
                registrationRequired={canRegister}
                intensity={item.intensity}
                durationStr={durationStr}
                paidAmountCents={reg?.paidAmountCents}
                shortSummary={item.shortSummary}
                description={item.description}
                onToggleStar={() => void onToggleStar(item.id)}
                onRegister={canRegister ? () => handleBookingPress(item) : undefined}
                onChange={registered ? () => confirmChange(item) : undefined}
                onCancel={registered ? () => confirmCancel(item) : undefined}
                onPressCard={() => {
                  setDetailItem(item);
                  setDetailModalVisible(true);
                }}
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

      {/* Enterprise Class Details Modal */}
      <ClassDetailModal
        visible={detailModalVisible}
        item={detailItem}
        dayLabel={detailItem ? formatDayLabel(dayKey(detailItem.start)) : ''}
        timeLabel={detailItem ? formatClassTime(detailItem.start) : ''}
        registered={
          detailItem && requiresAdvanceRegistration(detailItem)
            ? registeredMap.has(detailItem.id)
            : false
        }
        spotsLeft={detailItem ? Math.max(0, detailItem.capacity - (rosterCounts[detailItem.id] ?? 0)) : 0}
        totalBooked={detailItem ? rosterCounts[detailItem.id] ?? 0 : 0}
        starred={detailItem ? savedIds.has(detailItem.id) : false}
        busy={busyId === detailItem?.id}
        onClose={() => setDetailModalVisible(false)}
        onRegister={() => {
          if (detailItem && requiresAdvanceRegistration(detailItem)) {
            handleBookingPress(detailItem);
          }
        }}
        onChange={
          detailItem && requiresAdvanceRegistration(detailItem) && registeredMap.has(detailItem.id)
            ? () => confirmChange(detailItem)
            : undefined
        }
        onCancel={
          detailItem && requiresAdvanceRegistration(detailItem) && registeredMap.has(detailItem.id)
            ? () => confirmCancel(detailItem)
            : undefined
        }
        onToggleStar={detailItem ? () => void onToggleStar(detailItem.id) : undefined}
        onOpenForum={() => {
          if (detailItem) {
            setSelectedForumClass(detailItem);
            setForumModalVisible(true);
          }
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

      {/* Class Forum & Community Discussion Modal */}
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
  },
  pinnedHeader: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    gap: 6,
  },
  dayStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  arrowBtn: {
    width: 28,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.25,
  },
  dayStripScroll: {
    paddingHorizontal: 4,
    gap: 6,
    alignItems: 'center',
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    gap: 2,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  todayDotBadge: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pillDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pillCount: {
    fontSize: 9,
    fontWeight: '600',
  },
  searchAndChipsRow: {
    paddingHorizontal: spacing.md,
  },
  compactSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 7 : 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  unifiedFilterScroll: {
    paddingHorizontal: spacing.md,
    gap: 6,
    paddingTop: 2,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.chip,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  classList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 6,
  },
  listHeaderWrapper: {
    gap: 8,
    marginBottom: 6,
  },
  fallScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingBottom: 4,
  },
  sessionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionDateText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  slimForumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  slimForumIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimForumText: {
    fontSize: 11,
    flex: 1,
  },
  activeFilterNoticeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activeFilterNoticeText: {
    fontSize: 11,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardItem: {
    marginBottom: 4,
  },
  dayHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  dayHeadingText: {
    fontSize: 15,
    fontWeight: '800',
  },
  dayHeadingCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    borderRadius: radii.card,
    padding: spacing.xl,
    marginVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '800',
  },
  empty: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topScheduleToggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topScheduleToggleBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  topScheduleToggleBtnPool: {
    gap: 4,
    paddingVertical: 6,
  },
  topScheduleToggleIcon: {
    flexShrink: 0,
  },
  topScheduleToggleLabelStack: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  topScheduleToggleTextPool: {
    textAlign: 'center',
    lineHeight: 14,
  },
  topScheduleToggleTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topScheduleToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  poolBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  poolBadgePillText: {
    color: '#0369A1',
    fontSize: 9,
    fontWeight: '800',
  },
  poolScheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: 4,
  },
  poolBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  poolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  poolBadgeText: {
    color: '#0369A1',
    fontSize: 9,
    fontWeight: '800',
  },
  poolBannerSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
