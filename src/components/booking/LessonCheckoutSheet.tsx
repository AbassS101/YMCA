import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/theme/typography';

export type CheckoutLine = { label: string; value: string };

export function LessonCheckoutSheet({
  visible,
  title,
  lines,
  totalCents,
  paymentBrand,
  paymentLast4,
  busy,
  confirmLabel,
  footnote,
  totalText,
  onConfirm,
  onClose,
}: {
  /** Overrides the total value text, e.g. when nothing is charged yet. */
  totalText?: string;
  visible: boolean;
  title: string;
  lines: CheckoutLine[];
  totalCents: number;
  paymentBrand?: string;
  paymentLast4?: string;
  busy?: boolean;
  confirmLabel?: string;
  footnote?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const free = totalCents === 0;
  const total = totalText ?? (free ? 'Free' : `$${(totalCents / 100).toFixed(2)}`);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close checkout" />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
              {title}
            </Text>
            <View style={[styles.box, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {lines.map((l) => (
                <View key={l.label} style={styles.line}>
                  <Text style={[styles.lineLabel, { color: colors.textMuted }]} allowFontScaling>
                    {l.label}
                  </Text>
                  <Text style={[styles.lineValue, { color: colors.text }]} allowFontScaling>
                    {l.value}
                  </Text>
                </View>
              ))}
              <View style={[styles.line, styles.totalLine, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total due today</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{total}</Text>
              </View>
            </View>
            {!free ? (
              <Text style={[styles.pay, { color: colors.textMuted }]} allowFontScaling>
                Charged to {paymentBrand ?? 'Card'} ending in {paymentLast4 ?? '4242'}
              </Text>
            ) : null}
            {footnote ? (
              <Text style={[styles.foot, { color: colors.textMuted }]} allowFontScaling>
                {footnote}
              </Text>
            ) : null}
            <PrimaryButton
              title={confirmLabel ?? (free ? 'Confirm' : `Pay ${total}`)}              onPress={onConfirm}
              loading={busy}
            />
            <SecondaryButton title="Cancel" onPress={onClose} disabled={busy} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginTop: 8 },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '800' },
  box: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { fontSize: 14 },
  lineValue: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  totalLine: { borderTopWidth: 1, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  pay: { fontSize: 13, textAlign: 'center' },
  foot: { fontSize: 12, textAlign: 'center' },
});
