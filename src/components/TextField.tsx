import { forwardRef } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { AppText } from '@/components/AppText';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { radii, tapTarget, typography } from '@/theme/typography';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField({ label, error, style, ...inputProps }, ref) {
    const { colors } = useTheme();
    const { multiplier, scale } = useAccessibility();

    const scaledFontSize = Math.round(16 * multiplier);
    const scaledMinHeight = Math.max(tapTarget, Math.round(tapTarget * multiplier));

    return (
      <View style={styles.wrap}>
        {label ? <AppText style={[styles.label, { color: colors.muted }]}>{label}</AppText> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              color: colors.nearBlack,
              backgroundColor: colors.card,
              borderColor: colors.border,
              fontSize: scaledFontSize,
              minHeight: scaledMinHeight,
            },
            error ? styles.inputError : null,
            style,
          ]}
          accessibilityLabel={label}
          allowFontScaling
          {...inputProps}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    ...typography.label,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: tapTarget,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  error: {
    ...typography.caption,
    color: '#EF4444',
  },
});
