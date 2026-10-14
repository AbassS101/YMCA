import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MessagesInbox } from '@/components/messaging/MessagesInbox';
import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { type ThemeColors } from '@/theme/colors';

export default function StaffMessagesInboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const forumOn = useAppConfig().config.featureToggles.communityForum;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const forumBanner = !forumOn ? undefined : (
    <Pressable
      onPress={() => router.push('/(member)/community-forum')}
      style={({ pressed }) => [styles.forumCard, pressed && { backgroundColor: colors.primaryLight }]}
      accessibilityRole="button"
      accessibilityLabel="Open Community Forum and Staff Inquiries"
    >
      <View style={styles.forumIconWrap}>
        <Ionicons name="chatbubbles" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <Text style={styles.forumTitle}>Community Forum</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>@ STAFF INQUIRIES</Text>
          </View>
        </View>
        <Text style={styles.forumSub}>
          Browse topics, answer @ staff questions, and pin branch notices
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </Pressable>
  );

  return <MessagesInbox mode="staff" threadBase="/(staff)/messages" header={forumBanner} />;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    forumCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.accentBlue,
      padding: 14,
      gap: 12,
      marginHorizontal: 14,
      marginTop: 14,
    },
    forumIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    forumTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    pill: {
      backgroundColor: colors.paidBadgeBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    pillText: { fontSize: 9, fontWeight: '800', color: colors.paidBadge, letterSpacing: 0.5 },
    forumSub: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  });
}
