import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'none',
    letterSpacing: 0.2,
    fontSize: 12,
  },
  input: {
    ...typography.body,
    color: colors.nearBlack,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: colors.scarlet,
  },
  error: {
    ...typography.body,
    fontSize: 12,
    color: colors.scarlet,
  },
});
