import { Stack } from 'expo-router';

export default function MemberLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="manage-membership" />
      <Stack.Screen name="change-membership" />
      <Stack.Screen name="join-membership" />
      <Stack.Screen name="events" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="donate" />
      <Stack.Screen name="branch-amenities" />
      <Stack.Screen name="programs" />
      <Stack.Screen name="guest-pass" />
      <Stack.Screen name="update-payment" />
      <Stack.Screen name="cancel" />
      <Stack.Screen name="book-lesson" />
      <Stack.Screen name="about" />
      <Stack.Screen name="community-forum" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="complaints-suggestions" />
    </Stack>
  );
}
