import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { AppProviders } from '@/context/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
