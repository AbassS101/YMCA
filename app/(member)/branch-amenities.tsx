import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { useTheme } from '@/context/ThemeContext';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

type AmenityItem = {
  id: string;
  title: string;
  category: 'Aquatics' | 'Fitness' | 'Courts' | 'Family' | 'Wellness';
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  description: string;
  details: string[];
  scheduleAction?: {
    label: string;
    route: string;
  };
};

const AMENITIES: AmenityItem[] = [
  {
    id: 'outdoor-pool',
    title: 'Heated Outdoor Pool (Year-Round)',
    category: 'Aquatics',
    icon: 'water-outline',
    badge: 'Open 365 Days',
    description: 'One of the area’s few heated outdoor pools open year-round! Enjoy lap swim, family rec swim, and refreshing open-air workouts through every season.',
    details: [
      'Water temperature maintained between 82°F – 84°F',
      'Dedicated lap lanes available morning, afternoon, and evening',
      'Open rec swim hours for families on weekends',
      'Heated pool deck access and deck chairs',
    ],
    scheduleAction: {
      label: 'View Swim Schedule',
      route: '/(member)/(tabs)/schedules',
    },
  },
  {
    id: 'indoor-pool',
    title: 'Indoor 25-Meter Lap & Teaching Pool',
    category: 'Aquatics',
    icon: 'water',
    description: 'A 6-lane 25-meter indoor pool host to youth and adult swim lessons, Aqua Fit water aerobics, and Masters swim training.',
    details: [
      'Warm-water section ideal for Aqua Arthritis therapy',
      'Youth Swim Academy (Stages 1 through 6)',
      'Kickboards, pull buoys, and aquatic exercise equipment provided',
      'Certified YMCA lifeguards always on duty',
    ],
    scheduleAction: {
      label: 'Explore Aqua Classes',
      route: '/(member)/(tabs)/schedules',
    },
  },
  {
    id: 'pickleball',
    title: 'Pickleball Powered by JOOLA',
    category: 'Courts',
    icon: 'tennisball-outline',
    badge: 'JOOLA Official Partner',
    description: 'High-energy pickleball on professional courts. Silver Spring hosts weekly beginner clinics, open recreational ladders, and pickup play.',
    details: [
      'Multiple indoor marked courts in the main gymnasium',
      'Open drop-in play: Mon/Wed/Fri mornings and Tuesday evenings',
      'JOOLA demo paddles and balls available at the equipment desk',
      'All skill levels welcome from beginner to tournament players',
    ],
  },
  {
    id: 'child-watch',
    title: 'Child Watch Babysitting',
    category: 'Family',
    icon: 'happy-outline',
    badge: 'Free with Family Membership',
    description: 'Safe, fun, supervised drop-in childcare for children ages 6 weeks to 10 years while parents work out in the facility.',
    details: [
      'Up to 2 hours of care per visit per child',
      'Staffed by background-checked, CPR-certified youth care professionals',
      'Engaging activities, art projects, story time, and play areas',
      'Hours: Mon–Fri 4:00 PM – 8:00 PM · Sat 8:00 AM – 1:00 PM',
    ],
    scheduleAction: {
      label: 'View Child Watch Times',
      route: '/(member)/(tabs)/schedules',
    },
  },
  {
    id: 'fitness-center',
    title: 'Fitness & Wellness Center',
    category: 'Fitness',
    icon: 'barbell-outline',
    description: 'Spacious wellness floor equipped with the latest cardio machines, free weight dumbbells up to 100 lbs, Olympic squat racks, and Cybex selectorized machines.',
    details: [
      'Treadmills, ellipticals, stair climbers, and rowers with personal TVs',
      'Dedicated stretching and functional turf movement zone',
      'Fitlinxx computerized strength and cardio tracking',
      'Complimentary 1-on-1 member wellness consultation included',
    ],
    scheduleAction: {
      label: 'Meet Personal Trainers',
      route: '/(member)/(tabs)/trainers',
    },
  },
  {
    id: 'group-ex',
    title: 'Group Exercise & Cycle Studios',
    category: 'Fitness',
    icon: 'people-outline',
    badge: '40+ Classes Weekly',
    description: 'Multi-purpose wood-floor studios with surround sound and dedicated spin bikes. Unlimited classes are included free with membership.',
    details: [
      'Signature classes: BodyPump, Yoga Flow, Zumba, Cycle & Spin, HIIT',
      'Active Older Adult classes: Gentle Chair Yoga, Fit & Well Seniors',
      'Top certified instructors passionate about motivating every fitness level',
      'All mats, weights, bands, and steps provided in studio',
    ],
    scheduleAction: {
      label: 'Browse Class Schedule',
      route: '/(member)/(tabs)/schedules',
    },
  },
  {
    id: 'gymnasium',
    title: 'Full Gymnasium & Basketball',
    category: 'Courts',
    icon: 'basketball-outline',
    description: 'Regulation high-school sized basketball court host to adult open pickup runs, youth basketball leagues, and community family games.',
    details: [
      'Open shootaround and pickup basketball daily',
      'Youth sports leagues, floor hockey, and seasonal camps',
      'Volleyball setup available during weekend family hours',
    ],
  },
  {
    id: 'sauna-steam',
    title: 'Saunas, Steam Rooms & Locker Rooms',
    category: 'Wellness',
    icon: 'flame-outline',
    description: 'Recharge post-workout with cedarwood dry heat saunas, eucalyptus-infused steam rooms, private showers, and lockers.',
    details: [
      'Men’s and Women’s locker rooms with digital lockers',
      'Separate dry cedar saunas and steam rooms in each facility',
      'Day lockers available free (bring your own padlock or purchase at desk)',
      'Accessible family / gender-neutral changing suites with direct pool access',
    ],
  },
  {
    id: 'tennis',
    title: 'Outdoor Tennis Courts',
    category: 'Courts',
    icon: 'tennisball',
    description: 'Outdoor hard courts tucked behind the YMCA Silver Spring facility for member recreation and seasonal instruction.',
    details: [
      'First-come, first-served open play for members',
      'Spring and summer youth tennis clinics and private instruction',
      'Court reservations available through Member Services',
    ],
  },
];

