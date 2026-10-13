import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';

export function useChatTheme() {
  const { colors: tc, isDark } = useTheme();
  return useMemo(
    () => ({
      isDark,
      bg: tc.background,
      surface: tc.cardBg,
      border: tc.border,
      text: tc.text,
      muted: tc.textMuted,
      accent: colors.primary,
      hover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
      input: isDark ? '#1E293B' : '#F1F5F9',
      reactionBg: isDark ? '#1E293B' : '#F1F5F9',
      reactionActiveBg: isDark ? '#0C2A4A' : '#E0F2FE',
      mentionBg: isDark ? 'rgba(56,189,248,0.18)' : 'rgba(0,96,156,0.10)',
      quoteBar: isDark ? '#475569' : '#CBD5E1',
      staffBar: '#16A34A',
      danger: '#DC2626',
    }),
    [tc, isDark]
  );
}

export type ChatTheme = ReturnType<typeof useChatTheme>;
