import { Text } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';

export default function AdminThresholdsScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('thresholds');
  const [form, setForm] = useDraftFrom(value, (v) => ({
    staleDays: String(v.staleCancelDays),
    fullPercent: String(Math.round(v.fullClassRatio * 100)),
    newDays: String(v.newMemberDays),
  }));
  const { staleDays, fullPercent, newDays } = form;

  const submit = async () => {
    const percent = Number(fullPercent);
    if (!/^\d+$/.test(staleDays.trim()) || !/^\d+$/.test(newDays.trim())) return setError('Day counts must be whole numbers.');
    if (!/^\d+$/.test(fullPercent.trim()) || percent < 1 || percent > 100) return setError('Full-class level must be a whole percent from 1 to 100.');
    await save({ staleCancelDays: Number(staleDays), fullClassRatio: percent / 100, newMemberDays: Number(newDays) }, 'Alert thresholds were updated.');
  };

  return (
    <StaffScreen subtitle="Alert Thresholds" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>When staff dashboards and the front desk flag an item.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Thresholds" icon="speedometer" accent={accent}>
        <TextField label="Flag a cancellation request after (days)" value={staleDays} onChangeText={(staleDays) => setForm({ ...form, staleDays })} keyboardType="number-pad" />
        <TextField label="Flag a class as full at (% of capacity)" value={fullPercent} onChangeText={(fullPercent) => setForm({ ...form, fullPercent })} keyboardType="number-pad" />
        <TextField label="Treat a member as new for (days)" value={newDays} onChangeText={(newDays) => setForm({ ...form, newDays })} keyboardType="number-pad" />
      </SectionCard>
      <PrimaryButton title="Save Thresholds" onPress={() => void submit()} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}
