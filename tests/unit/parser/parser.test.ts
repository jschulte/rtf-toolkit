/**
 * Parser Unit Tests
 * Epic 2: RTF Parser & AST Builder
 */

import { describe, it, expect } from 'vitest';
import { parseRTF } from '../../../src/parser/parser.js';

describe('Epic 2 Phase 1: Basic Document Structure', () => {
  it('should parse minimal RTF document', () => {
    const rtf = '{\\rtf1}';
    const doc = parseRTF(rtf);

    expect(doc).toHaveProperty('type', 'document');
    expect(doc).toHaveProperty('rtfVersion', 1);
  });

  it('should parse RTF header with charset', () => {
    const rtf = '{\\rtf1\\ansi}';
    const doc = parseRTF(rtf);

    expect(doc.charset).toBe('ansi');
  });

  it('should parse RTF with default font', () => {
    const rtf = '{\\rtf1\\deff0}';
    const doc = parseRTF(rtf);

    expect(doc.defaultFont).toBe(0);
  });

  it('should parse simple font table', () => {
    const rtf = '{\\rtf1{\\fonttbl{\\f0 Arial;}{\\f1 Times New Roman;}}}';
    const doc = parseRTF(rtf);

    expect(doc.fontTable).toBeDefined();
    expect(doc.fontTable).toHaveLength(2);
    expect(doc.fontTable[0]).toMatchObject({ index: 0, name: 'Arial' });
    expect(doc.fontTable[1]).toMatchObject({ index: 1, name: 'Times New Roman' });
  });

  it('should parse font table with font families', () => {
    const rtf = '{\\rtf1{\\fonttbl{\\f0\\fnil Arial;}{\\f1\\froman Times;}}}';
    const doc = parseRTF(rtf);

    expect(doc.fontTable[0]).toMatchObject({
      index: 0,
      family: 'nil',
      name: 'Arial',
    });
    expect(doc.fontTable[1]).toMatchObject({
      index: 1,
      family: 'roman',
      name: 'Times',
    });
  });

  it('should parse color table', () => {
    const rtf = '{\\rtf1{\\colortbl;\\red255\\green0\\blue0;\\red0\\green255\\blue0;}}';
    const doc = parseRTF(rtf);

    expect(doc.colorTable).toBeDefined();
    expect(doc.colorTable).toHaveLength(3); // Index 0 is auto/default
    expect(doc.colorTable[1]).toMatchObject({ r: 255, g: 0, b: 0 }); // Red
    expect(doc.colorTable[2]).toMatchObject({ r: 0, g: 255, b: 0 }); // Green
  });

  it('should handle complete document header', () => {
    const rtf =
      '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}{\\colortbl;\\red255\\green0\\blue0;}}';
    const doc = parseRTF(rtf);

    expect(doc.rtfVersion).toBe(1);
    expect(doc.charset).toBe('ansi');
    expect(doc.defaultFont).toBe(0);
    expect(doc.fontTable).toHaveLength(1);
    expect(doc.colorTable).toHaveLength(2);
  });

  it('should initialize empty content array', () => {
    const rtf = '{\\rtf1}';
    const doc = parseRTF(rtf);

    expect(doc).toHaveProperty('content');
    expect(Array.isArray(doc.content)).toBe(true);
  });
});
