import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { filterProfanity } from '@/domain/types';
import { useChatTheme } from './chatTheme';

export const REPORT_REASONS = [
  'Profanity / Inappropriate Language',
  'Harassment or Disrespectful Behavior',
  'Spam or Promotional Content',
  'Safety / Community Guidelines Violation',
];

type Props = {
  visible: boolean;
  authorName: string;
  content: string;
  onClose: () => void;
  /** Resolves with the ticket number. */
  onSubmit: (reason: string, details: string) => Promise<string>;
};

export function ReportContentSheet({ visible, authorName, content, onClose, onSubmit }: Props) {
  const theme = useChatTheme();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setReason(REPORT_REASONS[0]);
      setDetails('');
      setTicket(null);
      setError(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [visible]);

  const submit = async () => {
    setBusy(true);
    setError(false);
    try {
      setTicket(await onSubmit(reason, details));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.head}>
            <Ionicons name="flag" size={18} color={theme.accent} />
            <Text style={[styles.title, { color: theme.text }]}>Report to YMCA IT</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.muted} />
            </Pressable>
          </View>

          <View style={[styles.preview, { backgroundColor: theme.input }]}>
            <Text style={[styles.previewAuthor, { color: theme.text }]}>{authorName}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={3}>
              {filterProfanity(content)}
            </Text>
          </View>

          {ticket ? (
            <View style={styles.success}>
              <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
              <Text style={[styles.successTitle, { color: theme.text }]}>Ticket #{ticket} sent</Text>
              <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center' }}>
                YMCA IT has received your report and will review it.
              </Text>
              <Pressable onPress={onClose} style={[styles.primary, { backgroundColor: '#16A34A' }]}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {REPORT_REASONS.map((r) => {
                const on = r === reason;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    style={[
                      styles.reason,
                      { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.reactionActiveBg : 'transparent' },
                    ]}
                  >
                    <Ionicons
                      name={on ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={on ? theme.accent : theme.muted}
                    />
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: on ? '700' : '500', flex: 1 }}>
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Optional details..."
                placeholderTextColor={theme.muted}
                maxLength={250}
                style={[styles.input, { color: theme.text, backgroundColor: theme.input }]}
              />
              {error ? (
                <Text style={{ color: theme.danger, fontSize: 12 }}>Could not send report. Try again.</Text>
              ) : null}
              <Pressable
                onPress={() => void submit()}
                disabled={busy}
                style={[styles.primary, { backgroundColor: theme.accent }]}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Send report</Text>}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end', padding: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800' },
  preview: { padding: 10, borderRadius: 10, gap: 2 },
  previewAuthor: { fontSize: 12, fontWeight: '800' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  primary: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, minWidth: 120 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  success: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  successTitle: { fontSize: 15, fontWeight: '800' },
});
