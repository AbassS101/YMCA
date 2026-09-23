import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BillingHero } from '@/components/BillingHero';
import { ErrorBanner } from '@/components/ErrorBanner';
import { MemberCheckInCard } from '@/components/MemberCheckInCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { Announcement, Member, Membership, PrivateLesson, ScheduleItem } from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { lessonRepo } from '@/repositories/lessonRepo';
import { membershipRepo } from '@/repositories/membershipRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
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
  | { kind: 'class'; item: ScheduleItem; paidAmountCents?: number }
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
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [weekItems, setWeekItems] = useState<WeekItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [error, setError] = useState(false);
  const listRef = useRef<FlatList<WeekItem>>(null);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const to = addDays(today, 6);
      const [nextMember, nextMembership, regs, lessons, schedules, anns] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
        registrationRepo.listMine(api, memberId),
        lessonRepo.listMine(api, memberId),
        scheduleRepo.list(api, { branchId: BRANCH_ID, from: today, to }),
        announcementRepo.list(api, BRANCH_ID),
      ]);
      const byId = new Map(schedules.map((s) => [s.id, s]));
      const classItems: WeekItem[] = [];
      for (const r of regs) {
        const s = byId.get(r.scheduleItemId);
        if (s) {
          classItems.push({ kind: 'class', item: s, paidAmountCents: r.paidAmountCents });
        }
      }

      const lessonItems: WeekItem[] = lessons.map((item) => ({
        kind: 'lesson' as const,
        item,
      }));
      const combined = [...classItems, ...lessonItems].sort((a, b) =>
        a.item.start.localeCompare(b.item.start)
      );
      setMember(nextMember);
      setMembership(nextMembership);
      if (anns && anns.length > 0) {
        setLatestAnnouncement(anns[0]);
      }
      setWeekItems(combined);
      setCardIndex(0);
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const firstName = member?.name.split(' ')[0] ?? '';

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
      <YHeader subtitle={firstName ? `Welcome back, ${firstName}` : 'Member Home'} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Digital Member Scan Pass */}
        {member ? <MemberCheckInCard member={member} /> : null}

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

        {/* Next Billing Summary */}
        {membership && member ? (
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

        {/* Quick Branch Feature Hub */}
        <View style={styles.featureHubRow}>
          <Pressable
            onPress={() => router.push('/(member)/branch-amenities')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="View Amenities and Heated Pools"
          >
            <View style={[styles.tileIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="water-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Pools & Saunas</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>Heated Pool & Gym</Text>
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
            onPress={() => router.push('/(member)/guest-pass')}
            style={[styles.featureTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="View Guest Passes"
          >
            <View style={[styles.tileIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="ticket-outline" size={20} color={colors.gold} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Guest Passes</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>2 Free Annual</Text>
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
            Your Bookings This Week
          </Text>
          {weekItems.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.muted, { color: colors.textMuted }]} allowFontScaling>
                You have nothing booked yet this week. Browse classes or reserve your spot in a program!
              </Text>
              <PrimaryButton
                title="Explore Classes & Events"
                onPress={() => router.push('/(member)/(tabs)/schedules')}
                accessibilityHint="Go to Classes to register"
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
                          {w.kind === 'class' ? 'Class' : 'Private Lesson'}
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
                          <Text style={styles.includedPillText}>Included Free</Text>
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
});
