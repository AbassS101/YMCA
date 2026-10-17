/**
 * Real 1D barcode encoders used to redraw a member's scanned physical card.
 * Each encoder returns alternating bar/space widths (in modules), starting with a bar.
 */

export type ScannableSymbology = 'code128' | 'code39' | 'codabar' | 'itf14';

export const SCANNABLE_SYMBOLOGIES: ScannableSymbology[] = ['code128', 'code39', 'codabar', 'itf14'];

// Code 128 symbol patterns (bar/space widths), index = symbol value 0..105.
const C128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
];
const C128_STOP = '2331112';
const START_B = 104;
const START_C = 105;
const CODE_C = 99;

function toDigits(s: string): number[] {
  return s.split('').map((c) => c.charCodeAt(0) - 48);
}

export function encodeCode128(value: string): number[] {
  const text = value;
  if (!text || /[^\x20-\x7E]/.test(text)) throw new Error('Unsupported Code 128 value');

  const symbols: number[] = [];
  if (/^\d{4,}$/.test(text)) {
    // Code C packs digit pairs; odd lengths start in Code B for the first digit.
    let rest = text;
    if (text.length % 2 === 1) {
      symbols.push(START_B, text.charCodeAt(0) - 32, CODE_C);
      rest = text.slice(1);
    } else {
      symbols.push(START_C);
    }
    for (let i = 0; i < rest.length; i += 2) {
      const [a, b] = toDigits(rest.slice(i, i + 2));
      symbols.push(a * 10 + b);
    }
  } else {
    symbols.push(START_B);
    for (const ch of text) symbols.push(ch.charCodeAt(0) - 32);
  }

  let sum = symbols[0];
  for (let i = 1; i < symbols.length; i++) sum += symbols[i] * i;
  symbols.push(sum % 103);

  const widths: number[] = [];
  for (const s of symbols) widths.push(...C128[s].split('').map(Number));
  widths.push(...C128_STOP.split('').map(Number));
  return widths;
}

// Code 39: n = narrow, w = wide; 9 elements per char (bar, space, bar, ...).
const C39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

export function encodeCode39(value: string): number[] {
  const text = value.toUpperCase();
  if (!text || /[^0-9A-Z\-. ]/.test(text)) throw new Error('Unsupported Code 39 value');

  const widths: number[] = [];
  const chars = `*${text}*`.split('');
  chars.forEach((ch, i) => {
    if (i > 0) widths.push(1); // inter-character gap
    widths.push(...C39[ch].split('').map((e) => (e === 'w' ? 3 : 1)));
  });
  return widths;
}

const CODABAR: Record<string, string> = {
  '0': 'nnnnnww', '1': 'nnnnwwn', '2': 'nnnwnnw', '3': 'wwnnnnn', '4': 'nnwnnwn',
  '5': 'wnnnnwn', '6': 'nwnnnnw', '7': 'nwnnwnn', '8': 'nwwnnnn', '9': 'wnnwnnn',
  '-': 'nnnwwnn', $: 'nnwwnnn', ':': 'wnnnwnw', '/': 'wnwnnnw', '.': 'wnwnwnw', '+': 'nnwnwnw',
  A: 'nnwwnwn', B: 'nwnwnnw', C: 'nnnwnww', D: 'nnnwwwn',
};

export function encodeCodabar(value: string): number[] {
  let text = value.toUpperCase();
  // Scanners often strip the A-D start/stop characters; add them back if missing.
  if (!/^[A-D].*[A-D]$/.test(text)) text = `A${text}A`;
  if (text.length < 3 || /[^0-9A-D\-$:/.+]/.test(text)) throw new Error('Unsupported Codabar value');

  const widths: number[] = [];
  text.split('').forEach((ch, i) => {
    if (i > 0) widths.push(1);
    widths.push(...CODABAR[ch].split('').map((e) => (e === 'w' ? 3 : 1)));
  });
  return widths;
}

// Interleaved 2 of 5: digit pairs, first digit in the bars, second in the spaces.
const ITF = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn'];

export function encodeItf(value: string): number[] {
  if (!/^\d+$/.test(value)) throw new Error('Unsupported ITF value');
  const digits = value.length % 2 === 1 ? `0${value}` : value;
  const w = (e: string) => (e === 'w' ? 3 : 1);

  const widths: number[] = [1, 1, 1, 1]; // start
  for (let i = 0; i < digits.length; i += 2) {
    const bars = ITF[Number(digits[i])];
    const spaces = ITF[Number(digits[i + 1])];
    for (let k = 0; k < 5; k++) widths.push(w(bars[k]), w(spaces[k]));
  }
  widths.push(3, 1, 1); // stop
  return widths;
}

export function encodeBarcode(value: string, type: ScannableSymbology): number[] {
  switch (type) {
    case 'code39':
      return encodeCode39(value);
    case 'codabar':
      return encodeCodabar(value);
    case 'itf14':
      return encodeItf(value);
    default:
      return encodeCode128(value);
  }
}
