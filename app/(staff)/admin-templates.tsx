import { Text } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';

export default function AdminTemplatesScreen() {
  const { colors: tc } = useTheme();
  const { value: templates, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('templates');
  const [form, setForm] = useDraftFrom(templates, (t) => ({ ...t }));

  const submit = async () => {
    if (!form.welcomeCall.trim() || !form.guestPassShare.trim()) return setError('Every template needs text.');
    await save({ welcomeCall: form.welcomeCall.trim(), guestPassShare: form.guestPassShare.trim() }, 'Templates were updated.');
  };

  return (
    <StaffScreen subtitle="Message Templates" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Words in curly braces are filled in automatically, so keep them exactly as written.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Guest Pass Share Message" icon="ticket" accent={accent} subtitle="Sent when a member shares a guest pass. Fills in {guestName} and {passCode}.">
        <TextField label="Message" value={form.guestPassShare} onChangeText={(guestPassShare) => setForm({ ...form, guestPassShare })} multiline />
      </SectionCard>
      <SectionCard title="Welcome Call Script" icon="call" accent={accent} subtitle="Front desk script for new members. Fills in {firstName} and {repName}.">
        <TextField label="Script" value={form.welcomeCall} onChangeText={(welcomeCall) => setForm({ ...form, welcomeCall })} multiline />
      </SectionCard>
      <PrimaryButton title="Save Templates" onPress={() => void submit()} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}
