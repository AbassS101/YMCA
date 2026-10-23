import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import type { PoolScheduleConfig, PoolSlotOverride } from '@/domain/branchContent';
import { DAYS_OF_WEEK, getPoolSlots, POOL_FACILITIES, type PoolDayKey, type PoolId } from '@/domain/poolScheduleData';

const POOL_OPTIONS = (Object.keys(POOL_FACILITIES) as PoolId[]).map((id) => ({ key: id, label: POOL_FACILITIES[id].shortName }));
const DAY_OPTIONS = DAYS_OF_WEEK.map((d) => ({ key: d.key, label: d.short }));

/** Drops blank fields and overrides that change nothing, so the saved settings only hold real changes. */
function cleanOverrides(overrides: Record<string, PoolSlotOverride>): Record<string, PoolSlotOverride> {
  const out: Record<string, PoolSlotOverride> = {};
  for (const [id, o] of Object.entries(overrides)) {
    const next: PoolSlotOverride = {};
    if (o.title?.trim()) next.title = o.title.trim();
    if (o.note?.trim()) next.note = o.note.trim();
    if (o.isClosed) next.isClosed = true;
    if (Object.keys(next).length > 0) out[id] = next;
  }
  return out;
}

export default function AdminPoolScheduleScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, save, resetToDefaults } = useConfigEditor('poolSchedule');
  const [draft, setDraft] = useDraftFrom(value, (v): PoolScheduleConfig => JSON.parse(JSON.stringify(v)));
  const [pool, setPool] = useState<PoolId>('indoor');
  const [day, setDay] = useState<PoolDayKey>(DAYS_OF_WEEK[0].key);

  // Raw slots (before overrides) so staff always see the standard name next to their change.
  const slots = getPoolSlots(pool, day);

  const setOverride = (slotId: string, patch: PoolSlotOverride) =>
    setDraft({ ...draft, slotOverrides: { ...draft.slotOverrides, [slotId]: { ...draft.slotOverrides[slotId], ...patch } } });

  const submit = () => {
    const facilityNotices = Object.fromEntries(
      Object.entries(draft.facilityNotices).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)
    );
    void save({ facilityNotices, slotOverrides: cleanOverrides(draft.slotOverrides) }, 'The pool schedule was updated.');
  };

  return (
    <StaffScreen subtitle="Pool Schedule" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Rename or close a pool time, add a note members see when they open it, or post a notice at the top of a pool&apos;s schedule.
        Closed times are left out of the lap lane finder.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <ChipRow options={POOL_OPTIONS} value={pool} onChange={setPool} />
      <SectionCard title={`${POOL_FACILITIES[pool].shortName} Notice`} icon="megaphone" accent={accent}>
        <TextField
          label="Notice shown at the top of this pool's schedule (optional)"
          value={draft.facilityNotices[pool] ?? ''}
          onChangeText={(text) => setDraft({ ...draft, facilityNotices: { ...draft.facilityNotices, [pool]: text } })}
          placeholder="e.g. Lanes 5-6 closed for repairs this week"
          multiline
        />
      </SectionCard>
      <SectionCard title="Pool Times" icon="water" accent={accent} count={slots.length}>
        <ChipRow options={DAY_OPTIONS} value={day} onChange={setDay} />
        {slots.map((slot) => {
          const o = draft.slotOverrides[slot.id] ?? {};
          return (
            <View key={slot.id} style={[styles.card, { borderColor: o.isClosed ? '#B42318' : tc.cardBorder }]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: tc.text }]}>
                    {slot.startTime} – {slot.endTime}
                  </Text>
                  <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                    {slot.title} · {slot.laneBreakdownLabel}
                  </Text>
                </View>
                <Text style={{ color: o.isClosed ? '#B42318' : tc.textMuted, fontSize: 12, fontWeight: '700' }}>Closed</Text>
                <Switch
                  value={!!o.isClosed}
                  onValueChange={(isClosed) => setOverride(slot.id, { isClosed })}
                  trackColor={{ false: '#CBD5E1', true: '#B42318' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={`Close ${slot.title} ${slot.startTime}`}
                />
              </View>
              <TextField
                label="New name (optional)"
                value={o.title ?? ''}
                placeholder={slot.title}
                onChangeText={(title) => setOverride(slot.id, { title })}
              />
              <TextField
                label="Note for members (optional)"
                value={o.note ?? ''}
                placeholder={slot.notes ?? ''}
                onChangeText={(note) => setOverride(slot.id, { note })}
              />
            </View>
          );
        })}
      </SectionCard>
      <PrimaryButton title="Save Pool Schedule" onPress={submit} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '800' },
});
