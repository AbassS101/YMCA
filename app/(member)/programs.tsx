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
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { useTheme } from '@/context/ThemeContext';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

type ProgramSection = {
  id: string;
  title: string;
  category: string;
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  highlights: string[];
  ctaText?: string;
  ctaRoute?: string;
};

const PROGRAMS: ProgramSection[] = [
  {
    id: 'camps',
    title: 'YMCA Summer & Day Camps',
    category: 'Youth Development',
    badge: 'Member Priority & Discount',
    icon: 'sunny-outline',
    description: 'Award-winning full-day summer camps that inspire confidence, build friendships, and create lifelong memories in a safe, nurturing environment.',
    highlights: [
      'Camp Silver Spring: Traditional outdoor adventures, games, and weekly field trips',
      'Sports & Aquatics specialty camps with daily swimming instruction',
      'STEM & Arts discovery sessions for curious young minds',
      'Financial assistance and sibling discounts available',
    ],
    ctaText: 'Register or Inquire at Wellness Desk',
    ctaRoute: '/(member)/(tabs)/trainers',
  },
  {
    id: 'swim-academy',
    title: 'YMCA Swim Academy (All Ages)',
    category: 'Aquatics',
    badge: 'Stages 1–6',
    icon: 'water-outline',
    description: 'Nationally recognized swim curriculum emphasizing water safety, stroke mechanics, stamina, and building lifelong aquatic confidence.',
    highlights: [
      'Parent & Child (6 months – 3 years): Water acclimation and bonding',
      'Preschool & School Age (Stages 1–6): Water movement to stroke mechanics',
      'Masters Swim & Adult stroke refinement for fitness swimmers',
      'Small instructor-to-swimmer ratios with certified safety lifeguards',
    ],
    ctaText: 'View Swim Class Schedule',
    ctaRoute: '/(member)/(tabs)/schedules',
  },
  {
    id: 'child-care',
    title: 'Early Learning & School-Age Care',
    category: 'Youth Development',
    badge: 'Licensed Programs',
    icon: 'school-outline',
    description: 'High-quality before-and-after school enrichment and licensed early childhood education serving Montgomery County families.',
    highlights: [
      'Curriculum aligned with Maryland State Department of Education standards',
      'Homework assistance, STEM activities, and healthy snacks',
      'Transportation to and from select local Silver Spring elementary schools',
      'Full-day care options during school holidays and professional days',
    ],
  },
  {
    id: 'diabetes-prevention',
    title: "YMCA's Diabetes Prevention Program",
    category: 'Community Health',
    badge: 'CDC Recognized',
    icon: 'heart-outline',
    description: 'A proven, lifestyle-change program helping adults at risk of type 2 diabetes reduce their risk through healthy eating, physical activity, and peer support.',
    highlights: [
      'Led by a trained YMCA Lifestyle Coach over 12 monthly sessions',
      'Goals: 7% weight loss and 150 minutes of weekly moderate activity',
      'Often covered by Medicare, Medicaid, and private health insurers',
      'Confidential risk assessments available anytime at Silver Spring branch',
    ],
  },
  {
    id: 'blood-pressure',
    title: 'Blood Pressure Self-Monitoring',
    category: 'Community Health',
    icon: 'pulse-outline',
    description: 'Evidence-based program helping adults with hypertension manage their blood pressure through personal tracking and healthy habit consultations.',
    highlights: [
      'Free blood pressure cuff and log book provided upon enrollment',
      'Personal consultations with YMCA Healthy Heart Ambassadors twice monthly',
      'Monthly nutrition education seminars on reducing sodium and DASH diet',
      'Track improvements and share reports with your primary care provider',
    ],
  },
  {
    id: 'wellness-orientation',
    title: 'Complimentary Member Wellness Consultation',
    category: 'Personal Fitness',
    badge: 'Free with Membership',
    icon: 'fitness-outline',
    description: 'Every YMCA Silver Spring member receives a complimentary 45-minute 1-on-1 orientation with a certified trainer to evaluate goals and establish an actionable workout routine.',
    highlights: [
      'Equipment walkthrough tailored to your comfort level and fitness goals',
      'Personalized recommendation of group classes and lane swim times',
      'Goal setting: strength building, mobility, weight management, or race prep',
      'Book anytime directly with our personal trainers in the app',
    ],
    ctaText: 'Book with Trainer Alex or Sarah',
    ctaRoute: '/(member)/(tabs)/trainers',
  },
];

export default function ProgramsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Programs & Community Health" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Link */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>Back</AppText>
        </Pressable>

        {/* Mission Statement Banner */}
        <View style={[styles.missionCard, cardTheme]}>
          <AppText style={[styles.missionTitle, { color: colors.text }]}>
            More Than A Gym. A Community Cause.
          </AppText>
          <AppText style={[styles.missionBody, { color: colors.textMuted }]}>
            The YMCA of Metropolitan Washington is dedicated to strengthening community through youth development, healthy living, and social responsibility. Explore signature programs and health initiatives offered right here at the Silver Spring branch.
          </AppText>
        </View>

        {/* Program Cards */}
        {PROGRAMS.map((prog) => (
          <View key={prog.id} style={[styles.programCard, cardTheme]}>
            <View style={styles.topRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={prog.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderBody}>
                <AppText style={[styles.progTitle, { color: colors.text }]}>
                  {prog.title}
                </AppText>
                <View style={styles.metaBadgeRow}>
                  <AppText style={[styles.progCategory, { color: colors.textMuted }]}>
                    {prog.category}
                  </AppText>
                  {prog.badge && (
                    <View style={[styles.badgePill, { backgroundColor: colors.gold }]}>
                      <AppText style={styles.badgeText}>{prog.badge}</AppText>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <AppText style={[styles.progDesc, { color: colors.text }]}>
              {prog.description}
            </AppText>

            <View style={styles.highlightsList}>
              {prog.highlights.map((h, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                  <AppText style={[styles.bulletText, { color: colors.textMuted }]}>
                    {h}
                  </AppText>
                </View>
              ))}
            </View>

            {prog.ctaText && prog.ctaRoute && (
              <PrimaryButton
                title={prog.ctaText}
                onPress={() => router.push(prog.ctaRoute as any)}
                accessibilityHint={`Go to ${prog.ctaText}`}
              />
            )}
          </View>
        ))}

        {/* Contact Front Desk */}
        <View style={[styles.inquiryCard, cardTheme]}>
          <AppText style={[styles.inquiryTitle, { color: colors.text }]}>
            Program Registration Questions?
          </AppText>
          <AppText style={[styles.inquiryText, { color: colors.textMuted }]}>
            Have questions about camp fees, child care enrollment, or health program qualification? Our Silver Spring Member Services team is happy to assist.
          </AppText>
          <SecondaryButton
            title="Message Wellness Desk"
            onPress={() => router.push('/(member)/(tabs)/trainers')}
          />
        </View>
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
  missionCard: {
    ...cardStyle,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E11D48',
  },
  missionTitle: {
    ...typography.title,
    fontSize: 18,
  },
  missionBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  programCard: {
    ...cardStyle,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  cardHeaderBody: {
    flex: 1,
    gap: 4,
  },
  progTitle: {
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
  progCategory: {
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
  progDesc: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  highlightsList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  inquiryCard: {
    ...cardStyle,
    gap: 8,
    marginTop: 4,
  },
  inquiryTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  inquiryText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
