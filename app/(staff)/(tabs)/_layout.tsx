import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme/colors';
import { tapTarget, typography } from '@/theme/typography';

export default function StaffTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          minHeight: tapTarget + 14,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: 'Today',
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: 'Schedules',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: 'Schedules and Events',
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: 'Members',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: 'Messages',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: 'Me',
        }}
      />
    </Tabs>
  );
}
