import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { visibleItems } from '@/domain/branchContent';
import { wellnessRateHighlights } from '@/domain/wellnessPrograms';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

export default function ProgramsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { wellnessPackages, programs: programContent } = useAppConfig().config;
  // The rate lines come from the wellness rate card, so they follow price changes.
  const programs = visibleItems(programContent).map((p) =>
    p.id === 'wellness-training-programs'
      ? { ...p, highlights: [...p.highlights.slice(0, 2), ...wellnessRateHighlights(wellnessPackages), ...p.highlights.slice(2)] }
      : p
  );

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
        {programs.map((prog) => (
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
            onPress={() => router.push('/(member)/(tabs)/staff')}
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
