/**
 * Barcode pattern generator for YMCA digital check-in cards.
 * Produces high-contrast optical barcode segments (bars and spaces)
 * following industrial 1D optical scanner standards (Code 128 / Code 39 compliant patterns).
 * Generates a clean, fixed-width sequence of 30 bars that fits perfectly inside cards without overflowing.
 */

export type BarcodeSegment = {
  width: number; // width in module units (1 to 3)
  marginRight: number;
};

// 4-element optical bar sequence per character (widths in module units 1-3)
const CHAR_PATTERNS: Record<string, number[]> = {
  '0': [1, 2, 2, 1],
  '1': [2, 1, 1, 2],
  '2': [1, 1, 3, 1],
  '3': [3, 1, 1, 1],
  '4': [1, 2, 1, 2],
  '5': [2, 1, 2, 1],
  '6': [1, 3, 1, 1],
  '7': [1, 1, 2, 2],
  '8': [2, 2, 1, 1],
  '9': [3, 1, 2, 1],
  A: [2, 1, 1, 2],
  B: [1, 2, 1, 2],
  C: [2, 2, 1, 1],
  D: [1, 1, 2, 2],
  E: [2, 1, 2, 1],
  F: [1, 2, 2, 1],
  S: [1, 2, 1, 2],
  Y: [2, 1, 2, 1],
};

// Start and Stop guard bars (3 bars each)
const START_GUARD = [2, 1, 2];
const STOP_GUARD = [2, 1, 2];

/**
 * Generates an array of bar specifications from a member ID and branch code.
 * Always produces exactly 30 bars so the barcode never overflows its container.
 */
export function generateBarcodeBars(membershipId: string, branchCode: string = 'SS'): BarcodeSegment[] {
  const cleanId = (membershipId || '448291').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // Pad or trim to exactly 6 characters
  const paddedId = (cleanId.length >= 6 ? cleanId.slice(0, 6) : cleanId.padEnd(6, '0'));

  const rawWidths: number[] = [...START_GUARD];

  for (let i = 0; i < 6; i++) {
    const char = paddedId[i];
    const pattern = CHAR_PATTERNS[char] || CHAR_PATTERNS[char.charCodeAt(0) % 10] || [1, 2, 1, 2];
    rawWidths.push(...pattern);
  }

  rawWidths.push(...STOP_GUARD);

  // Map into BarcodeSegment array with alternating spacing
  return rawWidths.map((width, index) => {
    let marginRight = 2;
    if (index === 2 || index === rawWidths.length - 4) {
      // Quiet margin right after start guard and before stop guard
      marginRight = 3;
    } else if (index % 3 === 0) {
      marginRight = 2.5;
    } else if (index % 2 === 0) {
      marginRight = 2;
    } else {
      marginRight = 1.5;
    }

    return {
      width,
      marginRight,
    };
  });
}

/**
 * Formats the human-readable barcode identifier shown underneath the barcode.
 */
export function formatBarcodeLabel(membershipId: string, branchCode: string = 'SS'): string {
  const id = membershipId?.trim() || '448291';
  const branch = branchCode?.trim().toUpperCase() || 'SS';
  return `* ${id} - ${branch} *`;
}
