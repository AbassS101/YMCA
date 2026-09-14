export const lightColors = {
  /** YMCA Official Brand Primary Blue */
  primary: '#00609C',
  /** Deep YMCA Navy for headers and high-contrast text surfaces */
  primaryDark: '#002855',
  /** Ice blue tint for active chips, pressed states, and subtle highlights */
  primaryLight: '#EBF4FA',
  /** Vibrant secondary blue for interactive links and focus */
  accentBlue: '#0072CE',
  /** YMCA Aquatics Teal */
  accentTeal: '#00838F',
  /** Warm YMCA Gold for highlights and low-capacity alerts */
  gold: '#D97706',
  goldBg: '#FEF3C7',
  /** Slate 900 for ultra-crisp readable text exceeding WCAG AAA standards (>14:1) */
  nearBlack: '#0F172A',
  /** Modern crisp neutral background */
  offWhite: '#F8FAFC',
  /** Pure white */
  white: '#FFFFFF',
  /** Accessible slate muted text for secondary details (>5.5:1 contrast) */
  muted: '#475467',
  /** Lighter muted for text on dark backgrounds */
  mutedOnDark: '#CBD5E1',
  /** Crisp subtle border */
  border: '#E2E8F0',
  /** Distinct success green for "Included with Membership" */
  success: '#15803D',
  successBg: '#DCFCE7',
  /** Paid / Extra Cost badge styling */
  paidBadge: '#1D4ED8',
  paidBadgeBg: '#EFF6FF',
  /** Destructive / error red, reserved only for cancellations and error banners */
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  /** Backward-compatible alias for destructive/legacy references */
  scarlet: '#DC2626',

  // Semantic surfaces
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBg: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475467',
  cardBorder: '#E2E8F0',
};

export const darkColors = {
  /** High-contrast cyan/sky blue in dark mode */
  primary: '#38BDF8',
  /** Deep YMCA Navy header */
  primaryDark: '#0C4A6E',
  /** Dark navy ice blue highlight */
  primaryLight: '#1E3A5F',
  /** Vibrant accent blue */
  accentBlue: '#60A5FA',
  /** YMCA Aquatics Teal */
  accentTeal: '#2DD4BF',
  /** Warm YMCA Gold */
  gold: '#FBBF24',
  goldBg: '#78350F',
  /** Pure crisp white text on dark */
  nearBlack: '#F8FAFC',
  /** Deep midnight background */
  offWhite: '#0B132B',
  /** Rich dark card surface */
  white: '#152238',
  /** Legible muted text on dark */
  muted: '#94A3B8',
  /** Lighter muted for text on dark backgrounds */
  mutedOnDark: '#E2E8F0',
  /** Dark mode border */
  border: '#1E3A5F',
  /** Vibrant green for success */
  success: '#34D399',
  successBg: '#064E3B',
  /** Paid / Extra Cost badge styling */
  paidBadge: '#93C5FD',
  paidBadgeBg: '#1E3A8A',
  /** Bright error red */
  danger: '#F87171',
  dangerBg: '#7F1D1D',
  scarlet: '#F87171',

  // Semantic surfaces
  background: '#0B132B',
  card: '#152238',
  cardBg: '#152238',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  cardBorder: '#1E3A5F',
};

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accentBlue: string;
  accentTeal: string;
  gold: string;
  goldBg: string;
  nearBlack: string;
  offWhite: string;
  white: string;
  muted: string;
  mutedOnDark: string;
  border: string;
  success: string;
  successBg: string;
  paidBadge: string;
  paidBadgeBg: string;
  danger: string;
  dangerBg: string;
  scarlet: string;
  background: string;
  card: string;
  cardBg: string;
  text: string;
  textMuted: string;
  cardBorder: string;
};

/** Default backward-compatible colors object */
export const colors: ThemeColors = lightColors;
