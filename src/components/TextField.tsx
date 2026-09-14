import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/context/ThemeContext';
import { radii, tapTarget, typography } from '@/theme/typography';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? <AppText style={[styles.label, { color: colors.muted }]}>{label}</AppText> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            color: colors.nearBlack,
            backgroundColor: colors.card,
            borderColor: colors.border,
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
