import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { YHeader } from '@/components/YHeader';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/theme/typography';

/** Stack screen frame for staff tools: header, back button, scrolling body, and an access gate. */
export function StaffScreen({
  subtitle,
  allowed = true,
  children,
  overlay,
}: {
  subtitle: string;
  allowed?: boolean;
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const router = useRouter();
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color={tc.primary} />
          <Text style={{ color: tc.primary, fontWeight: '700' }}>Back</Text>
        </Pressable>
        {allowed ? children : <Text style={{ color: tc.text, fontSize: 15 }}>You do not have access to this tool.</Text>}
      </ScrollView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
});
