import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { ActionButton } from '@/components/staff/SectionCard';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { capabilitiesForRole } from '@/domain/staffCapabilities';
import type { ChildWatchShift, Staff } from '@/domain/types';
import { childWatchRepo } from '@/repositories/childWatchRepo';

import { BRANCH_ID } from '../dashboards/format';
import { DANGER, SheetError, SheetInput } from './SheetInput';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(isoDate: string, offset: number): string {
  if (offset === 0) return 'Today';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

export function ShiftsSheet({
  visible,
  onClose,
  staffId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  staffId: string;
  onDone: () => void;
}) {
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const { config } = useAppConfig();
  const { can } = useStaffCapabilities();
  const allowed = can('manageChildWatchProgram');
  const today = getDemoToday();

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const [date, setDate] = useState(today);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<ChildWatchShift[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [who, setWho] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nameOf = useCallback((id: string) => staff.find((s) => s.id === id)?.name ?? id, [staff]);

  const resetForm = () => {
    setEditingId(undefined);
    setStart('');
    setEnd('');
  };

  const loadShifts = useCallback(
    async (d: string) => {
      try {
        setShifts(await childWatchRepo.shifts(d, staffId));
      } catch {
        setShifts([]);
      }
    },
    [staffId]
  );

  useEffect(() => {
    if (!visible) return;
    setDate(today);
    setError(null);
    resetForm();
    void (async () => {
      const all = await api.listStaff(BRANCH_ID).catch(() => [] as Staff[]);
      const eligible = all.filter((s) => capabilitiesForRole(s.staffRole).has('runChildWatchRoom'));
      setStaff(eligible);
      setWho((cur) => cur || eligible[0]?.id || '');
    })();
  }, [visible, api, today]);

  useEffect(() => {
    if (visible) void loadShifts(date);
  }, [visible, date, loadShifts]);

  const validate = (): string | null => {
    if (!who) return 'Pick a staff member.';
    if (!HHMM.test(start) || !HHMM.test(end)) return 'Use 24-hour times like 08:30.';
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (s >= e) return 'End time must be after start time.';
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const windows = config.childWatch.hours[weekday] ?? [];
    if (!windows.some((w) => s >= toMinutes(w.open) && e <= toMinutes(w.close))) {
      return windows.length === 0 ? 'Child Watch is closed that day.' : 'Shift must fall within Child Watch hours.';
    }
    const overlap = shifts.some(
      (x) => x.id !== editingId && x.staffId === who && s < toMinutes(x.end) && e > toMinutes(x.start)
    );
    return overlap ? `${nameOf(who)} already has an overlapping shift.` : null;
  };

  const save = async () => {
    if (!allowed) return setError('Only the Child Watch director can edit shifts.');
    const problem = validate();
    if (problem) return setError(problem);
    try {
      setSaving(true);
      setError(null);
      await childWatchRepo.saveShift({ id: editingId, staffId: who, date, start, end }, staffId);
      resetForm();
      await loadShifts(date);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the shift.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    try {
      setSaving(true);
      setError(null);
      await childWatchRepo.deleteShift(editingId, staffId);
      resetForm();
      await loadShifts(date);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the shift.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible && allowed} title="Child Watch shifts" onClose={onClose}>
      <FieldLabel>Date</FieldLabel>
      <ChipRow
        options={dates.map((d, i) => ({ key: d, label: dayLabel(d, i) }))}
        value={date}
        onChange={(d) => {
          setDate(d);
          resetForm();
          setError(null);
        }}
      />
      <FieldLabel>Shifts</FieldLabel>
      {shifts.length === 0 ? <Text style={{ color: tc.textMuted }}>No shifts scheduled.</Text> : null}
      {[...shifts]
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((s) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setEditingId(s.id);
              setWho(s.staffId);
              setStart(s.start);
              setEnd(s.end);
              setError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Edit shift for ${nameOf(s.staffId)}`}
            style={{
              borderWidth: 1,
              borderColor: s.id === editingId ? tc.primary : tc.cardBorder,
              borderRadius: 10,
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: tc.text, fontWeight: '700' }}>{nameOf(s.staffId)}</Text>
            <Text style={{ color: tc.textMuted }}>
              {s.start}-{s.end}
            </Text>
          </Pressable>
        ))}
      <FieldLabel>{editingId ? 'Edit shift' : 'Add shift'}</FieldLabel>
      <ChipRow options={staff.map((s) => ({ key: s.id, label: s.name }))} value={who} onChange={setWho} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SheetInput
          style={{ flex: 1 }}
          value={start}
          onChangeText={setStart}
          placeholder="Start 08:00"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        <SheetInput
          style={{ flex: 1 }}
          value={end}
          onChangeText={setEnd}
          placeholder="End 12:00"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
      </View>
      <SheetError message={error} />
      <ActionButton label={editingId ? 'Save changes' : 'Add shift'} color={tc.primary} onPress={() => void save()} loading={saving} />
      {editingId ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionButton label="Delete shift" color={DANGER} variant="outline" onPress={() => void remove()} loading={saving} />
          <ActionButton label="Cancel edit" color={tc.textMuted} variant="outline" onPress={resetForm} />
        </View>
      ) : null}
    </Sheet>
  );
}
