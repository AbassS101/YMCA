import { csvSafe, toCsv } from '@/export/csv';

type Row = { a: string | number | boolean | null | undefined; b?: string };
const cols = [
  { header: 'A', value: (r: Row) => r.a },
  { header: 'B', value: (r: Row) => r.b },
];

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
    const csv = toCsv<Row>([{ a: 1, b: 'x' }], cols);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('A,B\r\n1,x\r\n');
  });

  it('quotes fields with commas, quotes and newlines, doubling inner quotes', () => {
    const csv = toCsv<Row>([{ a: 'a,b', b: 'say "hi"' }, { a: 'line1\nline2', b: 'cr\rx' }], cols).slice(1);
    expect(csv).toBe('A,B\r\n"a,b","say ""hi"""\r\n"line1\nline2","cr\rx"\r\n');
  });

  it('writes null and undefined as empty and keeps numbers and booleans', () => {
    const csv = toCsv<Row>([{ a: null }, { a: false, b: undefined }, { a: 0 }], cols).slice(1);
    expect(csv).toBe('A,B\r\n,\r\nfalse,\r\n0,\r\n');
  });

  it('guards string cells against formula injection', () => {
    const csv = toCsv<Row>([{ a: '=SUM(A1)', b: '@cmd' }, { a: '+1', b: '-2' }], cols).slice(1);
    expect(csv).toBe("A,B\r\n'=SUM(A1),'@cmd\r\n'+1,'-2\r\n");
  });

  it('does not alter negative numbers', () => {
    expect(toCsv<Row>([{ a: -5 }], cols).slice(1)).toBe('A,B\r\n-5,\r\n');
  });

  it('emits only the header for no rows', () => {
    expect(toCsv<Row>([], cols).slice(1)).toBe('A,B\r\n');
  });
});

describe('csvSafe', () => {
  it('prefixes only values that start with a formula character', () => {
    expect(csvSafe('=1')).toBe("'=1");
    expect(csvSafe('+1')).toBe("'+1");
    expect(csvSafe('-1')).toBe("'-1");
    expect(csvSafe('@x')).toBe("'@x");
    expect(csvSafe('a=1')).toBe('a=1');
    expect(csvSafe('')).toBe('');
  });
});
