export const typography = {
  wordmark: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.3 },
  heroDate: { fontSize: 32, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 18, fontWeight: '400' as const },
  bodyStrong: { fontSize: 18, fontWeight: '600' as const },
  label: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.4 },
  tabLabel: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 15, fontWeight: '400' as const },
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  card: 16,
  button: 12,
  chip: 14,
} as const;

export const tapTarget = 56;
