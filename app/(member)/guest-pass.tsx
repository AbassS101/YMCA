import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

export default function GuestPassScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { colors, isDark } = useTheme();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [remainingPasses, setRemainingPasses] = useState(2);
  const [issuing, setIssuing] = useState(false);
  const [issuedHistory, setIssuedHistory] = useState<
    { name: string; email: string; passCode: string; date: string }[]
  >([]);

  async function handleSendInvite() {
    if (!guestName.trim()) {
      dialog.alert(
        'Missing Name',
        'Please enter your guest’s full name.',
        [{ text: 'OK' }],
        'alert'
      );
      return;
    }

    if (remainingPasses <= 0) {
      dialog.alert(
        'No Guest Passes Remaining',
        'You have used all 2 complimentary guest passes for this membership period. Additional single-day guest passes can be purchased at the front desk for $15.',
        [{ text: 'Got It' }],
        'info'
      );
      return;
    }

    setIssuing(true);
    try {
      const code = `SS-GUEST-${Math.floor(100000 + Math.random() * 900000)}`;
      const todayStr = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      setRemainingPasses((prev) => prev - 1);
      setIssuedHistory((prev) => [
        { name: guestName.trim(), email: guestEmail.trim(), passCode: code, date: todayStr },
        ...prev,
      ]);

      const shareMessage = `Hi ${guestName.trim()}! I've sent you a complimentary 1-Day Guest Pass to the YMCA Silver Spring. Your Pass Code is ${code}. Present this pass code at the YMCA Silver Spring Member Services desk (9800 Hastings Drive, Silver Spring, MD)!`;

      dialog.alert(
        'Guest Pass Created!',
        `Guest pass issued for ${guestName.trim()}!\n\nPass Code: ${code}\n\nYour guest can present this pass code at the YMCA Silver Spring Member Services desk.`,
        [{ text: 'Done' }],
        'checkmark'
      );

      try {
        await Share.share({
          message: shareMessage,
          title: 'YMCA Silver Spring Guest Pass',
        });
      } catch {
        // user dismissed share sheet
      }

      setGuestName('');
      setGuestEmail('');
    } finally {
      setIssuing(false);
    }
  }

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Guest Passes & Reciprocity" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Link */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>Back</AppText>
        </Pressable>

        {/* Balance Hero Card */}
        <View style={[styles.balanceCard, cardTheme]}>
          <View style={styles.balanceHeader}>
            <View>
              <AppText style={[styles.balanceLabel, { color: colors.textMuted }]}>
                ANNUAL GUEST PASS BENEFIT
              </AppText>
              <AppText style={[styles.balanceNumber, { color: colors.primary }]}>
                {remainingPasses} Available
              </AppText>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="ticket-outline" size={28} color={colors.primary} />
            </View>
          </View>
          <AppText style={[styles.balanceNote, { color: colors.text }]}>
            Each YMCA Silver Spring membership includes 2 complimentary one-day guest passes per calendar year. Bring a workout buddy, family member, or friend!
          </AppText>
        </View>

        {/* Issue Guest Pass Form */}
        <View style={[styles.formCard, cardTheme]}>
          <AppText style={[styles.formTitle, { color: colors.text }]}>
            Send a Digital Guest Pass
          </AppText>
          <AppText style={[styles.formSubtitle, { color: colors.textMuted }]}>
            Generate an official digital guest code to share instantly via text message or email.
          </AppText>

          <TextField
            label="Guest's Full Name"
            placeholder="e.g. Taylor Smith"
            value={guestName}
            onChangeText={setGuestName}
          />

          <TextField
            label="Guest's Email (Optional)"
            placeholder="taylor@example.com"
            value={guestEmail}
            onChangeText={setGuestEmail}
            keyboardType="email-address"
          />

          <PrimaryButton
            title={remainingPasses > 0 ? "Generate & Share Pass" : "No Passes Remaining"}
            onPress={() => void handleSendInvite()}
            loading={issuing}
            disabled={remainingPasses <= 0}
            accessibilityHint="Creates and shares a guest pass"
          />
        </View>

        {/* Issued Passes History */}
        {issuedHistory.length > 0 && (
          <View style={[styles.historyCard, cardTheme]}>
            <AppText style={[styles.historyTitle, { color: colors.text }]}>
              Recently Issued Passes
            </AppText>
            {issuedHistory.map((item, idx) => (
              <View key={idx} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.historyName, { color: colors.text }]}>
                    {item.name}
                  </AppText>
                  <AppText style={[styles.historyCode, { color: colors.primary }]}>
                    Code: {item.passCode}
                  </AppText>
                </View>
                <AppText style={[styles.historyDate, { color: colors.textMuted }]}>
                  {item.date}
                </AppText>
              </View>
            ))}
          </View>
        )}

        {/* Nationwide YMCA Reciprocity */}
        <View style={[styles.reciprocityCard, cardTheme]}>
          <View style={styles.reciprocityTop}>
            <Ionicons name="globe-outline" size={26} color={colors.gold} />
            <AppText style={[styles.reciprocityTitle, { color: colors.text }]}>
              YMCA Nationwide Reciprocity
            </AppText>
          </View>
          <AppText style={[styles.reciprocityText, { color: colors.textMuted }]}>
            As an active YMCA Silver Spring member, you have access to free general facility privileges at over 2,500 YMCAs across the United States and Canada!
          </AppText>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <AppText style={[styles.bulletText, { color: colors.text }]}>
                Simply show your YMCA Silver Spring barcode pass at any participating YMCA.
              </AppText>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <AppText style={[styles.bulletText, { color: colors.text }]}>
                Includes all YMCA branches in the Metropolitan Washington association (Bethesda, Calomiris, Bowie, Fairfax, Reston).
              </AppText>
            </View>
          </View>
        </View>

        {/* Guest Rules & Facility Guidelines */}
        <View style={[styles.guidelinesCard, cardTheme]}>
          <AppText style={[styles.guidelinesTitle, { color: colors.text }]}>
            Guest & Check-In Policies
          </AppText>
          <View style={styles.ruleItem}>
            <AppText style={[styles.ruleHeader, { color: colors.text }]}>• Youth Supervision</AppText>
            <AppText style={[styles.ruleText, { color: colors.textMuted }]}>
              Children under 12 must be directly accompanied by a parent or guardian at all times unless participating in a supervised YMCA class or Child Watch.
            </AppText>
          </View>
          <View style={styles.ruleItem}>
            <AppText style={[styles.ruleHeader, { color: colors.text }]}>• Additional Guest Day Passes</AppText>
            <AppText style={[styles.ruleText, { color: colors.textMuted }]}>
              Additional day passes can be purchased at the front desk: Adult $15 · Youth/Senior $10.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backText: {
    ...typography.body,
    fontWeight: '700',
  },
  balanceCard: {
    ...cardStyle,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  balanceNumber: {
    ...typography.title,
    fontSize: 26,
    fontWeight: '800',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceNote: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    ...cardStyle,
    gap: 12,
  },
  formTitle: {
    ...typography.title,
    fontSize: 18,
  },
  formSubtitle: {
    ...typography.body,
    fontSize: 14,
  },
  historyCard: {
    ...cardStyle,
    gap: 10,
  },
  historyTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  historyName: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  historyCode: {
    ...typography.caption,
    fontWeight: '700',
    marginTop: 2,
  },
  historyDate: {
    ...typography.caption,
  },
  reciprocityCard: {
    ...cardStyle,
    gap: 10,
  },
  reciprocityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reciprocityTitle: {
    ...typography.title,
    fontSize: 18,
  },
  reciprocityText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  guidelinesCard: {
    ...cardStyle,
    gap: 10,
  },
  guidelinesTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  ruleItem: {
    gap: 2,
  },
  ruleHeader: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  ruleText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 12,
  },
});
