import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

export type DialogIconType =
  | 'calendar'
  | 'checkmark'
  | 'card'
  | 'trash'
  | 'fitness'
  | 'alert'
  | 'info';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type ThemedDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: DialogIconType;
  buttons?: DialogButton[];
  onClose: () => void;
};

function getIconMeta(
  type: DialogIconType,
  colors: ReturnType<typeof useTheme>['colors']
): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  switch (type) {
    case 'checkmark':
      return { name: 'checkmark-circle', color: colors.success, bg: colors.successBg };
    case 'calendar':
      return { name: 'calendar', color: colors.primary, bg: colors.primaryLight };
    case 'card':
      return { name: 'card', color: colors.primary, bg: colors.primaryLight };
    case 'trash':
      return { name: 'trash', color: colors.danger, bg: colors.dangerBg };
    case 'fitness':
      return { name: 'fitness', color: colors.primary, bg: colors.primaryLight };
    case 'alert':
      return { name: 'alert-circle', color: colors.danger, bg: colors.dangerBg };
    case 'info':
    default:
      return { name: 'information-circle', color: colors.primary, bg: colors.primaryLight };
  }
}

export function ThemedDialog({
  visible,
  title,
  message,
  icon = 'info',
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
}: ThemedDialogProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const iconMeta = getIconMeta(icon, colors);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={title}
        >
          {/* Top Circular Badge */}
          <View style={[styles.iconCircle, { backgroundColor: iconMeta.bg }]}>
            <Ionicons name={iconMeta.name} size={32} color={iconMeta.color} />
          </View>

          {/* Title and Message */}
          <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
          {message ? (
            <AppText style={[styles.message, { color: colors.textMuted }]}>
              {message}
            </AppText>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              let btnBg = colors.primary;
              let btnTextColor = '#FFFFFF';
              let btnBorder = 'transparent';

              if (isDestructive) {
                btnBg = colors.danger;
                btnTextColor = '#FFFFFF';
              } else if (isCancel) {
                btnBg = isDark ? colors.cardBg : colors.white;
                btnTextColor = colors.text;
                btnBorder = colors.border;
              }

              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    onClose();
                    btn.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: pressed
                        ? isCancel
                          ? colors.primaryLight
                          : btnBg
                        : btnBg,
                      borderColor: btnBorder,
                      borderWidth: isCancel ? 1.5 : 0,
                      opacity: pressed && !isCancel ? 0.88 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={btn.text}
                >
                  <AppText
                    style={[
                      styles.buttonText,
                      {
                        color: btnTextColor,
                        fontWeight: isCancel ? '600' : '700',
                      },
                    ]}
                  >
                    {btn.text}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.card,
    borderWidth: 1.5,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    minHeight: tapTarget,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
});
