import { Switch, Text } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, ListRow, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor } from '@/context/useConfigEditor';
import type { FeatureToggles } from '@/domain/appConfig';

const TOGGLES: { key: keyof FeatureToggles; title: string; subtitle: string }[] = [
  { key: 'guestPasses', title: 'Guest Passes', subtitle: 'Members can issue and share guest passes' },
  { key: 'donations', title: 'Donations', subtitle: 'Members can give to the YMCA from the app' },
  { key: 'childWatch', title: 'Child Watch', subtitle: 'Child Watch status and sign-in' },
  { key: 'lessonBooking', title: 'Lesson Booking', subtitle: 'Members can book private lessons' },
  { key: 'swimClassEnrollment', title: 'Swim Class Enrollment', subtitle: 'Members can enroll in swim classes' },
  { key: 'communityForum', title: 'Community Forum', subtitle: 'Member forum and class chat' },
  { key: 'sessionRequests', title: 'Session Requests', subtitle: 'Members can request private sessions' },
];

export default function AdminTogglesScreen() {
  const { colors: tc } = useTheme();
  const { value: toggles, allowed, accent, busy, error, save, resetToDefaults } = useConfigEditor('featureToggles');

  return (
    <StaffScreen subtitle="Feature Toggles" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>Each switch saves as soon as you change it.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Features" icon="toggle" accent={accent} count={TOGGLES.length}>
        {TOGGLES.map((t) => (
          <ListRow
            key={t.key}
            title={t.title}
            subtitle={t.subtitle}
            right={
              <Switch
                value={toggles[t.key]}
                disabled={busy}
                onValueChange={(on) => void save({ [t.key]: on })}
                trackColor={{ false: '#CBD5E1', true: accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel={t.title}
              />
            }
          />
        ))}
      </SectionCard>
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}
