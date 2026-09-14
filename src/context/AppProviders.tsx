import type { ReactNode } from 'react';
import { SessionProvider } from '@/context/SessionContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
