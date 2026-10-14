import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultAppConfig, type AppConfig, type AppConfigPatch, type AppConfigSection } from '@/domain/appConfig';
import { useSession } from '@/context/SessionContext';
import { configRepo } from '@/repositories/configRepo';

type AppConfigContextValue = {
  config: AppConfig;
  refresh: () => Promise<void>;
  /** Saves one section as the signed-in staff member and returns the new config. */
  update: <S extends AppConfigSection>(section: S, patch: AppConfigPatch<S>) => Promise<AppConfig>;
};

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { api, session } = useSession();
  // Defaults show while the saved config loads (or if loading fails).
  const [config, setConfig] = useState<AppConfig>(() => defaultAppConfig());
  const userId = session?.userId;

  const refresh = useCallback(async () => {
    try {
      setConfig(await configRepo.get(api));
    } catch {
      // keep the current (default) config
    }
  }, [api]);

  // Reload on sign-in / sign-out, since staff may have changed settings in between.
  useEffect(() => {
    let cancelled = false;
    configRepo
      .get(api)
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, userId]);

  const update = useCallback(
    async <S extends AppConfigSection>(section: S, patch: AppConfigPatch<S>) => {
      if (!userId) throw new Error('Sign in to change settings.');
      const next = await configRepo.update(api, section, patch, userId);
      setConfig(next);
      return next;
    },
    [api, userId]
  );

  const value = useMemo(() => ({ config, refresh, update }), [config, refresh, update]);

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (ctx == null) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return ctx;
}
