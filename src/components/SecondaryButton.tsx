import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import { radii, tapTarget, typography } from '@/theme/typography';

type SecondaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
};

export function SecondaryButton({
  title,
  onPress,
  disabled,
  loading,
  destructive,
  accessibilityHint,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;
  const accent = destructive ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { borderColor: accent },
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={accent} />
      ) : (
        <AppText style={[styles.title, { color: accent }]}>{title}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tapTarget,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  title: {
    ...typography.bodyStrong,
  },
});
