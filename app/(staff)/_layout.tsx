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
      <Stack.Screen name="trainer-availability" />
      <Stack.Screen name="maintenance" />
      <Stack.Screen name="child-watch" />
      <Stack.Screen name="billing-issues" />
      <Stack.Screen name="leads" />
      <Stack.Screen name="campaigns" />
      <Stack.Screen name="rep-performance" />
      <Stack.Screen name="admin-center" />
      <Stack.Screen name="admin-plans" />
      <Stack.Screen name="admin-child-watch" />
      <Stack.Screen name="admin-swim-classes" />
      <Stack.Screen name="admin-templates" />
      <Stack.Screen name="admin-guest-donations" />
      <Stack.Screen name="admin-wellness-packages" />
      <Stack.Screen name="admin-toggles" />
      <Stack.Screen name="admin-branding" />
      <Stack.Screen name="admin-thresholds" />
      <Stack.Screen name="admin-audit" />
    </Stack>
  );
}
