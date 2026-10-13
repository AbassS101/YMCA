import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { SWIM_STAGES, type AquaticsClassOffering } from '@/domain/aquaticsGuideData';
import { formatCents } from '@/domain/lessonPricing';
import { radii, spacing } from '@/theme/typography';

export function SwimClassRow({
  offering,
  priceCents,
  otherTierCents,
  spotsLeft,
  enrolled,
  onPress,
}: {
  offering: AquaticsClassOffering;
  priceCents: number;
  otherTierCents: number;
  spotsLeft: number;
  enrolled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const stage = SWIM_STAGES.find((s) => s.code === offering.stageCode);
  const badgeBg = stage?.badgeBg ?? colors.primaryLight;
  const badgeText = stage?.badgeText ?? colors.primary;
  const full = spotsLeft <= 0;
  const free = priceCents === 0;
  const cta = enrolled ? 'Enrolled' : full ? 'Full' : free ? 'Enroll Free' : 'Enroll & Pay';

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.top}>
        <Text style={[styles.time, { color: colors.primary }]} allowFontScaling>
          {offering.day.slice(0, 3)} {offering.startTime} - {offering.endTime}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeText }]}>
            {stage ? `Stage ${stage.code}` : offering.stageCode}
          </Text>
        </View>
      </View>
      <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
        {offering.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]} allowFontScaling>
        {offering.ageCategory} · {offering.totalClasses} classes · {offering.poolLocation} · Code{' '}
        {offering.classCode}
      </Text>
      <View style={styles.bottom}>
        <View>
          <Text style={[styles.price, { color: free ? colors.success : colors.text }]} allowFontScaling>
            {formatCents(priceCents)}
          </Text>
          {!free && otherTierCents !== priceCents ? (
            <Text style={[styles.strike, { color: colors.textMuted }]}>{formatCents(otherTierCents)}</Text>
          ) : null}
          <Text
            style={[styles.spots, { color: spotsLeft <= 2 ? colors.danger : colors.textMuted }]}
            allowFontScaling
          >
            {full ? 'Class full' : `${spotsLeft} spots left`}
          </Text>
        </View>
        <Pressable
          onPress={onPress}
          disabled={enrolled || full}
          style={[
            styles.cta,
            { backgroundColor: enrolled ? colors.successBg : colors.primary, opacity: full ? 0.45 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${cta}: ${offering.title}`}
          accessibilityState={{ disabled: enrolled || full }}
        >
          <Text style={{ color: enrolled ? colors.success : '#FFFFFF', fontWeight: '800' }}>{cta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 14, fontWeight: '800' },
  badge: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 12 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  price: { fontSize: 22, fontWeight: '800' },
  strike: { fontSize: 12, textDecorationLine: 'line-through' },
  spots: { fontSize: 12, fontWeight: '700' },
  cta: { borderRadius: radii.button, paddingHorizontal: 18, minHeight: 48, justifyContent: 'center' },
});
