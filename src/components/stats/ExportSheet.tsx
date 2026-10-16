import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components/desk/Sheet';
import { ActionButton, StatusPill } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';
import type { StatsScope } from '@/domain/stats/statsScopes';
import { buildExport, EXPORT_DEFS, exportsForScopes, type ExportData, type ExportKey } from '@/export/salesforceMappings';
import { shareCsv } from '@/export/shareFile';
import { childWatchRepo } from '@/repositories/childWatchRepo';
import type { StatsRange } from '@/repositories/statsRepo';
import { createSalesforceClient } from '@/salesforce/createSalesforceClient';
import type { SalesforcePushResult } from '@/salesforce/SalesforcePort';

const salesforce = createSalesforceClient();

export function ExportSheet({
  visible,
  onClose,
  scopes,
  data,
  range,
  requesterId,
}: {
  visible: boolean;
  onClose: () => void;
  /** Scopes whose exports are offered (the active tab, or all for admins). */
  scopes: StatsScope[];
  data: ExportData;
  range: StatsRange;
  requesterId: string;
}) {
  const { colors: tc } = useTheme();
  const keys = useMemo(() => exportsForScopes(scopes), [scopes]);
  const [selected, setSelected] = useState<ExportKey[]>([]);
  const [busy, setBusy] = useState<'csv' | 'sf' | null>(null);
  const [history, setHistory] = useState<SalesforcePushResult[]>([]);

  useEffect(() => {
    if (!visible) return;
    setSelected([]);
    salesforce
      .history(requesterId)
      .then((h) => setHistory(h.slice(-5).reverse()))
      .catch(() => setHistory([]));
  }, [visible, requesterId]);

  const toggle = (k: ExportKey) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  /** Child Watch exports are audited; a failed audit write blocks nothing already shared but is surfaced. */
  const audit = async (via: string, files: { key: ExportKey; rowCount: number }[]) => {
    const cw = files.filter((f) => EXPORT_DEFS[f.key].scopes.includes('childWatch'));
    if (cw.length === 0) return;
    const detail = `Exported via ${via} (${range.from} to ${range.to}): ${cw.map((f) => `${f.key} ${f.rowCount} rows`).join(', ')}`;
    await childWatchRepo.recordExport(detail, requesterId).catch(() => {
      dialog.alert('Audit', 'The export was created, but the audit entry could not be saved.');
    });
  };

  const downloadCsv = async () => {
    setBusy('csv');
    try {
      let shared = 0;
      const done: { key: ExportKey; rowCount: number }[] = [];
      for (const key of selected) {
        const file = buildExport(key, data, range);
        if (await shareCsv(file.filename, file.csv)) {
          shared += 1;
          done.push({ key, rowCount: file.rowCount });
        }
      }
      await audit('CSV', done);
      if (shared < selected.length) dialog.alert('Export', 'Sharing is not available on this device.');
    } catch {
      dialog.alert('Export failed', 'The CSV could not be created. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const sendToSalesforce = async () => {
    setBusy('sf');
    try {
      if (!(await salesforce.isConnected())) {
        dialog.alert('Salesforce', 'Salesforce not connected: use CSV.');
        return;
      }
      const results: SalesforcePushResult[] = [];
      const pushed: { key: ExportKey; rowCount: number }[] = [];
      for (const key of selected) {
        const file = buildExport(key, data, range);
        const res = await salesforce.push(key, file.csv, requesterId);
        results.push(res);
        if (res.status !== 'failed') pushed.push({ key, rowCount: file.rowCount });
      }
      await audit('Salesforce', pushed);
      const failed = results.filter((r) => r.status === 'failed').length;
      dialog.alert(
        'Salesforce',
        failed ? `${failed} of ${results.length} exports failed.` : `Sent ${results.length} export${results.length === 1 ? '' : 's'}.`
      );
      setHistory((await salesforce.history(requesterId)).slice(-5).reverse());
    } catch {
      dialog.alert('Salesforce', 'The push failed. Use CSV instead.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet visible={visible} title="Export data" onClose={onClose}>
      <Text style={{ color: tc.textMuted, fontSize: 12 }}>
        {range.from} to {range.to}
      </Text>
      {keys.map((k) => {
        const def = EXPORT_DEFS[k];
        const on = selected.includes(k);
        return (
          <Pressable
            key={k}
            onPress={() => toggle(k)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                borderWidth: 2,
                borderColor: tc.primary,
                backgroundColor: on ? tc.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on ? <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: tc.text, fontWeight: '700', fontSize: 14 }}>{def.label}</Text>
              <Text style={{ color: tc.textMuted, fontSize: 11 }}>{def.sfObject}</Text>
            </View>
            {def.containsPII ? <StatusPill label="PII" color="#B42318" bg="#FEE2E2" /> : null}
          </Pressable>
        );
      })}
      {selected.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionButton label="Download CSV" icon="download-outline" color={tc.primary} loading={busy === 'csv'} onPress={() => void downloadCsv()} />
          <ActionButton label="Send to Salesforce" icon="cloud-upload-outline" color={tc.primary} variant="outline" loading={busy === 'sf'} onPress={() => void sendToSalesforce()} />
        </View>
      ) : (
        <Text style={{ color: tc.textMuted, fontSize: 12 }}>Select at least one export.</Text>
      )}
      {history.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={{ color: tc.text, fontWeight: '700', fontSize: 13 }}>Last pushes</Text>
          {history.map((h, i) => (
            <Text key={`${h.key}-${h.pushedAt}-${i}`} style={{ color: tc.textMuted, fontSize: 12 }}>
              {EXPORT_DEFS[h.key]?.label ?? h.key} · {h.rowCount} rows · {h.status} · {h.pushedAt.slice(0, 16).replace('T', ' ')}
            </Text>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}
