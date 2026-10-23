import React, { useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { encodeBarcode, type ScannableSymbology } from '@/utils/barcodeEncoders';

type Props = {
  value: string;
  type: ScannableSymbology;
  height?: number;
};

const QUIET_MODULES = 10;

/**
 * Draws a real, scannable barcode. Every module is a whole number of device pixels so bar edges stay
 * razor sharp. Fractional bar widths blur on screen, which red-laser scanners cannot read.
 */
export function ScannedBarcode({ value, type, height = 60 }: Props) {
  const [width, setWidth] = useState(0);

  const widths = useMemo(() => {
    try {
      return encodeBarcode(value, type);
    } catch {
      return [];
    }
  }, [value, type]);

  if (widths.length === 0) return null;

  const totalModules = widths.reduce((sum, w) => sum + w, 0) + QUIET_MODULES * 2;
  const ratio = PixelRatio.get();
  const devicePx = Math.max(1, Math.floor(width * ratio));
  const modulePx = Math.max(1, Math.floor(devicePx / totalModules));
  const moduleSize = modulePx / ratio;

  return (
    <View
      style={[styles.row, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={`Barcode ${value}`}
    >
      {width > 0 ? (
        <View style={styles.bars}>
          <View style={{ width: QUIET_MODULES * moduleSize }} />
          {widths.map((w, i) => (
            <View key={i} style={{ width: w * moduleSize, backgroundColor: i % 2 === 0 ? '#000000' : '#FFFFFF' }} />
          ))}
          <View style={{ width: QUIET_MODULES * moduleSize }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
});
