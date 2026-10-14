import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { EmptyState, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { CONFIG_SECTION_LABELS, type ConfigAuditEntry } from '@/domain/appConfig';
import { configRepo } from '@/repositories/configRepo';

const show = (value: unknown) => (value == null ? 'None' : JSON.stringify(value, null, 2));

export default function AdminAuditScreen() {
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const { can, theme } = useStaffCapabilities();
  const allowed = can('viewConfigAudit');

  const [entries, setEntries] = useState<ConfigAuditEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      setError('');
      configRepo
        .listAudit(api, session?.userId ?? '')
        .then((list) => setEntries([...list].sort((a, b) => b.at.localeCompare(a.at))))
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the change log.'));
    }, [api, allowed, session?.userId])
  );

  return (
    <StaffScreen subtitle="Change Log" allowed={allowed}>
      {error ? <ErrorBanner message={error} /> : null}
      <SectionCard title="Settings Changes" icon="list" accent={theme.color} count={entries.length} subtitle="Newest first. Tap an entry to see before and after.">
        {entries.length === 0 ? (
          <EmptyState icon="document-text-outline" text="No settings changes yet." />
        ) : (
          entries.map((e) => {
            const open = openId === e.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => setOpenId(open ? null : e.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={[styles.card, { borderColor: tc.cardBorder }]}
              >
                <View style={styles.top}>
                  <Text style={[styles.summary, { color: tc.text }]}>{e.summary}</Text>
                  <StatusPill label={CONFIG_SECTION_LABELS[e.section]?.toUpperCase() ?? e.section} color="#475467" bg="#F1F5F9" />
                </View>
                <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                  {e.byName} ({e.byRole}) · {new Date(e.at).toLocaleString()}
                </Text>
                {open ? (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.label, { color: tc.text }]}>Before</Text>
                    <Text style={[styles.json, { color: tc.textMuted }]} selectable>{show(e.before)}</Text>
                    <Text style={[styles.label, { color: tc.text }]}>After</Text>
                    <Text style={[styles.json, { color: tc.textMuted }]} selectable>{show(e.after)}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </SectionCard>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summary: { flex: 1, fontSize: 14, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '800' },
  json: { fontSize: 11, fontFamily: 'Courier' },
});
