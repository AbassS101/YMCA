import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { YHeader } from '@/components/YHeader';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/theme/typography';

type DashboardScaffoldProps = {
  subtitle: string;
  error?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  overlay?: ReactNode;
};

export function DashboardScaffold({ subtitle, error, onRetry, children, overlay }: DashboardScaffoldProps) {
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle={subtitle} />
      {error ? <ErrorBanner onRetry={onRetry} /> : null}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}

      </ScrollView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
});
