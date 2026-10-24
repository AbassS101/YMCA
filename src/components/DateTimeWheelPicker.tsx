import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { getDemoToday } from '@/domain/demoClock';
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

const HOUR_ITEMS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTE_ITEMS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const PERIOD_ITEMS = ['AM', 'PM'];
const ITEM_H = 40;
const DATE_STEP = 80; // card width 72 + gap 8

function WheelColumn({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = React.useRef<import('react').ComponentRef<typeof ScrollView>>(null);

  // Snap values not in the list (e.g. :20) to the nearest item.
  const idx = React.useMemo(() => {
    const exact = items.indexOf(value);
    if (exact >= 0) return exact;
    const n = parseInt(value, 10);
    let best = 0;
    items.forEach((it, i) => {
      if (Math.abs(parseInt(it, 10) - n) < Math.abs(parseInt(items[best], 10) - n)) best = i;
    });
    return best;
  }, [items, value]);

  React.useEffect(() => {
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
  }, [idx]);

  function settle(y: number) {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== idx) onChange(items[i]);
  }

  return (
    <ScrollView
      ref={ref}
      style={styles.wheelCol}
      contentContainerStyle={{ paddingVertical: ITEM_H }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      contentOffset={{ x: 0, y: idx * ITEM_H }}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
    >
      {items.map((it, i) => (
        <Pressable
          key={it}
          style={styles.wheelItem}
          onPress={() => {
            ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
            onChange(it);
          }}
        >
          <Text style={[styles.wheelText, i === idx && styles.wheelTextActive]}>{it}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function DateTimeWheelPicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  label,
  daysCount = 90,
}: DateTimeWheelPickerProps) {
  const today = getDemoToday();
  const dateScrollRef = React.useRef<import('react').ComponentRef<typeof ScrollView>>(null);

  const dates = React.useMemo(() => {
    const list: { iso: string; dayName: string; monthDay: string; monthLabel: string; isToday: boolean }[] = [];
    // Start at today, or at the selected date if it is earlier (e.g. editing a past class).
    const first = selectedDate && selectedDate < today ? selectedDate : today;
    const [y, m, d0] = first.split('-').map(Number);
    const span = Math.max(daysCount, 14);
    for (let i = 0; i < span; i++) {
      const d = new Date(Date.UTC(y, m - 1, d0 + i, 12));
      const opts = { timeZone: 'UTC' } as const;
      list.push({
        iso: d.toISOString().slice(0, 10),
        dayName: d.toLocaleDateString(undefined, { ...opts, weekday: 'short' }),
        monthDay: d.toLocaleDateString(undefined, { ...opts, month: 'short', day: 'numeric' }),
        monthLabel: d.toLocaleDateString(undefined, { ...opts, month: 'long', year: 'numeric' }),
        isToday: d.toISOString().slice(0, 10) === today,
      });
    }
    // Make sure a far-future selected date is still reachable.
    if (selectedDate && !list.some((x) => x.iso === selectedDate) && selectedDate > list[list.length - 1].iso) {
      const [sy, sm, sd] = selectedDate.split('-').map(Number);
      const d = new Date(Date.UTC(sy, sm - 1, sd, 12));
      const opts = { timeZone: 'UTC' } as const;
      list.push({
        iso: selectedDate,
        dayName: d.toLocaleDateString(undefined, { ...opts, weekday: 'short' }),
        monthDay: d.toLocaleDateString(undefined, { ...opts, month: 'short', day: 'numeric' }),
        monthLabel: d.toLocaleDateString(undefined, { ...opts, month: 'long', year: 'numeric' }),
        isToday: false,
      });
    }
    return list;
  }, [daysCount, selectedDate, today]);

  const selectedIndex = Math.max(0, dates.findIndex((x) => x.iso === selectedDate));
  const selectedLabel = dates[selectedIndex]?.monthLabel ?? '';

  // Keep the selected date in view (initial render and after arrow jumps).
  React.useEffect(() => {
    dateScrollRef.current?.scrollTo({
      x: Math.max(0, selectedIndex * DATE_STEP - DATE_STEP),
      animated: true,
    });
  }, [selectedIndex]);

  function jumpDays(delta: number) {
    const next = dates[Math.min(dates.length - 1, Math.max(0, selectedIndex + delta))];
    if (next) onDateChange(next.iso);
  }

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

      <View style={styles.monthRow}>
        <Pressable onPress={() => jumpDays(-7)} hitSlop={10} style={styles.arrowBtn} accessibilityLabel="Back one week">
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthText}>{selectedLabel}</Text>
        <Pressable onPress={() => jumpDays(7)} hitSlop={10} style={styles.arrowBtn} accessibilityLabel="Forward one week">
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        ref={dateScrollRef}
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
              <Text style={[styles.dateDayName, isSelected && styles.textActive]}>{d.dayName}</Text>
              <Text style={[styles.dateMonthDay, isSelected && styles.textActive]}>{d.monthDay}</Text>
              {d.isToday ? (
                <View style={[styles.todayBadge, isSelected && styles.todayBadgeActive]}>
                  <Text style={[styles.todayText, isSelected && { color: colors.primary }]}>TODAY</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.subLabel, { marginTop: 12 }]}>Select Start Time</Text>
      <View style={styles.wheelRow}>
        <View pointerEvents="none" style={styles.wheelHighlight} />
        <WheelColumn items={HOUR_ITEMS} value={hour12} onChange={(v) => updateTime(v, minute, period)} />
        <Text style={styles.wheelColon}>:</Text>
        <WheelColumn items={MINUTE_ITEMS} value={minute} onChange={(v) => updateTime(hour12, v, period)} />
        <WheelColumn items={PERIOD_ITEMS} value={period} onChange={(v) => updateTime(hour12, minute, v)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
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
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  wheelHighlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: ITEM_H,
    height: ITEM_H,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  wheelCol: {
    flex: 1,
    height: ITEM_H * 3,
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.muted,
  },
  wheelTextActive: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  wheelColon: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
