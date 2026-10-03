import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('csv', () => {
  it('neutralises formula-looking text cells', () => {
    expect(toCsv([['=HYPERLINK("http://x")', '+1', '-2', '@a', '正常']])).toBe(`"'=HYPERLINK(""http://x"")",'+1,'-2,'@a,正常`);
  });
  it('keeps numbers as numbers and round-trips quoted fields', () => {
    expect(toCsv([[-3, 'a,b']])).toBe('-3,"a,b"');
    expect(parseCsv('a,"b ""q"", c"\r\n1,2')).toEqual([['a', 'b "q", c'], ['1', '2']]);
  });
  it('handles empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
