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
