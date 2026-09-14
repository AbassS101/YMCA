import { Image, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/theme/typography';

const ymcaLogo = require('../../assets/ymca-logo.png');

type YHeaderProps = {
  subtitle?: string;
};

export function YHeader({ subtitle }: YHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: isDark ? colors.cardBg : colors.white,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.logoBar,
          { backgroundColor: isDark ? '#FFFFFF' : colors.white },
        ]}
      >
        <Image
          source={ymcaLogo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="YMCA"
        />
      </View>
      <View style={[styles.branchBar, { backgroundColor: colors.primaryDark }]}>
        <AppText style={styles.branch}>YMCA Silver Spring</AppText>
      </View>
      {subtitle ? (
        <AppText
          style={[
            styles.subtitle,
            {
              backgroundColor: colors.primaryLight,
              color: isDark ? colors.primary : colors.primaryDark,
            },
          ]}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
  },
  logoBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logo: {
    width: 200,
    height: 52,
  },
  branchBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  branch: {
    ...typography.wordmark,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyStrong,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
