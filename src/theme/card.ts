import { Platform, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';

export const cardStyle: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: radii.card,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
};
