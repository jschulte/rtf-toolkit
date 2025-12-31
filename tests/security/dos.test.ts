/**
 * Security Tests - Denial of Service (DoS) Protection
 */

import { describe, it, expect } from 'vitest';
import { parseRTF } from '../../src/parser/parser.js';
import { tokenize } from '../../src/parser/tokenizer.js';

describe('DoS Protection', () => {
  describe('Nested Group Depth Limit', () => {
    it('should reject deeply nested groups (200 levels)', () => {
      const depth = 200;
      const malicious = '{'.repeat(depth) + '\\rtf1 text' + '}'.repeat(depth);

      expect(() => parseRTF(malicious)).toThrow(/maximum.*nesting.*depth/i);
    });

    it('should accept reasonable nesting (50 levels)', () => {
      const depth = 50;
      const valid = '{'.repeat(depth) + '\\rtf1 text' + '}'.repeat(depth);

      expect(() => parseRTF(valid)).not.toThrow();
    });

    it('should handle nested formatting groups', () => {
      const malicious = '{\\rtf1 ' + '{\\b '.repeat(150) + 'text' + '}'.repeat(150) + '}';

      expect(() => parseRTF(malicious)).toThrow(/maximum.*nesting.*depth/i);
    });
  });

  describe('Document Size Limit', () => {
    it('should reject documents larger than 50MB', () => {
      const huge = '{\\rtf1 ' + 'A'.repeat(60 * 1024 * 1024) + '}';

      expect(() => tokenize(huge)).toThrow(/exceeds maximum.*size/i);
    });

    it('should accept documents under size limit', () => {
      const acceptable = '{\\rtf1 ' + 'A'.repeat(1024 * 1024) + '}';

      expect(() => tokenize(acceptable)).not.toThrow();
    });
  });

  describe('Text Chunk Size Limit', () => {
    it('should reject single text chunk larger than 1MB', () => {
      const giant = '{\\rtf1 ' + 'X'.repeat(2 * 1024 * 1024) + '}';

      expect(() => tokenize(giant)).toThrow(/text chunk exceeds/i);
    });

    it('should accept multiple smaller chunks', () => {
      const chunks = '{\\rtf1 ' + ('A'.repeat(500000) + '\\par ').repeat(10) + '}';

      expect(() => tokenize(chunks)).not.toThrow();
    });
  });

  describe('Font Table Index Validation', () => {
    it('should reject font index >= 1000', () => {
      const malicious = '{\\rtf1{\\fonttbl{\\f9999 Arial;}}}';

      expect(() => parseRTF(malicious)).toThrow(/font index.*out of.*range/i);
    });

    it('should reject negative font index', () => {
      const malicious = '{\\rtf1{\\fonttbl{\\f-1 Arial;}}}';

      expect(() => parseRTF(malicious)).toThrow(/font index.*out of.*range/i);
    });

    it('should accept valid font indices', () => {
      const valid = '{\\rtf1{\\fonttbl{\\f0 Arial;}{\\f1 Times;}{\\f99 Courier;}}}';

      expect(() => parseRTF(valid)).not.toThrow();
    });
  });

  describe('Color Table Size Validation', () => {
    it('should reject color table with > 1000 entries', () => {
      const colors = Array(1100)
        .fill(0)
        .map(() => '\\red0\\green0\\blue0;')
        .join('');
      const malicious = `{\\rtf1{\\colortbl;${colors}}}`;

      expect(() => parseRTF(malicious)).toThrow(/color table exceeds/i);
    });

    it('should accept reasonable color table', () => {
      const valid = '{\\rtf1{\\colortbl;\\red255\\green0\\blue0;\\red0\\green255\\blue0;}}';

      expect(() => parseRTF(valid)).not.toThrow();
    });
  });

  describe('Revision Table Size Validation', () => {
    it('should reject revision table with > 1000 authors', () => {
      const authors = Array(1100)
        .fill(0)
        .map((_, i) => `{Author ${i};}`)
        .join('');
      const malicious = `{\\rtf1{\\*\\revtbl${authors}}}`;

      expect(() => parseRTF(malicious)).toThrow(/revision table exceeds/i);
    });
  });

  describe('Input Type Validation', () => {
    it('should reject non-string input to parseRTF', () => {
      expect(() => parseRTF(null as any)).toThrow(/must be a string/i);
      expect(() => parseRTF(undefined as any)).toThrow(/must be a string/i);
      expect(() => parseRTF(123 as any)).toThrow(/must be a string/i);
      expect(() => parseRTF({} as any)).toThrow(/must be a string/i);
    });

    it('should reject empty string input', () => {
      expect(() => parseRTF('')).toThrow(/cannot be empty/i);
    });

    it('should reject non-string input to tokenize', () => {
      expect(() => tokenize(null as any)).toThrow(/must be a string/i);
    });
  });

  describe('RGB Color Value Validation', () => {
    it('should sanitize out-of-range RGB values', () => {
      const rtf = '{\\rtf1{\\colortbl;\\red999\\green-50\\blue300;}}';
      const doc = parseRTF(rtf);

      expect(doc.colorTable[1].r).toBe(255); // Clamped to max
      expect(doc.colorTable[1].g).toBe(0); // Clamped to min
      expect(doc.colorTable[1].b).toBe(255); // Clamped to max
    });
  });
});
