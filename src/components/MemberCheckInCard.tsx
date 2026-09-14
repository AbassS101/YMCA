import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';
import type { Member } from '@/domain/types';

export type MemberCheckInCardProps = {
  member: Member;
};

export function MemberCheckInCard({ member }: MemberCheckInCardProps) {
  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`Digital Member Pass for ${member.name}`}>
      {/* Header */}
      <View style={styles.topRow}>
        <View style={styles.headerTitles}>
          <AppText style={styles.kicker}>YMCA of Metropolitan Washington</AppText>
          <AppText style={styles.branchName}>Silver Spring Branch</AppText>
        </View>
        <View style={styles.statusBadge}>
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

      {/* Digital Member Barcode */}
      <View style={styles.barcodeContainer}>
        <View style={styles.barcodeLines}>
          {[
            3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 4, 1, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3,
            1, 2,
          ].map((w, idx) => (
            <View
              key={idx}
              style={[
                styles.bar,
                { width: w * 2.5, marginRight: idx % 3 === 0 ? 3 : 2 },
              ]}
            />
          ))}
        </View>
        <AppText style={styles.barcodeNumbers}>
          * {member.membershipId} - {member.homeBranchId.toUpperCase()} *
        </AppText>
      </View>

      <AppText style={styles.hint}>
        Scan or show at YMCA Silver Spring welcome desk for quick facility access
      </AppText>
    </View>
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
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignSelf: 'flex-start',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barcodeLines: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 1,
  },
  barcodeNumbers: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#334155',
  },
  hint: {
    ...typography.caption,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
});
