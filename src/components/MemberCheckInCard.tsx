import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';
import type { Member } from '@/domain/types';
import {
  boostBrightnessForScanner,
  restoreScreenBrightness,
  isScannerBrightnessBoosted,
} from '@/utils/brightness';
import {
  generateBarcodeBars,
  formatBarcodeLabel,
} from '@/utils/barcode';

export type MemberCheckInCardProps = {
  member: Member;
  initialExpanded?: boolean;
  onClose?: () => void;
  showInlineCard?: boolean;
};

export function MemberCheckInCard({
  member,
  initialExpanded = false,
  onClose,
  showInlineCard = true,
}: MemberCheckInCardProps) {
  const [isScanModalOpen, setIsScanModalOpen] = useState(initialExpanded);
  const [isBrightnessBoosted, setIsBrightnessBoosted] = useState(false);
  const previousBrightnessRef = useRef<number | null>(null);

  // Generate barcode bars from member ID
  const barcodeBars = generateBarcodeBars(member.membershipId, member.homeBranchId);
  const barcodeLabel = formatBarcodeLabel(member.membershipId, member.homeBranchId);

  // Handle opening Full-Screen Scan Focus Mode
  const handleOpenScanMode = async () => {
    setIsScanModalOpen(true);
    try {
      const prev = await boostBrightnessForScanner();
      previousBrightnessRef.current = prev;
      setIsBrightnessBoosted(true);
    } catch (e) {
      console.warn('Error boosting brightness for scan modal:', e);
    }
  };

  // Handle closing Full-Screen Scan Focus Mode
  const handleCloseScanMode = async () => {
    setIsScanModalOpen(false);
    try {
      await restoreScreenBrightness(previousBrightnessRef.current);
      previousBrightnessRef.current = null;
      setIsBrightnessBoosted(false);
    } catch (e) {
      console.warn('Error restoring brightness:', e);
    }
    onClose?.();
  };

  // Toggle brightness manually
  const handleToggleBrightness = async () => {
    if (isBrightnessBoosted) {
      await restoreScreenBrightness(previousBrightnessRef.current);
      setIsBrightnessBoosted(false);
    } else {
      const prev = await boostBrightnessForScanner();
      previousBrightnessRef.current = prev;
      setIsBrightnessBoosted(true);
    }
  };

  // Ensure brightness is cleaned up if component unmounts while boosted
  useEffect(() => {
    return () => {
      if (isScannerBrightnessBoosted()) {
        void restoreScreenBrightness(previousBrightnessRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Inline Digital Member Card */}
      {showInlineCard ? (
        <View
          style={styles.card}
          accessibilityRole="summary"
          accessibilityLabel={`Digital Member Pass for ${member.name}. Double tap barcode to enlarge for scanner.`}
        >
          {/* Header */}
          <View style={styles.topRow}>
            <View style={styles.headerTitles}>
              <AppText style={styles.kicker}>YMCA of Metropolitan Washington</AppText>
              <AppText style={styles.branchName}>Silver Spring Branch</AppText>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.activeDot} />
              <AppText style={styles.statusText}>
                {member.status === 'active' ? 'Active' : 'Pending'}
              </AppText>
            </View>
          </View>

          {/* Member Details */}
          <View style={styles.memberRow}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>
                {member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AppText>
            </View>
            <View style={styles.memberInfo}>
              <AppText style={styles.name}>{member.name}</AppText>
              <AppText style={styles.type}>
                {member.type} Membership · ID #{member.membershipId}
              </AppText>
            </View>
          </View>

          {/* Digital Member Barcode (Interactive - Tap to Enlarge) */}
          <Pressable
            onPress={handleOpenScanMode}
            style={({ pressed }) => [
              styles.barcodeContainer,
              pressed && styles.barcodeContainerPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enlarge barcode for scanner"
            accessibilityHint="Maximizes screen brightness and enlarges barcode to full screen for easy front desk scanning"
          >
            <View style={styles.barcodeHeaderRow}>
              <View style={styles.scannerBadge}>
                <Ionicons name="scan-outline" size={14} color={colors.primary} />
                <AppText style={styles.scannerBadgeText}>OPTICAL PASS</AppText>
              </View>
              <View style={styles.tapToFocusBadge}>
                <Ionicons name="expand-outline" size={13} color={colors.primaryDark} />
                <AppText style={styles.tapToFocusText}>Tap to Enlarge & Focus</AppText>
              </View>
            </View>

            {/* Barcode Lines Area */}
            <View style={styles.barcodeLinesWrapper}>
              <View style={styles.barcodeLines}>
                {barcodeBars.map((seg, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.bar,
                      {
                        width: Math.max(2, seg.width * 1.8),
                        marginRight: seg.marginRight,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <AppText style={styles.barcodeNumbers}>{barcodeLabel}</AppText>
          </Pressable>

          {/* Scanner Action Buttons Row */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleOpenScanMode}
              style={({ pressed }) => [
                styles.primaryScanButton,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Full-Screen Barcode"
            >
              <Ionicons name="scan" size={16} color={colors.white} />
              <AppText style={styles.primaryScanButtonText}>Enlarge for Scanner</AppText>
            </Pressable>

            <Pressable
              onPress={handleToggleBrightness}
              style={({ pressed }) => [
                styles.brightnessButton,
                isBrightnessBoosted && styles.brightnessButtonActive,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isBrightnessBoosted
                  ? 'Screen brightness maximized. Tap to revert'
                  : 'Boost screen brightness for scanner'
              }
            >
              <Ionicons
                name={isBrightnessBoosted ? 'sunny' : 'sunny-outline'}
                size={16}
                color={isBrightnessBoosted ? '#B45309' : colors.primaryDark}
              />
              <AppText
                style={[
                  styles.brightnessButtonText,
                  isBrightnessBoosted && styles.brightnessButtonTextActive,
                ]}
              >
                {isBrightnessBoosted ? '100% Bright' : 'Max Bright'}
              </AppText>
            </Pressable>
          </View>

          <AppText style={styles.hint}>
            Hold phone near the optical scanner at the Silver Spring welcome desk or turnstiles
          </AppText>
        </View>
      ) : null}

      {/* Full-Screen Scan Focus Mode Modal */}
      <Modal
        visible={isScanModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseScanMode}
        statusBarTranslucent={true}
      >
        <View style={styles.modalBackdrop}>
          {/* Dimmed Background Overlay */}
          <Pressable
            style={styles.modalDismissArea}
            onPress={handleCloseScanMode}
            accessibilityLabel="Close scan mode"
          />

          <View style={styles.focusModalCard} accessibilityRole="summary" accessibilityLabel="Enlarged Barcode Check-In Pass">
            {/* Modal Top Bar */}
            <View style={styles.modalTopBar}>
              <View style={styles.modalKickerGroup}>
                <AppText style={styles.modalKicker}>YMCA SILVER SPRING</AppText>
                <AppText style={styles.modalTitle}>Check-In Pass</AppText>
              </View>

              <Pressable
                onPress={handleCloseScanMode}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close barcode scanner mode"
              >
                <Ionicons name="close" size={22} color={colors.nearBlack} />
              </Pressable>
            </View>

            {/* Member Info Row */}
            <View style={styles.modalMemberRow}>
              <View style={styles.modalAvatar}>
                <AppText style={styles.modalAvatarText}>
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.modalMemberName}>{member.name}</AppText>
                <AppText style={styles.modalMemberType}>
                  {member.type} Membership · ID #{member.membershipId}
                </AppText>
              </View>
              <View style={styles.modalActiveBadge}>
                <View style={styles.activeDot} />
                <AppText style={styles.modalActiveText}>ACTIVE</AppText>
              </View>
            </View>

            {/* Brightness Status Banner */}
            <View
              style={[
                styles.brightnessBanner,
                isBrightnessBoosted ? styles.brightnessBannerActive : styles.brightnessBannerNormal,
              ]}
            >
              <View style={styles.brightnessBannerLeft}>
                <Ionicons
                  name={isBrightnessBoosted ? 'sunny' : 'sunny-outline'}
                  size={18}
                  color={isBrightnessBoosted ? '#D97706' : colors.primary}
                />
                <View>
                  <AppText style={styles.brightnessBannerTitle}>
                    {isBrightnessBoosted ? 'Screen Brightness: 100%' : 'Screen Brightness: Normal'}
                  </AppText>
                  <AppText style={styles.brightnessBannerSub}>
                    {isBrightnessBoosted
                      ? 'Maximum optical contrast active for fast scan'
                      : 'Tap boost to make screen easier to scan'}
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={handleToggleBrightness}
                style={styles.brightnessTogglePill}
                accessibilityRole="button"
                accessibilityLabel="Toggle scanner brightness"
              >
                <AppText style={styles.brightnessTogglePillText}>
                  {isBrightnessBoosted ? 'Dim' : 'Boost'}
                </AppText>
              </Pressable>
            </View>

            {/* Giant Barcode Display Area (Primary Focus of Screen) */}
            <View style={styles.giantBarcodeContainer}>
              {/* Giant Barcode Bars */}
              <View style={styles.giantBarcodeLines}>
                {barcodeBars.map((seg, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.giantBar,
                      {
                        width: Math.max(3, seg.width * 2.2),
                        marginRight: seg.marginRight * 1.05,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Barcode Number & Branch Code */}
              <AppText style={styles.giantBarcodeNumbers}>{barcodeLabel}</AppText>
            </View>

            {/* Instruction Tip */}
            <View style={styles.scannerInstructions}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <AppText style={styles.scannerInstructionText}>
                Hold phone screen 4–6 inches directly under the optical scanner beam at the welcome desk or turnstiles.
              </AppText>
            </View>

            {/* Done / Close Button */}
            <Pressable
              onPress={handleCloseScanMode}
              style={({ pressed }) => [
                styles.modalDoneButton,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Done scanning, return to home"
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <AppText style={styles.modalDoneButtonText}>Done / Finish Scanning</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    gap: spacing.md,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  headerTitles: {
    flex: 1,
    paddingRight: 6,
  },
  kicker: {
    ...typography.caption,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  branchName: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.primaryDark,
    marginTop: 2,
  },
  statusBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignSelf: 'flex-start',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.title,
    fontSize: 20,
    color: colors.nearBlack,
  },
  type: {
    ...typography.body,
    fontSize: 14,
    color: colors.muted,
  },
  barcodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  barcodeContainerPressed: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.995 }],
  },
  barcodeHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  scannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scannerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  tapToFocusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tapToFocusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  barcodeLinesWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barcodeLines: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  bar: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 0.5,
    flexShrink: 1,
  },
  barcodeNumbers: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2.8,
    color: '#0F172A',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryScanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryScanButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  brightnessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  brightnessButtonActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  brightnessButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  brightnessButtonTextActive: {
    color: '#92400E',
  },
  hint: {
    ...typography.caption,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal Full-Screen Scan Focus Mode Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalDismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  focusModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalKickerGroup: {
    gap: 2,
  },
  modalKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalMemberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  modalMemberType: {
    fontSize: 12,
    color: colors.muted,
  },
  modalActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modalActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
  },
  brightnessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  brightnessBannerActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  brightnessBannerNormal: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  brightnessBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  brightnessBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  brightnessBannerSub: {
    fontSize: 11,
    color: colors.muted,
  },
  brightnessTogglePill: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  brightnessTogglePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  giantBarcodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  giantBarcodeLines: {
    flexDirection: 'row',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    paddingHorizontal: 4,
  },
  giantBar: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 0.5,
    flexShrink: 1,
  },
  giantBarcodeNumbers: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#0F172A',
    textAlign: 'center',
  },
  scannerInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
  },
  scannerInstructionText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  modalDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalDoneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
