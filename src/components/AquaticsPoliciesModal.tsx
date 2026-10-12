import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { AQUATICS_SESSION_INFO } from '@/domain/aquaticsGuideData';
import { radii, spacing } from '@/theme/typography';

interface AquaticsPoliciesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AquaticsPoliciesModal({
  visible,
  onClose,
}: AquaticsPoliciesModalProps) {
  const { colors: tc, isDark } = useTheme();

  const handleEmailPress = async (email: string) => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch {
      // fallback
    }
  };

  const handlePhonePress = async (phone: string) => {
    try {
      await Linking.openURL(`tel:${phone.replace(/-/g, '')}`);
    } catch {
      // fallback
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <View style={styles.tagRow}>
                <Ionicons name="document-text" size={14} color={tc.primary} />
                <Text style={[styles.tagText, { color: tc.primary }]}>
                  POLICIES & CONTACTS
                </Text>
              </View>
              <Text style={[styles.titleText, { color: tc.text }]}>
                Aquatics Guidelines & Leadership
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={tc.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.scrollBody}>
            {/* Leadership Contacts */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: tc.text }]}>
                Aquatics Department Contacts
              </Text>
              <View style={styles.contactsGrid}>
                {AQUATICS_SESSION_INFO.contacts.map((contact) => (
                  <View
                    key={contact.email}
                    style={[
                      styles.contactCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.contactLeft}>
                      <Text style={[styles.contactName, { color: tc.text }]}>
                        {contact.name}
                      </Text>
                      <Text style={[styles.contactRole, { color: tc.primary }]}>
                        {contact.role}
                      </Text>
                      <Text style={[styles.contactEmail, { color: tc.textMuted }]}>
                        {contact.email}
                      </Text>
                    </View>

                    <View style={styles.contactActions}>
                      <Pressable
                        onPress={() => handleEmailPress(contact.email)}
                        style={[styles.actionIconBtn, { backgroundColor: '#E0F2FE' }]}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Email ${contact.name}`}
                      >
                        <Ionicons name="mail" size={14} color="#0284C7" />
                      </Pressable>
                      <Pressable
                        onPress={() => handlePhonePress(contact.phone)}
                        style={[styles.actionIconBtn, { backgroundColor: '#DCFCE7' }]}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${contact.name}`}
                      >
                        <Ionicons name="call" size={14} color="#16A34A" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Refund & Cancellation Policy */}
            <View
              style={[
                styles.policyCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FEF3C7',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <View style={styles.policyHeader}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <Text style={styles.policyTitle}>
                  {AQUATICS_SESSION_INFO.refundPolicy.title}
                </Text>
              </View>

              <View style={styles.policyList}>
                {AQUATICS_SESSION_INFO.refundPolicy.rules.map((rule, idx) => (
                  <View key={idx} style={styles.ruleItem}>
                    <Text style={[styles.ruleBullet, { color: '#D97706' }]}>•</Text>
                    <Text style={[styles.ruleText, { color: isDark ? '#FDE68A' : '#78350F' }]}>
                      {rule}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* CDC Drowning Prevention Awareness */}
            <View
              style={[
                styles.cdcCard,
                {
                  backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                  borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={22} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cdcTitle}>
                  Water Safety & Drowning Prevention
                </Text>
                <Text style={[styles.cdcText, { color: tc.textMuted }]}>
                  {AQUATICS_SESSION_INFO.healthBenefits.cdcDrowningStat}
                </Text>
              </View>
            </View>

            {/* Adult Health Benefits of Swimming */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: tc.text }]}>
                Health Benefits of Swimming at YMCA
              </Text>
              <View style={styles.benefitsGrid}>
                {AQUATICS_SESSION_INFO.healthBenefits.adultBenefits.map((benefit, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <Ionicons name="heart" size={13} color="#DC2626" />
                    <Text style={[styles.benefitText, { color: tc.text }]}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: tc.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Close Policies"
            >
              <Text style={styles.doneBtnText}>Close Guidelines</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii.card + 4,
    borderTopRightRadius: radii.card + 4,
    borderWidth: 1,
    maxHeight: '90%',
    paddingTop: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionWrap: {
    gap: spacing.xs,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  contactsGrid: {
    gap: spacing.xs + 2,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  contactLeft: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '800',
  },
  contactRole: {
    fontSize: 12,
    fontWeight: '700',
  },
  contactEmail: {
    fontSize: 11,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  policyList: {
    gap: 6,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  ruleBullet: {
    fontSize: 14,
    lineHeight: 16,
  },
  ruleText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  cdcCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  cdcTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 2,
  },
  cdcText: {
    fontSize: 12,
    lineHeight: 16,
  },
  benefitsGrid: {
    gap: 6,
    marginTop: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontSize: 12,
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
