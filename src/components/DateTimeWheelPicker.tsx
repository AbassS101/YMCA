import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

type DateTimeWheelPickerProps = {
  selectedDate: string; // 'YYYY-MM-DD'
  onDateChange: (date: string) => void;
  selectedTime: string; // 'HH:MM' (24-hour format)
  onTimeChange: (time: string) => void;
  label?: string;
  daysCount?: number;
};

const HOURS = ['06', '07', '08', '09', '10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08', '09'];
const MINUTES = ['00', '15', '30', '45'];

export function DateTimeWheelPicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  label,
  daysCount = 10,
}: DateTimeWheelPickerProps) {
  // Generate dates starting from reference demo week anchored around 2026-09-14
  const dates = React.useMemo(() => {
    const list: { iso: string; dayName: string; monthDay: string; isToday: boolean }[] = [];
    const base = new Date('2026-09-14T00:00:00-04:00');
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      list.push({ iso, dayName, monthDay, isToday: i === 0 });
    }
    return list;
  }, [daysCount]);

  // Parse time into 12-hour format + AM/PM
  const { hour12, minute, period } = React.useMemo(() => {
    const parts = (selectedTime || '09:00').split(':');
    let h = parseInt(parts[0] || '9', 10);
    const m = parts[1] || '00';
    const isPm = h >= 12;
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    return { hour12: hStr, minute: m, period: isPm ? 'PM' : 'AM' };
  }, [selectedTime]);

  function updateTime(newHour12: string, newMinute: string, newPeriod: string) {
    let h = parseInt(newHour12, 10);
    if (newPeriod === 'PM' && h < 12) h += 12;
    if (newPeriod === 'AM' && h === 12) h = 0;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    onTimeChange(`${hStr}:${newMinute}`);
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.headerLabel}>{label}</Text> : null}

      {/* Date Scroll Wheel */}
      <Text style={styles.subLabel}>Select Date</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateWheelContent}
      >
        {dates.map((d) => {
          const isSelected = selectedDate === d.iso;
          return (
            <Pressable
              key={d.iso}
              onPress={() => onDateChange(d.iso)}
              style={[styles.dateCard, isSelected && styles.dateCardActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.dateDayName, isSelected && styles.textActive]}>
                {d.dayName}
              </Text>
              <Text style={[styles.dateMonthDay, isSelected && styles.textActive]}>
                {d.monthDay}
              </Text>
              {d.isToday ? (
                <View style={[styles.todayBadge, isSelected && styles.todayBadgeActive]}>
                  <Text style={[styles.todayText, isSelected && { color: colors.primary }]}>
                    TODAY
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Time Wheel / Pill Selector */}
      <Text style={[styles.subLabel, { marginTop: 12 }]}>Select Start Time</Text>
      <View style={styles.timeSelectorRow}>
        {/* Hours Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeScroll}
        >
          {['06', '07', '08', '09', '10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08'].map(
            (hr, idx) => {
              const isSelected = hour12 === hr;
              return (
                <Pressable
                  key={`${hr}-${idx}`}
                  onPress={() => updateTime(hr, minute, period)}
                  style={[styles.timeChip, isSelected && styles.timeChipActive]}
                >
                  <Text style={[styles.timeChipText, isSelected && styles.textActive]}>
                    {hr}
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>

        {/* Minutes Picker */}
        <View style={styles.minuteCol}>
          {MINUTES.map((min) => {
            const isSelected = minute === min;
            return (
              <Pressable
                key={min}
                onPress={() => updateTime(hour12, min, period)}
                style={[styles.minuteChip, isSelected && styles.minuteChipActive]}
              >
                <Text style={[styles.minuteChipText, isSelected && styles.textActive]}>
                  :{min}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* AM / PM Switch */}
        <View style={styles.periodCol}>
          {['AM', 'PM'].map((p) => {
            const isSelected = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => updateTime(hour12, minute, p)}
                style={[styles.periodChip, isSelected && styles.periodChipActive]}
              >
                <Text style={[styles.periodChipText, isSelected && styles.textActive]}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.nearBlack,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateWheelContent: {
    gap: 8,
    paddingVertical: 4,
  },
  dateCard: {
    width: 72,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  dateMonthDay: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.nearBlack,
    marginTop: 2,
  },
  todayBadge: {
    marginTop: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#E0E7FF',
  },
  todayBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  todayText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeScroll: {
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  minuteCol: {
    flexDirection: 'row',
    gap: 4,
  },
  minuteChip: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  minuteChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  minuteChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  periodCol: {
    flexDirection: 'column',
    gap: 4,
  },
  periodChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
