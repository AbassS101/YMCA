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

export type TextScale = 'standard' | 'larger' | 'largest';

const STORAGE_KEY = '@ymca/text-scale';

const SCALE_MULTIPLIERS: Record<TextScale, number> = {
  standard: 1,
  larger: 1.15,
  largest: 1.3,
};

type AccessibilityContextValue = {
  textScale: TextScale;
  multiplier: number;
  setTextScale: (scale: TextScale) => void;
  scale: (size: number) => number;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [textScale, setTextScaleState] = useState<TextScale>('standard');

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'standard' || raw === 'larger' || raw === 'largest') {
        setTextScaleState(raw);
      }
    })();
  }, []);

  const setTextScale = useCallback((scale: TextScale) => {
    setTextScaleState(scale);
    void AsyncStorage.setItem(STORAGE_KEY, scale);
  }, []);

  const multiplier = SCALE_MULTIPLIERS[textScale];

  const scale = useCallback((size: number) => Math.round(size * multiplier), [multiplier]);

  const value = useMemo(
    () => ({ textScale, multiplier, setTextScale, scale }),
    [textScale, multiplier, setTextScale, scale]
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return ctx;
}
