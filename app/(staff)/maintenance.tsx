import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { MaintenanceReports, maintenanceStatusBadge, urgencyBadge } from '@/components/staffHub/MaintenanceReports';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import {
  ageLabel,
  filterMaintenanceQueue,
  summarizeMaintenance,
  ticketSource,
  type MaintenanceFilter,
  type MaintenanceSource,
} from '@/domain/maintenanceTickets';
import { MAINTENANCE_CATEGORIES, type ComplaintSuggestion, type FeedbackStatus } from '@/domain/types';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';
import { radii, spacing } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

const FILTERS: { key: MaintenanceFilter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

const SOURCES: { key: MaintenanceSource; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'member', label: 'Members' },
  { key: 'staff', label: 'Staff' },
];

const NEXT_STATUS: { key: FeedbackStatus; label: string }[] = [
  { key: 'under_review', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];

function filedBy(item: ComplaintSuggestion): string {
  if (item.submittedByStaffName) return `${item.submittedByStaffName} (staff)`;
  if (item.isAnonymous) return 'Anonymous member';
  return item.memberName ? `${item.memberName} (member)` : 'Member';
}

export default function MaintenanceScreen() {
  const { api, session } = useSession();
  const { colors: tc } = useTheme();
  const { can, theme } = useStaffCapabilities();
  const staffId = session?.userId ?? '';
  const isHandler = can('manageMaintenance');

  const [items, setItems] = useState<ComplaintSuggestion[]>([]);
  const [filter, setFilter] = useState<MaintenanceFilter>('open');
  const [source, setSource] = useState<MaintenanceSource>('all');
  const [responding, setResponding] = useState<ComplaintSuggestion | null>(null);
  const [reply, setReply] = useState('');
  const [nextStatus, setNextStatus] = useState<FeedbackStatus>('under_review');
  const [saving, setSaving] = useState(false);
  const [myName, setMyName] = useState('Staff');

  useEffect(() => {
    if (!staffId) return;
    api
      .getStaff(staffId)
      .then((s) => setMyName(s.name))
      .catch(() => undefined);
  }, [api, staffId]);

  const load = useCallback(async () => {
    if (!isHandler) return;
    try {
      setItems(await complaintSuggestionRepo.list(api, BRANCH_ID, undefined, 'maintenance'));
    } catch {
      setItems([]);
    }
  }, [api, isHandler]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(() => summarizeMaintenance(items), [items]);
  const queue = useMemo(() => filterMaintenanceQueue(items, filter, source), [items, filter, source]);

  const openResponder = (item: ComplaintSuggestion) => {
    setResponding(item);
    setReply(item.staffResponse ?? '');
    setNextStatus(item.status === 'submitted' ? 'under_review' : item.status);
  };

  const save = async () => {
    if (!responding) return;
    setSaving(true);
    try {
      const me = await api.getStaff(staffId).catch(() => null);
      await complaintSuggestionRepo.updateStatus(api, responding.id, nextStatus, reply.trim() || undefined, staffId, me?.name);
      setResponding(null);
      await load();
    } catch (e) {
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not save the update.');
    } finally {
      setSaving(false);
    }
  };

  if (!isHandler) {
    return (
      <StaffScreen subtitle="Report to Maintenance">
        <MaintenanceReports filer={{ kind: 'staff', staffId, staffName: myName }} />
      </StaffScreen>
    );
  }

  return (
    <StaffScreen subtitle="Maintenance Requests">
      <View style={styles.summary}>
        {[
          { label: 'Open', value: summary.open, color: theme.color },
          { label: 'Urgent', value: summary.urgent, color: '#B91C1C' },
          { label: 'In progress', value: summary.inProgress, color: '#6D28D9' },
          { label: 'Done this week', value: summary.resolvedThisWeek, color: '#15803D' },
        ].map((k) => (
          <View key={k.label} style={[styles.kpi, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={{ color: k.color, fontSize: 22, fontWeight: '800' }}>{k.value}</Text>
            <Text style={{ color: tc.textMuted, fontSize: 11, fontWeight: '700' }}>{k.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chipRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, { backgroundColor: filter === f.key ? theme.color : tc.cardBg, borderColor: filter === f.key ? theme.color : tc.cardBorder }]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.key }}
          >
            <Text style={{ color: filter === f.key ? '#FFFFFF' : tc.text, fontWeight: '700', fontSize: 13 }}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chipRow}>
        {SOURCES.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setSource(s.key)}
            style={[styles.chip, styles.chipSmall, { backgroundColor: source === s.key ? `${theme.color}1A` : tc.cardBg, borderColor: source === s.key ? theme.color : tc.cardBorder }]}
            accessibilityRole="button"
            accessibilityState={{ selected: source === s.key }}
          >
            <Text style={{ color: source === s.key ? theme.color : tc.textMuted, fontWeight: '700', fontSize: 12 }}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionCard title="Queue" icon="construct-outline" accent={theme.color} count={queue.length} subtitle="Urgent first, then oldest">
        {queue.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" text="Nothing here. Nice work." />
        ) : (
          queue.map((item) => {
            const st = maintenanceStatusBadge(item.status);
            const ur = urgencyBadge(item.urgency);
            const cat = MAINTENANCE_CATEGORIES.find((c) => c.id === item.category);
            return (
              <View key={item.id} style={[styles.ticket, { borderColor: item.urgency === 'urgent' && item.status !== 'resolved' ? '#FCA5A5' : tc.cardBorder }]}>
                <View style={styles.chipRow}>
                  <StatusPill label={st.label} color={st.color} bg={st.bg} />
                  {item.type === 'complaint' ? <StatusPill label={ur.label} color={ur.color} bg={ur.bg} /> : <StatusPill label="IDEA" color="#075985" bg="#E0F2FE" />}
                  <Text style={{ color: tc.textMuted, fontSize: 11 }}>{ageLabel(item.createdAt)}</Text>
                </View>
                <Text style={{ color: tc.text, fontSize: 15, fontWeight: '800' }} allowFontScaling>
                  {item.title}
                </Text>
                <Text style={{ color: tc.textMuted, fontSize: 12 }} allowFontScaling>
                  {cat?.label ?? 'Facility'}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
                <Text style={{ color: tc.text, fontSize: 13 }} allowFontScaling>
                  {item.details}
                </Text>
                <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                  <Ionicons name={ticketSource(item) === 'staff' ? 'id-card-outline' : 'person-outline'} size={12} /> {filedBy(item)}
                </Text>
                {item.staffResponse ? (
                  <View style={[styles.reply, { borderLeftColor: theme.color }]}>
                    <Text style={{ color: tc.textMuted, fontSize: 12 }} allowFontScaling>
                      {item.respondedByStaffName ?? 'Maintenance'}: {item.staffResponse}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => openResponder(item)}
                  style={[styles.respondBtn, { borderColor: theme.color }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Update ${item.title}`}
                >
                  <Ionicons name="create-outline" size={15} color={theme.color} />
                  <Text style={{ color: theme.color, fontWeight: '700', fontSize: 13 }}>
                    {item.status === 'resolved' ? 'Edit reply' : 'Update & reply'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </SectionCard>

      <Modal visible={responding != null} transparent animationType="slide" onRequestClose={() => setResponding(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={[styles.sheet, { backgroundColor: tc.cardBg }]}>
            <Text style={{ color: tc.text, fontSize: 17, fontWeight: '800' }} allowFontScaling>
              {responding?.title}
            </Text>
            <Text style={{ color: tc.textMuted, fontSize: 13 }}>Status</Text>
            <View style={styles.chipRow}>
              {NEXT_STATUS.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => setNextStatus(s.key)}
                  style={[styles.chip, { backgroundColor: nextStatus === s.key ? theme.color : tc.cardBg, borderColor: nextStatus === s.key ? theme.color : tc.cardBorder }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: nextStatus === s.key }}
                >
                  <Text style={{ color: nextStatus === s.key ? '#FFFFFF' : tc.text, fontWeight: '700', fontSize: 13 }}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: tc.textMuted, fontSize: 13 }}>Reply (shown to the person who filed it)</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                multiline
                placeholder="e.g. Tagged out of service, technician booked for Thursday."
                placeholderTextColor={tc.textMuted}
                style={[styles.input, { color: tc.text, borderColor: tc.cardBorder }]}
                accessibilityLabel="Reply"
              />
            </ScrollView>
            <PrimaryButton title={saving ? 'Saving...' : 'Save update'} onPress={() => void save()} disabled={saving} />
            <Pressable onPress={() => setResponding(null)} style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
              <Text style={{ color: tc.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: radii.button, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1.5, minHeight: 36, justifyContent: 'center' },
  chipSmall: { paddingVertical: 5, minHeight: 30 },
  ticket: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 6 },
  reply: { borderLeftWidth: 3, paddingLeft: 8 },
  respondBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radii.button, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radii.button, padding: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 15 },
});
