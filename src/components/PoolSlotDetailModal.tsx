import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { poolSlotTimes } from '@/domain/poolScheduleDates';
import {
  POOL_FACILITIES,
  type PoolTimeSlot,
} from '@/domain/poolScheduleData';
import { radii, spacing } from '@/theme/typography';
import { downloadOrOpenIcs } from '@/utils/calendarExport';
import { PoolLaneDiagram } from './PoolLaneDiagram';

interface PoolSlotDetailModalProps {
  visible: boolean;
  slot: PoolTimeSlot | null;
  onClose: () => void;
  date?: string;
}

export function PoolSlotDetailModal({
  visible,
  slot,
  onClose,
  date,
}: PoolSlotDetailModalProps) {
  const { colors: tc, isDark } = useTheme();
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    setCalendarAdded(false);
  }, [slot?.id, visible]);

  if (!slot) return null;

  const facility = POOL_FACILITIES[slot.poolId];

  const handleAddPoolToCalendar = () => {
    setCalendarAdded(true);
    void downloadOrOpenIcs({
      title: `${facility.shortName}: ${slot.title} (${slot.laneBreakdownLabel})`,
      ...poolSlotTimes(slot, date),
      location: facility.name,
      description: slot.notes || `${slot.title} (${slot.laneBreakdownLabel}) at YMCA Silver Spring.`,
    });
  };

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
          {/* Top Bar with Title and Close */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <View style={styles.poolTagRow}>
                <Ionicons name="water" size={14} color={tc.primary} />
                <Text style={[styles.poolTagText, { color: tc.primary }]}>
                  {facility.name}
                </Text>
              </View>
              <Text style={[styles.titleText, { color: tc.text }]} numberOfLines={2}>
                {slot.title}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={tc.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.scrollBody}>
            {/* Time & Duration Pill Row */}
            <View
              style={[
                styles.timePillCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.timeInfoLeft}>
                <Ionicons name="time-outline" size={18} color={tc.primary} />
                <View>
                  <Text style={[styles.timeRangeLabel, { color: tc.text }]}>
                    {slot.startTime} – {slot.endTime}
                  </Text>
                  <Text style={[styles.dayLabel, { color: tc.textMuted }]}>
                    {slot.day.toUpperCase()} SCHEDULE
                  </Text>
                </View>
              </View>

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
            </View>

            {/* Visual 6-Lane Pool Diagram */}
            <PoolLaneDiagram
              facility={facility}
              laneAllocations={slot.laneAllocations}
              slotTitle={slot.title}
              slotTime={`${slot.startTime} – ${slot.endTime}`}
              isClosed={slot.isClosed}
            />

            {/* Overview & Member Guidance */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: tc.text }]}>
                Member Guidelines for this Session
              </Text>
              <Text style={[styles.bodyText, { color: tc.textMuted }]}>
                {slot.notes ||
                  'Please select a lane aligned with your target pace. Continuous circle swimming (counter-clockwise) is enforced whenever 3 or more swimmers share a lane.'}
              </Text>
            </View>

            {/* Equipment Available */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: tc.text }]}>
                Complimentary Aquatics Equipment
              </Text>
              <View style={styles.equipmentRow}>
                <View style={[styles.eqPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="barbell-outline" size={12} color={tc.primary} />
                  <Text style={[styles.eqText, { color: tc.text }]}>Aqua Dumbbells</Text>
                </View>
                <View style={[styles.eqPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="shield-outline" size={12} color={tc.primary} />
                  <Text style={[styles.eqText, { color: tc.text }]}>Kickboards</Text>
                </View>
                <View style={[styles.eqPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="fitness-outline" size={12} color={tc.primary} />
                  <Text style={[styles.eqText, { color: tc.text }]}>Pull Buoys</Text>
                </View>
                <View style={[styles.eqPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="ribbon-outline" size={12} color={tc.primary} />
                  <Text style={[styles.eqText, { color: tc.text }]}>USCG Lifejackets</Text>
                </View>
              </View>
            </View>

            {/* Safety & Lifeguards */}
            <View
              style={[
                styles.safetyCallout,
                {
                  backgroundColor: isDark ? '#143325' : '#F0FDF4',
                  borderColor: isDark ? '#166534' : '#BBF7D0',
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.safetyTitle, { color: '#16A34A' }]}>
                  Certified Lifeguards on Active Deck
                </Text>
                <Text style={[styles.safetyDesc, { color: tc.textMuted }]}>
                  All YMCA pools have Red Cross / YMCA certified lifeguards on duty. Deep-end swimming requires passing the swim test.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          <View style={styles.bottomBar}>
            {!slot.isClosed ? (
              <Pressable
                onPress={handleAddPoolToCalendar}
                style={[
                  styles.calBtn,
                  calendarAdded
                    ? { backgroundColor: '#ECFDF5', borderColor: '#10B981' }
                    : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add pool session to calendar"
              >
                <Ionicons
                  name={calendarAdded ? 'checkmark-circle' : 'calendar'}
                  size={16}
                  color={calendarAdded ? '#059669' : tc.primary}
                />
                <Text
                  style={[
                    styles.calBtnText,
                    { color: calendarAdded ? '#059669' : tc.text },
                  ]}
                >
                  {calendarAdded ? 'In Calendar' : 'Add Calendar'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: tc.primary, flex: 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.doneBtnText}>Close Details</Text>
            </Pressable>
          </View>
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
    maxHeight: '88%',
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
  poolTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  poolTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  titleText: {
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
  scrollBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  timePillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  timeInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeRangeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  flyerBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs + 2,
  },
  flyerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionWrap: {
    gap: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  eqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  eqText: {
    fontSize: 11,
    fontWeight: '600',
  },
  safetyCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  safetyDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  calBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  calBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

