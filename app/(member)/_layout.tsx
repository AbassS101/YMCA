import { Stack } from 'expo-router';

export default function MemberLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="book-lesson" />
      <Stack.Screen name="change-membership" />
      <Stack.Screen name="branch-amenities" />
      <Stack.Screen name="programs" />
      <Stack.Screen name="guest-pass" />
      <Stack.Screen name="update-payment" />
      <Stack.Screen name="cancel" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
