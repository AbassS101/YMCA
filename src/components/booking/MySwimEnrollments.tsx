import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { AQUATICS_CLASSES } from '@/domain/aquaticsGuideData';
import { formatCents } from '@/domain/lessonPricing';
import type { SwimClassEnrollment } from '@/domain/types';
import { radii, spacing } from '@/theme/typography';

export function MySwimEnrollments({
  enrollments,
  onRequestRefund,
}: {
  enrollments: SwimClassEnrollment[];
  onRequestRefund: (e: SwimClassEnrollment) => void;
}) {
  const sessionInfo = useAppConfig().config.aquaticsSession;
  const { colors } = useTheme();
  if (enrollments.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.heading, { color: colors.text }]} allowFontScaling>
        My swim enrollments
      </Text>
      {enrollments.map((e) => {
        const c = AQUATICS_CLASSES.find((x) => x.id === e.classId);
        return (
          <View
            key={e.id}
            style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} allowFontScaling>
              {c?.title ?? e.classId}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} allowFontScaling>
              {e.participantName} · {c ? `${c.day}s ${c.startTime}` : ''} ·{' '}
              {sessionInfo.sessionName}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} allowFontScaling>
              {e.paidAmountCents > 0
                ? `Paid ${formatCents(e.paidAmountCents)} with card ending ${e.paymentLast4 ?? ''}`
                : 'Free class'}
            </Text>
            <Pressable
              onPress={() => onRequestRefund(e)}
              accessibilityRole="button"
              accessibilityLabel={`Request refund for ${c?.title ?? 'class'}`}
              style={styles.link}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Request refund</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 3 },
  link: { minHeight: 40, justifyContent: 'center' },
});