const CATEGORIES = ['All', 'Aquatics', 'Fitness', 'Courts', 'Family', 'Wellness'] as const;

export default function BranchAmenitiesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filtered = selectedCategory === 'All'
    ? AMENITIES
    : AMENITIES.filter((a) => a.category === selectedCategory);

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Amenities & Facility" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Link */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Previous Screen"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>Back</AppText>
        </Pressable>

        {/* Hero Facility Overview */}
        <View style={[styles.heroCard, cardTheme]}>
          <View style={styles.branchHeaderRow}>
            <View style={styles.branchHeaderLeft}>
              <AppText style={[styles.heroBranchTitle, { color: colors.text }]}>
                YMCA Silver Spring
              </AppText>
              <AppText style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                9800 Hastings Drive, Silver Spring, MD 20901
              </AppText>
            </View>
            <View style={[styles.openBadge, { backgroundColor: colors.successBg }]}>
              <AppText style={[styles.openBadgeText, { color: colors.success }]}>OPEN</AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.hoursGrid}>
            <View style={styles.hoursCol}>
              <AppText style={[styles.hoursLabel, { color: colors.textMuted }]}>
                MONDAY – FRIDAY
              </AppText>
              <AppText style={[styles.hoursTime, { color: colors.text }]}>
                5:30 AM – 10:00 PM
              </AppText>
            </View>
            <View style={styles.hoursCol}>
              <AppText style={[styles.hoursLabel, { color: colors.textMuted }]}>
                SATURDAY – SUNDAY
              </AppText>
              <AppText style={[styles.hoursTime, { color: colors.text }]}>
                Sat 7am–8pm · Sun 8am–8pm
              </AppText>
            </View>
          </View>

          <View style={styles.contactRow}>
            <Pressable
              onPress={() => Linking.openURL('tel:3015852120')}
              style={[styles.contactPill, { backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <AppText style={[styles.contactText, { color: colors.primary }]}>
                (301) 585-2120
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('mailto:silverspring@ymcadc.org')}
              style={[styles.contactPill, { backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <AppText style={[styles.contactText, { color: colors.primary }]}>
                silverspring@ymcadc.org
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.cardBg,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <AppText
                  style={[
                    styles.filterChipText,
                    {
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {cat}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Amenity Cards */}
        {filtered.map((item) => (
          <View key={item.id} style={[styles.amenityCard, cardTheme]}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderBody}>
                <AppText style={[styles.amenityTitle, { color: colors.text }]}>
                  {item.title}
                </AppText>
                <View style={styles.metaBadgeRow}>
                  <AppText style={[styles.amenityCategory, { color: colors.textMuted }]}>
                    {item.category}
                  </AppText>
                  {item.badge && (
                    <View style={[styles.badgePill, { backgroundColor: colors.gold }]}>
                      <AppText style={styles.badgeText}>{item.badge}</AppText>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <AppText style={[styles.amenityDesc, { color: colors.text }]}>
              {item.description}
            </AppText>

            <View style={styles.bulletList}>
              {item.details.map((point, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <AppText style={[styles.bulletText, { color: colors.textMuted }]}>
                    {point}
                  </AppText>
                </View>
              ))}
            </View>

            {item.scheduleAction && (
              <PrimaryButton
                title={item.scheduleAction.label}
                onPress={() => router.push(item.scheduleAction!.route as any)}
                accessibilityHint={`Go to ${item.scheduleAction.label}`}
              />
            )}
          </View>
        ))}
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
    paddingVertical: 6,
  },
  backText: {
    ...typography.body,
    fontWeight: '700',
  },
  heroCard: {
    ...cardStyle,
    gap: 12,
    overflow: 'hidden',
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  branchHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  heroBranchTitle: {
    ...typography.title,
    fontSize: 22,
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 14,
    marginTop: 2,
    lineHeight: 19,
  },
  openBadge: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignSelf: 'flex-start',
  },
  openBadgeText: {
    ...typography.caption,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  hoursCol: {
    flex: 1,
    minWidth: 130,
  },
  hoursLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  hoursTime: {
    ...typography.bodyStrong,
    fontSize: 14,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.chip,
  },
  contactText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    minHeight: tapTarget,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    ...typography.body,
    fontSize: 14,
  },
  amenityCard: {
    ...cardStyle,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  cardHeaderBody: {
    flex: 1,
    gap: 4,
  },
  amenityTitle: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 24,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  amenityCategory: {
    ...typography.caption,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.chip,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amenityDesc: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
  },
});
