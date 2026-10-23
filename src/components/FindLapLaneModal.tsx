import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
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
  applyPoolOverrides,
  INDOOR_POOL_SLOTS,
  OUTDOOR_POOL_SLOTS,
  type PoolDayKey,
  type PoolId,
  type PoolTimeSlot,
} from '@/domain/poolScheduleData';
import { radii, spacing } from '@/theme/typography';

interface FindLapLaneModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSlot: (slot: PoolTimeSlot, poolId: PoolId, day: PoolDayKey) => void;
}

type TimeOfDayFilter = 'all' | 'morning' | 'midday' | 'afternoon' | 'evening';

export function FindLapLaneModal({
  visible,
  onClose,
  onSelectSlot,
}: FindLapLaneModalProps) {
  const { poolSchedule } = useAppConfig().config;
  const { colors: tc, isDark } = useTheme();

  const [selectedDay, setSelectedDay] = useState<PoolDayKey>('monday');
  const [minLanes, setMinLanes] = useState<number>(4);
  const [timeFilter, setTimeFilter] = useState<TimeOfDayFilter>('all');

  const matchingSlots = useMemo(() => {
    const indoorDaySlots = applyPoolOverrides(INDOOR_POOL_SLOTS, poolSchedule).filter(
      (s) => s.day === selectedDay && !s.isClosed && s.lapLanes >= minLanes
    );
    const outdoorDaySlots = applyPoolOverrides(OUTDOOR_POOL_SLOTS, poolSchedule).filter(
      (s) => s.day === selectedDay && !s.isClosed && s.lapLanes >= minLanes
    );

    const filterByTimeOfDay = (slots: PoolTimeSlot[]) => {
      if (timeFilter === 'all') return slots;
      if (timeFilter === 'morning')
        return slots.filter((s) => s.startMinutes < 660); // before 11am
      if (timeFilter === 'midday')
        return slots.filter((s) => s.startMinutes >= 660 && s.startMinutes < 900); // 11am - 3pm
      if (timeFilter === 'afternoon')
        return slots.filter((s) => s.startMinutes >= 900 && s.startMinutes < 1080); // 3pm - 6pm
      if (timeFilter === 'evening')
        return slots.filter((s) => s.startMinutes >= 1080); // after 6pm
      return slots;
    };

    return {
      indoor: filterByTimeOfDay(indoorDaySlots),
      outdoor: filterByTimeOfDay(outdoorDaySlots),
    };
  }, [selectedDay, minLanes, timeFilter, poolSchedule]);

  const totalFound = matchingSlots.indoor.length + matchingSlots.outdoor.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <View style={styles.iconRow}>
                <Ionicons name="search" size={16} color={tc.primary} />
                <Text style={[styles.headingTag, { color: tc.primary }]}>
                  LAP SWIM FINDER
                </Text>
              </View>
              <Text style={[styles.mainTitle, { color: tc.text }]}>
                Find Available Lap Lanes
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={tc.text} />
            </Pressable>
          </View>

          {/* Day Selector Pills */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: tc.textMuted }]}>
              SELECT DAY:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
              {DAYS_OF_WEEK.map((d) => {
                const active = selectedDay === d.key;
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => setSelectedDay(d.key)}
                    style={[
                      styles.dayPill,
                      {
                        backgroundColor: active
                          ? tc.primary
                          : isDark
                          ? '#1E293B'
                          : '#F1F5F9',
                        borderColor: active ? tc.primary : tc.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayPillText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {d.short}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Minimum Lap Lanes Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: tc.textMuted }]}>
              MINIMUM LAP LANES:
            </Text>
            <View style={styles.laneRow}>
              {[
                { count: 3, label: '3+ Lanes' },
                { count: 4, label: '4+ Lanes' },
                { count: 5, label: '5 Lanes (Max)' },
              ].map((opt) => {
                const active = minLanes === opt.count;
                return (
                  <Pressable
                    key={opt.count}
                    onPress={() => setMinLanes(opt.count)}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: active
                          ? tc.primary
                          : isDark
                          ? '#1E293B'
                          : '#F8FAFC',
                        borderColor: active ? tc.primary : tc.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="water"
                      size={13}
                      color={active ? '#FFFFFF' : tc.primary}
                    />
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Time of Day Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: tc.textMuted }]}>
              TIME OF DAY:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
              {[
                { key: 'all' as const, label: 'All Hours' },
                { key: 'morning' as const, label: 'Morning (6–11 AM)' },
                { key: 'midday' as const, label: 'Midday (11 AM–3 PM)' },
                { key: 'afternoon' as const, label: 'Afternoon (3–6 PM)' },
                { key: 'evening' as const, label: 'Evening (6–10 PM)' },
              ].map((t) => {
                const active = timeFilter === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTimeFilter(t.key)}
                    style={[
                      styles.timePill,
                      {
                        backgroundColor: active
                          ? tc.primary
                          : isDark
                          ? '#1E293B'
                          : '#F1F5F9',
                        borderColor: active ? tc.primary : tc.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Result Count Banner */}
          <View style={styles.resultBanner}>
            <Text style={[styles.resultBannerText, { color: tc.textMuted }]}>
              Found <Text style={{ color: tc.primary, fontWeight: '700' }}>{totalFound}</Text> matching lap swimming times
            </Text>
          </View>

          {/* Matches List */}
          <ScrollView contentContainerStyle={styles.resultsScroll}>
            {/* Indoor Pool Matches */}
            <View style={styles.poolSectionBlock}>
              <View style={styles.poolSectionHeader}>
                <Ionicons name="water" size={15} color={tc.primary} />
                <Text style={[styles.poolSectionTitle, { color: tc.text }]}>
                  Indoor 25m Pool (83°F) · {matchingSlots.indoor.length} Times
                </Text>
              </View>

              {matchingSlots.indoor.length === 0 ? (
                <Text style={[styles.noMatchText, { color: tc.textMuted }]}>
                  No slots with {minLanes}+ lap lanes at this time.
                </Text>
              ) : (
                matchingSlots.indoor.map((slot) => (
                  <Pressable
                    key={slot.id}
                    onPress={() => {
                      onSelectSlot(slot, 'indoor', selectedDay);
                      onClose();
                    }}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.resultTimeBox}>
                      <Text style={[styles.resultTimeText, { color: tc.text }]}>
                        {slot.startTime} – {slot.endTime}
                      </Text>
                      <Text style={[styles.resultTitleText, { color: tc.textMuted }]}>
                        {slot.title}
                      </Text>
                    </View>
                    <View style={[styles.lanePill, { backgroundColor: '#BAE6FD' }]}>
                      <Text style={styles.lanePillText}>
                        {slot.lapLanes} Lap Lanes
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            {/* Outdoor Pool Matches */}
            <View style={styles.poolSectionBlock}>
              <View style={styles.poolSectionHeader}>
                <Ionicons name="sunny" size={15} color="#D97706" />
                <Text style={[styles.poolSectionTitle, { color: tc.text }]}>
                  Heated Outdoor Pool (82°F) · {matchingSlots.outdoor.length} Times
                </Text>
              </View>

              {matchingSlots.outdoor.length === 0 ? (
                <Text style={[styles.noMatchText, { color: tc.textMuted }]}>
                  No slots with {minLanes}+ lap lanes at this time.
                </Text>
              ) : (
                matchingSlots.outdoor.map((slot) => (
                  <Pressable
                    key={slot.id}
                    onPress={() => {
                      onSelectSlot(slot, 'outdoor', selectedDay);
                      onClose();
                    }}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.resultTimeBox}>
                      <Text style={[styles.resultTimeText, { color: tc.text }]}>
                        {slot.startTime} – {slot.endTime}
                      </Text>
                      <Text style={[styles.resultTitleText, { color: tc.textMuted }]}>
                        {slot.title}
                      </Text>
                    </View>
                    <View style={[styles.lanePill, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.lanePillText, { color: '#78350F' }]}>
                        {slot.lapLanes} Lap Lanes
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii.card + 4,
    borderTopRightRadius: radii.card + 4,
    borderWidth: 1,
    maxHeight: '90%',
    paddingTop: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  headingTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 6,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dayScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  laneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultBanner: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  resultBannerText: {
    fontSize: 12,
  },
  resultsScroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  poolSectionBlock: {
    gap: 8,
  },
  poolSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  noMatchText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  resultTimeBox: {
    flex: 1,
    gap: 2,
  },
  resultTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultTitleText: {
    fontSize: 11,
  },
  lanePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  lanePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
});
