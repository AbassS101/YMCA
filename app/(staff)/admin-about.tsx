import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { newSlugId } from '@/domain/adminCenter';
import { CONTENT_ICONS, type AboutConfig } from '@/domain/branchContent';

const ICON_OPTIONS = CONTENT_ICONS.map((icon) => ({ key: icon, label: icon.replace('-outline', '') }));

export default function AdminAboutScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('about');
  const [draft, setDraft] = useDraftFrom(value, (v): AboutConfig => JSON.parse(JSON.stringify(v)));

  const setPillar = (i: number, patch: Partial<AboutConfig['pillars'][number]>) =>
    setDraft({ ...draft, pillars: draft.pillars.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setMetric = (i: number, patch: Partial<AboutConfig['metrics'][number]>) =>
    setDraft({ ...draft, metrics: draft.metrics.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const setAmenity = (i: number, patch: Partial<AboutConfig['amenities'][number]>) =>
    setDraft({ ...draft, amenities: draft.amenities.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  const submit = () => {
    const metrics = draft.metrics.map((m) => ({ ...m, label: m.label.trim(), value: m.value.trim() }));
    const amenities = draft.amenities.map((a) => ({ ...a, name: a.name.trim() }));
    if (metrics.some((m) => !m.label || !m.value)) return setError('Every highlight number needs a label and a value.');
    if (amenities.some((a) => !a.name)) return setError('Every amenity needs a name.');
    void save(
      {
        association: draft.association.trim(),
        email: draft.email.trim(),
        pillars: draft.pillars.map((p) => ({ ...p, title: p.title.trim(), subtitle: p.subtitle.trim(), description: p.description.trim() })),
        metrics,
        amenities,
      },
      'The About page was updated.'
    );
  };

  return (
    <StaffScreen subtitle="About Page" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>What members read on the About page.</Text>
      {error ? <ErrorBanner message={error} /> : null}

      <SectionCard title="Branch" icon="information-circle" accent={accent}>
        <TextField label="Association" value={draft.association} onChangeText={(association) => setDraft({ ...draft, association })} />
        <TextField
          label="Contact email"
          value={draft.email}
          onChangeText={(email) => setDraft({ ...draft, email })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </SectionCard>

      <SectionCard title="Highlight Numbers" icon="stats-chart" accent={accent} count={draft.metrics.length}>
        {draft.metrics.map((m, i) => (
          <View key={m.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <TextField label="Label" value={m.label} onChangeText={(label) => setMetric(i, { label })} />
            <TextField label="Value" value={m.value} onChangeText={(v) => setMetric(i, { value: v })} />
            <ActionButton
              label="Remove"
              icon="trash"
              color="#B42318"
              variant="outline"
              onPress={() => setDraft({ ...draft, metrics: draft.metrics.filter((_, j) => j !== i) })}
            />
          </View>
        ))}
        <ActionButton
          label="Add number"
          icon="add"
          color={accent}
          variant="outline"
          onPress={() =>
            setDraft({ ...draft, metrics: [...draft.metrics, { id: newSlugId('metric', draft.metrics.map((m) => m.id)), label: '', value: '' }] })
          }
        />
      </SectionCard>

      <SectionCard title="Pillars" icon="ribbon" accent={accent} count={draft.pillars.length}>
        {draft.pillars.map((p, i) => (
          <View key={p.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.name, { color: tc.text }]}>Show on About page</Text>
              <Switch
                value={!p.hidden}
                onValueChange={(on) => setPillar(i, { hidden: !on })}
                trackColor={{ false: '#CBD5E1', true: accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`Show ${p.title}`}
              />
            </View>
            <TextField label="Title" value={p.title} onChangeText={(title) => setPillar(i, { title })} />
            <TextField label="Subtitle" value={p.subtitle} onChangeText={(subtitle) => setPillar(i, { subtitle })} />
            <TextField label="Description" value={p.description} onChangeText={(description) => setPillar(i, { description })} multiline />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Amenity List" icon="business" accent={accent} count={draft.amenities.length}>
        {draft.amenities.map((a, i) => (
          <View key={a.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <TextField label="Name" value={a.name} onChangeText={(name) => setAmenity(i, { name })} />
            <ChipRow options={ICON_OPTIONS} value={a.icon} onChange={(icon) => setAmenity(i, { icon })} />
            <ActionButton
              label="Remove"
              icon="trash"
              color="#B42318"
              variant="outline"
              onPress={() => setDraft({ ...draft, amenities: draft.amenities.filter((_, j) => j !== i) })}
            />
          </View>
        ))}
        <ActionButton
          label="Add amenity"
          icon="add"
          color={accent}
          variant="outline"
          onPress={() =>
            setDraft({
              ...draft,
              amenities: [...draft.amenities, { id: newSlugId('amenity', draft.amenities.map((a) => a.id)), name: '', icon: 'star-outline' }],
            })
          }
        />
      </SectionCard>

      <PrimaryButton title="Save About Page" onPress={submit} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '800' },
});
