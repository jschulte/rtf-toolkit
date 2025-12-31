/**
 * Tokenizer Unit Tests
 * Story 1.1: Basic Control Word Recognition
 */

import { describe, it, expect } from 'vitest';
import { tokenize, Token } from '../../../src/parser/tokenizer.js';

describe('Story 1.1: Basic Control Word Recognition', () => {
  it('should recognize simple control word without parameter', () => {
    const tokens = tokenize('\\b');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'b',
      param: null,
    });
  });

  it('should recognize control word with positive parameter', () => {
    const tokens = tokenize('\\rtf1');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'rtf',
      param: 1,
    });
  });

  it('should recognize control word with negative parameter', () => {
    const tokens = tokenize('\\li-720');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'li',
      param: -720,
    });
  });

  it('should recognize control word with large parameter', () => {
    const tokens = tokenize('\\fs24');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'fs',
      param: 24,
    });
  });

  it('should handle control word followed by space', () => {
    const tokens = tokenize('\\par ');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'par',
      param: null,
    });
  });

  it('should handle multiple control words', () => {
    const tokens = tokenize('\\rtf1\\ansi\\deff0');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: 'controlWord', name: 'rtf', param: 1 });
    expect(tokens[1]).toMatchObject({ type: 'controlWord', name: 'ansi', param: null });
    expect(tokens[2]).toMatchObject({ type: 'controlWord', name: 'deff', param: 0 });
  });

  it('should track position information', () => {
    const tokens = tokenize('\\rtf1');
    expect(tokens[0]).toHaveProperty('pos');
    expect(tokens[0].pos).toBe(0);
  });

  it('should handle control word at end of string', () => {
    const tokens = tokenize('\\b');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'b',
    });
  });

  it('should handle zero parameter', () => {
    const tokens = tokenize('\\deff0');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlWord',
      name: 'deff',
      param: 0,
    });
  });

  it('should correctly identify control word boundaries', () => {
    const tokens = tokenize('\\b\\i');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ type: 'controlWord', name: 'b' });
    expect(tokens[1]).toMatchObject({ type: 'controlWord', name: 'i' });
  });
});

describe('Story 1.2: Group Delimiters', () => {
  it('should recognize opening brace as groupStart', () => {
    const tokens = tokenize('{');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'groupStart',
    });
  });

  it('should recognize closing brace as groupEnd', () => {
    const tokens = tokenize('}');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'groupEnd',
    });
  });

  it('should tokenize simple RTF document with groups', () => {
    const tokens = tokenize('{\\rtf1}');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: 'groupStart' });
    expect(tokens[1]).toMatchObject({ type: 'controlWord', name: 'rtf', param: 1 });
    expect(tokens[2]).toMatchObject({ type: 'groupEnd' });
  });

  it('should handle nested groups', () => {
    const tokens = tokenize('{{}}');
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toMatchObject({ type: 'groupStart' });
    expect(tokens[1]).toMatchObject({ type: 'groupStart' });
    expect(tokens[2]).toMatchObject({ type: 'groupEnd' });
    expect(tokens[3]).toMatchObject({ type: 'groupEnd' });
  });

  it('should handle multiple levels of nesting', () => {
    const tokens = tokenize('{\\rtf1{\\b nested}}');
    expect(tokens[0]).toMatchObject({ type: 'groupStart' });
    expect(tokens[1]).toMatchObject({ type: 'controlWord', name: 'rtf' });
    expect(tokens[2]).toMatchObject({ type: 'groupStart' });
    expect(tokens[3]).toMatchObject({ type: 'controlWord', name: 'b' });
    expect(tokens[5]).toMatchObject({ type: 'groupEnd' });
    expect(tokens[6]).toMatchObject({ type: 'groupEnd' });
  });

  it('should track group positions', () => {
    const tokens = tokenize('{test}');
    expect(tokens[0]).toHaveProperty('pos', 0);
    expect(tokens[1]).toHaveProperty('pos'); // text token
    expect(tokens[2]).toHaveProperty('pos', 5);
  });

  it('should handle groups in complex documents', () => {
    const tokens = tokenize('{\\rtf1\\ansi{\\b bold}}');
    const groupStarts = tokens.filter((t) => t.type === 'groupStart');
    const groupEnds = tokens.filter((t) => t.type === 'groupEnd');
    expect(groupStarts).toHaveLength(2);
    expect(groupEnds).toHaveLength(2);
  });

  it('should maintain proper group depth', () => {
    const input = '{{{nested}}}';
    const tokens = tokenize(input);
    const starts = tokens.filter((t) => t.type === 'groupStart').length;
    const ends = tokens.filter((t) => t.type === 'groupEnd').length;
    expect(starts).toBe(3);
    expect(ends).toBe(3);
  });
});

