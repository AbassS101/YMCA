import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { LaneAllocation, PoolFacilityInfo } from '@/domain/poolScheduleData';
import { radii, spacing, typography } from '@/theme/typography';

interface PoolLaneDiagramProps {
  facility: PoolFacilityInfo;
  laneAllocations: LaneAllocation[];
  slotTitle: string;
  slotTime: string;
  isClosed?: boolean;
}

export function PoolLaneDiagram({
  facility,
  laneAllocations,
  slotTitle,
  slotTime,
  isClosed = false,
}: PoolLaneDiagramProps) {
  const { colors: tc, isDark } = useTheme();

  const lapCount = laneAllocations.filter((l) => l.type === 'lap').length;
  const recCount = laneAllocations.filter((l) => l.type === 'rec').length;
  const progCount = laneAllocations.filter((l) =>
    ['fitness', 'lessons', 'team', 'waterpolo'].includes(l.type)
  ).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#0B1C2D' : '#F0F9FF',
          borderColor: isDark ? '#0369A1' : '#BAE6FD',
        },
      ]}
    >
      {/* Pool Header Strip */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.poolIconCircle, { backgroundColor: tc.primary }]}>
            <Ionicons name="water" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.poolTitle, { color: tc.text }]}>
              {facility.shortName} · 6-Lane Layout
            </Text>
            <Text style={[styles.poolSubtitle, { color: tc.textMuted }]}>
              {slotTime} · {slotTitle}
            </Text>
          </View>
        </View>

        <View style={styles.specsRow}>
          <View
            style={[
              styles.tempBadge,
              { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' },
            ]}
          >
            <Ionicons name="thermometer-outline" size={12} color={tc.primary} />
            <Text style={[styles.tempText, { color: tc.primary }]}>
              {facility.temperature.split(' ')[0]}
            </Text>
          </View>
        </View>
      </View>

      {/* Capacity Summary Bar */}
      {!isClosed ? (
        <View style={styles.summaryBar}>
          <View style={styles.summaryPill}>
            <View style={[styles.dot, { backgroundColor: '#0284C7' }]} />
            <Text style={[styles.summaryText, { color: tc.text }]}>
              {lapCount} Lap {lapCount === 1 ? 'Lane' : 'Lanes'}
            </Text>
          </View>
          {recCount > 0 ? (
            <View style={styles.summaryPill}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.summaryText, { color: tc.text }]}>
                {recCount} Rec {recCount === 1 ? 'Lane' : 'Lanes'}
              </Text>
            </View>
          ) : null}
          {progCount > 0 ? (
            <View style={styles.summaryPill}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.summaryText, { color: tc.text }]}>
                {progCount} Program {progCount === 1 ? 'Lane' : 'Lanes'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Pool Water Surface & Lanes */}
      <View
        style={[
          styles.poolWaterSurface,
          {
            backgroundColor: isDark ? '#032644' : '#E0F2FE',
            borderColor: isDark ? '#0284C7' : '#7DD3FC',
          },
        ]}
      >
        {isClosed ? (
          <View style={styles.closedWaterOverlay}>
            <Ionicons name="moon-outline" size={28} color={tc.textMuted} />
            <Text style={[styles.closedWaterText, { color: tc.textMuted }]}>
              Pool Deck is Closed for the Night
            </Text>
            <Text style={[styles.closedWaterSub, { color: tc.textMuted }]}>
              Thermal blankets active · Reopens at 6:00 AM
            </Text>
          </View>
        ) : (
          laneAllocations.map((lane, index) => {
            const isLast = index === laneAllocations.length - 1;

            let laneBadgeBg = '#E0F2FE';
            let laneBadgeText = '#0369A1';
            let laneIcon: keyof typeof Ionicons.glyphMap = 'speedometer-outline';

            if (lane.type === 'lap') {
              laneBadgeBg = isDark ? '#0C4A6E' : '#BAE6FD';
              laneBadgeText = isDark ? '#38BDF8' : '#0369A1';
              laneIcon = 'water-outline';
            } else if (lane.type === 'rec') {
              laneBadgeBg = isDark ? '#78350F' : '#FEF3C7';
              laneBadgeText = isDark ? '#FDE68A' : '#92400E';
              laneIcon = 'happy-outline';
            } else if (lane.type === 'fitness') {
              laneBadgeBg = isDark ? '#7C2D12' : '#FFEDD5';
              laneBadgeText = isDark ? '#FED7AA' : '#9A3412';
              laneIcon = 'fitness-outline';
            } else if (lane.type === 'lessons') {
              laneBadgeBg = isDark ? '#831843' : '#FCE7F3';
              laneBadgeText = isDark ? '#FBCFE8' : '#9D174D';
              laneIcon = 'school-outline';
            } else if (lane.type === 'team') {
              laneBadgeBg = isDark ? '#064E3B' : '#DCFCE7';
              laneBadgeText = isDark ? '#86EFAC' : '#166534';
              laneIcon = 'trophy-outline';
            } else if (lane.type === 'waterpolo') {
              laneBadgeBg = isDark ? '#1E3A8A' : '#DBEAFE';
              laneBadgeText = isDark ? '#93C5FD' : '#1D4ED8';
              laneIcon = 'football-outline';
            }

            return (
              <View
                key={lane.laneNumber}
                style={[
                  styles.laneRow,
                  !isLast && styles.laneDivider,
                  { borderBottomColor: isDark ? '#075985' : '#BAE6FD' },
                ]}
              >
                {/* Lane Number Tag */}
                <View
                  style={[
                    styles.laneNumberBox,
                    { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  <Text style={[styles.laneNumberText, { color: tc.text }]}>
                    Lane {lane.laneNumber}
                  </Text>
                </View>

                {/* Lane Usage Pill */}
                <View
                  style={[
                    styles.laneUsagePill,
                    { backgroundColor: laneBadgeBg },
                  ]}
                >
                  <Ionicons name={laneIcon} size={13} color={laneBadgeText} />
                  <Text
                    style={[styles.laneUsageText, { color: laneBadgeText }]}
                    numberOfLines={1}
                  >
                    {lane.label}
                  </Text>
                </View>

                {/* Lane Circle Swim Convention */}
                <View style={styles.laneRightInfo}>
                  {lane.type === 'lap' ? (
                    <Text style={[styles.laneSubRule, { color: tc.textMuted }]}>
                      Circle Swim (Counter-Clockwise)
                    </Text>
                  ) : lane.type === 'rec' ? (
                    <Text style={[styles.laneSubRule, { color: tc.textMuted }]}>
                      Open Recreation & Family
                    </Text>
                  ) : (
                    <Text style={[styles.laneSubRule, { color: tc.textMuted }]}>
                      Program Reserved
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Pool Deck Footer */}
      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Ionicons name="shield-checkmark-outline" size={13} color={tc.success} />
          <Text style={[styles.footerText, { color: tc.textMuted }]}>
            YMCA Lifeguard on Deck
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="expand-outline" size={13} color={tc.primary} />
          <Text style={[styles.footerText, { color: tc.textMuted }]}>
            25m Length · 6 Competition Lanes
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  poolIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  poolSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tempBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  tempText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.sm,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  poolWaterSurface: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingVertical: 2,
  },
  closedWaterOverlay: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  closedWaterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  closedWaterSub: {
    fontSize: 12,
  },
  laneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  laneDivider: {
    borderBottomWidth: 1,
  },
  laneNumberBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    minWidth: 54,
    alignItems: 'center',
  },
  laneNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  laneUsagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    flex: 1,
  },
  laneUsageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  laneRightInfo: {
    alignItems: 'flex-end',
  },
  laneSubRule: {
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 11,
  },
});
