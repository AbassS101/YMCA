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
import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { visibleItems } from '@/domain/branchContent';
import { childWatchCutoffLine, describeHoursLines, formatLimit } from '@/domain/childWatch';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

const CATEGORIES = ['All', 'Aquatics', 'Fitness', 'Courts', 'Family', 'Wellness'] as const;

export default function BranchAmenitiesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { config } = useAppConfig();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const rules = config.childWatch;
  const amenities = visibleItems(config.amenities).filter((a) => a.id !== 'child-watch' || config.featureToggles.childWatch).map((a) =>
    a.id === 'child-watch'
      ? {
          ...a,
          description: `Positive and fun on-site childcare during your visit, for children ${rules.minAgeWeeks} weeks and up. Maximum of ${formatLimit(rules.maxMinutesPerDay)} per day; parents must remain in the building.`,
          details: [
            ...describeHoursLines(rules.hours).map((l) => l.text),
            childWatchCutoffLine(rules).replace(/\.$/, ''),
            ...a.details.slice(-1),
          ],
        }
      : a
  );
  const filtered = selectedCategory === 'All'
    ? amenities
    : amenities.filter((a) => a.category === selectedCategory);

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
