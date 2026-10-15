import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  MAINTENANCE_CATEGORIES,
  type ComplaintSuggestion,
  type FeedbackType,
  type FeedbackUrgency,
  type MaintenanceCategory,
} from '@/domain/types';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, typography } from '@/theme/typography';

import { hubAccent } from './hubTheme';

const BRANCH_ID = 'silver-spring';

export type MaintenanceFiler =
  | { kind: 'member'; memberId: string }
  | { kind: 'staff'; staffId: string; staffName: string };

export function maintenanceStatusBadge(status: ComplaintSuggestion['status']) {
  switch (status) {
    case 'under_review':
      return { label: 'IN PROGRESS', bg: '#EDE9FE', color: '#6D28D9' };
    case 'resolved':
      return { label: 'RESOLVED', bg: '#DCFCE7', color: '#15803D' };
    default:
      return { label: 'OPEN', bg: '#FEF3C7', color: '#B45309' };
  }
}

export function urgencyBadge(urgency?: FeedbackUrgency) {
  switch (urgency) {
    case 'urgent':
      return { label: 'URGENT', bg: '#FEE2E2', color: '#B91C1C' };
    case 'low':
      return { label: 'LOW', bg: '#E0F2FE', color: '#075985' };
    default:
      return { label: 'NORMAL', bg: '#F1F5F9', color: '#475467' };
  }
}

const URGENCIES: { key: FeedbackUrgency; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'normal', label: 'Normal' },
  { key: 'urgent', label: 'Urgent' },
];

type Props = {
  filer: MaintenanceFiler;
  /** Called after a report is filed, so a parent can refresh counts. */
  onSubmitted?: () => void;
};

