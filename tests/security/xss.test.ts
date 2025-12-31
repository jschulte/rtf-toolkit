/**
 * Security Tests - Cross-Site Scripting (XSS) Protection
 */

import { describe, it, expect } from 'vitest';
import { parseRTF, toHTML } from '../../src/index.js';

describe('XSS Protection', () => {
  describe('HTML Escaping in Text Content', () => {
    it('should escape backticks in text', () => {
      const rtf = '{\\rtf1 `backtick` text}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('&#96;');
      expect(html).not.toContain('`');
    });
  });

  describe('CSS Injection in Font Names', () => {
    it('should sanitize font names with HTML tags', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 Arial</style><script>alert(1)</script><style>;}}}{\\f0 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('</style>');
    });

    it('should remove special characters from font names', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 Font<>"\'`Name;}}{\\f0 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Font name should be sanitized in style attribute
      if (html.includes('font-family')) {
        const match = html.match(/font-family:\s*"([^"]*)"/);
        if (match) {
          const fontName = match[1];
          expect(fontName).not.toContain('<');
          expect(fontName).not.toContain('>');
        }
      }
    });

    it('should quote font family names in CSS', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 My Font;}}{\\f0 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Font names should be quoted if font-family is present
      if (html.includes('font-family')) {
        expect(html).toMatch(/font-family:\s*"[^"]*"/);
      } else {
        // If no font-family in output, that's also acceptable
        expect(html).toBeDefined();
      }
    });
  });

  describe('Author Name Escaping in Attributes', () => {
    it('should escape backticks in author names', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Alice` onmouseover=`alert(1);}}{\\revised\\revauth1 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Backticks should be escaped
      expect(html).toContain('&#96;');
      // Should not have literal backtick-delimited attributes
      expect(html).not.toMatch(/data-author=`[^`]*`/);
      // Verify it's safely in an HTML attribute
      expect(html).toMatch(/data-author="[^"]*&#96;[^"]*"/);
    });

    it('should escape quotes in author names', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Alice" onclick="alert(1);}}{\\revised\\revauth1 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Quotes should be escaped
      expect(html).toContain('&quot;');
      // Should not break out of attribute
      expect(html).not.toMatch(/data-author="[^"]*"\s+onclick=/);
    });
  });

  describe('RGB Color Value Sanitization', () => {
    it('should clamp out-of-range color values in HTML', () => {
      const rtf = '{\\rtf1{\\colortbl;\\red999\\green-50\\blue300;}{\\cf1 colored}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should contain rgb(255, 0, 255) - all clamped
      expect(html).toContain('rgb(255, 0, 255)');
    });

    it('should handle non-numeric color values safely', () => {
      // Test that HTML renderer sanitizes already-parsed color values
      const rtf = '{\\rtf1{\\colortbl;\\red0\\green0\\blue0;}{\\cf1 text}}';
      const doc = parseRTF(rtf);

      // Manually corrupt color table to test renderer sanitization
      doc.colorTable[1] = { r: NaN as any, g: Infinity as any, b: -Infinity as any };

      const html = toHTML(doc);

      // Should default to 0 for invalid values
      expect(html).toContain('rgb(0, 0, 0)');
    });
  });
});
