import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { notificationRepo } from '@/repositories/notificationRepo';
import { typography } from '@/theme/typography';

const ymcaLogo = require('../../assets/ymca-logo.png');

type YHeaderProps = {
  subtitle?: string;
  showActions?: boolean;
};

export function YHeader({ subtitle, showActions = true }: YHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnread = useCallback(async () => {
    if (!session?.userId || !api) return;
    try {
      const count = await notificationRepo.getUnreadCount(api, session.userId);
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, [api, session?.userId]);

  useEffect(() => {
    void fetchUnread();
    const interval = setInterval(() => {
      void fetchUnread();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const canShowActions = showActions && session != null;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: isDark ? colors.cardBg : colors.white,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.logoBar,
          { backgroundColor: isDark ? '#FFFFFF' : colors.white },
        ]}
      >
        <Image
          source={ymcaLogo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="YMCA"
        />

        {canShowActions ? (
          <View style={styles.actionsRow}>
            {session.role === 'member' ? (
              <Pressable
                onPress={() => router.push('/(member)/donate')}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Make a Donation"
                hitSlop={8}
              >
                <Ionicons name="heart" size={22} color="#DC2626" />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                if (session.role === 'member') {
                  router.push('/(member)/notifications');
                }
              }}
              style={({ pressed }) => [
                styles.headerActionBtn,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={22} color="#1E293B" />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={[styles.branchBar, { backgroundColor: colors.primaryDark }]}>
        <AppText style={styles.branch}>YMCA Silver Spring</AppText>
      </View>
      {subtitle ? (
        <AppText
          style={[
            styles.subtitle,
            {
              backgroundColor: colors.primaryLight,
              color: isDark ? colors.primary : colors.primaryDark,
            },
          ]}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
  },
  logoBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 64,
  },
  logo: {
    width: 180,
    height: 48,
  },
  actionsRow: {
    position: 'absolute',
    right: 14,
    top: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  branchBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  branch: {
    ...typography.wordmark,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyStrong,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});

