import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type YHeaderProps = {
  subtitle?: string;
};

function TriangleMark() {
  return (
    <View style={styles.triangle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
  );
}

export function YHeader({ subtitle }: YHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <TriangleMark />
        <Text style={styles.wordmark}>YMCA SILVER SPRING</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const TRIANGLE_SIZE = 12;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.scarlet,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: TRIANGLE_SIZE,
    borderRightWidth: TRIANGLE_SIZE,
    borderBottomWidth: TRIANGLE_SIZE * 1.4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.white,
    marginTop: 2,
  },
  wordmark: {
    ...typography.wordmark,
    color: colors.white,
  },
  subtitle: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    opacity: 0.92,
  },
});
