import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const DEFAULT_MESSAGE = "Couldn't reach membership services";

type ErrorBannerProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message = DEFAULT_MESSAGE, onRetry }: ErrorBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.scarlet,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  message: {
    ...typography.body,
    color: colors.white,
    flex: 1,
  },
  retry: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 6,
  },
  retryText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
