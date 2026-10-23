import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useConfigEditor, useDraftFrom } from '@/context/useConfigEditor';
import { newSlugId } from '@/domain/adminCenter';
import { DEFAULT_PROGRAMS, type ProgramSection } from '@/domain/branchContent';

type Draft = ProgramSection & { highlightsText: string };

const DEFAULT_IDS = new Set(DEFAULT_PROGRAMS.map((p) => p.id));

export default function AdminProgramsScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('programs');
  const [drafts, setDrafts] = useDraftFrom(value, (list): Draft[] => list.map((p) => ({ ...p, highlightsText: p.highlights.join('\n') })));
  const [openId, setOpenId] = useState<string | null>(null);

  const setItem = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const add = () => {
    const id = newSlugId('program', drafts.map((d) => d.id));
    setDrafts([...drafts, { id, title: '', category: '', icon: 'star-outline', description: '', highlights: [], highlightsText: '' }]);
    setOpenId(id);
  };

  const submit = () => {
    const next: ProgramSection[] = [];
    for (const { highlightsText, ...d } of drafts) {
      const title = d.title.trim();
      const category = d.category.trim();
      const description = d.description.trim();
      if (!title || !category || !description) return setError('Every program needs a title, category, and description.');
      next.push({
        ...d,
        title,
        category,
        description,
        badge: d.badge?.trim() || undefined,
        ctaText: d.ctaText?.trim() || undefined,
        highlights: highlightsText.split('\n').map((l) => l.trim()).filter(Boolean),
      });
    }
    void save(next, 'Programs were updated.');
  };

  return (
    <StaffScreen subtitle="Programs" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        The programs members see on the Programs page. Wellness package prices are added automatically from the wellness rate card.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Programs" icon="star" accent={accent} count={drafts.length}>
        {drafts.map((d, i) => (
          <View key={d.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.name, { color: tc.text, flex: 1 }]}>{d.title || 'New program'}</Text>
              <Switch
                value={!d.hidden}
                onValueChange={(on) => setItem(i, { hidden: !on })}
                trackColor={{ false: '#CBD5E1', true: accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`Show ${d.title || 'program'}`}
              />
            </View>
            <Text style={{ color: tc.textMuted, fontSize: 12 }}>
              {d.category || 'No category'}
              {d.hidden ? ' · Hidden' : ''}
            </Text>
            {openId === d.id ? (
              <>
                <TextField label="Title" value={d.title} onChangeText={(title) => setItem(i, { title })} />
                <TextField label="Category" value={d.category} onChangeText={(category) => setItem(i, { category })} />
                <TextField label="Badge (optional)" value={d.badge ?? ''} onChangeText={(badge) => setItem(i, { badge })} />
                <TextField label="Description" value={d.description} onChangeText={(description) => setItem(i, { description })} multiline />
                <TextField
                  label="Highlights (one per line)"
                  value={d.highlightsText}
                  onChangeText={(highlightsText) => setItem(i, { highlightsText })}
                  multiline
                />
                {d.ctaRoute ? (
                  <TextField label="Button text (optional)" value={d.ctaText ?? ''} onChangeText={(ctaText) => setItem(i, { ctaText })} />
                ) : null}
                {!DEFAULT_IDS.has(d.id) ? (
                  <ActionButton
                    label="Remove program"
                    icon="trash"
                    color="#B42318"
                    variant="outline"
                    onPress={() => setDrafts(drafts.filter((_, j) => j !== i))}
                  />
                ) : null}
              </>
            ) : null}
            <ActionButton
              label={openId === d.id ? 'Done' : 'Edit'}
              icon={openId === d.id ? 'checkmark' : 'pencil'}
              color={tc.primary}
              variant="outline"
              onPress={() => setOpenId(openId === d.id ? null : d.id)}
            />
          </View>
        ))}
        <ActionButton label="Add program" icon="add" color={accent} variant="outline" onPress={add} />
      </SectionCard>
      <PrimaryButton title="Save Programs" onPress={submit} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '800' },
});
