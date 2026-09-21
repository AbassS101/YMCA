import { Text, type TextProps, type StyleProp, type TextStyle, StyleSheet } from 'react-native';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Text that respects the in-app Standard / Larger / Largest control.
 */
export function AppText({ style, ...props }: TextProps) {
  const { multiplier } = useAccessibility();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;

  let scaledStyle: TextStyle | undefined;
  if (flat?.fontSize != null) {
    const newFontSize = Math.round(flat.fontSize * multiplier);
    const newLineHeight =
      flat.lineHeight != null
        ? Math.max(Math.round(flat.lineHeight * multiplier), Math.round(newFontSize * 1.25))
        : undefined;

    scaledStyle = {
      fontSize: newFontSize,
      ...(newLineHeight != null ? { lineHeight: newLineHeight } : {}),
    };
  }

  const scaled: StyleProp<TextStyle> = scaledStyle ? [style, scaledStyle] : style;

  return <Text {...props} style={scaled} allowFontScaling />;
}
