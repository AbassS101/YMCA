import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { GuestPassCard } from '@/components/GuestPassCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { YMCA_MEMBERSHIP_PLANS } from '@/domain/types';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';

const BRANCH_NAME = 'YMCA Silver Spring';
const BRANCH_ADDRESS = '9800 Hastings Drive, Silver Spring, MD 20901';
const BRANCH_PHONE = '(301) 585-2120';
const HOURS_WEEKDAY = 'Mon–Fri 5:30 AM – 10:00 PM';
const HOURS_WEEKEND = 'Sat 7:00 AM – 8:00 PM · Sun 8:00 AM – 8:00 PM';

const GUEST_AMENITIES = [
  {
    title: 'Cardio & Strength Training Floor',
    desc: 'LifeFitness treadmills, free weights, squat racks, and functional turf area',
    icon: 'barbell-outline' as const,
    color: '#0284C7',
  },
  {
    title: '2 Heated Pools (Indoor & Outdoor)',
    desc: '25m indoor lap pool + outdoor heated pool open year-round at 82°F',
    icon: 'water-outline' as const,
    color: '#00609C',
  },
  {
    title: '85+ Drop-In Group Fitness Classes',
    desc: 'Yoga, BodyPump, Cycling, Zumba, and Aqua Arthritis classes included with pass',
    icon: 'people-outline' as const,
    color: '#16A34A',
  },
  {
    title: 'JOOLA Pickleball & Basketball Gym',
    desc: 'Full-court basketball gym and indoor tournament-grade pickleball nets',
    icon: 'tennisball-outline' as const,
    color: '#D97706',
  },
  {
    title: 'Dry Saunas & Steam Rooms',
    desc: 'Full locker room access with showers, private day lockers, and saunas',
    icon: 'flame-outline' as const,
    color: '#E11D48',
  },
  {
    title: 'High-Speed Wi-Fi & Lounge',
    desc: 'Complimentary high-speed guest Wi-Fi and welcoming lobby seating area',
    icon: 'wifi-outline' as const,
    color: '#7C3AED',
  },
];

const TODAY_DROP_IN_CLASSES = [
  {
    title: 'Vinyasa Flow Yoga',
    time: '9:00 AM – 10:00 AM',
    room: 'Mind & Body Studio',
    instructor: 'Maya Lin',
    badge: 'All Levels',
    icon: 'flower-outline' as const,
    color: '#16A34A',
  },
  {
    title: 'Aqua Fit (Water Aerobics)',
    time: '10:15 AM – 11:00 AM',
    room: 'Indoor Lap Pool',
    instructor: 'Jane Doe',
    badge: 'Low Impact',
    icon: 'water-outline' as const,
    color: '#0284C7',
  },
  {
    title: 'Express Cycling / Spin',
    time: '12:00 PM – 12:45 PM',
    room: 'Cycling Theater',
    instructor: 'Doc',
    badge: 'Cardio Boost',
    icon: 'bicycle-outline' as const,
    color: '#D97706',
  },
  {
    title: 'Total Body Strength & Core',
    time: '5:30 PM – 6:30 PM',
    room: 'Fitness Studio A',
    instructor: 'Ryanne',
    badge: 'Strength',
    icon: 'barbell-outline' as const,
    color: '#E11D48',
  },
];

const GYM_COMPARISON_POINTS = [
  {
    feature: 'Join Initiation Fee',
    ymca: '$0 enrollment fee for guests',
    gym: '$50 to $100 Initiation',
  },
  {
    feature: 'Membership Contracts',
    ymca: 'No Contracts · Cancel Anytime',
    gym: '12-Month Lock-In Contracts',
  },
  {
    feature: 'Heated Pools (Indoor & Outdoor)',
    ymca: '2 Heated Pools Included Year-Round',
    gym: 'No Pool or $30+/mo Add-On',
  },
  {
    feature: 'Saunas & Steam Rooms',
    ymca: 'Included in Both Locker Rooms',
    gym: 'Rare or High-Tier Only',
  },
  {
    feature: 'Group Fitness Classes',
    ymca: '85+ Classes/Week Included Free',
    gym: '$20 – $35 Per Class Fee',
  },
  {
    feature: 'Drop-Off Child Watch',
    ymca: 'Free Daily with Family Membership',
    gym: 'Not Available',
  },
  {
    feature: 'Nationwide Reciprocity',
    ymca: '2,500+ YMCAs Across North America',
    gym: 'Single Location Only',
  },
  {
    feature: 'Mission & Purpose',
    ymca: '501(c)(3) Nonprofit Community',
    gym: 'For-Profit Shareholders',
  },
  {
    feature: 'Financial Assistance',
    ymca: 'Open Doors aid through Member Services',
    gym: 'None Offered',
  },
];

