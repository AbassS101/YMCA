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
          Prototype — not an official published YMCA app. Demo data only; not connected to real
          membership or billing systems.
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
    color: colors.scarlet,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.body,
    color: colors.nearBlack,
    lineHeight: 22,
  },
});
