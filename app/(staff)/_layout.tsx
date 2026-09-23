import { Stack } from 'expo-router';

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="staff-management" />
      <Stack.Screen name="complaints-suggestions" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
