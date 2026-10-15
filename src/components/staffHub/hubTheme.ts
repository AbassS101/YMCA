export type HubSection = 'training' | 'swim' | 'packages' | 'desk' | 'maintenance';

/** One accent per section of the Staff page. */
export const HUB_ACCENTS: Record<HubSection, { light: string; dark: string; soft: string; darkSoft: string }> = {
  training: { light: '#00609C', dark: '#38BDF8', soft: '#EBF4FA', darkSoft: '#0C2A3D' },
  swim: { light: '#00838F', dark: '#22D3EE', soft: '#E0F7FA', darkSoft: '#083344' },
  packages: { light: '#4338CA', dark: '#A5B4FC', soft: '#E0E7FF', darkSoft: '#1E1B4B' },
  desk: { light: '#0369A1', dark: '#7DD3FC', soft: '#E0F2FE', darkSoft: '#082F49' },
  maintenance: { light: '#B45309', dark: '#FBBF24', soft: '#FEF3C7', darkSoft: '#451A03' },
};

export function hubAccent(section: HubSection, isDark: boolean): { color: string; soft: string } {
  const a = HUB_ACCENTS[section];
  return { color: isDark ? a.dark : a.light, soft: isDark ? a.darkSoft : a.soft };
}

export function formatLessonWhen(isoStart: string): string {
  const d = new Date(isoStart);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
