import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { tapTarget } from '@/theme/typography';

export default function MemberTabsLayout() {
  const { colors } = useTheme();
  const { communityForum } = useAppConfig().config.featureToggles;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          minHeight: tapTarget + 14,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: colors.cardBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingHorizontal: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={Math.max(size, 26)} color={typeof color === 'number' ? colors.primary : color ?? undefined} />
          ),
          tabBarAccessibilityLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={Math.max(size, 26)} color={typeof color === 'number' ? colors.primary : color ?? undefined} />
          ),
          tabBarAccessibilityLabel: 'Classes',
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          href: communityForum ? undefined : null,
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={Math.max(size, 26)} color={typeof color === 'number' ? colors.primary : color ?? undefined} />
          ),
          tabBarAccessibilityLabel: 'General Community Space & Forum',
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="id-card" size={Math.max(size, 26)} color={typeof color === 'number' ? colors.primary : color ?? undefined} />
          ),
          tabBarAccessibilityLabel: 'Staff',
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={Math.max(size, 26)} color={typeof color === 'number' ? colors.primary : color ?? undefined} />
          ),
          tabBarAccessibilityLabel: 'Account',
        }}
      />
    </Tabs>
  );
}
