import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { encodeBarcode, type ScannableSymbology } from '@/utils/barcodeEncoders';

type Props = {
  value: string;
  type: ScannableSymbology;
  height?: number;
};

/** Draws a real, scannable barcode. Bars use flex ratios so it always fits its container. */
export function ScannedBarcode({ value, type, height = 60 }: Props) {
  const widths = useMemo(() => {
    try {
      return encodeBarcode(value, type);
    } catch {
      return [];
    }
  }, [value, type]);

  if (widths.length === 0) return null;

  return (
    <View
      style={[styles.row, { height }]}
      accessibilityRole="image"
      accessibilityLabel={`Barcode ${value}`}
    >
      {/* Quiet zones: 10 modules each side, as required by scanners. */}
      <View style={{ flex: 10 }} />
      {widths.map((w, i) => (
        <View key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? '#000000' : '#FFFFFF' }} />
      ))}
      <View style={{ flex: 10 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
});
