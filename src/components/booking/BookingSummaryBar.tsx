import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/theme/typography';

export function BookingSummaryBar({
  title,
  detail,
  buttonLabel,
  disabled,
  loading,
  onPress,
}: {
  title: string;
  detail: string;
  buttonLabel: string;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} allowFontScaling>
          {title}
        </Text>
        <Text style={[styles.detail, { color: colors.textMuted }]} numberOfLines={2} allowFontScaling>
          {detail}
        </Text>
      </View>
      <PrimaryButton
        title={buttonLabel}
        onPress={onPress}
        disabled={disabled}
        loading={loading}
        accessibilityHint="Opens the checkout summary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, padding: spacing.sm, gap: spacing.xs },
  info: { gap: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  detail: { fontSize: 13 },
});
