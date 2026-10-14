import { Stack } from 'expo-router';

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="staff-management" />
      <Stack.Screen name="complaints-suggestions" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="surveys" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="lesson-pricing" />
      <Stack.Screen name="child-watch" />
      <Stack.Screen name="billing-issues" />
      <Stack.Screen name="leads" />
      <Stack.Screen name="campaigns" />
      <Stack.Screen name="rep-performance" />
    </Stack>
  );
}
