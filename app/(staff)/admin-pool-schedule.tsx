import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PoolMatrixGrid } from '@/components/PoolMatrixGrid';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow, Sheet } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import type { PoolScheduleConfig, PoolWeeklyBlock } from '@/domain/branchContent';
import { allPoolSlots, DAYS_OF_WEEK, POOL_FACILITIES, type PoolDayKey, type PoolId } from '@/domain/poolScheduleData';
import { copyPoolDay, editablePoolDay, validateWeeklyPoolDays } from '@/domain/poolScheduleEditor';

const POOLS = (Object.keys(POOL_FACILITIES) as PoolId[]).map((id) => ({ key: id, label: POOL_FACILITIES[id].shortName }));
const DAYS = DAYS_OF_WEEK.map((d) => ({ key: d.key, label: d.short }));

export default function AdminPoolScheduleScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, save, resetToDefaults } = useConfigEditor('poolSchedule');
  const [draft, setDraft] = useDraftFrom(value, (v): PoolScheduleConfig => JSON.parse(JSON.stringify(v)));
  const [pool, setPool] = useState<PoolId>('indoor');
  const [day, setDay] = useState<PoolDayKey>('monday');
  const [editing, setEditing] = useState<string | null>(null);
  const [targets, setTargets] = useState<PoolDayKey[]>([]);
  const [message, setMessage] = useState('');
  const blocks = editablePoolDay(pool, day, draft);
  const block = blocks.find((b) => b.id === editing);
  const problem = validateWeeklyPoolDays(draft);
  const templates = allPoolSlots(pool).filter((slot, index, all) => !slot.isClosed && all.findIndex((s) => s.category === slot.category) === index);
  const setBlocks = (next: PoolWeeklyBlock[]) => setDraft((current) => ({ ...current, weeklyDays: { ...current.weeklyDays, [`${pool}:${day}`]: next } }));
  const patch = (change: Partial<PoolWeeklyBlock>) => setBlocks(blocks.map((b) => b.id === editing ? { ...b, ...change } : b));
  const changeDay = (next: PoolDayKey) => { setDay(next); setEditing(null); setTargets([]); setMessage(''); };
  const add = () => {
    const template = templates[0];
    let index = blocks.length;
    while (blocks.some((b) => b.id === `${pool}:${day}:new:${index}`)) index++;
    const id = `${pool}:${day}:new:${index}`;
    setBlocks([...blocks, { id, templateId: template.id, title: 'Lap Swim', startTime: '6:00 AM', endTime: '7:00 AM', lapLanes: 6, recLanes: 0, programLanes: 0, isClosed: false, note: '' }]);
    setEditing(id);
  };

  return <StaffScreen subtitle="Pool Schedule" allowed={allowed}>
    <Text style={{ color: tc.textMuted, lineHeight: 20 }}>Managed by the Aquatics Director. Set up the week once: it repeats automatically. Tap a time to edit it, copy a day to reuse it, then save to publish to members.</Text>
    {error ? <ErrorBanner message={error} /> : null}
    <ChipRow options={POOLS} value={pool} onChange={(next) => { setPool(next); setEditing(null); setTargets([]); setMessage(''); }} />
    <SectionCard title={`${POOL_FACILITIES[pool].shortName} Notice`} icon="megaphone" accent={accent}>
      <TextField label="Notice for members (optional)" value={draft.facilityNotices[pool] ?? ''} onChangeText={(text) => setDraft({ ...draft, facilityNotices: { ...draft.facilityNotices, [pool]: text } })} placeholder="e.g. Lanes 5–6 closed for repairs" multiline />
    </SectionCard>
    <SectionCard title="Weekly Pool Times" icon="water" accent={accent} subtitle="Repeats every week until you change it" count={blocks.length}>
      <ChipRow options={DAYS} value={day} onChange={changeDay} />
      {blocks.map((b) => <Pressable key={b.id} onPress={() => setEditing(b.id)} accessibilityRole="button" accessibilityState={{ selected: editing === b.id }} accessibilityLabel={`Edit ${b.title}, ${b.startTime} to ${b.endTime}`} style={[styles.card, { borderColor: editing === b.id ? accent : tc.cardBorder }]}>
        <Text style={[styles.name, { color: tc.text }]}>{b.startTime} – {b.endTime}</Text>
        <Text style={{ color: tc.text }}>{b.title}</Text>
        <Text style={{ color: tc.textMuted }}>{b.isClosed ? 'Closed' : `${b.lapLanes} Lap · ${b.recLanes} Rec · ${b.programLanes} Program`}</Text>
      </Pressable>)}
      <ActionButton label="Add pool time" icon="add" color={accent} variant="outline" onPress={add} />
    </SectionCard>
    {block ? <Sheet visible title="Edit Pool Time" onClose={() => setEditing(null)}>
      <TextField label="Activity name" value={block.title} onChangeText={(title) => patch({ title })} />
      <Text style={{ color: tc.textMuted }}>Activity type uses the current schedule colors.</Text>
      <ChipRow options={templates.map((s) => ({ key: s.id, label: s.category === 'rec' ? 'Recreation' : s.category === 'lap' ? 'Lap swim' : s.category === 'fitness' ? 'Water fitness' : s.category === 'lessons' ? 'Lessons' : s.category === 'waterpolo' ? 'Water polo' : 'Swim team' }))} value={templates.find((s) => s.category === allPoolSlots(pool).find((s) => s.id === block.templateId)?.category)?.id ?? ''} onChange={(templateId) => patch({ templateId })} />
      <TextField label="Start time" value={block.startTime} placeholder="6:00 AM" onChangeText={(startTime) => patch({ startTime: startTime.toUpperCase() })} />
      <TextField label="End time" value={block.endTime} placeholder="9:00 AM" onChangeText={(endTime) => patch({ endTime: endTime.toUpperCase() })} />
      <View style={styles.row}><Text style={{ color: tc.text, flex: 1 }}>Pool closed during this time</Text><Switch value={block.isClosed} onValueChange={(isClosed) => patch(!isClosed && allPoolSlots(pool).find((s) => s.id === block.templateId)?.isClosed ? { isClosed, templateId: templates[0].id, lapLanes: 6 } : { isClosed })} accessibilityLabel="Pool closed during this time" /></View>
      {!block.isClosed ? <>
        <Text style={{ color: tc.textMuted }}>Share up to 6 lanes between activities.</Text>
        {(['lapLanes', 'recLanes', 'programLanes'] as const).map((key) => <View key={key} style={{ gap: 8 }}>
          <Text style={{ color: tc.text }}>{key === 'lapLanes' ? 'Lap lanes' : key === 'recLanes' ? 'Recreation lanes' : 'Program lanes'}</Text>
          <ChipRow options={Array.from({ length: 7 }, (_, n) => ({ key: String(n), label: String(n) }))} value={String(block[key])} onChange={(count) => patch({ [key]: Number(count) })} />
        </View>)}
      </> : null}
      <TextField label="Note for members (optional)" value={block.note} onChangeText={(note) => patch({ note })} multiline />
      {problem ? <ErrorBanner message={problem} /> : null}
      <PrimaryButton title="Done" onPress={() => setEditing(null)} />
      <Text style={{ color: tc.textMuted }}>Changes are in your draft. Save Pool Schedule to publish.</Text>
      <ActionButton label="Remove this pool time" icon="trash-outline" color="#B42318" variant="outline" onPress={() => { setBlocks(blocks.filter((b) => b.id !== editing)); setEditing(null); }} />
    </Sheet> : null}
    <SectionCard title="Repeat This Day" icon="repeat" accent={accent} subtitle={`Copy ${DAYS_OF_WEEK.find((d) => d.key === day)?.label}'s full schedule to other days in this pool. Replaces those days when saved.`}>
      <View style={styles.days}>{DAYS.filter((d) => d.key !== day).map((d) => <Pressable key={d.key} accessibilityRole="checkbox" accessibilityState={{ checked: targets.includes(d.key) }} onPress={() => setTargets((current) => current.includes(d.key) ? current.filter((key) => key !== d.key) : [...current, d.key])} style={[styles.card, { borderColor: targets.includes(d.key) ? accent : tc.cardBorder }]}><Text style={{ color: tc.text }}>{targets.includes(d.key) ? '✓ ' : ''}{d.label}</Text></Pressable>)}</View>
      <ActionButton label="Select weekdays" color={accent} variant="outline" onPress={() => setTargets(DAYS_OF_WEEK.slice(0, 5).map((d) => d.key).filter((key) => key !== day))} />
      <PrimaryButton title={`Copy to ${targets.length} selected days`} disabled={!targets.length || !!problem} onPress={() => { setDraft(copyPoolDay(draft, pool, day, targets)); setMessage(`Copied to ${targets.map((key) => DAYS.find((d) => d.key === key)?.label).join(', ')}. Save to publish.`); setTargets([]); }} />
      {message ? <Text accessibilityRole="alert" style={{ color: tc.text }}>{message}</Text> : null}
    </SectionCard>
    {problem ? <ErrorBanner message={problem} /> : <SectionCard title="Schedule Preview" icon="calendar-outline" accent={accent} subtitle="Your changes in the current pool schedule design. Tap a block to edit.">
      <PoolMatrixGrid poolId={pool} schedule={draft} onSelectSlot={(slot) => { setDay(slot.day); setEditing(slot.id); setTargets([]); }} />
    </SectionCard>}
    <PrimaryButton title="Save Pool Schedule" loading={busy} disabled={!!problem} onPress={() => { void save(draft, 'The weekly pool schedule is now published to members.'); }} />
    <ActionButton label="Discard unsaved changes" icon="arrow-undo-outline" color={accent} variant="outline" onPress={() => { setDraft(JSON.parse(JSON.stringify(value))); setEditing(null); setMessage(''); }} />
    <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
  </StaffScreen>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  name: { fontSize: 15, fontWeight: '800' },
});
