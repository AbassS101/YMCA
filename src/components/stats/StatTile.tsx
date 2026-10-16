import { KpiTile, type KpiTileProps } from '@/components/staff/KpiTile';

export type StatTileProps = Omit<KpiTileProps, 'value'> & {
  value: number | string;
  /** Change vs. the prior period; rendered as a ▲/▼ suffix. */
  delta?: { value: number; goodWhen: 'up' | 'down' };
};

/** KpiTile with an optional ▲/▼ delta. Color is carried by the label text; the tile itself is unchanged. */
export function StatTile({ delta, label, ...rest }: StatTileProps) {
  if (!delta || delta.value === 0) return <KpiTile label={label} {...rest} />;
  const up = delta.value > 0;
  const good = up === (delta.goodWhen === 'up');
  const mark = `${up ? '▲' : '▼'} ${Math.abs(delta.value)}`;
  return <KpiTile label={`${label} ${mark}`} {...rest} color={good ? '#15803D' : '#B42318'} />;
}
