import { describe, expect, test } from 'vitest';
import { csvEscape, csvRow, csvFile } from '../src/lib/utils/csv';

describe('csvEscape', () => {
  test('passes through plain values', () => {
    expect(csvEscape('hello')).toBe('hello');
    expect(csvEscape(42)).toBe('42');
  });

  test('handles null and undefined as empty string', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  test('quotes fields containing comma', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  test('quotes and doubles internal quotes', () => {
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
  });

  test('quotes fields with newlines', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
});

describe('csvRow', () => {
  test('joins escaped cells with comma', () => {
    expect(csvRow(['a', 'b', 'c'])).toBe('a,b,c');
  });

  test('escapes only the cells that need it', () => {
    expect(csvRow(['plain', 'has,comma', 'quoted "x"'])).toBe('plain,"has,comma","quoted ""x"""');
  });
});

describe('csvFile', () => {
  test('emits header + rows separated by CRLF', () => {
    const out = csvFile(['id', 'name'], [['1', 'Alpha'], ['2', 'Beta, B']]);
    expect(out).toBe('id,name\r\n1,Alpha\r\n2,"Beta, B"\r\n');
  });

  test('handles empty rows array', () => {
    expect(csvFile(['x'], [])).toBe('x\r\n');
  });
});