const THREE_PILLARS = [
  {
    pillar: 'Youth Development',
    tagline: 'Nurturing the Potential of Every Child',
    detail:
      'We support working Montgomery County families through licensed child care, STEM summer day camps, youth swim academy, basketball leagues, and free drop-off Child Watch while parents work out.',
    icon: 'school-outline' as const,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    pillar: 'Healthy Living',
    tagline: 'Improving Community Health and Well-Being',
    detail:
      'We bring people together across 85+ weekly fitness classes, gentle warm-water joint therapy, active older adult social clubs, LIVESTRONG® cancer survivorship, and evidence-based Parkinson’s cycling programs.',
    icon: 'heart-outline' as const,
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    pillar: 'Social Responsibility',
    tagline: 'Giving Back and Providing Support to Neighbors',
    detail:
      'As a 501(c)(3) nonprofit, we ensure that cost is never a barrier. Through our Open Doors scholarship fund, thousands of local residents access memberships and programs regardless of ability to pay.',
    icon: 'globe-outline' as const,
    color: '#15803D',
    bg: '#F0FDF4',
  },
];

const GUEST_DONATION_TIERS = [
  {
    amountCents: 2500,
    amountLabel: '$25',
    title: 'Life-Saving Water Safety & Swim Lessons',
    subtitle: 'Childhood Drowning Prevention',
    badge: 'Urgent Need',
    icon: 'water' as const,
    color: '#0284C7',
    bg: '#EFF6FF',
    fundId: 'aquatics',
    why: 'Drowning is a leading cause of accidental death for children in Montgomery County. Your $25 gift equips a local child with life-saving water safety skills, floating techniques, and swim instruction.',
  },
  {
    amountCents: 5000,
    amountLabel: '$50',
    title: 'LIVESTRONG® at the YMCA',
    subtitle: 'Cancer Survivorship Program',
    badge: 'Evidence-Based',
    icon: 'ribbon' as const,
    color: '#DC2626',
    bg: '#FFF1F2',
    fundId: 'livestrong',
    why: 'Helps an adult cancer survivor rebuild muscle strength, emotional hope, and stamina in our free 12-week rehabilitation program led by certified cancer exercise specialists.',
  },
  {
    amountCents: 10000,
    amountLabel: '$100',
    title: 'Pedaling for Parkinson’s™',
    subtitle: 'Mobility & Motor Function',
    badge: 'Community Favorite',
    icon: 'bicycle' as const,
    color: '#D97706',
    bg: '#FEF3C7',
    fundId: 'parkinsons',
    why: 'Sustains specialized fast-cadence indoor cycling proven to reduce tremors, improve motor control, and restore daily functional independence at zero cost to participants.',
  },
  {
    amountCents: 17500,
    amountLabel: '$175',
    title: 'YMCA Summer Day Camp',
    subtitle: 'Enriching Summer Experiences',
    badge: 'Youth Impact',
    icon: 'sunny' as const,
    color: '#16A34A',
    bg: '#F0FDF4',
    fundId: 'summer-camp',
    why: 'Sponsors 1 local child for a full week of summer day camp with STEM learning, sports, outdoor discovery, and nutritious meals while parents work.',
  },
  {
    amountCents: 25000,
    amountLabel: '$250',
    title: 'Safety Around Water for Schools',
    subtitle: 'Community Aquatics Partnership',
    badge: 'High Impact',
    icon: 'shield-checkmark' as const,
    color: '#2563EB',
    bg: '#EFF6FF',
    fundId: 'aquatics',
    why: 'Expands certified water safety clinics to classrooms in underserved Montgomery County public elementary schools, teaching water survival skills to entire cohorts.',
  },
  {
    amountCents: 50000,
    amountLabel: '$500',
    title: 'Working Families Child Care Aid',
    subtitle: 'Safe, Licensed Early Learning',
    badge: 'Family Support',
    icon: 'people' as const,
    color: '#7C3AED',
    bg: '#FAF5FF',
    fundId: 'child-care',
    why: 'Helps a working parent afford dependable, safe infant or toddler child care so they can keep their job and provide household stability.',
  },
];

