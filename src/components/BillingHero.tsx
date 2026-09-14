import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

type BillingHeroProps = {
  nextBillingDateLabel: string;
  subtitle: string;
};

export function BillingHero({ nextBillingDateLabel, subtitle }: BillingHeroProps) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.topRow}>
        <AppText style={styles.label}>Next billing date</AppText>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>Active Member</AppText>
        </View>
      </View>
      <AppText style={styles.date}>{nextBillingDateLabel}</AppText>
      <AppText style={styles.subtitle}>{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    ...typography.label,
    color: colors.mutedOnDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  date: {
    ...typography.heroDate,
    color: colors.white,
  },
  subtitle: {
    ...typography.body,
    color: colors.offWhite,
    marginTop: 4,
  },
});
