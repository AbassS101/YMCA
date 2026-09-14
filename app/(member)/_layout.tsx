import { Tabs } from 'expo-router';

import { colors } from '@/theme/colors';

export default function MemberLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.scarlet,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="schedules" options={{ title: 'Schedules' }} />
      <Tabs.Screen name="trainers" options={{ title: 'Trainers' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
