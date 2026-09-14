import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@/domain/types';
import { createProtivityClient } from '@/protivity/createProtivityClient';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

const SESSION_KEY = '@ymca/session';

type SessionContextValue = {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: ProtivityPort;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => createProtivityClient(), []);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw == null) return;
      setSession(JSON.parse(raw) as AuthSession);
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await api.login(email, password);
      setSession(next);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    },
    [api]
  );

  const logout = useCallback(async () => {
    setSession(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo(
    () => ({ session, login, logout, api }),
    [session, login, logout, api]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx == null) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
