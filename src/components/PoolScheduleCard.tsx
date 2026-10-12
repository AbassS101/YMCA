import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { PoolTimeSlot } from '@/domain/poolScheduleData';
import { radii, spacing } from '@/theme/typography';

interface PoolScheduleCardProps {
  slot: PoolTimeSlot;
  isSelected: boolean;
  onSelect: (slot: PoolTimeSlot) => void;
  onOpenDetails: (slot: PoolTimeSlot) => void;
}

export function PoolScheduleCard({
  slot,
  isSelected,
  onSelect,
  onOpenDetails,
}: PoolScheduleCardProps) {
  const { colors: tc, isDark } = useTheme();

  const isClosed = slot.isClosed;
  const durationMins = slot.endMinutes - slot.startMinutes;
  const durationHours = durationMins / 60;
  const durationText =
    durationHours >= 1
      ? Number.isInteger(durationHours)
        ? `${durationHours} hr${durationHours > 1 ? 's' : ''}`
        : `${Math.floor(durationHours)}h ${durationMins % 60}m`
      : `${durationMins} mins`;

  // Icon mapping
  let categoryIcon: keyof typeof Ionicons.glyphMap = 'water-outline';
  if (slot.category === 'fitness') categoryIcon = 'fitness-outline';
  else if (slot.category === 'lessons') categoryIcon = 'school-outline';
  else if (slot.category === 'team') categoryIcon = 'trophy-outline';
  else if (slot.category === 'waterpolo') categoryIcon = 'football-outline';
  else if (slot.category === 'rec') categoryIcon = 'happy-outline';
  else if (slot.category === 'closed') categoryIcon = 'moon-outline';

  return (
    <Pressable
      onPress={() => onSelect(slot)}
      style={[
        styles.card,
        {
          backgroundColor: isSelected
            ? isDark
              ? '#1E3A5F'
              : '#E0F2FE'
            : isDark
            ? tc.cardBg
            : '#FFFFFF',
          borderColor: isSelected
            ? tc.primary
            : isDark
            ? tc.cardBorder
            : '#E2E8F0',
        },
        isSelected && styles.cardSelected,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${slot.title}, ${slot.startTime} to ${slot.endTime}, ${slot.laneBreakdownLabel}`}
    >
      {/* Left Time Column */}
      <View style={styles.timeColumn}>
        <Text style={[styles.startTimeText, { color: tc.text }]}>
          {slot.startTime}
        </Text>
        <Text style={[styles.timeDivider, { color: tc.textMuted }]}>to</Text>
        <Text style={[styles.endTimeText, { color: tc.textMuted }]}>
          {slot.endTime}
        </Text>
        <View
          style={[
            styles.durationPill,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
          ]}
        >
          <Text style={[styles.durationText, { color: tc.textMuted }]}>
            {durationText}
          </Text>
        </View>
      </View>

      {/* Vertical Border Divider */}
      <View
        style={[
          styles.verticalDivider,
          {
            backgroundColor: isSelected
              ? tc.primary
              : isDark
              ? '#334155'
              : '#E2E8F0',
          },
        ]}
      />

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {/* Top Header Row with Title and Flyer Badge */}
        <View style={styles.titleRow}>
          <View style={styles.titleWithIcon}>
            <Ionicons
              name={categoryIcon}
              size={16}
              color={isSelected ? tc.primary : tc.text}
            />
            <Text
              style={[
                styles.slotTitle,
                { color: tc.text },
                isSelected && { color: tc.primary, fontWeight: '700' },
              ]}
              numberOfLines={2}
            >
              {slot.title}
            </Text>
          </View>
        </View>

        {/* Lane Breakdown Badge (styled to reflect the official flyer) */}
        <View style={styles.breakdownRow}>
          <View
            style={[
              styles.flyerBadge,
              {
                backgroundColor: isDark
                  ? slot.colorTheme.bg
                  : slot.colorTheme.badgeBg,
                borderColor: slot.colorTheme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.flyerBadgeText,
                { color: slot.colorTheme.badgeText },
              ]}
            >
              {slot.laneBreakdownLabel}
            </Text>
          </View>

          {!isClosed ? (
            <View style={styles.capacityTag}>
              <Text style={[styles.capacityText, { color: tc.textMuted }]}>
                {slot.lapLanes > 0 ? `${slot.lapLanes} Lap` : ''}
                {slot.lapLanes > 0 && slot.recLanes > 0 ? ' · ' : ''}
                {slot.recLanes > 0 ? `${slot.recLanes} Rec` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Visual Lane Capacity Bar (6 segments representing the 6 lanes) */}
        {!isClosed ? (
          <View style={styles.laneBarWrapper}>
            <View style={styles.laneBarContainer}>
              {slot.laneAllocations.map((lane) => {
                let segmentColor = '#0284C7';
                if (lane.type === 'rec') segmentColor = '#F59E0B';
                else if (lane.type === 'fitness') segmentColor = '#EA580C';
                else if (lane.type === 'lessons') segmentColor = '#EC4899';
                else if (lane.type === 'team') segmentColor = '#22C55E';
                else if (lane.type === 'waterpolo') segmentColor = '#2563EB';
                else if (lane.type === 'closed') segmentColor = '#64748B';

                return (
                  <View
                    key={lane.laneNumber}
                    style={[
                      styles.laneSegment,
                      { backgroundColor: segmentColor },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={[styles.laneBarLabel, { color: tc.textMuted }]}>
              6 Lanes
            </Text>
          </View>
        ) : null}

        {/* Notes / Swimmer Details */}
        {slot.notes ? (
          <Text
            style={[styles.notesText, { color: tc.textMuted }]}
            numberOfLines={2}
          >
            {slot.notes}
          </Text>
        ) : null}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => onSelect(slot)}
            style={styles.laneMapButton}
            hitSlop={6}
          >
            <Ionicons
              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
              size={14}
              color={tc.primary}
            />
            <Text style={[styles.laneMapButtonText, { color: tc.primary }]}>
              {isSelected ? 'Viewing on Lane Map' : 'Select on Lane Map'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onOpenDetails(slot)}
            style={[styles.detailsLink, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            hitSlop={6}
          >
            <Text style={[styles.detailsLinkText, { color: tc.primary }]}>
              Details
            </Text>
            <Ionicons name="chevron-forward" size={12} color={tc.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.12,
    elevation: 3,
  },
  timeColumn: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  startTimeText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeDivider: {
    fontSize: 10,
    marginVertical: 1,
  },
  endTimeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  durationPill: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 2,
    borderRadius: 1,
    marginRight: spacing.sm,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  flyerBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs + 2,
  },
  flyerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  capacityTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  laneBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  laneBarContainer: {
    flexDirection: 'row',
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
  },
  laneSegment: {
    flex: 1,
    borderRadius: 1.5,
  },
  laneBarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  laneMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  laneMapButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  detailsLinkText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