export default function GuestPassScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { colors: tc, isDark } = useTheme();

  const isGuest = session?.role === 'guest';
  const [activeTab, setActiveTab] = useState<'guest_pass' | 'issue_pass'>('guest_pass');

  // Issue pass state for members
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [remainingPasses, setRemainingPasses] = useState(2);
  const [issuing, setIssuing] = useState(false);
  const [issuedHistory, setIssuedHistory] = useState<
    { name: string; email: string; passCode: string; date: string }[]
  >([]);

  // Interactive Donation Tier State
  const [selectedDonationIndex, setSelectedDonationIndex] = useState(1); // default $50 (LIVESTRONG)
  const currentDonationTier = GUEST_DONATION_TIERS[selectedDonationIndex];

  async function handleSendInvite() {
    if (!guestName.trim()) {
      dialog.alert('Missing Name', 'Please enter your guest’s full name.', [{ text: 'OK' }], 'alert');
      return;
    }

    if (remainingPasses <= 0) {
      dialog.alert(
        'No Guest Passes Remaining',
        'You have used all complimentary guest passes for this membership period. Additional single-day passes can be purchased at the front desk for $15.',
        [{ text: 'Got It' }],
        'info'
      );
      return;
    }

    setIssuing(true);
    try {
      const code = `SS-GUEST-${Math.floor(100000 + Math.random() * 900000)}`;
      const todayStr = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      setRemainingPasses((prev) => prev - 1);
      setIssuedHistory((prev) => [
        { name: guestName.trim(), email: guestEmail.trim(), passCode: code, date: todayStr },
        ...prev,
      ]);

      const shareMessage = `Hi ${guestName.trim()}! I've sent you a complimentary 1-Day Guest Pass to the YMCA Silver Spring. Your Pass Code is ${code}. Present this pass code at the YMCA Silver Spring Member Services desk (9800 Hastings Drive, Silver Spring, MD)!`;

      dialog.alert(
        'Guest Pass Created!',
        `Guest pass issued for ${guestName.trim()}!\n\nPass Code: ${code}\n\nYour guest can present this pass code at the YMCA Silver Spring Member Services desk.`,
        [{ text: 'Done' }],
        'checkmark'
      );

      try {
        await Share.share({
          message: shareMessage,
          title: 'YMCA Silver Spring Guest Pass',
        });
      } catch {
        // user dismissed share
      }

      setGuestName('');
      setGuestEmail('');
    } finally {
      setIssuing(false);
    }
  }

  const cardTheme = {
    backgroundColor: tc.cardBg,
    borderColor: tc.cardBorder,
  };

  const handleCall = () => {
    Linking.openURL('tel:3015852120').catch(() => {});
  };

  const handleDirections = () => {
    const url = Platform.select({
      ios: 'maps:0,0?q=YMCA+Silver+Spring+MD',
      android: 'geo:0,0?q=9800+Hastings+Drive+Silver+Spring+MD+20901',
      default: 'https://maps.google.com/?q=9800+Hastings+Drive+Silver+Spring+MD+20901',
    });
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleShowWifiInfo = () => {
    dialog.alert(
      'YMCA Guest Wi-Fi',
      'Network Name: YMCA-Guest-WiFi\nPassword: ymca-community\n\nEnjoy complimentary high-speed internet throughout our building, fitness center, and lobby lounge!',
      [{ text: 'Got It' }],
      'info'
    );
  };

  const handleDonateNow = (tier: typeof GUEST_DONATION_TIERS[0]) => {
    router.push({
      pathname: '/(member)/donate',
      params: {
        amount: tier.amountCents.toString(),
        fund: tier.fundId,
      },
    } as any);
  };

  const currentGuestDisplayName = isGuest ? 'Taylor Smith' : 'Taylor Smith (Guest Preview)';
  const currentGuestPassCode = isGuest ? 'SS-GUEST-882194' : 'SS-GUEST-882194';

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Guest Passes & Facility Privileges" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Navigation Back */}
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(member)/home')
          }
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>Back</AppText>
        </Pressable>

        {/* Dual Mode Switcher for Members */}
        {!isGuest ? (
          <View style={[styles.tabsWrap, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
            <Pressable
              onPress={() => setActiveTab('guest_pass')}
              style={[
                styles.tabBtn,
                activeTab === 'guest_pass' && {
                  backgroundColor: colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Digital Guest Pass & Facility Privileges View"
            >
              <Ionicons
                name="ticket"
                size={16}
                color={activeTab === 'guest_pass' ? '#FFFFFF' : tc.textMuted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'guest_pass' ? '#FFFFFF' : tc.textMuted },
                ]}
              >
                Guest Pass & Experience
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('issue_pass')}
              style={[
                styles.tabBtn,
                activeTab === 'issue_pass' && {
                  backgroundColor: colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Invite a Friend or Issue a Pass"
            >
              <Ionicons
                name="paper-plane"
                size={16}
                color={activeTab === 'issue_pass' ? '#FFFFFF' : tc.textMuted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'issue_pass' ? '#FFFFFF' : tc.textMuted },
                ]}
              >
                Share Pass ({remainingPasses} Left)
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: COMPLETE GUEST SCREEN & PASS EXPERIENCE                */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'guest_pass' ? (
          <>
            {/* 1. DIGITAL GUEST PASS CARD WITH FULL BRIGHTNESS BARCODE */}
            <GuestPassCard
              guestName={currentGuestDisplayName}
              passCode={currentGuestPassCode}
              branchName="YMCA Silver Spring"
              validUntilLabel="Valid Today until 10:00 PM"
              showActionShortcuts={false}
            />

            {/* 2. CHECK-IN INSTRUCTIONS (WHAT TO BRING & HOW TO SCAN) */}
            <View style={[styles.card, cardTheme]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="checkmark-done-circle" size={22} color="#16A34A" />
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  How to Check In at {BRANCH_NAME}
                </AppText>
              </View>

              <View style={styles.stepList}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepNumCircle, { backgroundColor: colors.primaryLight }]}>
                    <AppText style={[styles.stepNumText, { color: colors.primary }]}>1</AppText>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText style={[styles.stepTitle, { color: tc.text }]}>
                      Safety & Liability Waiver
                    </AppText>
                    <AppText style={[styles.stepDesc, { color: tc.textMuted }]}>
                      Complete the standard 1-minute YMCA guest waiver on the front desk tablet or with our friendly reception team.
                    </AppText>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={[styles.stepNumCircle, { backgroundColor: colors.primaryLight }]}>
                    <AppText style={[styles.stepNumText, { color: colors.primary }]}>2</AppText>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText style={[styles.stepTitle, { color: tc.text }]}>
                      Scan Barcode at Turnstiles
                    </AppText>
                    <AppText style={[styles.stepDesc, { color: tc.textMuted }]}>
                      Tap the barcode above to enlarge for scanner. Hold it near the optical turnstiles for instant facility access!
                    </AppText>
                  </View>
                </View>
              </View>
            </View>

            {/* 3. WHAT'S INCLUDED IN YOUR GUEST PASS */}
            <View style={[styles.card, cardTheme]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="sparkles" size={20} color="#D97706" />
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  What’s Included in Your Guest Pass Today
                </AppText>
              </View>
              <AppText style={[styles.cardSubtitle, { color: tc.textMuted }]}>
                Enjoy full access to our premier Montgomery County fitness & aquatics amenities:
              </AppText>

              <View style={styles.amenitiesGrid}>
                {GUEST_AMENITIES.map((a, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.amenityCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.amenityTop}>
                      <Ionicons name={a.icon} size={20} color={a.color} />
                      <AppText style={[styles.amenityTitle, { color: tc.text }]}>
                        {a.title}
                      </AppText>
                    </View>
                    <AppText style={[styles.amenityDesc, { color: tc.textMuted }]}>
                      {a.desc}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            {/* 4. GUEST WI-FI & LOCKER ACCESS CARD */}
            <View style={[styles.card, cardTheme]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  Guest Amenities: Wi-Fi, Lockers & Showers
                </AppText>
              </View>

              <View style={[styles.wifiBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="wifi" size={16} color={colors.primary} />
                    <AppText style={[styles.wifiTitle, { color: tc.text }]}>
                      Complimentary Guest Wi-Fi
                    </AppText>
                  </View>
                  <AppText style={[styles.wifiDetails, { color: tc.textMuted }]}>
                    Network: <AppText style={{ fontWeight: '700', color: tc.text }}>YMCA-Guest-WiFi</AppText> · Password: <AppText style={{ fontWeight: '700', color: tc.text }}>ymca-community</AppText>
                  </AppText>
                </View>
                <Pressable
                  onPress={handleShowWifiInfo}
                  style={[styles.wifiCopyBtn, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="View Wi-Fi password details"
                >
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <AppText style={[styles.wifiCopyText, { color: colors.primary }]}>View</AppText>
                </Pressable>
              </View>

              <View style={styles.lockerNoteRow}>
                <Ionicons name="lock-closed-outline" size={16} color={tc.textMuted} />
                <AppText style={[styles.lockerNoteText, { color: tc.textMuted }]}>
                  Day lockers are available in both locker rooms. Towels are provided at Member Services. Please bring a padlock or request a loaner lock at the desk.
                </AppText>
              </View>
            </View>

            {/* 5. TODAY'S DROP-IN GROUP FITNESS CLASSES */}
            <View style={[styles.card, cardTheme]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="calendar-outline" size={20} color="#16A34A" />
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  Today’s Drop-In Group Classes (Free for Guests)
                </AppText>
              </View>
              <AppText style={[styles.cardSubtitle, { color: tc.textMuted }]}>
                No advance registration required for guests—just arrive 5 minutes early:
              </AppText>

              <View style={styles.todayClassesList}>
                {TODAY_DROP_IN_CLASSES.map((c, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.classRowCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.classRowLeft}>
                      <View style={[styles.classIconCircle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <Ionicons name={c.icon} size={18} color={c.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText style={[styles.classRowTitle, { color: tc.text }]}>
                            {c.title}
                          </AppText>
                          <View style={styles.classRowBadge}>
                            <AppText style={styles.classRowBadgeText}>{c.badge}</AppText>
                          </View>
                        </View>
                        <AppText style={[styles.classRowSub, { color: tc.textMuted }]}>
                          {c.time} · {c.room} · Coach {c.instructor}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <SecondaryButton
                title="Browse Full 85+ Class Schedule →"
                onPress={() => router.push('/(member)/(tabs)/schedules')}
                accessibilityHint="View full weekly class timetable"
              />
            </View>

            {/* ------------------------------------------------------------- */}
            {/* 6. ADVERTISE THE YMCA: EXCLUSIVE GUEST-TO-MEMBER PROMOTION    */}
            {/* ------------------------------------------------------------- */}
            <View
              style={[
                styles.joinHeroCard,
                {
                  backgroundColor: isDark ? '#172554' : '#EFF6FF',
                  borderColor: isDark ? '#1D4ED8' : '#93C5FD',
                },
              ]}
            >
              <View style={styles.joinPromoPill}>
                <Ionicons name="flash" size={14} color="#1D4ED8" />
                <AppText style={styles.joinPromoPillText}>
                  EXCLUSIVE GUEST OFFER: $0 ENROLLMENT FEE
                </AppText>
              </View>

              <AppText style={[styles.joinHeroTitle, { color: tc.text }]}>
                Love Your Workout Today? Join the Y!
              </AppText>

              <AppText style={[styles.joinHeroDesc, { color: tc.textMuted }]}>
                Turn today’s guest pass into a lifetime of strength, community, and vitality. Join YMCA Silver Spring within 48 hours of your guest visit and we will{' '}
                <AppText style={{ fontWeight: '800', color: colors.primary }}>
                  completely waive your one-time enrollment fee!
                </AppText>{' '}
                Plus, all YMCA memberships include unlimited Nationwide Reciprocity at over 2,500 YMCAs across North America.
              </AppText>

              {/* WHY YMCA VS COMMERCIAL GYMS: COMPARISON TABLE */}
              <View style={[styles.comparisonCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
                <AppText style={[styles.compHeaderTitle, { color: tc.text }]}>
                  Why Choose YMCA vs. Commercial Gyms?
                </AppText>

                <View style={styles.compRowsWrap}>
                  {GYM_COMPARISON_POINTS.map((pt, idx) => (
                    <View key={idx} style={[styles.compRow, { borderBottomColor: tc.border }]}>
                      <AppText style={[styles.compFeatureName, { color: tc.text }]}>
                        {pt.feature}
                      </AppText>
                      <View style={styles.compValuesRow}>
                        <View style={styles.compYmcaCol}>
                          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                          <AppText style={styles.compYmcaText}>{pt.ymca}</AppText>
                        </View>
                        <View style={styles.compGymCol}>
                          <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                          <AppText style={[styles.compGymText, { color: tc.textMuted }]}>{pt.gym}</AppText>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Popular Plans Quick View */}
              <View style={styles.planHighlightsList}>
                <AppText style={[styles.popularPlansTitle, { color: tc.text }]}>
                  Popular Silver Spring Membership Plans:
                </AppText>
                {YMCA_MEMBERSHIP_PLANS.slice(0, 4).map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.planMiniRow,
                      {
                        backgroundColor: tc.cardBg,
                        borderColor: tc.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText style={[styles.planMiniName, { color: tc.text }]}>
                          {p.name}
                        </AppText>
                        {p.recommended ? (
                          <View style={styles.recBadge}>
                            <AppText style={styles.recBadgeText}>POPULAR</AppText>
                          </View>
                        ) : null}
                      </View>
                      <AppText style={[styles.planMiniSub, { color: tc.textMuted }]}>
                        {p.subtitle}
                      </AppText>
                    </View>
                    <AppText style={[styles.planMiniPrice, { color: colors.primary }]}>
                      ${(p.monthlyAmountCents / 100).toFixed(0)}/mo
                    </AppText>
                  </View>
                ))}
              </View>

              <PrimaryButton
                title="Claim $0 Join Fee & Become a Member →"
                onPress={() => router.push('/(member)/join-membership')}
                accessibilityHint="Browse all membership plans and join online in 2 minutes"
              />

              <AppText style={[styles.joinFooterNotice, { color: tc.textMuted }]}>
                No long-term lock-in contracts. Ask Member Services about Open Doors financial aid options.
              </AppText>
            </View>

            {/* ------------------------------------------------------------- */}
            {/* 7. TALK ABOUT US: OUR MISSION, STORY, AND THREE PILLARS       */}
            {/* ------------------------------------------------------------- */}
            <View style={[styles.card, cardTheme]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  About Us at {BRANCH_NAME}
                </AppText>
              </View>
              <AppText style={[styles.aboutLead, { color: tc.text }]}>
                “The Y is more than a fitness center. We are a cause-driven nonprofit strengthening the foundations of community through youth development, healthy living, and social responsibility.”
              </AppText>

              <AppText style={[styles.aboutBody, { color: tc.textMuted }]}>
                Established to serve Montgomery County and the Greater Washington metropolitan region, YMCA Silver Spring brings together people of all ages, backgrounds, and incomes. For over 170 years, the YMCA movement has believed that when we invest in each other, our whole community thrives.
              </AppText>

              {/* The Three Cause Pillars */}
              <View style={styles.pillarsWrap}>
                {THREE_PILLARS.map((p, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.pillarCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : p.bg,
                        borderColor: isDark ? '#334155' : tc.border,
                      },
                    ]}
                  >
                    <View style={styles.pillarTop}>
                      <Ionicons name={p.icon} size={22} color={p.color} />
                      <View style={{ flex: 1 }}>
                        <AppText style={[styles.pillarName, { color: p.color }]}>
                          {p.pillar}
                        </AppText>
                        <AppText style={[styles.pillarTagline, { color: tc.text }]}>
                          {p.tagline}
                        </AppText>
                      </View>
                    </View>
                    <AppText style={[styles.pillarDetail, { color: tc.textMuted }]}>
                      {p.detail}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Quick Branch Stats */}
              <View style={styles.branchStatsRow}>
                <View style={[styles.statBox, { borderColor: tc.border }]}>
                  <AppText style={[styles.statNum, { color: colors.primary }]}>4,200+</AppText>
                  <AppText style={[styles.statLbl, { color: tc.textMuted }]}>
                    Active Members
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: tc.border }]}>
                  <AppText style={[styles.statNum, { color: colors.primary }]}>85+</AppText>
                  <AppText style={[styles.statLbl, { color: tc.textMuted }]}>
                    Weekly Classes
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: tc.border }]}>
                  <AppText style={[styles.statNum, { color: colors.primary }]}>2</AppText>
                  <AppText style={[styles.statLbl, { color: tc.textMuted }]}>
                    Heated Pools
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: tc.border }]}>
                  <AppText style={[styles.statNum, { color: colors.primary }]}>100%</AppText>
                  <AppText style={[styles.statLbl, { color: tc.textMuted }]}>
                    Nonprofit Cause
                  </AppText>
                </View>
              </View>

              {/* Community Member Testimonial */}
              <View style={[styles.testimonialBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                <AppText style={[styles.testimonialQuote, { color: tc.text }]}>
                  “The YMCA isn’t just where I work out—it’s where my kids learned to swim, where my parents stay mobile in the heated pool, and where our whole community feels like family.”
                </AppText>
                <AppText style={[styles.testimonialAuthor, { color: tc.textMuted }]}>
                  — Maria K., Silver Spring Member
                </AppText>
              </View>
            </View>

            {/* ------------------------------------------------------------- */}
            {/* 8. ASK FOR DONATIONS AND EXPLAIN WHY (THE CHARITABLE CAUSE)   */}
            {/* ------------------------------------------------------------- */}
            <View
              style={[
                styles.donateHeroCard,
                {
                  backgroundColor: isDark ? '#2E1014' : '#FFF1F2',
                  borderColor: isDark ? '#991B1B' : '#FDA4AF',
                },
              ]}
            >
              <View style={styles.donateTopRow}>
                <View style={styles.heartIconCircle}>
                  <Ionicons name="heart" size={24} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.donateHeroTitle, { color: tc.text }]}>
                    Support Our Community: Make a Gift
                  </AppText>
                  <AppText style={[styles.donateHeroSubtitle, { color: '#DC2626' }]}>
                    100% Tax-Deductible 501(c)(3) Support · EIN: 53-0196605
                  </AppText>
                </View>
              </View>

              {/* THE "WHY" CALLOUT: WHY DOES THE YMCA ASK FOR DONATIONS? */}
              <View style={[styles.whyCalloutBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: '#FCA5A5' }]}>
                <View style={styles.whyCalloutHeader}>
                  <Ionicons name="help-circle" size={18} color="#DC2626" />
                  <AppText style={[styles.whyCalloutTitle, { color: tc.text }]}>
                    Why Does the YMCA Need Charitable Donations?
                  </AppText>
                </View>
                <AppText style={[styles.whyCalloutBody, { color: tc.textMuted }]}>
                  Many visitors ask:{' '}
                  <AppText style={{ fontStyle: 'italic' }}>
                    “If the YMCA charges membership dues, why do you ask for donations?”
                  </AppText>
                </AppText>
                <AppText style={[styles.whyCalloutBody, { color: tc.textMuted, marginTop: 4 }]}>
                  Here is the answer:{' '}
                  <AppText style={{ fontWeight: '800', color: tc.text }}>
                    Membership dues cover our basic facility overhead
                  </AppText>
                  —gym equipment, utility bills, and building maintenance.{' '}
                  <AppText style={{ fontWeight: '800', color: '#DC2626' }}>
                    Membership dues DO NOT subsidize community programs or cover financial scholarships.
                  </AppText>
                </AppText>
                <AppText style={[styles.whyCalloutBody, { color: tc.textMuted, marginTop: 4 }]}>
                  As a 501(c)(3) nonprofit,{' '}
                  <AppText style={{ fontWeight: '700', color: tc.text }}>
                    100% of your tax-deductible gift directly funds life-saving community programs
                  </AppText>{' '}
                  for Montgomery County children, seniors, cancer survivors, and families who cannot afford them. Because of donors,{' '}
                  <AppText style={{ fontWeight: '800', color: '#16A34A' }}>
                    no one is ever turned away from the YMCA due to inability to pay.
                  </AppText>
                </AppText>
              </View>

              {/* INTERACTIVE DONATION TIER SELECTOR */}
              <AppText style={[styles.tierSelectorLabel, { color: tc.text }]}>
                Select a Giving Amount to See Your Local Impact:
              </AppText>

              {/* Amount Selection Chips */}
              <View style={styles.tierChipsRow}>
                {GUEST_DONATION_TIERS.map((tier, idx) => {
                  const isSelected = idx === selectedDonationIndex;
                  return (
                    <Pressable
                      key={tier.amountCents}
                      onPress={() => setSelectedDonationIndex(idx)}
                      style={[
                        styles.tierChip,
                        {
                          backgroundColor: isSelected ? '#DC2626' : (isDark ? '#1E293B' : '#FFFFFF'),
                          borderColor: isSelected ? '#DC2626' : (isDark ? '#475569' : '#E2E8F0'),
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select donation tier of ${tier.amountLabel}`}
                    >
                      <AppText
                        style={[
                          styles.tierChipText,
                          { color: isSelected ? '#FFFFFF' : tc.text },
                        ]}
                      >
                        {tier.amountLabel}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Highlighted Selected Tier Impact Card */}
              <View
                style={[
                  styles.activeTierCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: '#DC2626',
                  },
                ]}
              >
                <View style={styles.activeTierTopRow}>
                  <View style={[styles.tierIconBadge, { backgroundColor: currentDonationTier.bg }]}>
                    <Ionicons name={currentDonationTier.icon} size={20} color={currentDonationTier.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText style={[styles.activeTierAmount, { color: '#DC2626' }]}>
                        {currentDonationTier.amountLabel} Donation
                      </AppText>
                      <View style={styles.tierBadgePill}>
                        <AppText style={styles.tierBadgePillText}>{currentDonationTier.badge}</AppText>
                      </View>
                    </View>
                    <AppText style={[styles.activeTierTitle, { color: tc.text }]}>
                      {currentDonationTier.title}
                    </AppText>
                  </View>
                </View>

                <AppText style={[styles.activeTierWhy, { color: tc.textMuted }]}>
                  {currentDonationTier.why}
                </AppText>

                <Pressable
                  onPress={() => handleDonateNow(currentDonationTier)}
                  style={[styles.donateCtaBtn, { backgroundColor: '#DC2626' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Donate ${currentDonationTier.amountLabel} to YMCA Silver Spring`}
                >
                  <Ionicons name="heart" size={16} color="#FFFFFF" />
                  <AppText style={styles.donateCtaBtnText}>
                    Donate {currentDonationTier.amountLabel} (100% Tax-Deductible) →
                  </AppText>
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.push('/(member)/donate')}
                style={styles.exploreAllGivingLink}
                accessibilityRole="button"
                accessibilityLabel="View all YMCA community funds and charitable giving options"
              >
                <AppText style={[styles.exploreAllGivingText, { color: '#DC2626' }]}>
                  Explore All Community Funds & Full Case for Support →
                </AppText>
              </Pressable>
            </View>

            {/* 9. LOCATION & FRONT DESK CONTACT */}
            <View style={[styles.card, cardTheme]}>
              <AppText style={[styles.cardTitle, { color: tc.text }]}>
                Location & Front Desk Contact
              </AppText>
              <AppText style={[styles.addressText, { color: tc.text }]}>
                {BRANCH_ADDRESS}
              </AppText>
              <AppText style={[styles.hoursLine, { color: tc.textMuted }]}>
                {HOURS_WEEKDAY}
              </AppText>
              <AppText style={[styles.hoursLine, { color: tc.textMuted }]}>
                {HOURS_WEEKEND}
              </AppText>

              <View style={styles.contactActionRow}>
                <Pressable
                  onPress={handleCall}
                  style={[styles.quickContactBtn, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="Call YMCA front desk"
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <AppText style={[styles.quickContactBtnText, { color: colors.primary }]}>
                    Call {BRANCH_PHONE}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={handleDirections}
                  style={[styles.quickContactBtn, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="Get driving directions to YMCA"
                >
                  <Ionicons name="navigate" size={16} color={colors.primary} />
                  <AppText style={[styles.quickContactBtnText, { color: colors.primary }]}>
                    Get Directions
                  </AppText>
                </Pressable>
              </View>

              <AppText style={[styles.frontDeskWelcomeNote, { color: tc.textMuted }]}>
                Need assistance during your visit? Ask Maya Brooks or any member of our Member Services front desk team!
              </AppText>
            </View>

            {/* 10. GUEST POLICIES & GUIDELINES */}
            <View style={[styles.card, cardTheme]}>
              <AppText style={[styles.cardTitle, { color: tc.text }]}>
                Guest Rules & Facility Policies
              </AppText>

              <View style={styles.policyItem}>
                <AppText style={[styles.policyHeader, { color: tc.text }]}>
                  • Youth & Child Watch Guidelines
                </AppText>
                <AppText style={[styles.policyBody, { color: tc.textMuted }]}>
                  Children under 12 must be directly supervised by a parent or guardian. Drop-off Child Watch is a complimentary benefit for Family Memberships; guest pass holders may register child watch at the desk for a nominal fee.
                </AppText>
              </View>

              <View style={styles.policyItem}>
                <AppText style={[styles.policyHeader, { color: tc.text }]}>
                  • Lockers, Showers & Towels
                </AppText>
                <AppText style={[styles.policyBody, { color: tc.textMuted }]}>
                  Day lockers are available in both general locker rooms. Please bring your own padlock or request a loaner lock at Member Services. Towel service is provided for your convenience.
                </AppText>
              </View>

              <View style={styles.policyItem}>
                <AppText style={[styles.policyHeader, { color: tc.text }]}>
                  • Purchasing Additional Day Passes
                </AppText>
                <AppText style={[styles.policyBody, { color: tc.textMuted }]}>
                  Additional single-day passes can be purchased at the front desk: Adult $15 · Youth & Senior $10. Day pass fees can be credited toward your first month’s membership if you join within 48 hours!
                </AppText>
              </View>
            </View>
          </>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 2: MEMBER'S "SHARE / ISSUE GUEST PASS" FLOW              */
          /* ------------------------------------------------------------- */
          <>
            {/* Balance Hero Card */}
            <View style={[styles.card, cardTheme, styles.balanceBorder]}>
              <View style={styles.balanceHeader}>
                <View>
                  <AppText style={[styles.balanceLabel, { color: tc.textMuted }]}>
                    ANNUAL GUEST PASS BENEFIT
                  </AppText>
                  <AppText style={[styles.balanceNumber, { color: colors.primary }]}>
                    {remainingPasses} Available
                  </AppText>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="ticket-outline" size={28} color={colors.primary} />
                </View>
              </View>
              <AppText style={[styles.balanceNote, { color: tc.text }]}>
                Each YMCA Silver Spring membership includes 2 complimentary one-day guest passes per calendar year. Bring a workout buddy, family member, or friend!
              </AppText>
            </View>

            {/* Issue Guest Pass Form */}
            <View style={[styles.card, cardTheme]}>
              <AppText style={[styles.cardTitle, { color: tc.text }]}>
                Send a Digital Guest Pass
              </AppText>
              <AppText style={[styles.cardSubtitle, { color: tc.textMuted }]}>
                Generate an official digital guest code to share instantly via text message or email.
              </AppText>

              <TextField
                label="Guest's Full Name"
                placeholder="e.g. Taylor Smith"
                value={guestName}
                onChangeText={setGuestName}
              />

              <TextField
                label="Guest's Email (Optional)"
                placeholder="taylor@example.com"
                value={guestEmail}
                onChangeText={setGuestEmail}
                keyboardType="email-address"
              />

              <PrimaryButton
                title={remainingPasses > 0 ? 'Generate & Share Pass' : 'No Passes Remaining'}
                onPress={() => void handleSendInvite()}
                loading={issuing}
                disabled={remainingPasses <= 0}
                accessibilityHint="Creates and shares a guest pass"
              />
            </View>

            {/* Issued Passes History */}
            {issuedHistory.length > 0 && (
              <View style={[styles.card, cardTheme]}>
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  Recently Issued Passes
                </AppText>
                {issuedHistory.map((item, idx) => (
                  <View key={idx} style={[styles.historyRow, { borderBottomColor: tc.border }]}>
                    <View style={{ flex: 1 }}>
                      <AppText style={[styles.historyName, { color: tc.text }]}>
                        {item.name}
                      </AppText>
                      <AppText style={[styles.historyCode, { color: colors.primary }]}>
                        Code: {item.passCode}
                      </AppText>
                    </View>
                    <AppText style={[styles.historyDate, { color: tc.textMuted }]}>
                      {item.date}
                    </AppText>
                  </View>
                ))}
              </View>
            )}

            {/* Nationwide YMCA Reciprocity */}
            <View style={[styles.card, cardTheme]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="globe-outline" size={24} color="#D97706" />
                <AppText style={[styles.cardTitle, { color: tc.text }]}>
                  YMCA Nationwide Reciprocity
                </AppText>
              </View>
              <AppText style={[styles.reciprocityText, { color: tc.textMuted }]}>
                As an active YMCA Silver Spring member, you have access to free general facility privileges at over 2,500 YMCAs across the United States and Canada!
              </AppText>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <AppText style={[styles.bulletText, { color: tc.text }]}>
                    Simply show your YMCA Silver Spring barcode pass at any participating YMCA.
                  </AppText>
                </View>
                <View style={styles.bulletItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <AppText style={[styles.bulletText, { color: tc.text }]}>
                    Includes all YMCA branches in the Metropolitan Washington association (Bethesda, Calomiris, Bowie, Fairfax, Reston).
                  </AppText>
                </View>
              </View>
            </View>
          </>
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
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabsWrap: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm - 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    ...cardStyle,
    gap: 12,
  },
  balanceBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  stepList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  amenitiesGrid: {
    gap: 8,
  },
  amenityCard: {
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
    gap: 4,
  },
  amenityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amenityTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  amenityDesc: {
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 28,
  },
  wifiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 10,
  },
  wifiTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  wifiDetails: {
    fontSize: 12,
  },
  wifiCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  wifiCopyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockerNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  lockerNoteText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  todayClassesList: {
    gap: 8,
  },
  classRowCard: {
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
  },
  classRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  classIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  classRowBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  classRowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  classRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  joinHeroCard: {
    borderRadius: radii.card,
    borderWidth: 2,
    padding: spacing.md,
    gap: 14,
  },
  joinPromoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  joinPromoPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  joinHeroTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  joinHeroDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  comparisonCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  compHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  compRowsWrap: {
    gap: 8,
  },
  compRow: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 4,
  },
  compFeatureName: {
    fontSize: 12,
    fontWeight: '700',
  },
  compValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  compYmcaCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compYmcaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    flex: 1,
  },
  compGymCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compGymText: {
    fontSize: 11,
    flex: 1,
  },
  planHighlightsList: {
    gap: 6,
  },
  popularPlansTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  planMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  planMiniName: {
    fontSize: 13,
    fontWeight: '700',
  },
  planMiniSub: {
    fontSize: 11,
  },
  planMiniPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  recBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  joinFooterNotice: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  aboutLead: {
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  aboutBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  pillarsWrap: {
    gap: 10,
  },
  pillarCard: {
    borderRadius: radii.sm,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  pillarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillarName: {
    fontSize: 14,
    fontWeight: '800',
  },
  pillarTagline: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillarDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  branchStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  testimonialBox: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  testimonialQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  donateHeroCard: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 12,
  },
  donateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donateHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  donateHeroSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  whyCalloutBox: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    gap: 4,
  },
  whyCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  whyCalloutTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  whyCalloutBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  tierSelectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  tierChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.button,
    borderWidth: 1.5,
  },
  tierChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeTierCard: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
  },
  activeTierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTierAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  tierBadgePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tierBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  activeTierTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  activeTierWhy: {
    fontSize: 12,
    lineHeight: 17,
  },
  donateCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.button,
    marginTop: 4,
  },
  donateCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  exploreAllGivingLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  exploreAllGivingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hoursLine: {
    fontSize: 12,
  },
  contactActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  quickContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  frontDeskWelcomeNote: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 2,
  },
  policyItem: {
    gap: 3,
  },
  policyHeader: {
    fontSize: 13,
    fontWeight: '700',
  },
  policyBody: {
    fontSize: 12,
    lineHeight: 17,
    paddingLeft: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  balanceNumber: {
    fontSize: 26,
    fontWeight: '800',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceNote: {
    fontSize: 13,
    lineHeight: 19,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyCode: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
  },
  reciprocityText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
