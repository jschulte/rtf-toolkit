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

describe('Epic 3: HTML Renderer - Track Changes', () => {
  describe('markup mode (default)', () => {
    it('should render insertions with visual styling', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('class="rtf-revision-inserted"');
      expect(html).toContain('inserted');
      expect(html).toContain('background-color');
    });

    it('should render deletions with strikethrough styling', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\deleted\\revauth1 removed} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('class="rtf-revision-deleted"');
      expect(html).toContain('removed');
      expect(html).toContain('text-decoration: line-through');
    });

    it('should include data attributes by default', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John Doe;}}Text {\\revised\\revauth1 new} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('data-revision-type="insertion"');
      expect(html).toContain('data-author="John Doe"');
      expect(html).toContain('data-author-index="1"');
    });

    it('should include timestamp data attribute when present', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\revdttm12345 new} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('data-timestamp');
    });
  });

  describe('final mode', () => {
    it('should show insertions as normal text', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'final' } });

      expect(html).toContain('inserted');
      expect(html).not.toContain('rtf-revision-inserted');
      expect(html).not.toContain('data-revision-type');
    });

    it('should hide deletions completely', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\deleted\\revauth1 removed} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'final' } });

      expect(html).not.toContain('removed');
      expect(html).toContain('Text');
      expect(html).toContain('more');
    });

    it('should show document as if all changes were accepted', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{A;}{B;}}Start {\\revised\\revauth1 added} middle {\\deleted\\revauth2 removed} end.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'final' } });

      expect(html).toContain('added');
      expect(html).not.toContain('removed');
      expect(html).toContain('Start');
      expect(html).toContain('middle');
      expect(html).toContain('end');
    });
  });

  describe('original mode', () => {
    it('should hide insertions completely', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'original' } });

      expect(html).not.toContain('inserted');
      expect(html).toContain('Text');
      expect(html).toContain('more');
    });

    it('should show deletions as normal text', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\deleted\\revauth1 removed} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'original' } });

      expect(html).toContain('removed');
      expect(html).not.toContain('rtf-revision-deleted');
      expect(html).not.toContain('data-revision-type');
    });

    it('should show document as if all changes were rejected', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{A;}{B;}}Start {\\revised\\revauth1 added} middle {\\deleted\\revauth2 removed} end.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'original' } });

      expect(html).not.toContain('added');
      expect(html).toContain('removed');
      expect(html).toContain('Start');
      expect(html).toContain('middle');
      expect(html).toContain('end');
    });
  });

  describe('custom colors', () => {
    it('should use custom insertion colors', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, {
        trackChanges: {
          insertionColor: '#e6ffe6',
          insertionBorderColor: '#00ff00',
        },
      });

      expect(html).toContain('background-color: #e6ffe6');
      expect(html).toContain('border-bottom: 2px solid #00ff00');
    });

    it('should use custom deletion colors', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\deleted\\revauth1 removed} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, {
        trackChanges: {
          deletionColor: '#ffe6e6',
          deletionBorderColor: '#ff0000',
        },
      });

      expect(html).toContain('background-color: #ffe6e6');
      expect(html).toContain('border-bottom: 2px solid #ff0000');
    });
  });

  describe('data attributes option', () => {
    it('should exclude data attributes when disabled', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, {
        trackChanges: { includeDataAttributes: false },
      });

      expect(html).toContain('class="rtf-revision-inserted"');
      expect(html).not.toContain('data-revision-type');
      expect(html).not.toContain('data-author');
    });
  });

  describe('tooltips option', () => {
    it('should include title attribute when tooltips enabled', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John Doe;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, {
        trackChanges: { includeTooltips: true },
      });

      expect(html).toContain('title="Inserted by John Doe');
    });

    it('should include timestamp in tooltip when present', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\revdttm12345 inserted} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, {
        trackChanges: { includeTooltips: true },
      });

      expect(html).toContain('title="Inserted by Author on');
    });

    it('should show Deleted in tooltip for deletions', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Jane Smith;}}Text {\\deleted\\revauth1 removed} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, {
        trackChanges: { includeTooltips: true },
      });

      expect(html).toContain('title="Deleted by Jane Smith');
    });
  });

  describe('formatted text within revisions', () => {
    it('should preserve bold formatting in insertions', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\b bold insert\\b0} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('<strong>bold insert</strong>');
      expect(html).toContain('rtf-revision-inserted');
    });

    it('should preserve formatting in final mode', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\i italic text\\i0} more.}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc, { trackChanges: { mode: 'final' } });

      expect(html).toContain('<em>italic text</em>');
    });
  });
});