/** Report a facility problem or suggest an improvement, then follow your own reports. Members and staff share it. */
export function MaintenanceReports({ filer, onSubmitted }: Props) {
  const { api } = useSession();
  const { colors, isDark } = useTheme();
  const { color: accent, soft } = hubAccent('maintenance', isDark);
  const filerId = filer.kind === 'member' ? filer.memberId : filer.staffId;

  const [type, setType] = useState<FeedbackType>('complaint');
  const [category, setCategory] = useState<MaintenanceCategory>('maint_gym_equipment');
  const [urgency, setUrgency] = useState<FeedbackUrgency>('normal');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mine, setMine] = useState<ComplaintSuggestion[]>([]);

  const loadMine = useCallback(async () => {
    if (!filerId) return;
    try {
      const list =
        filer.kind === 'member'
          ? await complaintSuggestionRepo.list(api, BRANCH_ID, filer.memberId, 'maintenance')
          : await complaintSuggestionRepo.listMaintenanceByStaff(api, BRANCH_ID, filer.staffId);
      setMine(list);
    } catch {
      setMine([]);
    }
  }, [api, filer, filerId]);

  useFocusEffect(
    useCallback(() => {
      void loadMine();
    }, [loadMine])
  );

  const submit = async () => {
    if (!title.trim()) {
      setFormError('Add a short title so the team knows what to look for.');
      return;
    }
    if (details.trim().length < 10) {
      setFormError('Add a little more detail (at least 10 characters).');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      let memberName: string | undefined;
      let memberEmail: string | undefined;
      if (filer.kind === 'member' && !anonymous) {
        const m = await api.getMember(filer.memberId).catch(() => null);
        memberName = m?.name;
        memberEmail = m?.email;
      }
      await complaintSuggestionRepo.create(api, {
        type,
        category,
        title: title.trim(),
        details: details.trim(),
        branchId: BRANCH_ID,
        department: 'maintenance',
        urgency,
        location: location.trim() || undefined,
        isAnonymous: filer.kind === 'member' ? anonymous : false,
        ...(filer.kind === 'member'
          ? { memberId: filer.memberId, memberName, memberEmail }
          : { submittedByStaffId: filer.staffId, submittedByStaffName: filer.staffName }),
      });
      setTitle('');
      setDetails('');
      setLocation('');
      setAnonymous(false);
      setUrgency('normal');
      await loadMine();
      onSubmitted?.();
      dialog.alert(
        type === 'complaint' ? 'Report Sent' : 'Suggestion Sent',
        'Thank you. The maintenance team has been notified and you can follow progress below.',
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardTheme = { backgroundColor: colors.cardBg, borderColor: colors.cardBorder };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.card, cardTheme]}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: soft }]}>
            <Ionicons name="construct" size={24} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.text }]} allowFontScaling>
              Facilities & Maintenance
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]} allowFontScaling>
              Report something broken or share an idea to improve the building. It goes straight to the maintenance team.
            </Text>
          </View>
        </View>

        <View style={[styles.segment, { backgroundColor: isDark ? colors.card : colors.surfaceMuted, borderColor: colors.border }]}>
          {(['complaint', 'suggestion'] as const).map((t) => {
            const active = type === t;
            return (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.segmentBtn, active ? { backgroundColor: colors.cardBg } : null]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={{ color: active ? accent : colors.textMuted, fontWeight: '700', fontSize: 14 }}>
                  {t === 'complaint' ? 'Report a Problem' : 'Suggest an Improvement'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>What is it about?</Text>
        <View style={styles.catGrid}>
          {MAINTENANCE_CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id as MaintenanceCategory)}
                style={[styles.cat, { borderColor: active ? accent : colors.border, backgroundColor: active ? soft : colors.cardBg }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${c.label}. ${c.description}`}
              >
                <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={18} color={active ? accent : colors.textMuted} />
                <Text style={{ color: active ? accent : colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1 }} allowFontScaling>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {type === 'complaint' ? (
          <>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>How urgent?</Text>
            <View style={styles.urgRow}>
              {URGENCIES.map((u) => {
                const active = urgency === u.key;
                const tone = urgencyBadge(u.key);
                return (
                  <Pressable
                    key={u.key}
                    onPress={() => setUrgency(u.key)}
                    style={[styles.urg, { borderColor: active ? tone.color : colors.border, backgroundColor: active ? tone.bg : colors.cardBg }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={{ color: active ? tone.color : colors.textMuted, fontWeight: '700', fontSize: 13 }}>{u.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <TextField label="Where? (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Lap pool deck, men's locker room" />
        <TextField label="Short title" value={title} onChangeText={setTitle} placeholder="e.g. Treadmill 4 belt slipping" />
        <TextField
          label="Details"
          value={details}
          onChangeText={setDetails}
          placeholder="What did you see? When did it start?"
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        {filer.kind === 'member' ? (
          <View style={styles.anonRow}>
            <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} allowFontScaling>
              Send anonymously
            </Text>
            <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: accent }} accessibilityLabel="Send anonymously" />
          </View>
        ) : null}

        {formError ? (
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }} accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        <PrimaryButton
          title={submitting ? 'Sending...' : type === 'complaint' ? 'Send to Maintenance' : 'Send Suggestion'}
          onPress={() => void submit()}
          disabled={submitting}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]} allowFontScaling>
        My maintenance reports ({mine.length})
      </Text>
      {mine.length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted }]} allowFontScaling>
          Nothing sent yet. Reports you file will show up here with the team&apos;s reply.
        </Text>
      ) : (
        mine.map((item) => {
          const st = maintenanceStatusBadge(item.status);
          const ur = urgencyBadge(item.urgency);
          const cat = MAINTENANCE_CATEGORIES.find((c) => c.id === item.category);
          return (
            <View key={item.id} style={[styles.card, cardTheme, { gap: 6 }]}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                {item.type === 'complaint' ? (
                  <View style={[styles.badge, { backgroundColor: ur.bg }]}>
                    <Text style={[styles.badgeText, { color: ur.color }]}>{ur.label}</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.badgeText, { color: '#075985' }]}>IDEA</Text>
                  </View>
                )}
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }} allowFontScaling>
                {item.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }} allowFontScaling>
                {cat?.label ?? 'Facility'}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
              {item.staffResponse ? (
                <View style={[styles.reply, { borderLeftColor: accent, backgroundColor: soft }]}>
                  <Text style={{ color: accent, fontSize: 11, fontWeight: '800' }}>
                    {item.respondedByStaffName ?? 'Maintenance team'}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 13 }} allowFontScaling>
                    {item.staffResponse}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardStyle, gap: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...typography.title, fontSize: 18 },
  hint: { fontSize: 13, lineHeight: 18 },
  segment: { flexDirection: 'row', borderRadius: radii.button, borderWidth: 1, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radii.button - 2 },
  eyebrow: { ...typography.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: radii.button, paddingHorizontal: 10, paddingVertical: 8, minWidth: '47%', flexGrow: 1 },
  urgRow: { flexDirection: 'row', gap: 8 },
  urg: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radii.button, borderWidth: 1.5 },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...typography.title, fontSize: 18 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  reply: { borderLeftWidth: 3, padding: 8, borderRadius: 6, gap: 2 },
});
