import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { ChipRow } from '@/components/desk/Sheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, SectionCard } from '@/components/staff/SectionCard';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import type { SupportTicket, TicketPriority, TicketStatus, TicketType } from '@/domain/types';
import { supportTicketRepo } from '@/repositories/supportTicketRepo';

const STATUS_OPTIONS: { key: 'all' | TicketStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const TYPE_OPTIONS: { key: 'all' | TicketType; label: string }[] = [
  { key: 'all', label: 'All types' },
  { key: 'problem_report', label: 'Problems' },
  { key: 'feature_request', label: 'Feature requests' },
];

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: '#64748B',
  normal: '#0284C7',
  high: '#B45309',
  urgent: '#B42318',
};

const STATUS_LABELS: Record<TicketStatus, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };

const words = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function SupportTicketsScreen() {
  const router = useRouter();
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const { can, theme } = useStaffCapabilities();
  const allowed = can('manageSupportTickets');
  const staffId = session?.userId ?? '';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | TicketStatus>('open');
  const [type, setType] = useState<'all' | TicketType>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!api || !allowed) return;
    setLoading(true);
    setError('');
    try {
      const list = await supportTicketRepo.listAllTickets(api, staffId);
      setTickets([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [api, allowed, staffId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (status === 'all' || t.status === status) &&
        (type === 'all' || t.type === type) &&
        (!q || [t.title, t.description, t.userName, t.ticketNumber].some((f) => f.toLowerCase().includes(q)))
    );
  }, [tickets, status, type, query]);

  const setTicketStatus = async (ticket: SupportTicket, next: TicketStatus) => {
    if (!api) return;
    setBusyId(ticket.id);
    setError('');
    try {
      const updated = await supportTicketRepo.updateStatus(api, ticket.id, next, staffId);
      setTickets((list) => list.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const openCount = tickets.filter((t) => t.status !== 'resolved').length;

  return (
    <StaffScreen subtitle="Support Tickets" allowed={allowed}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Problem reports and feature requests sent from the app. {openCount} still need attention.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <ChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      <ChipRow options={TYPE_OPTIONS} value={type} onChange={setType} />
      <TextField placeholder="Search title, member, or ticket number" value={query} onChangeText={setQuery} accessibilityLabel="Search tickets" />
      <SectionCard title="Tickets" icon="bug" accent={theme.color} count={filtered.length}>
        {loading ? (
          <ActivityIndicator color={theme.color} />
        ) : filtered.length === 0 ? (
          <Text style={{ color: tc.textMuted, fontSize: 13 }}>No tickets match these filters.</Text>
        ) : (
          filtered.map((t) => (
            <View key={t.id} style={[styles.card, { borderColor: tc.cardBorder }]}>
              <View style={styles.row}>
                <Text style={[styles.number, { color: tc.textMuted }]}>{t.ticketNumber}</Text>
                <Text style={[styles.pill, { color: PRIORITY_COLORS[t.priority], borderColor: PRIORITY_COLORS[t.priority] }]}>
                  {words(t.priority)}
                </Text>
                <Text style={[styles.pill, { color: tc.text, borderColor: tc.cardBorder }]}>{STATUS_LABELS[t.status]}</Text>
              </View>
              <Text style={[styles.title, { color: tc.text }]}>{t.title}</Text>
              <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                {t.type === 'feature_request' ? 'Feature request' : 'Problem report'} · {words(t.category)} · {t.userName} ·{' '}
                {new Date(t.createdAt).toLocaleDateString()}
              </Text>
              <Text style={{ color: tc.text, fontSize: 14 }} numberOfLines={4}>
                {t.description}
              </Text>
              <View style={styles.actions}>
                {t.status === 'open' ? (
                  <ActionButton
                    label="Start"
                    icon="play"
                    color={theme.color}
                    variant="outline"
                    loading={busyId === t.id}
                    onPress={() => void setTicketStatus(t, 'in_progress')}
                  />
                ) : null}
                {t.status !== 'resolved' ? (
                  <ActionButton
                    label="Resolve"
                    icon="checkmark"
                    color="#15803D"
                    loading={busyId === t.id}
                    onPress={() => void setTicketStatus(t, 'resolved')}
                  />
                ) : (
                  <ActionButton
                    label="Reopen"
                    icon="refresh"
                    color="#B45309"
                    variant="outline"
                    loading={busyId === t.id}
                    onPress={() => void setTicketStatus(t, 'open')}
                  />
                )}
                {t.threadId ? (
                  <ActionButton
                    label="Conversation"
                    icon="chatbubbles"
                    color={tc.primary}
                    variant="outline"
                    onPress={() => router.push(`/(staff)/messages/${t.threadId}` as never)}
                  />
                ) : null}
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  number: { fontSize: 12, fontWeight: '700', flex: 1 },
  pill: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
});
