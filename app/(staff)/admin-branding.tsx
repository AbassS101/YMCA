import { Text } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import type { BrandingConfig } from '@/domain/appConfig';

const FIELDS: { key: keyof BrandingConfig; label: string; keyboardType?: 'phone-pad' | 'email-address' }[] = [
  { key: 'branchName', label: 'Branch name' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone', keyboardType: 'phone-pad' },
  { key: 'hoursWeekday', label: 'Weekday hours' },
  { key: 'hoursWeekend', label: 'Weekend hours' },
  { key: 'wellnessEmail', label: 'Wellness contact email', keyboardType: 'email-address' },
];

export default function AdminBrandingScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, save, resetToDefaults } = useConfigEditor('branding');
  const [draft, setDraft] = useDraftFrom(value, (v) => v);

  return (
    <StaffScreen subtitle="Branding & Contact" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>The branch details members see across the app.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Branch Details" icon="business" accent={accent}>
        {FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            value={draft[f.key]}
            onChangeText={(text) => setDraft({ ...draft, [f.key]: text })}
            keyboardType={f.keyboardType}
            autoCapitalize={f.keyboardType === 'email-address' ? 'none' : undefined}
          />
        ))}
      </SectionCard>
      <PrimaryButton
        title="Save Branding"
        onPress={() => void save(Object.fromEntries(FIELDS.map((f) => [f.key, draft[f.key].trim()])) as BrandingConfig, 'Branding was updated.')}
        loading={busy}
      />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}
