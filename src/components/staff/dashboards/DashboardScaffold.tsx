import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle={subtitle} />
      {error ? <ErrorBanner onRetry={onRetry} /> : null}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
        <View style={[styles.footer, { borderColor: tc.cardBorder }]}>
          <Pressable onPress={() => router.push('/(staff)/schedules?view=pool')} style={styles.footerAction} accessibilityRole="button" accessibilityLabel="Open pool schedule">
            <Ionicons name="water-outline" size={18} color={tc.primary} />
            <Text style={{ color: tc.primary, fontSize: 13, fontWeight: '600' }}>Pool schedule</Text>
          </Pressable>
          {onRetry ? <Pressable onPress={onRetry} style={styles.footerAction} accessibilityRole="button" accessibilityLabel="Refresh dashboard"><Ionicons name="refresh-outline" size={18} color={tc.textMuted} /><Text style={{ color: tc.textMuted, fontSize: 13 }}>Refresh</Text></Pressable> : null}
        </View>
      </ScrollView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  footer: { borderTopWidth: 1, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerAction: { flexDirection: 'row', gap: 7, minHeight: 44, alignItems: 'center', paddingHorizontal: 4 },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
});
