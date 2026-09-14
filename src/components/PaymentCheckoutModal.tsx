import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';
import type { ScheduleItem } from '@/domain/types';

export type PaymentCheckoutModalProps = {
  visible: boolean;
  item: ScheduleItem | null;
  dayLabel: string;
  timeLabel: string;
  paymentBrand?: string;
  paymentLast4?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PaymentCheckoutModal({
  visible,
  item,
  dayLabel,
  timeLabel,
  paymentBrand = 'Visa',
  paymentLast4 = '4242',
  busy,
  onConfirm,
  onClose,
}: PaymentCheckoutModalProps) {
  if (!item) return null;

  const priceCents = item.priceCents ?? 0;
  const formattedPrice = `$${(priceCents / 100).toFixed(2)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet} accessibilityRole="summary" accessibilityLabel="Checkout & Payment">
          {/* Sheet Handle */}
          <View style={styles.handle} />

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <AppText style={styles.tagText}>
                    {item.isSpecialEvent ? 'Special Event Booking' : 'Specialized Swim / Program Session'}
                  </AppText>
                </View>
              </View>
              <AppText style={styles.title}>{item.title}</AppText>
              <AppText style={styles.when}>
                {dayLabel} · {timeLabel}
              </AppText>
              <AppText style={styles.location}>
                {item.location} · {item.instructorName}
              </AppText>
              {item.description ? (
                <AppText style={styles.description}>{item.description}</AppText>
              ) : null}
            </View>

            {/* Price Summary Box */}
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryHeader}>Order Summary</AppText>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>Registration Fee</AppText>
                <AppText style={styles.summaryValue}>{formattedPrice}</AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>YMCA Member Discount</AppText>
                <AppText style={[styles.summaryValue, styles.discount]}>-$0.00</AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>Taxes & Surcharges</AppText>
                <AppText style={styles.summaryValue}>$0.00</AppText>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <AppText style={styles.totalLabel}>Total Due Now</AppText>
                <AppText style={styles.totalValue}>{formattedPrice}</AppText>
              </View>
            </View>

            {/* Payment Method Card */}
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeaderRow}>
                <AppText style={styles.paymentHeader}>Payment Method on File</AppText>
                <View style={styles.verifiedBadge}>
                  <AppText style={styles.verifiedText}>Verified</AppText>
                </View>
              </View>
              <AppText style={styles.cardDetails}>
                {paymentBrand} ending in ••{paymentLast4}
              </AppText>
              <AppText style={styles.guaranteeText}>
                Your card on file will be charged {formattedPrice} upon confirmation. You may cancel up to 24 hours prior to the session for a full refund.
              </AppText>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <PrimaryButton
                title={`Confirm & Pay ${formattedPrice}`}
                onPress={onConfirm}
                loading={busy}
                disabled={busy}
                accessibilityHint={`Charges ${formattedPrice} to your ${paymentBrand} card`}
              />
              <SecondaryButton
                title="Back to Schedule"
                onPress={onClose}
                disabled={busy}
                accessibilityHint="Cancel and return to class schedule"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.card + 8,
    borderTopRightRadius: radii.card + 8,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: 6,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    ...typography.title,
    fontSize: 22,
    color: colors.nearBlack,
  },
  when: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  location: {
    ...typography.body,
    color: colors.muted,
  },
  description: {
    ...typography.caption,
    color: colors.nearBlack,
    backgroundColor: colors.offWhite,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: colors.offWhite,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeader: {
    ...typography.label,
    color: colors.nearBlack,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.body,
    fontSize: 15,
    color: colors.muted,
  },
  summaryValue: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.nearBlack,
  },
  discount: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.bodyStrong,
    fontSize: 18,
    color: colors.nearBlack,
  },
  totalValue: {
    ...typography.heroDate,
    fontSize: 24,
    color: colors.primary,
  },
  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentHeader: {
    ...typography.label,
    color: colors.primaryDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  cardDetails: {
    ...typography.bodyStrong,
    color: colors.nearBlack,
    fontSize: 16,
  },
  guaranteeText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 2,
  },
  actions: {
    gap: spacing.sm,
    marginTop: 6,
  },
});
