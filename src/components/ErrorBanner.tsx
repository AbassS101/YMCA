import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import { tapTarget, typography } from '@/theme/typography';

const DEFAULT_MESSAGE = "Couldn't reach membership services";

type ErrorBannerProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message = DEFAULT_MESSAGE, onRetry }: ErrorBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <AppText style={styles.message}>{message}</AppText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <AppText style={styles.retryText}>Retry</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
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
    minHeight: tapTarget,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
});
