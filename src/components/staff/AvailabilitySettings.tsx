import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { sessionLengthsFor } from '@/domain/sessionAvailability';
import type { Staff } from '@/domain/types';
import { sessionRequestRepo } from '@/repositories/lessonRepo';
import { radii } from '@/theme/typography';

/** Which session lengths an instructor offers, and which members may book instantly. */
export function AvailabilitySettings({ staffId, accent }: { staffId: string; accent: string }) {
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const s = await api.getStaff(staffId);
      setStaff(s);
      const entries = await Promise.all(
        (s.instantBookMemberIds ?? []).map(async (id) => [id, (await api.getMember(id).catch(() => null))?.name ?? id] as const)
      );
      setNames(Object.fromEntries(entries));
    } catch {
      setStaff(null);
    }
  }, [api, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!staff) return null;
  const lengths = sessionLengthsFor(staff);

  const toggleLength = async (len: 30 | 60) => {
    const next = lengths.includes(len) ? lengths.filter((l) => l !== len) : [...lengths, len];
    if (next.length === 0) {
      dialog.alert('Keep one length', 'Offer at least one session length.');
      return;
    }
    try {
      await api.updateStaff(staffId, { sessionLengths: next.sort((a, b) => a - b) as (30 | 60)[] });
      await load();
    } catch {
      dialog.alert('Error', 'Could not save session lengths.');
    }
  };

  const removeInstant = async (memberId: string) => {
    if (!session?.userId) return;
    try {
      await sessionRequestRepo.setInstantBooking(api, staffId, memberId, false, session.userId);
      await load();
    } catch (e) {
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not update.');
    }
  };

  const instantIds = staff.instantBookMemberIds ?? [];

  return (
    <SectionCard
      title="Booking Settings"
      icon="settings-outline"
      accent={accent}
      subtitle="Members request a time inside your availability windows"
    >
      <Text style={[styles.label, { color: tc.text }]}>Session lengths I offer</Text>
      <View style={styles.row}>
        {([30, 60] as const).map((len) => {
          const active = lengths.includes(len);
          return (
            <Pressable
              key={len}
              onPress={() => void toggleLength(len)}
              style={[styles.chip, { backgroundColor: active ? accent : tc.cardBg, borderColor: active ? accent : tc.cardBorder }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${len} minute sessions`}
            >
              <Text style={{ color: active ? '#FFFFFF' : tc.text, fontWeight: '800' }}>{len} min</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: tc.text }]}>Instant booking ({instantIds.length})</Text>
      <Text style={{ color: tc.textMuted, fontSize: 12 }}>
        Off by default. Turn it on for a member from their profile; they will skip the request step.
      </Text>
      {instantIds.map((id) => (
        <View key={id} style={styles.instantRow}>
          <Text style={{ color: tc.text, flex: 1, fontWeight: '600' }}>{names[id] ?? id}</Text>
          <Pressable onPress={() => void removeInstant(id)} accessibilityRole="button" accessibilityLabel={`Remove ${names[id] ?? id}`}>
            <Text style={{ color: tc.danger, fontWeight: '700' }}>Remove</Text>
          </Pressable>
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1.5 },
  instantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
});
