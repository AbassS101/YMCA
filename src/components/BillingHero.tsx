import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type BillingHeroProps = {
  nextBillingDateLabel: string;
  subtitle: string;
};

export function BillingHero({ nextBillingDateLabel, subtitle }: BillingHeroProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Next billing date</Text>
      <Text style={styles.date}>{nextBillingDateLabel}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.nearBlack,
    borderRadius: 12,
    padding: 20,
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.muted,
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
