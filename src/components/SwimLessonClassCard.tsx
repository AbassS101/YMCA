import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { AquaticsClassOffering } from '@/domain/aquaticsGuideData';
import { radii, spacing } from '@/theme/typography';

interface SwimLessonClassCardProps {
  offering: AquaticsClassOffering;
  onSelect?: (offering: AquaticsClassOffering) => void;
}

export function SwimLessonClassCard({
  offering,
  onSelect,
}: SwimLessonClassCardProps) {
  const { colors: tc, isDark } = useTheme();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEnrollPress = async () => {
    try {
      await Linking.openURL('https://www.ymcadc.org');
    } catch {
      // fallback
    }
  };

  let ageColor = '#0284C7';
  let ageBg = '#E0F2FE';
  if (offering.ageCategory === 'Preschool') {
    ageColor = '#EA580C';
    ageBg = '#FFEDD5';
  } else if (offering.ageCategory === 'Youth') {
    ageColor = '#7C3AED';
    ageBg = '#EDE9FE';
  } else if (offering.ageCategory === 'Teen & Adult') {
    ageColor = '#059669';
    ageBg = '#D1FAE5';
  } else if (offering.ageCategory === 'Adult Masters') {
    ageColor = '#D97706';
    ageBg = '#FEF3C7';
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? tc.cardBg : '#FFFFFF',
          borderColor: isDark ? tc.cardBorder : '#E2E8F0',
        },
      ]}
    >
      {/* Top Day & Time Header */}
      <View style={styles.topRow}>
        <View style={styles.timeWrap}>
          <Ionicons name="time-outline" size={14} color={tc.primary} />
          <Text style={[styles.timeText, { color: tc.text }]}>
            {offering.day} · {offering.startTime} – {offering.endTime}
          </Text>
        </View>

        <View style={[styles.agePill, { backgroundColor: isDark ? '#1E293B' : ageBg }]}>
          <Text style={[styles.agePillText, { color: ageColor }]}>
            {offering.ageCategory}
          </Text>
        </View>
      </View>

      {/* Class Title */}
      <Text style={[styles.titleText, { color: tc.text }]}>
        {offering.title}
      </Text>

      {/* Class Code & Pricing Grid */}
      <View
        style={[
          styles.metaBox,
          {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {/* Class Code */}
        <Pressable
          onPress={handleCopyCode}
          style={styles.codeRow}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Class code ${offering.classCode}, tap to copy`}
        >
          <Text style={[styles.codeLabel, { color: tc.textMuted }]}>
            CLASS CODE:
          </Text>
          <View style={[styles.codeBadge, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <Text style={[styles.codeText, { color: tc.text }]}>
              {offering.classCode}
            </Text>
            <Ionicons
              name={copiedCode ? 'checkmark-circle' : 'copy-outline'}
              size={12}
              color={copiedCode ? tc.success : tc.primary}
            />
          </View>
        </Pressable>

        {/* Pricing */}
        <View style={styles.priceRow}>
          {offering.isFree ? (
            <View style={[styles.freeBadge, { backgroundColor: tc.successBg }]}>
              <Ionicons name="gift-outline" size={13} color={tc.success} />
              <Text style={[styles.freeBadgeText, { color: tc.success }]}>
                FREE FOR MEMBERS & GUESTS
              </Text>
            </View>
          ) : (
            <View style={styles.pricingPills}>
              <View style={styles.priceItem}>
                <Text style={[styles.priceTagLabel, { color: tc.textMuted }]}>
                  Full Member
                </Text>
                <Text style={[styles.priceTagValue, { color: tc.primary }]}>
                  ${offering.fullMemberPrice}
                </Text>
              </View>
              <View style={[styles.priceDivider, { backgroundColor: tc.border }]} />
              <View style={styles.priceItem}>
                <Text style={[styles.priceTagLabel, { color: tc.textMuted }]}>
                  Program Member
                </Text>
                <Text style={[styles.priceTagValue, { color: tc.text }]}>
                  ${offering.programMemberPrice}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Notes or Details */}
      {offering.notes ? (
        <Text style={[styles.notesText, { color: tc.textMuted }]} numberOfLines={2}>
          {offering.notes}
        </Text>
      ) : null}

      {/* Footer: Session Info & Enroll Button */}
      <View style={styles.footerRow}>
        <View style={styles.sessionCountTag}>
          <Ionicons name="calendar-outline" size={12} color={tc.textMuted} />
          <Text style={[styles.sessionCountText, { color: tc.textMuted }]}>
            {offering.totalClasses} Classes · {offering.durationWeeks} Weeks
          </Text>
        </View>

        <Pressable
          onPress={handleEnrollPress}
          style={[styles.enrollBtn, { backgroundColor: tc.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Enroll in ${offering.title}`}
        >
          <Text style={styles.enrollBtnText}>Easy to Enroll ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  agePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  agePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  metaBox: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pricingPills: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceDivider: {
    width: 1,
    height: 20,
  },
  priceTagLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceTagValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  notesText: {
    fontSize: 11,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  sessionCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionCountText: {
    fontSize: 11,
  },
  enrollBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.button,
  },
  enrollBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
