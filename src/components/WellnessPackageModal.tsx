import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WellnessPackagesView } from '@/components/WellnessPackagesView';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing, typography } from '@/theme/typography';
import type { WellnessProgramType } from '@/domain/wellnessPrograms';

export type WellnessPackageModalProps = {
  visible: boolean;
  onClose: () => void;
  onBookLesson?: () => void;
  onChatWithDesk?: () => void;
  initialProgramId?: WellnessProgramType;
};

export function WellnessPackageModal({
  visible,
  onClose,
  onBookLesson,
  onChatWithDesk,
  initialProgramId,
}: WellnessPackageModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Bar */}
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: colors.cardBg,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]} allowFontScaling>
              Wellness Training Packages
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]} allowFontScaling>
              YMCA Silver Spring Rates & Inclusions
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            accessibilityRole="button"
            accessibilityLabel="Close packages view"
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <WellnessPackagesView
            defaultProgramId={initialProgramId}
            onBookLesson={() => {
              onClose();
              onBookLesson?.();
            }}
            onChatWithDesk={() => {
              onClose();
              onChatWithDesk?.();
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
});
