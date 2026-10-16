export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

/** Prefixes a `'` when a value could be run as a spreadsheet formula (= + - @). */
export function csvSafe(v: string): string {
  return /^[=+\-@]/.test(v) ? `'${v}` : v;
}

function escapeField(raw: string): string {
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** RFC 4180 CSV: CRLF line endings, quoted special fields, UTF-8 BOM prefix. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeField(c.header)).join(',')];
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => {
          const v = c.value(row);
          if (v === null || v === undefined) return '';
          return escapeField(typeof v === 'string' ? csvSafe(v) : String(v));
        })
        .join(',')
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
