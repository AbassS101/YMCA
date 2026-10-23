import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import type { AquaticsSessionInfo } from '@/domain/aquaticsGuideData';

type Draft = {
  sessionName: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  laborDayNotice: string;
  fullMembers: string;
  programMembers: string;
  enrollmentPortalUrl: string;
  refundRules: string;
  contacts: AquaticsSessionInfo['contacts'];
};

const toDraft = (v: AquaticsSessionInfo): Draft => ({
  sessionName: v.sessionName,
  subtitle: v.subtitle,
  startDate: v.startDate,
  endDate: v.endDate,
  laborDayNotice: v.laborDayNotice,
  fullMembers: v.registrationDates.fullMembers,
  programMembers: v.registrationDates.programMembers,
  enrollmentPortalUrl: v.enrollmentPortalUrl,
  refundRules: v.refundPolicy.rules.join('\n'),
  contacts: v.contacts.map((c) => ({ ...c })),
});

const FIELDS: { key: keyof Omit<Draft, 'contacts' | 'refundRules'>; label: string; keyboardType?: 'url' }[] = [
  { key: 'sessionName', label: 'Session name' },
  { key: 'subtitle', label: 'Subtitle' },
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
  { key: 'laborDayNotice', label: 'Holiday / no-class notice' },
  { key: 'fullMembers', label: 'Registration opens: full members' },
  { key: 'programMembers', label: 'Registration opens: program members' },
  { key: 'enrollmentPortalUrl', label: 'Enrollment link', keyboardType: 'url' },
];

export default function AdminAquaticsSessionScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('aquaticsSession');
  const [draft, setDraft] = useDraftFrom(value, toDraft);

  const setContact = (i: number, patch: Partial<Draft['contacts'][number]>) =>
    setDraft({ ...draft, contacts: draft.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  const submit = () => {
    const contacts = draft.contacts.map((c) => ({ name: c.name.trim(), role: c.role.trim(), email: c.email.trim(), phone: c.phone.trim() }));
    if (contacts.some((c) => !c.name)) return setError('Every aquatics contact needs a name.');
    void save(
      {
        sessionName: draft.sessionName.trim(),
        subtitle: draft.subtitle.trim(),
        startDate: draft.startDate.trim(),
        endDate: draft.endDate.trim(),
        laborDayNotice: draft.laborDayNotice.trim(),
        registrationDates: { fullMembers: draft.fullMembers.trim(), programMembers: draft.programMembers.trim() },
        enrollmentPortalUrl: draft.enrollmentPortalUrl.trim(),
        refundPolicy: { ...value.refundPolicy, rules: draft.refundRules.split('\n').map((l) => l.trim()).filter(Boolean) },
        contacts,
      },
      'The aquatics session was updated.'
    );
  };

  return (
    <StaffScreen subtitle="Aquatics Session" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Session details members see in the Aquatics Guide, swim enrollment, and lesson booking.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Session" icon="calendar" accent={accent}>
        {FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            value={draft[f.key]}
            onChangeText={(text) => setDraft({ ...draft, [f.key]: text })}
            keyboardType={f.keyboardType}
            autoCapitalize={f.keyboardType === 'url' ? 'none' : undefined}
          />
        ))}
      </SectionCard>
      <SectionCard title="Refund Policy" icon="cash" accent={accent}>
        <TextField
          label="Rules (one per line)"
          value={draft.refundRules}
          onChangeText={(refundRules) => setDraft({ ...draft, refundRules })}
          multiline
        />
      </SectionCard>
      <SectionCard title="Contacts" icon="people" accent={accent} count={draft.contacts.length}>
        {draft.contacts.map((c, i) => (
          <View key={i} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <TextField label="Name" value={c.name} onChangeText={(name) => setContact(i, { name })} />
            <TextField label="Role" value={c.role} onChangeText={(role) => setContact(i, { role })} />
            <TextField
              label="Email"
              value={c.email}
              onChangeText={(email) => setContact(i, { email })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField label="Phone" value={c.phone} onChangeText={(phone) => setContact(i, { phone })} keyboardType="phone-pad" />
            <ActionButton
              label="Remove contact"
              icon="trash"
              color="#B42318"
              variant="outline"
              onPress={() => setDraft({ ...draft, contacts: draft.contacts.filter((_, j) => j !== i) })}
            />
          </View>
        ))}
        <ActionButton
          label="Add contact"
          icon="add"
          color={accent}
          variant="outline"
          onPress={() => setDraft({ ...draft, contacts: [...draft.contacts, { name: '', role: '', email: '', phone: '' }] })}
        />
      </SectionCard>
      <PrimaryButton title="Save Aquatics Session" onPress={submit} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
});
