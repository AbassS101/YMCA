import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';
import {
  boostBrightnessForScanner,
  restoreScreenBrightness,
  isScannerBrightnessBoosted,
} from '@/utils/brightness';
import {
  generateBarcodeBars,
  formatBarcodeLabel,
} from '@/utils/barcode';

export type GuestPassCardProps = {
  guestName?: string;
  passCode?: string;
  validUntilLabel?: string;
  branchName?: string;
  showActionShortcuts?: boolean;
  onOpenDetails?: () => void;
};

export function GuestPassCard({
  guestName = 'Taylor Smith',
  passCode = 'SS-GUEST-882194',
  validUntilLabel = 'Valid Today until 10:00 PM',
  branchName = 'YMCA Silver Spring',
  showActionShortcuts = true,
  onOpenDetails,
}: GuestPassCardProps) {
  const router = useRouter();
  const { colors: tc, isDark } = useTheme();

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isBrightnessBoosted, setIsBrightnessBoosted] = useState(false);
  const previousBrightnessRef = useRef<number | null>(null);

  const barcodeBars = generateBarcodeBars(passCode, 'silver-spring');
  const barcodeLabel = formatBarcodeLabel(passCode, 'silver-spring');

  const handleOpenScanMode = async () => {
    setIsScanModalOpen(true);
    try {
      const prev = await boostBrightnessForScanner();
      previousBrightnessRef.current = prev;
      setIsBrightnessBoosted(true);
    } catch (e) {
      void e; // Brightness boost is optional.
    }
  };

  const handleCloseScanMode = async () => {
    setIsScanModalOpen(false);
    try {
      await restoreScreenBrightness(previousBrightnessRef.current);
      previousBrightnessRef.current = null;
      setIsBrightnessBoosted(false);
    } catch (e) {
      void e; // Brightness restore is optional.
    }
  };

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

  useEffect(() => {
    return () => {
      if (isScannerBrightnessBoosted()) {
        void restoreScreenBrightness(previousBrightnessRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Inline Digital Guest Pass Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: tc.cardBg,
            borderColor: '#F59E0B',
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Digital Guest Pass for ${guestName}. Code ${passCode}.`}
      >
        {/* Top Header Row */}
        <View style={styles.topRow}>
          <View style={styles.headerTitles}>
            <AppText style={[styles.kicker, { color: tc.textMuted }]}>
              YMCA OF METROPOLITAN WASHINGTON
            </AppText>
            <AppText style={[styles.branchName, { color: tc.text }]}>
              {branchName}
            </AppText>
          </View>
          <View style={styles.guestBadge}>
            <View style={styles.activeDot} />
            <AppText style={styles.guestBadgeText}>1-DAY GUEST PASS</AppText>
          </View>
        </View>

        {/* Guest Details */}
        <View style={styles.guestRow}>
          <View style={[styles.avatar, { backgroundColor: isDark ? '#3B2A10' : '#FEF3C7' }]}>
            <Ionicons name="ticket" size={26} color="#D97706" />
          </View>
          <View style={styles.guestInfo}>
            <AppText style={[styles.name, { color: tc.text }]}>{guestName}</AppText>
            <AppText style={[styles.validTime, { color: '#D97706' }]}>
              {validUntilLabel}
            </AppText>
            <AppText style={[styles.passCodeText, { color: tc.textMuted }]}>
              Pass Code: {passCode}
            </AppText>
          </View>
        </View>

        {/* Interactive Optical Barcode */}
        <Pressable
          onPress={() => void handleOpenScanMode()}
          style={({ pressed }) => [
            styles.barcodeContainer,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFDF5',
              borderColor: isDark ? '#475569' : '#FDE68A',
            },
            pressed && styles.barcodePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Enlarge Guest Pass barcode for front desk scanner"
          accessibilityHint="Enlarges barcode to full screen and maximizes screen brightness for scanning"
        >
          <View style={styles.barcodeHeaderRow}>
            <View style={styles.opticalBadge}>
              <Ionicons name="scan-outline" size={13} color="#B45309" />
              <AppText style={styles.opticalBadgeText}>OPTICAL TURNSTILE PASS</AppText>
            </View>
            <View style={styles.tapToEnlargeBadge}>
              <Ionicons name="expand-outline" size={13} color={colors.primary} />
              <AppText style={[styles.tapToEnlargeText, { color: colors.primary }]}>
                Tap to Enlarge & Focus
              </AppText>
            </View>
          </View>

          {/* Barcode Lines Graphic */}
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
                      backgroundColor: isDark ? '#F1F5F9' : '#0F172A',
                    },
                  ]}
                />
              ))}
            </View>
            <AppText style={[styles.barcodeCodeLabel, { color: tc.text }]}>
              {barcodeLabel}
            </AppText>
          </View>

          <AppText style={[styles.scanHintText, { color: tc.textMuted }]}>
            Present at Member Services desk or scan at optical turnstiles
          </AppText>
        </Pressable>

        {/* Guest Privileges Checklist */}
        <View style={[styles.perksRow, { borderTopColor: tc.border }]}>
          <View style={styles.perkItem}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <AppText style={[styles.perkText, { color: tc.text }]}>
              Cardio & Weights
            </AppText>
          </View>
          <View style={styles.perkItem}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <AppText style={[styles.perkText, { color: tc.text }]}>
              2 Heated Pools
            </AppText>
          </View>
          <View style={styles.perkItem}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <AppText style={[styles.perkText, { color: tc.text }]}>
              Open Classes
            </AppText>
          </View>
        </View>

        {/* Quick Action Shortcuts (Join & Donate) */}
        {showActionShortcuts ? (
          <View style={styles.actionButtonsRow}>
            <Pressable
              onPress={() => router.push('/(member)/join-membership')}
              style={[styles.actionBtnJoin, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Turn Guest Pass Into Membership with enrollment fee waived"
            >
              <Ionicons name="id-card" size={14} color="#FFFFFF" />
              <AppText style={styles.actionBtnJoinText}>
                Join YMCA ($0 Enrollment Fee) ›
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(member)/donate')}
              style={[
                styles.actionBtnDonate,
                {
                  backgroundColor: isDark ? '#311014' : '#FEF2F2',
                  borderColor: '#F87171',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Support YMCA Cause: Donate"
            >
              <Ionicons name="heart" size={14} color="#DC2626" />
              <AppText style={styles.actionBtnDonateText}>
                Support Cause ›
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {onOpenDetails ? (
          <Pressable
            onPress={onOpenDetails}
            style={styles.moreDetailsLink}
            accessibilityRole="button"
            accessibilityLabel="View full guest pass details and facility guidelines"
          >
            <AppText style={[styles.moreDetailsText, { color: colors.primary }]}>
              View Full Guest Pass & Facility Guidelines →
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {/* Full-Screen Scan Focus Modal with Brightness Booster */}
      <Modal
        visible={isScanModalOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => void handleCloseScanMode()}
        statusBarTranslucent
      >
        <View style={[styles.scanModalContainer, { backgroundColor: tc.background }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <AppText style={[styles.modalTitle, { color: tc.text }]}>
                YMCA Guest Pass
              </AppText>
              <AppText style={[styles.modalSubtitle, { color: tc.textMuted }]}>
                Scan-Ready for Member Services Turnstile
              </AppText>
            </View>
            <Pressable
              onPress={() => void handleCloseScanMode()}
              style={[styles.closeModalBtn, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
              accessibilityRole="button"
              accessibilityLabel="Close enlarged scan view"
            >
              <Ionicons name="close" size={22} color={tc.text} />
            </Pressable>
          </View>

          {/* Large Optical Barcode Sheet */}
          <View
            style={[
              styles.modalBarcodeSheet,
              {
                backgroundColor: '#FFFFFF',
                borderColor: '#F59E0B',
              },
            ]}
          >
            <View style={styles.modalBadgeRow}>
              <View style={styles.modalGuestBadge}>
                <Ionicons name="ticket" size={16} color="#B45309" />
                <AppText style={styles.modalGuestBadgeText}>1-DAY GUEST PASS</AppText>
              </View>
              <AppText style={styles.modalBranchText}>Silver Spring Branch</AppText>
            </View>

            <AppText style={styles.modalGuestName}>{guestName}</AppText>
            <AppText style={styles.modalValidText}>{validUntilLabel}</AppText>

            {/* Enlarged Barcode */}
            <View style={styles.modalBarcodeLines}>
              {barcodeBars.map((seg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.modalBar,
                    {
                      width: Math.max(2, seg.width * 2.4),
                      marginRight: seg.marginRight * 1.3,
                      backgroundColor: '#0F172A',
                    },
                  ]}
                />
              ))}
            </View>

            <AppText style={styles.modalBarcodeLabel}>{barcodeLabel}</AppText>
            <AppText style={styles.modalPassIdText}>Pass ID: {passCode}</AppText>

            <View style={styles.modalInstructionBox}>
              <Ionicons name="information-circle" size={18} color="#0284C7" />
              <AppText style={styles.modalInstructionText}>
                Present this barcode to the Member Services desk or optical turnstiles.
              </AppText>
            </View>
          </View>

          {/* Screen Brightness Control */}
          <View style={styles.brightnessControlRow}>
            <Pressable
              onPress={() => void handleToggleBrightness()}
              style={[
                styles.brightnessBtn,
                {
                  backgroundColor: isBrightnessBoosted
                    ? '#FEF3C7'
                    : isDark
                    ? '#1E293B'
                    : '#F1F5F9',
                  borderColor: isBrightnessBoosted ? '#F59E0B' : tc.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Screen Brightness ${isBrightnessBoosted ? 'Maximum' : 'Normal'}`}
            >
              <Ionicons
                name={isBrightnessBoosted ? 'sunny' : 'sunny-outline'}
                size={20}
                color={isBrightnessBoosted ? '#D97706' : tc.text}
              />
              <AppText
                style={[
                  styles.brightnessBtnText,
                  { color: isBrightnessBoosted ? '#B45309' : tc.text },
                ]}
              >
                {isBrightnessBoosted ? 'Scanner Brightness: MAX' : 'Boost Screen Brightness'}
              </AppText>
            </Pressable>
          </View>

          {/* Conversion Footer inside Scan Mode */}
          <View style={styles.modalFooterActions}>
            <Pressable
              onPress={() => {
                void handleCloseScanMode();
                router.push('/(member)/join-membership');
              }}
              style={[styles.modalJoinBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <AppText style={styles.modalJoinBtnText}>
                Turn Guest Pass Into Full Membership →
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitles: {
    gap: 2,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  branchName: {
    fontSize: 15,
    fontWeight: '800',
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
  },
  validTime: {
    fontSize: 12,
    fontWeight: '700',
  },
  passCodeText: {
    fontSize: 11,
  },
  barcodeContainer: {
    borderRadius: radii.sm + 2,
    padding: spacing.sm + 4,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  barcodePressed: {
    opacity: 0.85,
  },
  barcodeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  opticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  opticalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  tapToEnlargeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapToEnlargeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barcodeLinesWrapper: {
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  barcodeLines: {
    flexDirection: 'row',
    height: 46,
    alignItems: 'center',
  },
  bar: {
    height: '100%',
  },
  barcodeCodeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scanHintText: {
    fontSize: 11,
    textAlign: 'center',
  },
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perkText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionBtnJoin: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  actionBtnJoinText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnDonate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  actionBtnDonateText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  moreDetailsLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  moreDetailsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scanModalContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBarcodeSheet: {
    borderRadius: radii.card,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  modalBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  modalGuestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  modalGuestBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  modalBranchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalGuestName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalValidText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  modalBarcodeLines: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'center',
    marginVertical: 12,
  },
  modalBar: {
    height: '100%',
  },
  modalBarcodeLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 3,
  },
  modalPassIdText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  modalInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: radii.sm,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  modalInstructionText: {
    fontSize: 11,
    color: '#0369A1',
    flex: 1,
    lineHeight: 15,
    fontWeight: '600',
  },
  brightnessControlRow: {
    alignItems: 'center',
  },
  brightnessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  brightnessBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalFooterActions: {
    gap: 10,
  },
  modalJoinBtn: {
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalJoinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
