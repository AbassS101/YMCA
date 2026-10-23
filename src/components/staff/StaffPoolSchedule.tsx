import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PoolLaneDiagram } from '@/components/PoolLaneDiagram';
import { PoolMatrixGrid } from '@/components/PoolMatrixGrid';
import { PoolSlotDetailModal } from '@/components/PoolSlotDetailModal';
import { ChipRow } from '@/components/desk/Sheet';
import { EmptyState, ListRow, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { getPoolSlots, POOL_FACILITIES, type PoolId, type PoolTimeSlot } from '@/domain/poolScheduleData';
import { poolDayForDate } from '@/domain/poolScheduleDates';

const FILTERS = [
  { key: 'all', label: 'All activity' }, { key: 'lap', label: 'Lap swim' },
  { key: 'rec', label: 'Recreation' }, { key: 'program', label: 'Programs' }, { key: 'closed', label: 'Closures' },
];

/** Uses the same published lane allocations that members see. */
export function StaffPoolSchedule({ date }: { date: string }) {
  const { colors: tc } = useTheme();
  const [pool, setPool] = useState<PoolId>('indoor');
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [selection, setSelection] = useState<PoolTimeSlot | null>(null);
  const [details, setDetails] = useState<PoolTimeSlot | null>(null);
  const day = poolDayForDate(date);
  const facility = POOL_FACILITIES[pool];
  const slots = useMemo(() => getPoolSlots(pool, day).sort((a, b) => a.startMinutes - b.startMinutes), [pool, day]);
  const visible = slots.filter((slot) => {
    if (filter === 'lap') return !slot.isClosed && slot.lapLanes > 0;
    if (filter === 'rec') return !slot.isClosed && slot.recLanes > 0;
    if (filter === 'program') return !slot.isClosed && slot.programLanes > 0;
    if (filter === 'closed') return slot.isClosed;
    return true;
  });
  const selected = visible.find((slot) => slot.id === selection?.id) ?? visible.find((slot) => !slot.isClosed) ?? visible[0];
  const openSlots = slots.filter((slot) => !slot.isClosed);
  const hours = openSlots.length ? `${openSlots[0].startTime} – ${openSlots[openSlots.length - 1].endTime}` : 'Closed';

  return <View style={styles.body}>
    <ChipRow options={[{ key: 'indoor', label: 'Indoor pool' }, { key: 'outdoor', label: 'Outdoor pool' }]} value={pool} onChange={setPool} />
    <SectionCard title={facility.shortName} icon="water-outline" subtitle="Published weekly pool schedule · Same lane allocations shown to members">
      <ListRow title={hours} subtitle={`${facility.totalLanes} lanes · ${facility.length}`} />
      <Text style={{ color: tc.textMuted, fontSize: 13, lineHeight: 19 }}>Select a time block to inspect the lanes. Pool programs and closures are included below.</Text>
    </SectionCard>
    <ChipRow options={[{ key: 'day', label: 'Day schedule' }, { key: 'week', label: 'Weekly overview' }]} value={mode} onChange={setMode} />
    {mode === 'week' ? <PoolMatrixGrid poolId={pool} onSelectSlot={setDetails} /> : <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><ChipRow options={FILTERS} value={filter} onChange={setFilter} /></ScrollView>
      {selected ? <PoolLaneDiagram facility={facility} laneAllocations={selected.laneAllocations} slotTitle={selected.title} slotTime={`${selected.startTime} – ${selected.endTime}`} isClosed={selected.isClosed} /> : null}
      <View style={[styles.list, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
        {visible.map((slot) => <View key={slot.id} style={[styles.slot, { borderColor: tc.cardBorder, backgroundColor: selected?.id === slot.id ? tc.primaryLight : tc.cardBg }]}>
          <Pressable onPress={() => setSelection(slot)} style={styles.slotSelect} accessibilityRole="button" accessibilityState={{ selected: selected?.id === slot.id }} accessibilityLabel={`${slot.title}, ${slot.startTime} to ${slot.endTime}, ${slot.laneBreakdownLabel}`}>
            <Text style={{ color: tc.textMuted, fontSize: 12, fontWeight: '600' }}>{slot.startTime} – {slot.endTime}</Text>
            <Text style={{ color: tc.text, fontSize: 16, fontWeight: '600', lineHeight: 22 }}>{slot.title}</Text>
            <Text style={{ color: tc.textMuted, fontSize: 13 }}>{slot.isClosed ? 'Pool closed' : slot.laneBreakdownLabel}</Text>
            {slot.notes ? <Text style={{ color: tc.textMuted, fontSize: 12, lineHeight: 18 }}>{slot.notes}</Text> : null}
          </Pressable>
          <Pressable onPress={() => setDetails(slot)} style={styles.details} accessibilityRole="button" accessibilityLabel={`View details for ${slot.title}`}><Text style={{ color: tc.primary, fontSize: 13, fontWeight: '600' }}>Details</Text></Pressable>
        </View>)}
        {!visible.length ? <EmptyState icon="water-outline" text="No pool activities match this filter." actionLabel="Show all activities" onAction={() => setFilter('all')} /> : null}
      </View>
    </>}
    <PoolSlotDetailModal visible={details !== null} slot={details} date={mode === 'day' ? date : undefined} onClose={() => setDetails(null)} />
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  slot: { borderBottomWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  slotSelect: { gap: 6 },
  details: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, marginLeft: -8 },
});
