import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { SessionRequest, SessionRequestAction, SessionRequestStatus } from '@/domain/types';
import { radii, spacing } from '@/theme/typography';

export const STATUS_LABEL: Record<SessionRequestStatus, string> = {
  pending: 'Waiting for reply',
  countered: 'New time offered',
  accepted: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const ACTION_LABEL: Record<SessionRequestAction, string> = {
  requested: 'Requested',
  auto_accepted: 'Booked instantly',
  accepted: 'Accepted',
  declined: 'Declined',
  countered: 'Offered another time',
  counter_accepted: 'Accepted the new time',
  counter_declined: 'Declined the new time',
  cancelled: 'Cancelled',
};

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(
    undefined,
    { hour: 'numeric', minute: '2-digit' }
  )}`;
}

export function SessionRequestCard({
  request,
  perspective,
  expandable,
  children,
}: {
  request: SessionRequest;
  /** Whose name to show as the "other side". */
  perspective: 'member' | 'staff' | 'oversight';
  /** Show a tap-to-expand history timeline. */
  expandable?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const tone =
    request.status === 'accepted'
      ? { fg: colors.success, bg: colors.successBg }
      : request.status === 'declined' || request.status === 'cancelled'
        ? { fg: colors.danger, bg: colors.dangerBg }
        : { fg: colors.gold, bg: colors.goldBg };
  const who =
    perspective === 'member'
      ? `with ${request.staffName ?? 'instructor'}`
      : perspective === 'staff'
        ? `from ${request.memberName ?? 'member'}`
        : `${request.memberName ?? 'Member'} with ${request.staffName ?? 'instructor'}`;
  const lastNote = [...request.history].reverse().find((e) => e.note)?.note;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <Pressable
        disabled={!expandable}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole={expandable ? 'button' : undefined}
        accessibilityLabel={expandable ? 'Toggle request history' : undefined}
      >
        <View style={styles.head}>
          <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
            {request.lessonType === 'swim' ? 'Private swim' : 'Personal training'} · {request.durationMin} min
          </Text>
          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.pillText, { color: tone.fg }]}>{STATUS_LABEL[request.status]}</Text>
          </View>
        </View>
        <Text style={[styles.line, { color: colors.text }]} allowFontScaling>
          {formatWhen(request.start)}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]} allowFontScaling>
          {who} · {request.location}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]} allowFontScaling>
          {request.paymentTiming === 'before' ? 'Pay before session' : 'Pay after session'}
          {request.swimmerName ? ` · Swimmer: ${request.swimmerName}` : ''}
        </Text>
        {lastNote ? (
          <Text style={[styles.note, { color: colors.text }]} allowFontScaling>
            &ldquo;{lastNote}&rdquo;
          </Text>
        ) : null}
      </Pressable>

      {expandable && open ? (
        <View style={[styles.timeline, { borderTopColor: colors.border }]}>
          {request.history.map((e, i) => (
            <Text key={`${e.at}-${i}`} style={[styles.sub, { color: colors.textMuted }]} allowFontScaling>
              {formatWhen(e.at)} · {e.byName}: {ACTION_LABEL[e.action]}
              {e.start ? ` (${formatWhen(e.start)})` : ''}
              {e.note ? ` — ${e.note}` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

export function SmallButton({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.dangerBg : colors.primaryLight;
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  pillText: { fontSize: 11, fontWeight: '800' },
  line: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12 },
  note: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  timeline: { borderTopWidth: 1, marginTop: 6, paddingTop: 6, gap: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  btn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full, minHeight: 36, justifyContent: 'center' },
  btnText: { fontSize: 13, fontWeight: '800' },
});
