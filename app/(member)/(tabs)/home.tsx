import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AttendanceStreakCard } from '@/components/AttendanceStreakCard';
import { BillingHero } from '@/components/BillingHero';
import { ErrorBanner } from '@/components/ErrorBanner';
import { GuestPassCard } from '@/components/GuestPassCard';
import { MemberCheckInCard } from '@/components/MemberCheckInCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import type {
  Announcement,
  Member,
  Membership,
  MemberStreakProfile,
  PrivateLesson,
  ScheduleItem,
  Survey,
} from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { lessonRepo } from '@/repositories/lessonRepo';
import { membershipRepo } from '@/repositories/membershipRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { savedClassesRepo } from '@/repositories/savedClassesRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { streakRepo } from '@/repositories/streakRepo';
import { surveyRepo } from '@/repositories/surveyRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';
const BRANCH_NAME = 'YMCA Silver Spring';
const BRANCH_ADDRESS = '9800 Hastings Drive, Silver Spring, MD 20901';
const BRANCH_PHONE = '(301) 585-2120';
const HOURS_WEEKDAY = 'Mon–Fri 5:30 AM – 10:00 PM';
const HOURS_WEEKEND = 'Sat 7:00 AM – 8:00 PM · Sun 8:00 AM – 8:00 PM';
const CARD_WIDTH = Dimensions.get('window').width - 48;

type WeekItem =
  | { kind: 'class'; item: ScheduleItem; paidAmountCents?: number; starredOnly?: boolean }
  | { kind: 'lesson'; item: PrivateLesson };

function formatBillingDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function membershipSubtitle(member: Member, membership: Membership): string {
  return `${member.type} Membership · ${formatCents(membership.monthlyAmountCents)}/mo · ${membership.paymentBrand} ••${membership.paymentLast4}`;
}

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDayShort(isoStart: string): string {
  const d = new Date(isoStart);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MemberHomeScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [streakProfile, setStreakProfile] = useState<MemberStreakProfile | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [activePopupNotice, setActivePopupNotice] = useState<Announcement | null>(null);
  const [popupNoticeVisible, setPopupNoticeVisible] = useState(false);
  const [weekItems, setWeekItems] = useState<WeekItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [error, setError] = useState(false);
  const listRef = useRef<FlatList<WeekItem>>(null);
  const hasCheckedPopupRef = useRef(false);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const to = addDays(today, 6);
      const [nextMember, nextMembership, regs, savedList, lessons, schedules, anns, surveysList, streakData] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
        registrationRepo.listMine(api, memberId),
        savedClassesRepo.list(memberId),
        lessonRepo.listMine(api, memberId),
        scheduleRepo.list(api, { branchId: BRANCH_ID, from: today, to }),
        announcementRepo.list(api, BRANCH_ID),
        surveyRepo.list(api, BRANCH_ID, true).catch(() => []),
        streakRepo.getStreakProfile(memberId),
      ]);
      const byId = new Map<string, ScheduleItem>(schedules.map((s: ScheduleItem) => [s.id, s]));
      const seenClassIds = new Set<string>();
      const classItems: WeekItem[] = [];
      for (const r of regs) {
        const s = byId.get(r.scheduleItemId);
        if (s) {
          seenClassIds.add(s.id);
          classItems.push({ kind: 'class', item: s, paidAmountCents: r.paidAmountCents, starredOnly: false });
        }
      }
      for (const sc of savedList) {
        if (seenClassIds.has(sc.scheduleItemId)) continue;
        const s = byId.get(sc.scheduleItemId);
        if (s) {
          seenClassIds.add(s.id);
          classItems.push({ kind: 'class', item: s, starredOnly: true });
        }
      }

      const lessonItems: WeekItem[] = lessons.map((item: PrivateLesson) => ({
        kind: 'lesson' as const,
        item,
      }));
      const combined = [...classItems, ...lessonItems].sort((a, b) =>
        a.item.start.localeCompare(b.item.start)
      );
      setMember(nextMember);
      setMembership(nextMembership);
      setStreakProfile(streakData);
      if (anns && anns.length > 0) {
        setLatestAnnouncement(anns[0]);
      }
      setActiveSurveys(surveysList ?? []);
      setWeekItems(combined);
      setCardIndex(0);

      // Pop-up Notice on App Open
      const popups: Announcement[] = (anns || []).filter((a: Announcement) => a.popupNotice);
      if (popups.length > 0 && !hasCheckedPopupRef.current) {
        hasCheckedPopupRef.current = true;
        const priorityOrder: Record<string, number> = { urgent: 3, high: 2, normal: 1 };
        popups.sort((a: Announcement, b: Announcement) => {
          const diff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
          if (diff !== 0) return diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const dismissedKey = `@ymca_dismissed_popups_${memberId}`;
        const raw = await AsyncStorage.getItem(dismissedKey).catch(() => null);
        const dismissed: string[] = raw ? JSON.parse(raw) : [];
        const target = popups.find((p: Announcement) => !dismissed.includes(p.id));
        if (target) {
          setActivePopupNotice(target);
          setPopupNoticeVisible(true);
        }
      }
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  const handleDismissPopup = async (noticeId?: string) => {
    setPopupNoticeVisible(false);
    if (!noticeId || !memberId) return;
    try {
      const dismissedKey = `@ymca_dismissed_popups_${memberId}`;
      const raw = await AsyncStorage.getItem(dismissedKey).catch(() => null);
      const dismissed: string[] = raw ? JSON.parse(raw) : [];
      if (!dismissed.includes(noticeId)) {
        dismissed.push(noticeId);
        await AsyncStorage.setItem(dismissedKey, JSON.stringify(dismissed));
      }
    } catch {
      // ignore
    }
  };

  const handlePopupAction = async (notice: Announcement) => {
    await handleDismissPopup(notice.id);
    if (notice.actionUrl) {
      router.push(notice.actionUrl as any);
    } else {
      router.push('/(member)/notifications');
    }
  };

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const firstName = member?.name.split(' ')[0] ?? '';
  const isGuest = session?.role === 'guest' || member?.type === '1-Day Guest Pass';

  const onCardScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    if (index >= 0 && index < weekItems.length) {
      setCardIndex(index);
    }
  };

  const dots = useMemo(
    () =>
      weekItems.map((_, i) => (
        <View key={i} style={[styles.dot, i === cardIndex && styles.dotActive]} />
      )),
    [weekItems, cardIndex]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle={firstName ? (isGuest ? `Welcome to the Y, ${firstName} (Guest Pass)` : `Welcome back, ${firstName}`) : 'YMCA Silver Spring'} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Digital Member or Guest Scan Pass */}
        {member ? (
          isGuest ? (
            <GuestPassCard
              guestName={member.name}
              passCode={member.membershipId}
              validUntilLabel="Valid Today until 10:00 PM"
              showActionShortcuts={true}
              onOpenDetails={() => router.push('/(member)/guest-screen')}
            />
          ) : (
            <MemberCheckInCard
              member={member}
              onBookOrientation={() => router.push('/(member)/(tabs)/trainers')}
              onClose={() => {
                if (memberId) {
                  void streakRepo.getStreakProfile(memberId).then(setStreakProfile);
                }
              }}
            />
          )
        ) : null}

        {/* Member Attendance Goals, Streaks, Fire Milestone Colors & Hold Card */}
        {member && streakProfile ? (
          <AttendanceStreakCard
            profile={streakProfile}
            memberId={memberId}
            memberName={member.name}
            onProfileUpdated={(updated) => setStreakProfile(updated)}
          />
        ) : null}

        {/* Latest Announcement Banner */}
        {latestAnnouncement ? (
          <Pressable
            onPress={() =>
              router.push(
                latestAnnouncement.actionUrl
                  ? (latestAnnouncement.actionUrl as any)
                  : '/(member)/notifications'
              )
            }
            style={[
              styles.announcementBanner,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Notice: ${latestAnnouncement.title}`}
          >
            <View style={styles.announcementLeft}>
              <View
                style={[
                  styles.annIconCircle,
                  {
                    backgroundColor:
                      latestAnnouncement.priority === 'high'
                        ? colors.goldBg
                        : colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={
                    latestAnnouncement.priority === 'high'
                      ? 'alert-circle'
                      : 'megaphone'
                  }
                  size={18}
                  color={
                    latestAnnouncement.priority === 'high'
                      ? colors.gold
                      : colors.primary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.annBadgeText, { color: colors.primary }]}>
                    LATEST BRANCH NOTICE
                  </Text>
                </View>
                <Text style={[styles.annTitleText, { color: colors.text }]} numberOfLines={1}>
                  {latestAnnouncement.title}
                </Text>
                <Text style={[styles.annBodyText, { color: colors.textMuted }]} numberOfLines={1}>
                  {latestAnnouncement.body}
                </Text>
              </View>
            </View>
            <Text style={[styles.quickPlanAction, { color: colors.primary }]}>View ›</Text>
          </Pressable>
        ) : null}

        {/* Active Member Survey / Poll Banner */}
        {activeSurveys.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(member)/surveys')}
            style={[
              styles.surveyBanner,
              {
                backgroundColor: isDark ? '#143325' : '#F0FDF4',
                borderColor: '#16A34A',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Active Poll: ${activeSurveys[0].title}`}
          >
            <View style={styles.surveyBannerLeft}>
              <View style={[styles.surveyIconCircle, { backgroundColor: '#16A34A' }]}>
                <Ionicons name="stats-chart" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.surveyBadgeText, { color: '#16A34A' }]}>
                    ACTIVE MEMBER POLL & SURVEY ({activeSurveys.length})
                  </Text>
                </View>
                <Text style={[styles.surveyTitleText, { color: colors.text }]} numberOfLines={1}>
                  {activeSurveys[0].title}
                </Text>
                <Text style={[styles.surveyBodyText, { color: colors.textMuted }]} numberOfLines={1}>
                  {activeSurveys[0].description}
                </Text>
              </View>
            </View>
            <Text style={[styles.quickPlanAction, { color: '#16A34A' }]}>Vote ›</Text>
          </Pressable>
        ) : null}

        {/* Guest Special Offer or Next Billing Summary */}
        {isGuest ? (
          <View
            style={[
              styles.guestPromoBanner,
              {
                backgroundColor: isDark ? '#172554' : '#EFF6FF',
                borderColor: isDark ? '#1D4ED8' : '#93C5FD',
              },
            ]}
          >
            <View style={styles.guestPromoPill}>
              <Ionicons name="sparkles" size={13} color="#1D4ED8" />
              <Text style={styles.guestPromoPillText}>EXCLUSIVE GUEST BENEFIT: $0 ENROLLMENT FEE</Text>
            </View>
            <Text style={[styles.guestPromoTitle, { color: colors.text }]}>
              Love Your Workout Today? Join the Y as a Member!
            </Text>
            <Text style={[styles.guestPromoDesc, { color: colors.textMuted }]}>
              Turn today’s guest pass into a full membership within 48 hours and we’ll completely waive your one-time enrollment fee. Access 2,500+ YMCAs across North America!
            </Text>
            <View style={styles.guestPromoBtnRow}>
              <Pressable
                onPress={() => router.push('/(member)/guest-screen')}
                style={[styles.guestActionBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Open Full Guest Experience Screen"
              >
                <Ionicons name="ticket-outline" size={15} color="#FFFFFF" />
                <Text style={styles.guestActionBtnText}>Guest Screen & Info ›</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(member)/join-membership')}
                style={[
                  styles.guestActionBtnOutline,
                  { borderColor: colors.primary, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Explore membership plans and join YMCA"
              >
                <Ionicons name="id-card-outline" size={15} color={colors.primary} />
                <Text style={[styles.guestActionBtnTextOutline, { color: colors.primary }]}>
                  Join YMCA ($0 Fee) ›
                </Text>
              </Pressable>
            </View>
          </View>
        ) : membership && member ? (
          <View style={styles.billingSectionWrap}>
            <BillingHero
              nextBillingDateLabel={formatBillingDateLabel(membership.nextBillingDate)}
              subtitle={membershipSubtitle(member, membership)}
            />
            <Pressable
              onPress={() => router.push('/(member)/manage-membership')}
              style={[
                styles.quickPlanRow,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Manage membership plan"
            >
              <View style={styles.quickPlanLeft}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
                <Text style={[styles.quickPlanText, { color: colors.text }]}>
                  Manage plan, billing dates, switch or schedule for next month
                </Text>
              </View>
              <Text style={[styles.quickPlanAction, { color: colors.primary }]}>Manage ›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Dedicated General Community Forum Callout */}
        <Pressable
          onPress={() => router.push('/(member)/community-forum')}
          style={[styles.forumBanner, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          accessibilityRole="button"
          accessibilityLabel="Open YMCA General Community Forum"
        >
          <View style={[styles.forumBannerIcon, { backgroundColor: isDark ? '#1E3A8A' : '#E0F2FE' }]}>
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.forumBannerTitle, { color: colors.text }]}>General Community Forum</Text>
              <View style={[styles.forumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.forumBadgeText, { color: colors.primary }]}>ACTIVE</Text>
              </View>
            </View>
            <Text style={[styles.forumBannerSub, { color: colors.textMuted }]}>
              Branch-wide chat: share tips, workout questions, and @ staff desk
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        {/* Dedicated Aquatics & Pool Schedule Callout */}
        <Pressable
          onPress={() => router.push('/(member)/pool-schedule')}
          style={[styles.forumBanner, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          accessibilityRole="button"
          accessibilityLabel="Open Official YMCA Pool Schedules"
        >
          <View style={[styles.forumBannerIcon, { backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE' }]}>
            <Ionicons name="water" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.forumBannerTitle, { color: colors.text }]}>Indoor & Outdoor Pool Schedules</Text>
              <View style={[styles.forumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.forumBadgeText, { color: colors.primary }]}>6 LANES</Text>
              </View>
            </View>
            <Text style={[styles.forumBannerSub, { color: colors.textMuted }]}>
              Live lap availability, heated outdoor pool & lessons (Oct 05, 2026)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        {/* Quick Branch Feature Hub */}
        <View style={styles.featureHubRow}>
          <Pressable
            onPress={() => router.push('/(member)/pool-schedule')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="View Amenities and Heated Pools"
          >
            <View style={[styles.tileIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="water-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Pool Schedules</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>Indoor & Outdoor</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(member)/events')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="View Events and RSVP"
          >
            <View style={[styles.tileIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.accentBlue} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Events</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>RSVP & Reminders</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(member)/child-watch')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Open Child Watch"
          >
            <View style={[styles.tileIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="happy-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Child Watch</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>Free babysitting</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(member)/donate')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Donate to YMCA"
          >
            <View style={[styles.tileIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Give / Donate</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>Community Impact</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(member)/guest-screen')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel={isGuest ? 'View Guest Pass Screen' : 'View Guest Passes'}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="ticket-outline" size={20} color={colors.gold} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>
              {isGuest ? 'Guest Pass' : 'Guest Passes'}
            </Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>
              {isGuest ? 'Active Today' : '2 Free Annual'}
            </Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <PrimaryButton
            title="Browse Class Schedule"
            onPress={() => router.push('/(member)/(tabs)/schedules')}
            accessibilityHint="View and book classes"
          />
          <SecondaryButton
            title="Book a Private Lesson"
            onPress={() => router.push('/(member)/book-lesson')}
            accessibilityHint="Schedule one-on-one session with your trainer"
          />
        </View>

        {/* Branch Info Card */}
        <View
          style={[
            styles.branchCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
          accessibilityRole="summary"
          accessibilityLabel="Branch Information"
        >
          <View style={styles.branchHeaderRow}>
            <Text style={[styles.branchTitle, { color: colors.text }]} allowFontScaling>
              {BRANCH_NAME}
            </Text>
            <View style={[styles.openNowBadge, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.openNowText, { color: colors.success }]}>OPEN TODAY</Text>
            </View>
          </View>

          <Text style={[styles.bodyTextStrong, { color: colors.text }]} allowFontScaling>
            Facility Hours:
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]} allowFontScaling>
            {HOURS_WEEKDAY}
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]} allowFontScaling>
            {HOURS_WEEKEND}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.bodyTextStrong, { color: colors.text }]} allowFontScaling>
            Address & Contact:
          </Text>
          <Text style={[styles.bodyText, styles.address, { color: colors.textMuted }]} allowFontScaling>
            {BRANCH_ADDRESS}
          </Text>
          <Text style={[styles.bodyText, styles.phone, { color: colors.textMuted }]} allowFontScaling>
            Phone: {BRANCH_PHONE}
          </Text>

          <View style={styles.amenitiesWrap}>
            {['Indoor Pool', 'Outdoor Pool', 'Cardio & Weights', 'Pickleball', 'Child Watch', 'Active Older Adults'].map(
              (tag, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => router.push('/(member)/branch-amenities')}
                  style={[styles.amenityPill, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore ${tag} amenity`}
                >
                  <Text
                    style={[
                      styles.amenityText,
                      { color: isDark ? colors.primary : colors.primaryDark },
                    ]}
                  >
                    {tag} ›
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <Pressable
            onPress={() => router.push('/(member)/branch-amenities')}
            style={styles.branchExploreLink}
            accessibilityRole="button"
          >
            <Text style={[styles.branchExploreText, { color: colors.primary }]}>
              Explore All Amenities & Pool Schedules →
            </Text>
          </Pressable>
        </View>

        {/* This Week Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} allowFontScaling>
            Your Bookings & Starred Classes This Week
          </Text>
          {weekItems.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.muted, { color: colors.textMuted }]} allowFontScaling>
                You have nothing booked or starred yet this week. Star drop-in classes for reminders or reserve your spot in a program!
              </Text>
              <PrimaryButton
                title="Explore Classes & Events"
                onPress={() => router.push('/(member)/(tabs)/schedules')}
                accessibilityHint="Go to Classes to star or register"
              />
            </View>
          ) : (
            <>
              <FlatList
                ref={listRef}
                data={weekItems}
                keyExtractor={(w) =>
                  w.kind === 'class' ? `class-${w.item.id}` : `lesson-${w.item.id}`
                }
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 12}
                contentContainerStyle={styles.cardList}
                onMomentumScrollEnd={onCardScrollEnd}
                renderItem={({ item: w }) => (
                  <View style={[styles.weekCard, { width: CARD_WIDTH }]}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText} allowFontScaling>
                          {w.kind === 'class'
                            ? w.starredOnly
                              ? 'Saved Class'
                              : 'Booked Class'
                            : 'Private Lesson'}
                        </Text>
                      </View>
                      {w.kind === 'class' && w.item.priceCents && w.item.priceCents > 0 ? (
                        <View style={styles.paidPill}>
                          <Text style={styles.paidPillText}>
                            Paid ${((w.paidAmountCents ?? w.item.priceCents) / 100).toFixed(2)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.includedPill}>
                          <Text style={styles.includedPillText}>
                            {w.kind === 'class' && w.starredOnly ? 'Drop-In · Alert On' : 'Included Free'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.weekTitle} allowFontScaling>
                      {w.kind === 'class' ? w.item.title : 'Private Lesson'}
                    </Text>
                    <Text style={styles.weekTime} allowFontScaling>
                      {formatDayShort(w.item.start)} · {formatClassTime(w.item.start)}
                    </Text>
                    <Text style={styles.weekMeta} allowFontScaling>
                      Location: {w.item.location}
                    </Text>
                    {w.kind === 'class' ? (
                      <Text style={styles.weekMeta} allowFontScaling>
                        Instructor: {w.item.instructorName}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
              <View style={styles.dots}>{dots}</View>
            </>
          )}
        </View>

        {member ? (
          <Pressable
            onPress={() => router.push('/(member)/(tabs)/schedules')}
            accessibilityRole="button"
            accessibilityLabel="Browse full schedule"
            style={styles.linkRow}
          >
            <Text style={styles.linkText} allowFontScaling>
              View Full Week Schedule ›
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* ========================================================= */}
      {/* POP-UP NOTICE MODAL ON APP OPEN                           */}
      {/* ========================================================= */}
      <Modal
        visible={popupNoticeVisible && activePopupNotice != null}
        animationType="fade"
        transparent
        onRequestClose={() => void handleDismissPopup(activePopupNotice?.id)}
      >
        <View style={styles.popupOverlay}>
          <View
            style={[
              styles.popupBox,
              {
                backgroundColor: colors.cardBg,
                borderColor:
                  activePopupNotice?.priority === 'urgent'
                    ? colors.scarlet
                    : activePopupNotice?.priority === 'high'
                    ? colors.gold
                    : colors.cardBorder,
              },
            ]}
          >
            {/* Header Badge & Close Button */}
            <View style={styles.popupHeaderRow}>
              <View
                style={[
                  styles.popupBadge,
                  {
                    backgroundColor:
                      activePopupNotice?.priority === 'urgent'
                        ? '#FEE2E2'
                        : activePopupNotice?.priority === 'high'
                        ? '#FEF3C7'
                        : '#EFF6FF',
                  },
                ]}
              >
                <Ionicons
                  name={
                    activePopupNotice?.priority === 'urgent'
                      ? 'alert-circle'
                      : activePopupNotice?.priority === 'high'
                      ? 'warning'
                      : 'megaphone'
                  }
                  size={14}
                  color={
                    activePopupNotice?.priority === 'urgent'
                      ? colors.scarlet
                      : activePopupNotice?.priority === 'high'
                      ? '#B45309'
                      : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.popupBadgeText,
                    {
                      color:
                        activePopupNotice?.priority === 'urgent'
                          ? colors.scarlet
                          : activePopupNotice?.priority === 'high'
                          ? '#B45309'
                          : colors.primary,
                    },
                  ]}
                >
                  {activePopupNotice?.priority === 'urgent'
                    ? 'URGENT MEMBER NOTICE'
                    : activePopupNotice?.priority === 'high'
                    ? 'IMPORTANT NOTICE'
                    : 'YMCA SILVER SPRING NOTICE'}
                </Text>
              </View>

              <Pressable
                onPress={() => void handleDismissPopup(activePopupNotice?.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close Pop-up Notice"
              >
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
              <Text style={[styles.popupTitle, { color: colors.text }]}>
                {activePopupNotice?.title}
              </Text>

              <Text style={[styles.popupMeta, { color: colors.textMuted }]}>
                Posted by {activePopupNotice?.authorName} · {activePopupNotice ? formatShortDate(activePopupNotice.createdAt) : ''}
              </Text>

              <Text style={[styles.popupBody, { color: colors.text }]}>
                {activePopupNotice?.body}
              </Text>
            </ScrollView>

            <View style={{ gap: 8, marginTop: 14 }}>
              <PrimaryButton
                title={activePopupNotice?.actionLabel || 'View Details ›'}
                onPress={() => {
                  if (activePopupNotice) {
                    void handlePopupAction(activePopupNotice);
                  }
                }}
              />
              <SecondaryButton
                title="Dismiss Notice"
                onPress={() => void handleDismissPopup(activePopupNotice?.id)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  quickActions: {
    gap: spacing.sm,
  },
  branchCard: {
    ...cardStyle,
    gap: 8,
    overflow: 'hidden',
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  branchTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.primaryDark,
    flex: 1,
    paddingRight: 6,
  },
  openNowBadge: {
    flexShrink: 0,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  openNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  bodyTextStrong: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.nearBlack,
  },
  bodyText: {
    ...typography.body,
    fontSize: 15,
    color: colors.nearBlack,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  address: {
    color: colors.muted,
  },
  phone: {
    color: colors.primary,
    fontWeight: '600',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  amenityPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.nearBlack,
  },
  muted: {
    ...typography.body,
    fontSize: 15,
    color: colors.muted,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  emptyCard: {
    ...cardStyle,
    gap: spacing.sm,
  },
  cardList: {
    gap: 12,
    paddingVertical: 4,
  },
  weekCard: {
    ...cardStyle,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  paidPill: {
    backgroundColor: colors.paidBadgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  paidPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.paidBadge,
  },
  includedPill: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  includedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  weekTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.nearBlack,
  },
  weekTime: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.primary,
  },
  weekMeta: {
    ...typography.caption,
    fontSize: 14,
    color: colors.muted,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  linkRow: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  linkText: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.primary,
  },
  billingSectionWrap: {
    gap: 8,
  },
  quickPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  quickPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quickPlanText: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
  },
  quickPlanAction: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 13,
  },
  forumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  forumBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forumBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  forumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  forumBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  forumBannerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  featureHubRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featureTile: {
    flex: 1,
    padding: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  tileIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tileTitle: {
    ...typography.bodyStrong,
    fontSize: 13,
  },
  tileSubtitle: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
  },
  branchExploreLink: {
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  branchExploreText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 13,
  },
  announcementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    marginBottom: 4,
  },
  announcementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  annIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  annTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  annBodyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  guestPromoBanner: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 10,
  },
  guestPromoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  guestPromoPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  guestPromoTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  guestPromoDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  guestPromoBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  guestActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.button,
  },
  guestActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guestActionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  guestActionBtnTextOutline: {
    fontSize: 12,
    fontWeight: '700',
  },
  surveyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1.5,
  },
  surveyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  surveyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  surveyTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  surveyBodyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupBox: {
    width: '100%',
    maxWidth: 460,
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  popupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  popupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  popupBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  popupMeta: {
    fontSize: 12,
  },
  popupBody: {
    fontSize: 14,
    lineHeight: 22,
  },
});
