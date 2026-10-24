import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import {
  DAYS_OF_WEEK,
  getPoolSlots,
  type PoolId,
  type PoolTimeSlot,
} from '@/domain/poolScheduleData';
import { radii, spacing } from '@/theme/typography';
import type { PoolScheduleConfig } from '@/domain/branchContent';

interface PoolMatrixGridProps {
  poolId: PoolId;
  onSelectSlot: (slot: PoolTimeSlot) => void;
  schedule?: PoolScheduleConfig;
}

const HOURS = [
  '6:00 AM',
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
  '10:00 PM',
];

const HOUR_HEIGHT = 44; // pixels per hour
const START_MINUTES = 360; // 6:00 AM
const COLUMN_WIDTH = 110;

export function PoolMatrixGrid({ poolId, onSelectSlot, schedule }: PoolMatrixGridProps) {
  const { colors: tc, isDark } = useTheme();
  const { poolSchedule } = useAppConfig().config;

  const titleText =
    poolId === 'indoor'
      ? 'Indoor Pool Schedule Starting October 05, 2026'
      : 'Outdoor Pool Schedule Starting October 05, 2026';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        },
      ]}
    >
      {/* Official Flyer Purple Header Strip */}
      <View style={styles.flyerHeaderBar}>
        <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
        <Text style={styles.flyerHeaderTitle} numberOfLines={1}>
          {titleText}
        </Text>
      </View>

      <Text style={[styles.instructionHint, { color: tc.textMuted }]}>
        Scroll horizontally to view all 7 days · Tap any block to inspect lane layout
      </Text>

      {/* Grid Scroll Viewport */}
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.gridScroll}>
        <View style={styles.gridContainer}>
          {/* Day Column Headers */}
          <View style={styles.headerRow}>
            {/* Top-left corner spacer for time axis */}
            <View style={styles.timeHeaderSpacer}>
              <Text style={[styles.timeHeaderLabel, { color: tc.textMuted }]}>
                TIME
              </Text>
            </View>

            {DAYS_OF_WEEK.map((d) => (
              <View
                key={d.key}
                style={[
                  styles.dayColumnHeader,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <Text style={[styles.dayHeaderTitle, { color: tc.text }]}>
                  {d.label.toUpperCase()}
                </Text>
                <Text style={[styles.dayHeaderSub, { color: tc.textMuted }]}>
                  {d.short}
                </Text>
              </View>
            ))}
          </View>

          {/* Body: Left Time Column + 7 Day Columns */}
          <View style={styles.gridBodyRow}>
            {/* Left Time Axis */}
            <View style={styles.timeAxisColumn}>
              {HOURS.map((hr, index) => (
                <View
                  key={hr}
                  style={[
                    styles.timeHourSlot,
                    {
                      height: HOUR_HEIGHT,
                      borderTopColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text style={[styles.timeAxisLabel, { color: tc.textMuted }]}>
                    {hr.replace(' ', '\n')}
                  </Text>
                </View>
              ))}
            </View>

            {/* 7 Columns for Each Day */}
            {DAYS_OF_WEEK.map((d) => {
              const slots = getPoolSlots(poolId, d.key, schedule ?? poolSchedule);

              return (
                <View
                  key={d.key}
                  style={[
                    styles.dayContentColumn,
                    {
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      backgroundColor: isDark ? '#090D16' : '#FAFAFA',
                    },
                  ]}
                >
                  {/* Background hour grid lines */}
                  {HOURS.map((hr) => (
                    <View
                      key={hr}
                      style={[
                        styles.gridHourBackgroundLine,
                        {
                          height: HOUR_HEIGHT,
                          borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                        },
                      ]}
                    />
                  ))}

                  {/* Program & Schedule Blocks overlay */}
                  {slots.map((slot) => {
                    const top = ((slot.startMinutes - START_MINUTES) / 60) * HOUR_HEIGHT;
                    const durationMins = slot.endMinutes - slot.startMinutes;
                    const height = (durationMins / 60) * HOUR_HEIGHT - 2;

                    // Flyer block theme
                    const bg = slot.colorTheme.flyerBg;
                    const textColor = slot.colorTheme.flyerText;

                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => onSelectSlot(slot)}
                        style={[
                          styles.matrixBlock,
                          {
                            top,
                            height: Math.max(height, 28),
                            backgroundColor: bg,
                            borderColor: slot.colorTheme.border,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${slot.startTime} to ${slot.endTime}, ${slot.laneBreakdownLabel}`}
                      >
                        <Text
                          style={[styles.matrixBlockText, { color: textColor }]}
                          numberOfLines={slot.isClosed ? 1 : height > 70 ? 4 : 2}
                        >
                          {slot.laneBreakdownLabel.replace(/ · /g, '\n')}
                        </Text>
                        {height > 80 && !slot.isClosed ? (
                          <Text
                            style={[styles.matrixBlockSub, { color: textColor }]}
                            numberOfLines={1}
                          >
                            {slot.startTime}–{slot.endTime}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Legend Footer */}
      <View style={styles.legendContainer}>
        <Text style={[styles.legendTitle, { color: tc.text }]}>Schedule Legend:</Text>
        <View style={styles.legendWrap}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#FBBF24' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Open Lap & Rec</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#F97316' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Water Fitness</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#86EFAC' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Swim Team Practice</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Preschool Lessons</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#EC4899' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Group Lessons</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#A855F7' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Masters Adult</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#38BDF8' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Water Polo / Weekend</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#1E293B' }]} />
            <Text style={[styles.legendText, { color: tc.textMuted }]}>Facility Closed</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  flyerHeaderBar: {
    backgroundColor: '#7B1FA2', // Official YMCA flyer purple
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flyerHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    flex: 1,
  },
  instructionHint: {
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 4,
  },
  gridScroll: {
    paddingBottom: spacing.sm,
  },
  gridContainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeHeaderSpacer: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayColumnHeader: {
    width: COLUMN_WIDTH,
    marginRight: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radii.xs,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  dayHeaderSub: {
    fontSize: 10,
    marginTop: 1,
  },
  gridBodyRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  timeAxisColumn: {
    width: 52,
  },
  timeHourSlot: {
    borderTopWidth: 1,
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingRight: 4,
  },
  timeAxisLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 11,
  },
  dayContentColumn: {
    width: COLUMN_WIDTH,
    marginRight: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    position: 'relative',
    height: HOUR_HEIGHT * HOURS.length,
  },
  gridHourBackgroundLine: {
    borderTopWidth: 1,
    width: '100%',
  },
  matrixBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 6,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  matrixBlockText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  matrixBlockSub: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.9,
  },
  legendContainer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
  },
});
