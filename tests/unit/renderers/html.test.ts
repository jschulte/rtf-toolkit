/**
 * HTML Renderer Unit Tests
 * Epic 3: HTML Renderer
 */

import { describe, it, expect } from 'vitest';
import { parseRTF } from '../../../src/parser/parser.js';
import { toHTML } from '../../../src/renderers/html.js';

describe('Epic 3: HTML Renderer - Basic', () => {
  it('should render simple text', () => {
    const rtf = '{\\rtf1 Hello World}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('Hello World');
    expect(html).toContain('<p>');
  });

  it('should render bold text', () => {
    const rtf = '{\\rtf1\\b Bold text\\b0}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('<strong>Bold text</strong>');
  });

  it('should render italic text', () => {
    const rtf = '{\\rtf1\\i Italic text\\i0}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('<em>Italic text</em>');
  });

  it('should render underlined text', () => {
    const rtf = '{\\rtf1\\ul Underlined text\\ul0}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('<u>Underlined text</u>');
  });

  it('should render combined formatting', () => {
    const rtf = '{\\rtf1\\b\\i\\ul Bold italic underlined\\b0\\i0\\ul0}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
    expect(html).toContain('<u>');
  });

  it('should render font size', () => {
    const rtf = '{\\rtf1\\fs24 12pt text}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('font-size');
    expect(html).toContain('12pt');
  });

  it('should render font family from font table', () => {
    const rtf = '{\\rtf1{\\fonttbl{\\f0 Arial;}}{\\f0 Arial text}}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('Arial');
    expect(html).toContain('font-family');
  });

  it('should render text color from color table', () => {
    const rtf = '{\\rtf1{\\colortbl;\\red255\\green0\\blue0;}{\\cf1 Red text}}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('color');
    expect(html).toContain('rgb(255, 0, 0)');
  });

  it('should render multiple paragraphs', () => {
    const rtf = '{\\rtf1 First paragraph\\par Second paragraph\\par}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    const paragraphCount = (html.match(/<p>/g) || []).length;
    expect(paragraphCount).toBe(2);
    expect(html).toContain('First paragraph');
    expect(html).toContain('Second paragraph');
  });

  it('should render centered text', () => {
    const rtf = '{\\rtf1\\qc Centered text}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('text-align');
    expect(html).toContain('center');
  });

  it('should render right-aligned text', () => {
    const rtf = '{\\rtf1\\qr Right aligned}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('text-align');
    expect(html).toContain('right');
  });

  it('should render nested formatting', () => {
    const rtf = '{\\rtf1 Normal {\\b bold} normal}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('Normal');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toMatch(/Normal.*<strong>bold<\/strong>.*normal/);
  });

  it('should escape HTML special characters', () => {
    const rtf = '{\\rtf1 < > & " \'}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).toContain('&amp;');
  });

  it('should render empty paragraphs', () => {
    const rtf = '{\\rtf1\\par\\par Text}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('<p>');
  });

  it('should wrap output in proper HTML structure', () => {
    const rtf = '{\\rtf1 Test}';
    const doc = parseRTF(rtf);
    const html = toHTML(doc);

    expect(html).toContain('<div');
    expect(html).toContain('</div>');
  });
});
