import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import { AQUATICS_SESSION_INFO, type AquaticsClassOffering } from '@/domain/aquaticsGuideData';
import { formatCents } from '@/domain/lessonPricing';
import { radii, spacing } from '@/theme/typography';

export function SwimEnrollSheet({
  offering,
  priceCents,
  defaultName,
  onContinue,
  onClose,
}: {
  offering: AquaticsClassOffering | null;
  priceCents: number;
  defaultName: string;
  onContinue: (participantName: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(defaultName);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    setName(defaultName);
    setAck(false);
  }, [offering, defaultName]);

  if (!offering) {
    return null;
  }

  const info = AQUATICS_SESSION_INFO;
  const rows: [string, string][] = [
    ['Session', `${info.sessionName} (${info.startDate} - ${info.endDate})`],
    ['Schedule', `${offering.day}s, ${offering.startTime} - ${offering.endTime}`],
    ['Classes', `${offering.totalClasses} over ${offering.durationWeeks} weeks`],
    ['Pool', offering.poolLocation],
    ['Class code', offering.classCode],
    ['Price', formatCents(priceCents)],
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
              {offering.title}
            </Text>
            <View style={[styles.box, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {rows.map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{k}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, flexShrink: 1, textAlign: 'right' }}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>
            {offering.notes ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }} allowFontScaling>
                {offering.notes}
              </Text>
            ) : null}

            <Text style={[styles.label, { color: colors.text }]}>Participant name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Swimmer's full name"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              accessibilityLabel="Participant name"
            />

            <View style={[styles.policy, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>
                Refund and cancellation policy
              </Text>
              <Text style={{ color: colors.text, fontSize: 12 }} allowFontScaling>
                Credits or refunds are given only for family emergencies or medical reasons with a doctor's
                note, and are prorated after the session starts. No make-ups for individual absences.
                Classes need at least 3 participants or may be combined or canceled, with a full refund or
                switch offered.
              </Text>
            </View>
            <Pressable
              onPress={() => setAck((a) => !a)}
              style={styles.ackRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ack }}
              accessibilityLabel="I understand the refund policy"
            >
              <Ionicons
                name={ack ? 'checkbox' : 'square-outline'}
                size={26}
                color={ack ? colors.primary : colors.textMuted}
              />
              <Text style={{ color: colors.text, flex: 1, fontSize: 14 }} allowFontScaling>
                I understand the refund policy
              </Text>
            </Pressable>

            <PrimaryButton
              title="Continue to checkout"
              onPress={() => onContinue(name.trim() || defaultName)}
              disabled={!ack || name.trim() === ''}
            />
            <SecondaryButton title="Cancel" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '800' },
  box: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 14, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 12, minHeight: 48, fontSize: 16 },
  policy: { borderRadius: radii.md, padding: spacing.sm, gap: 4 },
  ackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
});