describe('Story 1.3: Control Symbols & Escape Sequences', () => {
  it('should handle hex escape for ASCII character', () => {
    const tokens = tokenize("\\'41");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: 'A',
    });
  });

  it('should handle hex escape for extended ASCII', () => {
    const tokens = tokenize("\\'e9");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: 'é',
    });
  });

  it('should handle lowercase hex codes', () => {
    const tokens = tokenize("\\'61");
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: 'a',
    });
  });

  it('should handle uppercase hex codes', () => {
    const tokens = tokenize("\\'4A");
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: 'J',
    });
  });

  it('should handle non-breaking space symbol', () => {
    const tokens = tokenize('\\~');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlSymbol',
      name: '~',
      value: '\u00A0', // non-breaking space
    });
  });

  it('should handle optional hyphen symbol', () => {
    const tokens = tokenize('\\-');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlSymbol',
      name: '-',
      value: '\u00AD', // soft hyphen
    });
  });

  it('should handle non-breaking hyphen symbol', () => {
    const tokens = tokenize('\\_');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'controlSymbol',
      name: '_',
      value: '\u2011', // non-breaking hyphen
    });
  });

  it('should handle escaped backslash', () => {
    const tokens = tokenize('\\\\');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: '\\',
    });
  });

  it('should handle escaped opening brace', () => {
    const tokens = tokenize('\\{');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: '{',
    });
  });

  it('should handle escaped closing brace', () => {
    const tokens = tokenize('\\}');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'text',
      value: '}',
    });
  });

  it('should handle multiple hex escapes in sequence', () => {
    const tokens = tokenize("\\'48\\'65\\'6c\\'6c\\'6f"); // "Hello"
    expect(tokens).toHaveLength(5);
    expect(tokens.map((t) => t.value).join('')).toBe('Hello');
  });

  it('should handle hex escapes within text', () => {
    const tokens = tokenize("Hello\\'20World");
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: 'text', value: 'Hello' });
    expect(tokens[1]).toMatchObject({ type: 'text', value: ' ' });
    expect(tokens[2]).toMatchObject({ type: 'text', value: 'World' });
  });

  it('should handle special symbols in context', () => {
    const tokens = tokenize('word\\~hyphen');
    expect(tokens.some((t) => t.type === 'controlSymbol' && t.name === '~')).toBe(true);
  });

  it('should preserve position information for control symbols', () => {
    const tokens = tokenize('\\~');
    expect(tokens[0]).toHaveProperty('pos');
    expect(tokens[0].pos).toBe(0);
  });

  it('should handle mixed escape types', () => {
    const tokens = tokenize("\\{\\'41\\}");
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: 'text', value: '{' });
    expect(tokens[1]).toMatchObject({ type: 'text', value: 'A' });
    expect(tokens[2]).toMatchObject({ type: 'text', value: '}' });
  });
});

describe('Story 1.5: Unicode Character Support', () => {
  it('should handle basic Unicode character', () => {
    const tokens = tokenize('\\u1234?');
    // RTF \u1234 is decimal 1234, not hex 0x1234
    expect(tokens.some((t) => t.type === 'text' && t.value === String.fromCharCode(1234))).toBe(
      true
    );
  });

  it('should handle Unicode with alternate representation', () => {
    const tokens = tokenize('\\u8364?'); // € sign
    expect(tokens.some((t) => t.type === 'text' && t.value === '€')).toBe(true);
  });

  it('should handle negative Unicode values', () => {
    const tokens = tokenize('\\u-10179?');
    // Negative values represent surrogate pairs or special handling
    expect(tokens).toHaveLength(1);
  });

  it('should skip alternate character after Unicode', () => {
    const tokens = tokenize('\\u8364?test');
    // Should have € and "test", but not "?"
    const values = tokens.filter((t) => t.type === 'text').map((t) => t.value);
    expect(values).toContain('€');
    expect(values).toContain('test');
  });

  it('should handle multiple Unicode characters', () => {
    const tokens = tokenize('\\u20320?\\u22909?'); // 你好 in Unicode
    const textTokens = tokens.filter((t) => t.type === 'text');
    expect(textTokens.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle Unicode in context with text', () => {
    const tokens = tokenize('Hello\\u8364?World');
    const values = tokens.filter((t) => t.type === 'text').map((t) => t.value);
    expect(values).toContain('Hello');
    expect(values).toContain('€');
    expect(values).toContain('World');
  });
});
