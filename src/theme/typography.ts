export const typography = {
  wordmark: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.3 },
  heroDate: { fontSize: 32, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  h1: { fontSize: 26, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  card: 16,
  button: 12,
  chip: 14,
  full: 9999,
} as const;

export const tapTarget = 56;
