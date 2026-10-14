import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { AQUATICS_CLASSES } from '@/domain/aquaticsGuideData';

type ClassDraft = { capacity: string; hidden: boolean };

const DAYS = Array.from(new Set(AQUATICS_CLASSES.map((c) => c.day)));
const whole = (text: string): number | null => (/^\d+$/.test(text.trim()) && Number(text) > 0 ? Number(text) : null);

export default function AdminSwimClassesScreen() {
  const { colors: tc } = useTheme();
  const { value: swim, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('swimClasses');
  const [form, setForm] = useDraftFrom(swim, (s) => ({
    capacity: String(s.capacity),
    classes: Object.fromEntries(
      AQUATICS_CLASSES.map((c): [string, ClassDraft] => [
        c.id,
        { capacity: s.overrides[c.id] ? String(s.overrides[c.id].capacity) : '', hidden: s.hidden.includes(c.id) },
      ])
    ),
  }));
  const setClass = (id: string, patch: Partial<ClassDraft>) =>
    setForm({ ...form, classes: { ...form.classes, [id]: { ...form.classes[id], ...patch } } });

  const submit = async () => {
    const capacity = whole(form.capacity);
    if (capacity === null) return setError('Default capacity must be a whole number above zero.');
    const overrides: Record<string, { capacity: number }> = {};
    for (const c of AQUATICS_CLASSES) {
      const text = form.classes[c.id].capacity;
      if (text.trim() === '') continue;
      const n = whole(text);
      if (n === null) return setError(`${c.title}: capacity must be a whole number above zero, or blank for the default.`);
      overrides[c.id] = { capacity: n };
    }
    const hidden = AQUATICS_CLASSES.filter((c) => form.classes[c.id].hidden).map((c) => c.id);
    await save({ capacity, hidden, overrides }, 'Swim class settings were updated.');
  };

  return (
    <StaffScreen subtitle="Swim Class Capacity" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Set how many swimmers each class takes and hide classes from booking. Members already enrolled stay enrolled.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Default" icon="people" accent={accent}>
        <TextField
          label="Default capacity per class"
          value={form.capacity}
          onChangeText={(capacity) => setForm({ ...form, capacity })}
          keyboardType="number-pad"
        />
      </SectionCard>
      {DAYS.map((day) => (
        <SectionCard key={day} title={`${day} classes`} icon="water" accent={accent}>
          {AQUATICS_CLASSES.filter((c) => c.day === day).map((c) => {
            const d = form.classes[c.id];
            return (
              <View key={c.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
                <Text style={[styles.name, { color: tc.text }]}>
                  {c.startTime} {c.title}
                </Text>
                <TextField
                  label={`Capacity (blank = default ${form.capacity})`}
                  value={d.capacity}
                  onChangeText={(capacity) => setClass(c.id, { capacity })}
                  keyboardType="number-pad"
                />
                <View style={styles.switchRow}>
                  <Text style={{ color: tc.text, flex: 1 }}>Hidden from booking</Text>
                  <Switch
                    value={d.hidden}
                    onValueChange={(hidden) => setClass(c.id, { hidden })}
                    trackColor={{ false: '#CBD5E1', true: accent }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={`${c.title} hidden from booking`}
                  />
                </View>
              </View>
            );
          })}
        </SectionCard>
      ))}
      <PrimaryButton title="Save Swim Class Settings" onPress={() => void submit()} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  name: { fontSize: 14, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
