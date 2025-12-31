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

describe('Epic 2 Phase 2: Content Parsing', () => {
  it('should parse simple text content', () => {
    const rtf = '{\\rtf1 Hello World}';
    const doc = parseRTF(rtf);

    expect(doc.content).toHaveLength(1);
    expect(doc.content[0].type).toBe('paragraph');

    const para = doc.content[0] as any;
    expect(para.content).toHaveLength(1);
    expect(para.content[0].type).toBe('text');
    expect(para.content[0].content).toBe('Hello World');
  });

  it('should parse bold text', () => {
    const rtf = '{\\rtf1\\b Bold text\\b0}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.bold).toBe(true);
  });

  it('should parse italic text', () => {
    const rtf = '{\\rtf1\\i Italic text\\i0}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.italic).toBe(true);
  });

  it('should parse underlined text', () => {
    const rtf = '{\\rtf1\\ul Underlined text\\ul0}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.underline).toBe(true);
  });

  it('should parse font size', () => {
    const rtf = '{\\rtf1\\fs24 12pt text\\fs0}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.fontSize).toBe(24); // Half-points
  });

  it('should parse font family', () => {
    const rtf = '{\\rtf1{\\fonttbl{\\f0 Arial;}}{\\f0 Arial text}}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.font).toBe(0);
  });

  it('should parse text color', () => {
    const rtf = '{\\rtf1{\\colortbl;\\red255\\green0\\blue0;}{\\cf1 Red text}}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.foregroundColor).toBe(1);
  });

  it('should handle multiple formatting properties', () => {
    const rtf = '{\\rtf1\\b\\i\\ul Combined formatting\\b0\\i0\\ul0}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const textNode = para.content[0];
    expect(textNode.formatting.bold).toBe(true);
    expect(textNode.formatting.italic).toBe(true);
    expect(textNode.formatting.underline).toBe(true);
  });

  it('should handle nested formatting groups', () => {
    const rtf = '{\\rtf1 Normal {\\b bold {\\i bold italic} bold} normal}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    expect(para.content.length).toBeGreaterThan(1);

    // Should have text with different formatting
    const hasNormal = para.content.some((node: any) =>
      !node.formatting.bold && !node.formatting.italic
    );
    const hasBold = para.content.some((node: any) =>
      node.formatting.bold && !node.formatting.italic
    );
    const hasBoldItalic = para.content.some((node: any) =>
      node.formatting.bold && node.formatting.italic
    );

    expect(hasNormal).toBe(true);
    expect(hasBold).toBe(true);
    expect(hasBoldItalic).toBe(true);
  });

  it('should parse paragraph alignment', () => {
    const rtf = '{\\rtf1\\qc Centered text\\par}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    expect(para.formatting.alignment).toBe('center');
  });

  it('should parse multiple paragraphs', () => {
    const rtf = '{\\rtf1 First paragraph\\par Second paragraph\\par}';
    const doc = parseRTF(rtf);

    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].type).toBe('paragraph');
    expect(doc.content[1].type).toBe('paragraph');
  });

  it('should handle paragraph spacing', () => {
    const rtf = '{\\rtf1\\sb240\\sa120 Spaced paragraph}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    expect(para.formatting.spaceBefore).toBe(240);
    expect(para.formatting.spaceAfter).toBe(120);
  });

  it('should handle paragraph indentation', () => {
    const rtf = '{\\rtf1\\li720\\ri360\\fi-360 Indented paragraph}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    expect(para.formatting.leftIndent).toBe(720);
    expect(para.formatting.rightIndent).toBe(360);
    expect(para.formatting.firstLineIndent).toBe(-360);
  });

  it('should handle empty paragraphs', () => {
    const rtf = '{\\rtf1\\par\\par Text\\par}';
    const doc = parseRTF(rtf);

    expect(doc.content.length).toBeGreaterThanOrEqual(1);
  });

  it('should preserve formatting state through groups', () => {
    const rtf = '{\\rtf1\\b Bold {normal in group} still bold}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    // First and last text should be bold
    expect(para.content[0].formatting.bold).toBe(true);
    expect(para.content[para.content.length - 1].formatting.bold).toBe(true);
  });
});
