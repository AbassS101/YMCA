import { Platform, ViewStyle } from 'react-native';
import { colors, type ThemeColors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';

/** Theme-aware card style. Use inside makeStyles(colors) so dark mode is respected. */
export function makeCardStyle(c: ThemeColors): ViewStyle {
  const dark = c.background !== colors.background;
  return {
    backgroundColor: c.cardBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: dark ? 0.35 : 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: dark ? 1 : 3,
      },
      default: {},
    }),
  };
}

/** Light-only static card style (legacy). Prefer makeCardStyle in themed screens. */
export const cardStyle: ViewStyle = makeCardStyle(colors);
