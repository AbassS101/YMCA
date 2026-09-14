import { StyleSheet, Text, View } from 'react-native';

import { YHeader } from '@/components/YHeader';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export default function MemberTrainersScreen() {
  return (
    <View style={styles.screen}>
      <YHeader subtitle="Trainers" />
      <View style={styles.body}>
        <Text style={styles.placeholder}>Trainers — Task 11</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholder: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
});
