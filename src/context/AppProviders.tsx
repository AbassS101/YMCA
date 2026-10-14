import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { AppConfigProvider } from '@/context/AppConfigContext';
import { DialogProvider } from '@/context/DialogContext';
import { SessionProvider } from '@/context/SessionContext';
import { ThemeProvider } from '@/context/ThemeContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AccessibilityProvider>
          <SessionProvider>
            <AppConfigProvider>
              <DialogProvider>{children}</DialogProvider>
            </AppConfigProvider>
          </SessionProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
