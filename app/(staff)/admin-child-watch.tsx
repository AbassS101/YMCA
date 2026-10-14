import { Text } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { formatHoursText, parseHoursText } from '@/domain/adminCenter';
import type { HoursWindow } from '@/domain/childWatch';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminChildWatchScreen() {
  const { colors: tc } = useTheme();
  const { value: rules, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('childWatch');
  const [form, setForm] = useDraftFrom(rules, (r) => ({
    hours: r.hours.map(formatHoursText),
    cutoff: String(r.signInCutoffMin),
    maxMinutes: String(r.maxMinutesPerDay),
    minAgeWeeks: String(r.minAgeWeeks),
    capacity: String(r.roomCapacity),
    intro: r.intro,
    note: r.note,
    contactText: r.contactText,
    contactEmail: r.contactEmail,
  }));
  const { hours, cutoff, maxMinutes, minAgeWeeks, capacity, intro, note, contactText, contactEmail } = form;

  const submit = async () => {
    const parsed = hours.map(parseHoursText);
    const badDay = parsed.findIndex((h) => h === null);
    if (badDay >= 0) return setError(`${DAYS[badDay]}: use hours like 09:00-12:00, 16:00-20:00, or leave blank when closed.`);
    const numbers = [cutoff, maxMinutes, minAgeWeeks, capacity].map((t) => (/^\d+$/.test(t.trim()) ? Number(t) : null));
    if (numbers.some((n) => n === null)) return setError('Cutoff, daily limit, minimum age, and capacity must be whole numbers.');
    const [signInCutoffMin, maxMinutesPerDay, minAge, roomCapacity] = numbers as number[];
    await save(
      {
        hours: parsed as HoursWindow[][],
        signInCutoffMin,
        maxMinutesPerDay,
        minAgeWeeks: minAge,
        roomCapacity,
        intro: intro.trim(),
        note: note.trim(),
        contactText,
        contactEmail: contactEmail.trim(),
      },
      'Child Watch rules were updated.'
    );
  };

  return (
    <StaffScreen subtitle="Child Watch Rules" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        These rules drive Child Watch status and sign-in checks for members and the front desk.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Hours" icon="time" accent={accent} subtitle="24-hour HH:MM, comma-separated windows. Blank = closed.">
        {DAYS.map((day, i) => (
          <TextField
            key={day}
            label={day}
            value={hours[i] ?? ''}
            onChangeText={(text) => setForm({ ...form, hours: hours.map((h, j) => (j === i ? text : h)) })}
            placeholder="Closed"
            autoCapitalize="none"
          />
        ))}
      </SectionCard>
      <SectionCard title="Limits" icon="speedometer" accent={accent}>
        <TextField label="Sign-in cutoff (minutes before closing)" value={cutoff} onChangeText={(cutoff) => setForm({ ...form, cutoff })} keyboardType="number-pad" />
        <TextField label="Maximum minutes per child per day" value={maxMinutes} onChangeText={(maxMinutes) => setForm({ ...form, maxMinutes })} keyboardType="number-pad" />
        <TextField label="Minimum age (weeks)" value={minAgeWeeks} onChangeText={(minAgeWeeks) => setForm({ ...form, minAgeWeeks })} keyboardType="number-pad" />
        <TextField label="Room capacity" value={capacity} onChangeText={(capacity) => setForm({ ...form, capacity })} keyboardType="number-pad" />
      </SectionCard>
      <SectionCard title="Member Information" icon="information-circle" accent={accent} subtitle="Shown on the member Child Watch screen. Use {maxTime} in the introduction for the daily limit.">
        <TextField label="Introduction" value={intro} onChangeText={(intro) => setForm({ ...form, intro })} multiline />
        <TextField label="Please note" value={note} onChangeText={(note) => setForm({ ...form, note })} multiline />
        <TextField label="Contact line (shown before the email)" value={contactText} onChangeText={(contactText) => setForm({ ...form, contactText })} multiline />
        <TextField label="Contact email" value={contactEmail} onChangeText={(contactEmail) => setForm({ ...form, contactEmail })} keyboardType="email-address" autoCapitalize="none" />
      </SectionCard>
      <PrimaryButton title="Save Child Watch Rules" onPress={() => void submit()} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}
