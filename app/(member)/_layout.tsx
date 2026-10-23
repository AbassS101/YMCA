import { Redirect, Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { useSession } from '@/context/SessionContext';
import { staffRouteForSharedPage } from '@/domain/staffNavigation';

export default function MemberLayout() {
  const { session, ready } = useSession();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  if (!ready) return null;
  const staffRoute = staffRouteForSharedPage(pathname, session?.role);
  if (staffRoute) return <Redirect href={{ pathname: staffRoute, params } as never} />;
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
      <Stack.Screen name="guest-screen" />
      <Stack.Screen name="update-payment" />
      <Stack.Screen name="cancel" />
      <Stack.Screen name="book-lesson" />
      <Stack.Screen name="about" />
      <Stack.Screen name="community-forum" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="complaints-suggestions" />
      <Stack.Screen name="surveys" />
      <Stack.Screen name="pool-schedule" />
      <Stack.Screen name="aquatics-guide" />
      <Stack.Screen name="busy-times" />
      <Stack.Screen name="child-watch" />
      <Stack.Screen name="family" />
      <Stack.Screen name="wallet-card" />
    </Stack>
  );
}
