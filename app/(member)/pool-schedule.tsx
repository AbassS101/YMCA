import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { FindLapLaneModal } from '@/components/FindLapLaneModal';
import { PoolLaneDiagram } from '@/components/PoolLaneDiagram';
import { PoolMatrixGrid } from '@/components/PoolMatrixGrid';
import { PoolScheduleCard } from '@/components/PoolScheduleCard';
import { PoolSlotDetailModal } from '@/components/PoolSlotDetailModal';
import { YHeader } from '@/components/YHeader';
import { useTheme } from '@/context/ThemeContext';
import {
  DAYS_OF_WEEK,
  getCurrentSlotForPool,
  getPoolSlots,
  POOL_FACILITIES,
  type ActivityCategory,
  type PoolDayKey,
  type PoolId,
  type PoolTimeSlot,
} from '@/domain/poolScheduleData';
import { radii, spacing, tapTarget } from '@/theme/typography';

type ViewMode = 'timeline' | 'matrix';

export default function PoolScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pool?: string }>();
  const { colors: tc, isDark } = useTheme();

  // Active pool selection ('indoor' vs 'outdoor')
  const [activePool, setActivePool] = useState<PoolId>(
    params.pool === 'outdoor' ? 'outdoor' : 'indoor'
  );

  // View mode ('timeline' vs 'matrix')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // Selected day
  const [selectedDay, setSelectedDay] = useState<PoolDayKey>('monday');

  // Activity filter chip
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Selected slot for lane map
  const [selectedSlot, setSelectedSlot] = useState<PoolTimeSlot | null>(null);

  // Modals
  const [detailModalSlot, setDetailModalSlot] = useState<PoolTimeSlot | null>(null);
  const [finderModalVisible, setFinderModalVisible] = useState(false);

  const facility = POOL_FACILITIES[activePool];

  // All slots for active pool and selected day
  const daySlots = useMemo(() => {
    return getPoolSlots(activePool, selectedDay);
  }, [activePool, selectedDay]);

  // Current slot active right now (or top of morning)
  const currentSlotNow = useMemo(() => {
    return getCurrentSlotForPool(activePool, selectedDay);
  }, [activePool, selectedDay]);

  // Currently displayed slot on the lane diagram (fallback to first open or first slot)
  const activeDiagramSlot = useMemo(() => {
    if (selectedSlot && selectedSlot.poolId === activePool && selectedSlot.day === selectedDay) {
      return selectedSlot;
    }
    const firstOpen = daySlots.find((s) => !s.isClosed);
    return firstOpen || daySlots[0] || null;
  }, [selectedSlot, activePool, selectedDay, daySlots]);

  // Filtered slots for timeline view
  const filteredTimelineSlots = useMemo(() => {
    if (activeCategory === 'all') return daySlots;
    if (activeCategory === 'lap') return daySlots.filter((s) => s.lapLanes >= 3);
    if (activeCategory === 'rec') return daySlots.filter((s) => s.recLanes > 0 || s.category === 'rec');
    if (activeCategory === 'fitness') return daySlots.filter((s) => s.category === 'fitness');
    if (activeCategory === 'lessons') return daySlots.filter((s) => s.category === 'lessons');
    if (activeCategory === 'team') return daySlots.filter((s) => s.category === 'team');
    if (activeCategory === 'waterpolo') return daySlots.filter((s) => s.category === 'waterpolo');
    return daySlots;
  }, [daySlots, activeCategory]);

  // Live status for hero banner
  const indoorNow = useMemo(() => getCurrentSlotForPool('indoor', selectedDay), [selectedDay]);
  const outdoorNow = useMemo(() => getCurrentSlotForPool('outdoor', selectedDay), [selectedDay]);

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Official Aquatics & Pool Schedule" />

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back Link & Actions */}
        <View style={styles.topNavRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to previous screen"
          >
            <Ionicons name="arrow-back" size={20} color={tc.primary} />
            <Text style={[styles.backText, { color: tc.primary }]}>Back</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/(member)/aquatics-guide')}
              style={[styles.finderButton, { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}
              accessibilityRole="button"
              accessibilityLabel="View Swim Lessons Guide"
            >
              <Ionicons name="school-outline" size={14} color={tc.primary} />
              <Text style={[styles.finderButtonText, { color: tc.primary }]}>Lessons Guide</Text>
            </Pressable>

            <Pressable
              onPress={() => setFinderModalVisible(true)}
              style={[styles.finderButton, { backgroundColor: tc.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Open Lap Swim Finder"
            >
              <Ionicons name="search" size={14} color="#FFFFFF" />
              <Text style={styles.finderButtonText}>Find Lap Lane</Text>
            </Pressable>
          </View>
        </View>

        {/* Live Pool Status Banner */}
        <View
          style={[
            styles.heroStatusCard,
            {
              backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
              borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
            },
          ]}
        >
          <View style={styles.heroStatusHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE POOL AVAILABILITY</Text>
            </View>
            <Text style={[styles.scheduleEffectiveText, { color: tc.textMuted }]}>
              Schedule Starting Oct 05, 2026
            </Text>
          </View>

          <View style={styles.statusColumnsRow}>
            {/* Indoor Summary */}
            <Pressable
              onPress={() => setActivePool('indoor')}
              style={[
                styles.poolStatusPill,
                activePool === 'indoor' && styles.poolStatusPillActive,
                {
                  backgroundColor: isDark ? '#1E3A5F' : '#FFFFFF',
                  borderColor: activePool === 'indoor' ? tc.primary : tc.border,
                },
              ]}
            >
              <View style={styles.poolStatusPillTop}>
                <Ionicons name="water" size={14} color={tc.primary} />
                <Text style={[styles.poolStatusTitle, { color: tc.text }]}>
                  Indoor 25m Pool
                </Text>
              </View>
              <Text style={[styles.poolStatusLanes, { color: tc.primary }]}>
                {indoorNow && !indoorNow.isClosed
                  ? `${indoorNow.lapLanes} Lap Lanes Open`
                  : 'Deck Closed'}
              </Text>
              <Text style={[styles.poolStatusSub, { color: tc.textMuted }]} numberOfLines={1}>
                {indoorNow ? indoorNow.title : '83°F · 6 Lanes'}
              </Text>
            </Pressable>

            {/* Outdoor Summary */}
            <Pressable
              onPress={() => setActivePool('outdoor')}
              style={[
                styles.poolStatusPill,
                activePool === 'outdoor' && styles.poolStatusPillActive,
                {
                  backgroundColor: isDark ? '#1E3A5F' : '#FFFFFF',
                  borderColor: activePool === 'outdoor' ? tc.primary : tc.border,
                },
              ]}
            >
              <View style={styles.poolStatusPillTop}>
                <Ionicons name="sunny" size={14} color="#D97706" />
                <Text style={[styles.poolStatusTitle, { color: tc.text }]}>
                  Outdoor Heated
                </Text>
              </View>
              <Text style={[styles.poolStatusLanes, { color: '#D97706' }]}>
                {outdoorNow && !outdoorNow.isClosed
                  ? `${outdoorNow.lapLanes} Lap Lanes Open`
                  : 'Deck Closed'}
              </Text>
              <Text style={[styles.poolStatusSub, { color: tc.textMuted }]} numberOfLines={1}>
                {outdoorNow ? outdoorNow.title : '82°F · Heated Year-Round'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Segmented Pool Selector (Indoor vs Outdoor) */}
        <View style={styles.poolSegmentContainer}>
          <Pressable
            onPress={() => {
              setActivePool('indoor');
              setSelectedSlot(null);
            }}
            style={[
              styles.poolSegmentButton,
              activePool === 'indoor' && {
                backgroundColor: tc.primary,
                borderColor: tc.primary,
              },
              { borderColor: tc.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activePool === 'indoor' }}
          >
            <Ionicons
              name="water"
              size={18}
              color={activePool === 'indoor' ? '#FFFFFF' : tc.primary}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.segmentTitle,
                  { color: activePool === 'indoor' ? '#FFFFFF' : tc.text },
                ]}
              >
                Indoor 25m Pool
              </Text>
              <Text
                style={[
                  styles.segmentSubtitle,
                  { color: activePool === 'indoor' ? '#E0F2FE' : tc.textMuted },
                ]}
              >
                6 Lanes · Heated 83°F
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setActivePool('outdoor');
              setSelectedSlot(null);
            }}
            style={[
              styles.poolSegmentButton,
              activePool === 'outdoor' && {
                backgroundColor: tc.primary,
                borderColor: tc.primary,
              },
              { borderColor: tc.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activePool === 'outdoor' }}
          >
            <Ionicons
              name="sunny-outline"
              size={18}
              color={activePool === 'outdoor' ? '#FFFFFF' : '#D97706'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.segmentTitle,
                  { color: activePool === 'outdoor' ? '#FFFFFF' : tc.text },
                ]}
              >
                Heated Outdoor Pool
              </Text>
              <Text
                style={[
                  styles.segmentSubtitle,
                  { color: activePool === 'outdoor' ? '#E0F2FE' : tc.textMuted },
                ]}
              >
                6 Lanes · Heated 82°F
              </Text>
            </View>
          </Pressable>
        </View>

        {/* View Mode Toggle: Timeline vs Weekly Matrix Flyer */}
        <View
          style={[
            styles.viewModeContainer,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: tc.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setViewMode('timeline')}
            style={[
              styles.viewModeTab,
              viewMode === 'timeline' && [
                styles.viewModeTabActive,
                { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
              ],
            ]}
          >
            <Ionicons
              name="list"
              size={15}
              color={viewMode === 'timeline' ? tc.primary : tc.textMuted}
            />
            <Text
              style={[
                styles.viewModeText,
                {
                  color: viewMode === 'timeline' ? tc.primary : tc.textMuted,
                  fontWeight: viewMode === 'timeline' ? '700' : '500',
                },
              ]}
            >
              Daily Timeline & Lane Map
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('matrix')}
            style={[
              styles.viewModeTab,
              viewMode === 'matrix' && [
                styles.viewModeTabActive,
                { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
              ],
            ]}
          >
            <Ionicons
              name="grid"
              size={15}
              color={viewMode === 'matrix' ? '#7B1FA2' : tc.textMuted}
            />
            <Text
              style={[
                styles.viewModeText,
                {
                  color: viewMode === 'matrix' ? '#7B1FA2' : tc.textMuted,
                  fontWeight: viewMode === 'matrix' ? '700' : '500',
                },
              ]}
            >
              Weekly Schedule Flyer
            </Text>
          </Pressable>
        </View>

        {/* If Matrix View Mode */}
        {viewMode === 'matrix' ? (
          <View style={{ marginTop: spacing.sm }}>
            <PoolMatrixGrid
              poolId={activePool}
              onSelectSlot={(slot) => {
                setDetailModalSlot(slot);
              }}
            />
          </View>
        ) : (
          /* Timeline View Mode */
          <View>
            {/* Day Selector Bar */}
            <View style={styles.daySelectorWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daySelectorScroll}
              >
                {DAYS_OF_WEEK.map((d) => {
                  const active = selectedDay === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => {
                        setSelectedDay(d.key);
                        setSelectedSlot(null);
                      }}
                      style={[
                        styles.dayButton,
                        {
                          backgroundColor: active
                            ? tc.primary
                            : isDark
                            ? '#1E293B'
                            : '#FFFFFF',
                          borderColor: active ? tc.primary : tc.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.dayButtonTitle,
                          { color: active ? '#FFFFFF' : tc.text },
                          active && { fontWeight: '800' },
                        ]}
                      >
                        {d.short}
                      </Text>
                      <Text
                        style={[
                          styles.dayButtonSub,
                          { color: active ? '#E0F2FE' : tc.textMuted },
                        ]}
                      >
                        {d.label.slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipScroll}
            >
              {[
                { key: 'all', label: 'All Sessions' },
                { key: 'lap', label: 'Lap Swim' },
                { key: 'rec', label: 'Rec & Family' },
                { key: 'fitness', label: 'Water Fitness' },
                { key: 'team', label: 'Swim Team & Masters' },
                { key: 'lessons', label: 'Swim Lessons' },
                { key: 'waterpolo', label: 'Water Polo' },
              ].map((chip) => {
                const active = activeCategory === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => setActiveCategory(chip.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active
                          ? tc.primary
                          : isDark
                          ? '#1E293B'
                          : '#FFFFFF',
                        borderColor: active ? tc.primary : tc.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Interactive 6-Lane Visual Pool Deck */}
            {activeDiagramSlot ? (
              <PoolLaneDiagram
                facility={facility}
                laneAllocations={activeDiagramSlot.laneAllocations}
                slotTitle={activeDiagramSlot.title}
                slotTime={`${activeDiagramSlot.startTime} – ${activeDiagramSlot.endTime}`}
                isClosed={activeDiagramSlot.isClosed}
              />
            ) : null}

            {/* Schedule Section Heading */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: tc.text }]}>
                {selectedDay.toUpperCase()} TIMELINE
              </Text>
              <Text style={[styles.sectionCount, { color: tc.textMuted }]}>
                {filteredTimelineSlots.length} Time Blocks
              </Text>
            </View>

            {/* Cards List */}
            {filteredTimelineSlots.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: tc.border,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={32} color={tc.textMuted} />
                <Text style={[styles.emptyTitle, { color: tc.text }]}>
                  No sessions match this category on {selectedDay}
                </Text>
                <Pressable
                  onPress={() => setActiveCategory('all')}
                  style={[styles.resetFilterBtn, { backgroundColor: tc.primary }]}
                >
                  <Text style={styles.resetFilterText}>Show All Sessions</Text>
                </Pressable>
              </View>
            ) : (
              filteredTimelineSlots.map((slot) => (
                <PoolScheduleCard
                  key={slot.id}
                  slot={slot}
                  isSelected={activeDiagramSlot?.id === slot.id}
                  onSelect={(s) => setSelectedSlot(s)}
                  onOpenDetails={(s) => setDetailModalSlot(s)}
                />
              ))
            )}
          </View>
        )}

        {/* YMCA Aquatics Guidelines & Pool Amenities Info */}
        <View
          style={[
            styles.guidelinesCard,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: tc.border,
            },
          ]}
        >
          <View style={styles.guidelineHeader}>
            <Ionicons name="information-circle" size={20} color={tc.primary} />
            <Text style={[styles.guidelineTitle, { color: tc.text }]}>
              YMCA Silver Spring Aquatics Information
            </Text>
          </View>

          <View style={styles.guidelinesGrid}>
            <View style={styles.guidelineItem}>
              <Text style={[styles.guidelineItemTitle, { color: tc.text }]}>
                Circle Swimming Rule
              </Text>
              <Text style={[styles.guidelineItemBody, { color: tc.textMuted }]}>
                When 3 or more swimmers share a lane, circle swimming in a counter-clockwise direction is strictly required. Yield to faster swimmers at the wall.
              </Text>
            </View>

            <View style={styles.guidelineItem}>
              <Text style={[styles.guidelineItemTitle, { color: tc.text }]}>
                Pool Temperatures
              </Text>
              <Text style={[styles.guidelineItemBody, { color: tc.textMuted }]}>
                Indoor 25m Pool is maintained at 83°F. The Heated Outdoor Pool is maintained at 82°F year-round with nightly thermal blankets.
              </Text>
            </View>

            <View style={styles.guidelineItem}>
              <Text style={[styles.guidelineItemTitle, { color: tc.text }]}>
                Swim Test and Wristbands
              </Text>
              <Text style={[styles.guidelineItemBody, { color: tc.textMuted }]}>
                Children under 14 must pass our green wristband swim test to enter water deeper than chest height or must wear a Coast Guard-approved PFD.
              </Text>
            </View>

            <View style={styles.guidelineItem}>
              <Text style={[styles.guidelineItemTitle, { color: tc.text }]}>
                Showers & Locker Rooms
              </Text>
              <Text style={[styles.guidelineItemBody, { color: tc.textMuted }]}>
                Maryland state health code requires all swimmers to rinse thoroughly before stepping onto the pool deck. Direct dry sauna access in both locker rooms.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <PoolSlotDetailModal
        visible={detailModalSlot !== null}
        slot={detailModalSlot}
        onClose={() => setDetailModalSlot(null)}
      />

      <FindLapLaneModal
        visible={finderModalVisible}
        onClose={() => setFinderModalVisible(false)}
        onSelectSlot={(slot, poolId, day) => {
          setActivePool(poolId);
          setSelectedDay(day);
          setSelectedSlot(slot);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: tapTarget - 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  finderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  finderButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroStatusCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  scheduleEffectiveText: {
    fontSize: 11,
  },
  statusColumnsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  poolStatusPill: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    gap: 2,
  },
  poolStatusPillActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  poolStatusPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  poolStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  poolStatusLanes: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  poolStatusSub: {
    fontSize: 11,
  },
  poolSegmentContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  poolSegmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1.5,
  },
  segmentTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  segmentSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  viewModeContainer: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.md - 2,
  },
  viewModeTabActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  viewModeText: {
    fontSize: 12,
  },
  daySelectorWrapper: {
    marginBottom: spacing.sm,
  },
  daySelectorScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 50,
  },
  dayButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayButtonSub: {
    fontSize: 10,
    marginTop: 1,
  },
  filterChipScroll: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radii.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  resetFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  resetFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guidelinesCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  guidelinesGrid: {
    gap: spacing.sm,
  },
  guidelineItem: {
    gap: 2,
  },
  guidelineItemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  guidelineItemBody: {
    fontSize: 12,
    lineHeight: 16,
  },
});
