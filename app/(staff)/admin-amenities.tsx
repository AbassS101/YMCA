import { useState } from 'react';
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
import { AMENITY_CATEGORIES, DEFAULT_AMENITIES, type AmenityCategory, type AmenityItem } from '@/domain/branchContent';

type Draft = AmenityItem & { detailsText: string };

const CATEGORY_OPTIONS = AMENITY_CATEGORIES.map((c) => ({ key: c, label: c }));
const DEFAULT_IDS = new Set(DEFAULT_AMENITIES.map((a) => a.id));

export default function AdminAmenitiesScreen() {
  const { colors: tc } = useTheme();
  const { value, allowed, accent, busy, error, setError, save, resetToDefaults } = useConfigEditor('amenities');
  const [drafts, setDrafts] = useDraftFrom(value, (list): Draft[] => list.map((a) => ({ ...a, detailsText: a.details.join('\n') })));
  const [openId, setOpenId] = useState<string | null>(null);

  const setItem = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const add = () => {
    const id = newSlugId('amenity', drafts.map((d) => d.id));
    setDrafts([...drafts, { id, title: '', category: 'Fitness', icon: 'star-outline', description: '', details: [], detailsText: '' }]);
    setOpenId(id);
  };

  const submit = () => {
    const next: AmenityItem[] = [];
    for (const { detailsText, ...d } of drafts) {
      const title = d.title.trim();
      const description = d.description.trim();
      if (!title || !description) return setError('Every amenity needs a title and a description.');
      next.push({
        ...d,
        title,
        description,
        badge: d.badge?.trim() || undefined,
        details: detailsText.split('\n').map((l) => l.trim()).filter(Boolean),
      });
    }
    void save(next, 'Branch amenities were updated.');
  };

  return (
    <StaffScreen subtitle="Branch Amenities" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        The facilities members see on the Branch Amenities page. Turn an amenity off to hide it; standard amenities can be hidden but not
        removed.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Amenities" icon="business" accent={accent} count={drafts.length}>
        {drafts.map((d, i) => (
          <View key={d.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.name, { color: tc.text, flex: 1 }]}>{d.title || 'New amenity'}</Text>
              <Switch
                value={!d.hidden}
                onValueChange={(on) => setItem(i, { hidden: !on })}
                trackColor={{ false: '#CBD5E1', true: accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`Show ${d.title || 'amenity'}`}
              />
            </View>
            <Text style={{ color: tc.textMuted, fontSize: 12 }}>
              {d.category}
              {d.hidden ? ' · Hidden' : ''}
            </Text>
            {openId === d.id ? (
              <>
                <TextField label="Title" value={d.title} onChangeText={(title) => setItem(i, { title })} />
                <ChipRow<AmenityCategory> options={CATEGORY_OPTIONS} value={d.category} onChange={(category) => setItem(i, { category })} />
                <TextField label="Badge (optional)" value={d.badge ?? ''} onChangeText={(badge) => setItem(i, { badge })} />
                <TextField label="Description" value={d.description} onChangeText={(description) => setItem(i, { description })} multiline />
                <TextField label="Details (one per line)" value={d.detailsText} onChangeText={(detailsText) => setItem(i, { detailsText })} multiline />
                {!DEFAULT_IDS.has(d.id) ? (
                  <ActionButton
                    label="Remove amenity"
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
        <ActionButton label="Add amenity" icon="add" color={accent} variant="outline" onPress={add} />
      </SectionCard>
      <PrimaryButton title="Save Amenities" onPress={submit} loading={busy} />
      <ActionButton label="Reset section to defaults" icon="refresh" color="#B42318" variant="outline" onPress={resetToDefaults} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '800' },
});
