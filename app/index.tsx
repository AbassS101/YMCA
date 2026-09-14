import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>YMCA SILVER SPRING</Text>
      <Text style={styles.subtitle}>Prototype shell — routes coming in later tasks.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.scarlet,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
