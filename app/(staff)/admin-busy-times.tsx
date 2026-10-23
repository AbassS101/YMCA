import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { optionalWholeNumber } from '@/domain/adminCenter';
import { formatHour, levelFor, OPEN_HOUR } from '@/domain/busyness';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_OPTIONS = DAYS.map((label, i) => ({ key: String(i), label }));
const LEVEL_COLORS = { quiet: '#15803D', moderate: '#B45309', busy: '#B42318' } as const;

export default function AdminBusyTimesScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('busyTimes');
  const [grid, setGrid] = useDraftFrom(value, (v) => v.byDay.map((row) => row.map(String)));
  const [note, setNote] = useDraftFrom(value, (v) => v.note);
  const [day, setDay] = useState(String(new Date().getDay()));
  const dayIndex = Number(day);

  const setCell = (hourIndex: number, text: string) =>
    setGrid(grid.map((row, d) => (d === dayIndex ? row.map((c, h) => (h === hourIndex ? text : c)) : row)));

  const submit = () => {
    const byDay: number[][] = [];
    for (const [d, row] of grid.entries()) {
      const values = row.map(optionalWholeNumber);
      const bad = values.findIndex((v) => v === undefined || Number.isNaN(v) || v > 100);
      if (bad !== -1) {
        setDay(String(d));
        return setError(`${DAYS[d]} ${formatHour(OPEN_HOUR + bad)}: enter a whole number from 0 to 100.`);
      }
      byDay.push(values as number[]);
    }
    void save({ byDay, note: note.trim() }, 'Busy times were updated.');
  };

  return (
    <StaffScreen subtitle="Busy Times" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        How full the branch usually is each hour, from 0 (empty) to 100 (packed). 70 and up shows as busy, 40 and up as moderate.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Notice" icon="megaphone" accent={accent}>
        <TextField
          label="Note shown above the chart (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Expect a busier gym during the January rush"
          multiline
        />
      </SectionCard>
      <SectionCard title="Hourly Levels" icon="pulse" accent={accent}>
        <ChipRow options={DAY_OPTIONS} value={day} onChange={setDay} />
        {(grid[dayIndex] ?? []).map((cell, h) => {
          const n = optionalWholeNumber(cell);
          const level = n !== undefined && !Number.isNaN(n) ? levelFor(n) : null;
          return (
            <View key={h} style={styles.row}>
              <Text style={[styles.hour, { color: tc.text }]}>{formatHour(OPEN_HOUR + h)}</Text>
              <View style={{ flex: 1 }}>
                <TextField
                  value={cell}
                  onChangeText={(text) => setCell(h, text)}
                  keyboardType="number-pad"
                  accessibilityLabel={`${DAYS[dayIndex]} ${formatHour(OPEN_HOUR + h)} busy level`}
                />
              </View>
              <Text style={[styles.level, { color: level ? LEVEL_COLORS[level] : tc.textMuted }]}>{level ?? '—'}</Text>
            </View>
          );
        })}
      </SectionCard>
      <PrimaryButton title="Save Busy Times" onPress={submit} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hour: { width: 40, fontSize: 14, fontWeight: '700' },
  level: { width: 72, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
