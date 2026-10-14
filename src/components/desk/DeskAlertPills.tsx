import { StyleSheet, View } from 'react-native';

import { StatusPill } from '@/components/staff/SectionCard';
import type { DeskAlert } from '@/domain/deskAlerts';

const TONES = {
  critical: { color: '#B42318', bg: '#FEE2E2' },
  warning: { color: '#B45309', bg: '#FEF3C7' },
  info: { color: '#0369A1', bg: '#E0F2FE' },
} as const;

export function DeskAlertPills({ alerts, max = 3 }: { alerts: DeskAlert[]; max?: number }) {
  if (alerts.length === 0) return null;
  return (
    <View style={styles.row}>
      {alerts.slice(0, max).map((a) => (
        <StatusPill key={a.kind} label={a.label} color={TONES[a.severity].color} bg={TONES[a.severity].bg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
});
