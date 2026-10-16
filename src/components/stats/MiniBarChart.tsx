import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

export type MiniBarDatum = { label: string; value: number };

export function MiniBarChart({
  data,
  color,
  height = 72,
  highlightIndex,
}: {
  data: MiniBarDatum[];
  color: string;
  height?: number;
  highlightIndex?: number;
}) {
  const { colors: tc } = useTheme();
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  // Label roughly 6 bars so the axis stays readable on narrow screens.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  return (
    <View>
      <View style={[styles.row, { height }]}>
        {data.map((d, i) => {
          const h = max > 0 ? Math.max(2, Math.round((d.value / max) * height)) : 2;
          const highlighted = highlightIndex === i;
          return (
            <View
              key={`${d.label}-${i}`}
              style={styles.col}
              accessible
              accessibilityLabel={`${d.label}: ${d.value}`}
            >
              <View
                style={{
                  height: h,
                  borderRadius: 3,
                  backgroundColor: color,
                  opacity: highlightIndex == null || highlighted ? 1 : 0.45,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {data.map((d, i) => (
          <Text
            key={`${d.label}-${i}`}
            style={[styles.axisLabel, { color: tc.textMuted }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {i % labelEvery === 0 ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, justifyContent: 'flex-end' },
  axis: { flexDirection: 'row', gap: 2, marginTop: 4 },
  axisLabel: { flex: 1, fontSize: 9, textAlign: 'center' },
});
