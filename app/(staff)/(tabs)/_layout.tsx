import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { tapTarget } from '@/theme/typography';

export default function StaffTabsLayout() {
  const { colors: tc } = useTheme();
  const insets = useSafeAreaInsets();
  const { persona, theme, coachesClients, isAdmin } = useStaffCapabilities();

  const isDeskPersona = persona === 'membershipDirector' || persona === 'frontDesk';
  const todayLabel = isAdmin ? 'Branch' : isDeskPersona ? 'Front Desk' : 'Today';
  const todayIcon = isAdmin ? 'business' : isDeskPersona ? 'storefront' : 'sunny';
  const membersLabel = coachesClients ? 'Clients' : 'Members';
  const schedulesLabel = 'Schedules';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color,
        tabBarInactiveTintColor: tc.textMuted,
        tabBarStyle: {
          height: 76 + insets.bottom,
          minHeight: tapTarget + 14,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: tc.cardBg,
          borderTopColor: tc.cardBorder,
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
          title: todayLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={todayIcon} size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: todayLabel,
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: schedulesLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: 'Schedules, classes, lessons and pools',
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: membersLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={Math.max(size, 26)} color={color} />
          ),
          tabBarAccessibilityLabel: membersLabel,
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
