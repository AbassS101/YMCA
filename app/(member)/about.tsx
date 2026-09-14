import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { resetStore } from '@/storage/demoStore';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export default function AboutScreen() {
  const router = useRouter();
  const { logout } = useSession();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await resetStore();
      await logout();
      router.replace('/login');
    } finally {
      setResetting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <YHeader subtitle="About" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          YMCA Silver Spring · YMCA of Metropolitan Washington{'\n'}
          9800 Hastings Drive, Silver Spring, MD 20901{'\n'}
          Phone: (301) 585-2120 · silverspring@ymcadc.org{'\n\n'}
          Facility Hours:{'\n'}
          Monday–Friday: 5:30 AM – 10:00 PM{'\n'}
          Saturday: 7:00 AM – 8:00 PM{'\n'}
          Sunday: 8:00 AM – 8:00 PM{'\n\n'}
          Our Cause:{'\n'}
          The Y is a cause-driven nonprofit strengthening our community through youth development, healthy living, and social responsibility. Programs include aquatics, group fitness, active older adult wellness, child watch, camps, and community health.
        </Text>

        <PrimaryButton title="Reset demo data" onPress={() => void handleReset()} loading={resetting} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  back: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  disclaimer: {
    ...typography.body,
    color: colors.nearBlack,
    lineHeight: 22,
  },
});
