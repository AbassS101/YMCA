import { Text, type TextProps, type StyleProp, type TextStyle, StyleSheet } from 'react-native';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Text that respects the in-app Standard / Larger / Largest control.
 */
export function AppText({ style, ...props }: TextProps) {
  const { multiplier } = useAccessibility();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaled: StyleProp<TextStyle> =
    flat?.fontSize != null
      ? [style, { fontSize: Math.round(flat.fontSize * multiplier) }]
      : style;

  return <Text {...props} style={scaled} allowFontScaling />;
}
