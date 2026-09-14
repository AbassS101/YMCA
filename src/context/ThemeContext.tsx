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
import { useColorScheme, type ViewStyle, Platform } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@ymca/theme-mode';

type ThemeContextValue = {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  cardStyle: ViewStyle;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    })();
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    void AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const themeColors = isDark ? darkColors : lightColors;

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: themeColors.cardBg,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: themeColors.cardBorder,
      padding: spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: isDark ? 1 : 3,
        },
        default: {},
      }),
    }),
    [themeColors, isDark]
  );

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors: themeColors,
      cardStyle,
      setThemeMode,
    }),
    [themeMode, isDark, themeColors, cardStyle, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      themeMode: 'light',
      isDark: false,
      colors: lightColors,
      cardStyle: {
        backgroundColor: lightColors.cardBg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: lightColors.cardBorder,
        padding: spacing.md,
      },
      setThemeMode: () => {},
    };
  }
  return ctx;
}
