import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import {
  WELLNESS_AREAS_OF_EXPERTISE,
  WELLNESS_CONTACT_INFO,
  WELLNESS_PACKAGE_INCLUSIONS,
  type WellnessPackageTier,
  type WellnessProgramType,
  formatWellnessPrice,
} from '@/domain/wellnessPrograms';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

export type WellnessPackagesViewProps = {
  onBookLesson?: () => void;
  onChatWithDesk?: () => void;
  defaultProgramId?: WellnessProgramType;
};

export function WellnessPackagesView({
  onBookLesson,
  onChatWithDesk,
  defaultProgramId = 'personal-60',
}: WellnessPackagesViewProps) {
  const { colors, isDark } = useTheme();
  const { branding, wellnessPackages: programs } = useAppConfig().config;
  const contact = {
    ...WELLNESS_CONTACT_INFO,
    phone: branding.phone,
    phoneRaw: branding.phone.replace(/\D/g, ''),
    email: branding.wellnessEmail,
  };
  const [selectedProgramId, setSelectedProgramId] = useState<WellnessProgramType>(defaultProgramId);
  const [rateType, setRateType] = useState<'branch' | 'community'>('branch');

  const selectedProgram =
    programs.find((p) => p.id === selectedProgramId) ??
    programs[0];

  const handlePhoneCall = () => {
    Linking.openURL(`tel:${contact.phoneRaw}`).catch(() => {
      Alert.alert('Phone', `Call the front desk at ${contact.phone}`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(
      `mailto:${contact.email}?subject=Inquiry%20-%20YMCA%20Wellness%20Training%20Programs`
    ).catch(() => {
      Alert.alert('Email', `Email wellness at ${contact.email}`);
    });
  };

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={styles.container}>
      {/* Official Header Card */}
      <View style={[styles.card, cardTheme, styles.heroCard]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.badgePill, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="medal" size={14} color={colors.primary} />
            <Text style={[styles.badgePillText, { color: colors.primary }]}>
              YMCA SILVER SPRING
            </Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
            <Text style={[styles.badgePillText, { color: '#16A34A' }]}>
              NATIONALLY CERTIFIED
            </Text>
          </View>
        </View>

        <Text style={[styles.heroTitle, { color: colors.text }]} allowFontScaling>
          Wellness Training Programs
        </Text>

        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]} allowFontScaling>
          Supported by nationally certified YMCA trainers with personalized 1-on-1 and partner training packages. Every program is built around your individual goals, functional movement patterns, and long-term health.
        </Text>

        {/* Quick Contact Bar */}
        <View style={[styles.quickContactBar, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: colors.cardBorder }]}>
          <Pressable
            onPress={handlePhoneCall}
            style={styles.quickContactItem}
            accessibilityRole="button"
            accessibilityLabel={`Call ${contact.phone}`}
          >
            <Ionicons name="call" size={15} color={colors.primary} />
            <Text style={[styles.quickContactText, { color: colors.primary }]}>
              {contact.phone}
            </Text>
          </Pressable>
          <View style={[styles.quickContactDivider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={handleEmail}
            style={styles.quickContactItem}
            accessibilityRole="button"
            accessibilityLabel={`Email ${contact.email}`}
          >
            <Ionicons name="mail" size={15} color={colors.primary} />
            <Text style={[styles.quickContactText, { color: colors.primary }]}>
              {contact.email}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Program Option Selector */}
      <View style={styles.sectionHeaderWrap}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} allowFontScaling>
          Choose Training Format
        </Text>
      </View>

      <View style={styles.programTabsRow}>
        {programs.map((prog) => {
          const isSelected = prog.id === selectedProgramId;
          return (
            <Pressable
              key={prog.id}
              onPress={() => setSelectedProgramId(prog.id)}
              style={[
                styles.programTab,
                {
                  backgroundColor: isSelected ? colors.primary : colors.cardBg,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={prog.title}
            >
              <Ionicons
                name={prog.id === 'partner' ? 'people' : prog.id === 'personal-30' ? 'timer' : 'fitness'}
                size={18}
                color={isSelected ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                style={[
                  styles.programTabText,
                  { color: isSelected ? '#FFFFFF' : colors.text },
                ]}
                allowFontScaling
              >
                {prog.shortTitle}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active Program Details & Tagline */}
      <View style={[styles.card, cardTheme, { gap: 8 }]}>
        <View style={styles.programMetaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.programHeaderTitle, { color: colors.text }]} allowFontScaling>
              {selectedProgram.title}
            </Text>
            <Text style={[styles.programTagline, { color: colors.primary }]} allowFontScaling>
              {selectedProgram.tagline} · {selectedProgram.durationMinutes} Minutes
            </Text>
          </View>
          <View style={[styles.durationBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <Ionicons name="time-outline" size={14} color={colors.text} />
            <Text style={[styles.durationBadgeText, { color: colors.text }]}>
              {selectedProgram.durationMinutes} min
            </Text>
          </View>
        </View>

        <Text style={[styles.programDescText, { color: colors.textMuted }]} allowFontScaling>
          {selectedProgram.description}
        </Text>

        {/* Member vs Community Rate Toggle */}
        <View style={styles.rateToggleWrap}>
          <Text style={[styles.rateToggleLabel, { color: colors.textMuted }]}>
            Pricing Tier:
          </Text>
          <View
            style={[
              styles.rateTogglePills,
              {
                backgroundColor: isDark ? '#0F172A' : '#E2E8F0',
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => setRateType('branch')}
              style={[
                styles.ratePill,
                rateType === 'branch' && [styles.ratePillActive, { backgroundColor: colors.cardBg }],
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: rateType === 'branch' }}
              accessibilityLabel="View Branch Member Pricing"
            >
              <Text
                style={[
                  styles.ratePillText,
                  {
                    color: rateType === 'branch' ? colors.primary : colors.textMuted,
                    fontWeight: rateType === 'branch' ? '800' : '600',
                  },
                ]}
              >
                Branch Member
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setRateType('community')}
              style={[
                styles.ratePill,
                rateType === 'community' && [styles.ratePillActive, { backgroundColor: colors.cardBg }],
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: rateType === 'community' }}
              accessibilityLabel="View Community Member Pricing"
            >
              <Text
                style={[
                  styles.ratePillText,
                  {
                    color: rateType === 'community' ? colors.primary : colors.textMuted,
                    fontWeight: rateType === 'community' ? '800' : '600',
                  },
                ]}
              >
                Community Member
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Package Pricing Cards Matrix */}
      <View style={styles.tiersGrid}>
        {selectedProgram.tiers.map((tier: WellnessPackageTier) => {
          const isBestValue = tier.badge === 'Best Value';
          const isMember = rateType === 'branch';
          const totalPrice = isMember ? tier.branchMemberPrice : tier.communityMemberPrice;
          const perSessionPrice = isMember
            ? tier.branchMemberPerSession
            : tier.communityMemberPerSession;
          const perPersonPrice = isMember
            ? tier.branchMemberPerPersonPerSession
            : tier.communityMemberPerPersonPerSession;

          return (
            <View
              key={tier.sessions}
              style={[
                styles.tierCard,
                cardTheme,
                isBestValue && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              {/* Badge Row */}
              <View style={styles.tierTopBadgeRow}>
                <View
                  style={[
                    styles.sessionCountBadge,
                    { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' },
                  ]}
                >
                  <Text style={[styles.sessionCountText, { color: colors.primary }]}>
                    {tier.sessions} {tier.sessions === 1 ? 'SESSION' : 'SESSIONS'}
                  </Text>
                </View>

                {tier.badge ? (
                  <View
                    style={[
                      styles.tierHighlightBadge,
                      {
                        backgroundColor: isBestValue
                          ? colors.primary
                          : isDark
                            ? '#374151'
                            : '#FDE047',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierHighlightText,
                        { color: isBestValue ? '#FFFFFF' : '#854D0E' },
                      ]}
                    >
                      {tier.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Price Row */}
              <View style={styles.tierPriceSection}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLarge, { color: colors.text }]} allowFontScaling>
                    {formatWellnessPrice(totalPrice)}
                  </Text>
                  <Text style={[styles.pricePerSession, { color: colors.textMuted }]}>
                    {tier.sessions > 1 ? `(${formatWellnessPrice(perSessionPrice)}/session)` : ''}
                  </Text>
                </View>

                {perPersonPrice ? (
                  <Text style={[styles.perPersonNote, { color: colors.primary }]}>
                    {formatWellnessPrice(perPersonPrice)}/session/person
                  </Text>
                ) : null}

                {tier.savingsNote && isMember ? (
                  <Text style={[styles.savingsNote, { color: '#16A34A' }]}>
                    {tier.savingsNote}
                  </Text>
                ) : !isMember ? (
                  <Text style={[styles.savingsNote, { color: colors.textMuted }]}>
                    Community member standard rate
                  </Text>
                ) : null}
              </View>

              {/* Action Button */}
              {onBookLesson ? (
                <Pressable
                  onPress={onBookLesson}
                  style={({ pressed }) => [
                    styles.tierSelectBtn,
                    {
                      backgroundColor: isBestValue
                        ? colors.primary
                        : pressed
                          ? colors.primaryLight
                          : isDark
                            ? '#1E293B'
                            : '#F8FAFC',
                      borderColor: colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${tier.sessions} sessions package`}
                >
                  <Text
                    style={[
                      styles.tierSelectBtnText,
                      { color: isBestValue ? '#FFFFFF' : colors.primary },
                    ]}
                  >
                    Book with Trainer
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={isBestValue ? '#FFFFFF' : colors.primary}
                  />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* What Each Package Includes */}
      <View style={styles.sectionHeaderWrap}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]} allowFontScaling>
          Included in Every Package
        </Text>
      </View>

      <View style={styles.inclusionsGrid}>
        {WELLNESS_PACKAGE_INCLUSIONS.map((inc) => (
          <View key={inc.id} style={[styles.inclusionCard, cardTheme]}>
            <View style={[styles.inclusionIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons
                name={
                  inc.id === 'functional-assessment'
                    ? 'body'
                    : inc.id === 'goal-planning'
                      ? 'compass'
                      : inc.id === 'custom-program'
                        ? 'clipboard'
                        : 'analytics'
                }
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.inclusionContent}>
              <Text style={[styles.inclusionTitle, { color: colors.text }]} allowFontScaling>
                {inc.title}
              </Text>
              <Text style={[styles.inclusionSubtitle, { color: colors.primary }]} allowFontScaling>
                {inc.subtitle}
              </Text>
              <Text style={[styles.inclusionDesc, { color: colors.textMuted }]} allowFontScaling>
                {inc.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Areas of Expertise */}
      <View style={styles.sectionHeaderWrap}>
        <Ionicons name="ribbon" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]} allowFontScaling>
          Trainer Areas of Expertise
        </Text>
      </View>

      <View style={[styles.card, cardTheme, { gap: 12 }]}>
        <Text style={[styles.expertiseLead, { color: colors.textMuted }]} allowFontScaling>
          Our nationally certified trainers hold specialized credentials across diverse disciplines:
        </Text>
        <View style={styles.expertiseChipsWrap}>
          {WELLNESS_AREAS_OF_EXPERTISE.map((exp) => (
            <View
              key={exp.id}
              style={[
                styles.expertiseChip,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.expertiseChipTitle, { color: colors.text }]}>
                  {exp.title}
                </Text>
                <Text style={[styles.expertiseChipDesc, { color: colors.textMuted }]}>
                  {exp.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Inquiry & Support Footer Card */}
      <View
        style={[
          styles.card,
          cardTheme,
          {
            backgroundColor: isDark ? '#0F172A' : '#EFF6FF',
            borderColor: colors.primary,
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={styles.supportHeaderRow}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.supportTitle, { color: colors.text }]} allowFontScaling>
              Get Started or Inquire
            </Text>
            <Text style={[styles.supportBody, { color: colors.textMuted }]} allowFontScaling>
              {contact.inBranchPrompt}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <Pressable
            onPress={handlePhoneCall}
            style={[styles.contactActionBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Call desk at ${contact.phone}`}
          >
            <Ionicons name="call-outline" size={16} color={colors.primary} />
            <Text style={[styles.contactActionText, { color: colors.text }]}>
              {contact.phone}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleEmail}
            style={[styles.contactActionBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Email wellness at ${contact.email}`}
          >
            <Ionicons name="mail-outline" size={16} color={colors.primary} />
            <Text style={[styles.contactActionText, { color: colors.text }]}>
              Email Wellness
            </Text>
          </Pressable>

          {onChatWithDesk ? (
            <Pressable
              onPress={onChatWithDesk}
              style={[styles.contactActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Chat with front desk"
            >
              <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
              <Text style={[styles.contactActionText, { color: '#FFFFFF' }]}>
                Chat with Desk
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    ...cardStyle,
  },
  heroCard: {
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  quickContactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickContactItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quickContactText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickContactDivider: {
    width: 1,
    height: 18,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 17,
    fontWeight: '800',
  },
  programTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  programTab: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.button,
    borderWidth: 1.5,
  },
  programTabText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  programMetaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  programHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  programTagline: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  programDescText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  rateToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    flexWrap: 'wrap',
    gap: 8,
  },
  rateToggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rateTogglePills: {
    flexDirection: 'row',
    borderRadius: radii.full,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  ratePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  ratePillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  ratePillText: {
    fontSize: 11,
  },
  tiersGrid: {
    gap: 10,
  },
  tierCard: {
    ...cardStyle,
    gap: 10,
  },
  tierTopBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionCountText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierHighlightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tierHighlightText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tierPriceSection: {
    gap: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceLarge: {
    fontSize: 26,
    fontWeight: '900',
  },
  pricePerSession: {
    fontSize: 14,
    fontWeight: '600',
  },
  perPersonNote: {
    fontSize: 12,
    fontWeight: '700',
  },
  savingsNote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tierSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.button,
    borderWidth: 1.5,
    marginTop: 2,
  },
  tierSelectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inclusionsGrid: {
    gap: 8,
  },
  inclusionCard: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.sm + 4,
  },
  inclusionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inclusionContent: {
    flex: 1,
    gap: 2,
  },
  inclusionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  inclusionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  inclusionDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  expertiseLead: {
    fontSize: 12,
  },
  expertiseChipsWrap: {
    gap: 8,
  },
  expertiseChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  expertiseChipTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  expertiseChipDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  supportBody: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  contactActionBtn: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  contactActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
