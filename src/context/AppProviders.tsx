import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '@/context/SessionContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <SessionProvider>{children}</SessionProvider>
    </SafeAreaProvider>
  );
}
