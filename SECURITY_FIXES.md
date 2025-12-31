# Security Fixes Implementation Guide

This document provides detailed implementation guidance for fixing the security vulnerabilities identified in the security audit.

---

## Implementation Roadmap

### Phase 1: Critical DoS Fixes (Priority: IMMEDIATE)
- [ ] Add depth limit for nested groups
- [ ] Add document size limits
- [ ] Validate font/color table indices
- [ ] Add input type validation

### Phase 2: XSS Prevention (Priority: HIGH)
- [ ] Fix HTML escaping in font names
- [ ] Fix attribute escaping for author names
- [ ] Validate RGB color values
- [ ] Add CSS value sanitization

### Phase 3: Data Validation (Priority: MEDIUM)
- [ ] Add Unicode character validation
- [ ] Fix timestamp overflow
- [ ] Add control word length limits
- [ ] Add parameter bounds checking

### Phase 4: Testing & Documentation (Priority: ONGOING)
- [ ] Add security test suite
- [ ] Add fuzzing tests
- [ ] Update documentation
- [ ] Add security policy

---

## Fix #1: Depth Limit for Nested Groups

### File: `/Users/jonahschulte/git/rtf-toolkit/src/parser/parser.ts`

```typescript
/**
 * RTF Parser
 * Converts token stream to Abstract Syntax Tree
 */

import type {
  RTFDocument,
  FontDescriptor,
  RGBColor,
  RevisionAuthor,
  ParagraphNode,
  TextNode,
  RevisionNode,
  InlineNode,
  CharacterFormatting,
  ParagraphFormatting,
} from './ast-simple.js';
import { tokenize, Token } from './tokenizer.js';

// Security constants
const MAX_GROUP_DEPTH = 100;
const MAX_FONT_INDEX = 1000;
const MAX_COLOR_INDEX = 1000;
const MAX_AUTHOR_INDEX = 1000;

/**
 * Parser class for building AST from tokens
 */
class Parser {
  private tokens: Token[];
  private pos = 0;
  private formattingStack: FormattingState[] = [{}];
  private paragraphState: ParagraphState = {};
  private groupDepth = 0; // ADD THIS

  // ... existing methods ...

  /**
   * Parse document content (header + body)
   */
  private parseDocumentContent(doc: RTFDocument): void {
    let currentParagraph: InlineNode[] = [];

    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.peek();

      if (token?.type === 'controlWord') {
        const { name, param } = token;

        // Check for paragraph break
        if (name === 'par' || name === 'line') {
          this.advance();

          if (currentParagraph.length > 0 || name === 'par') {
            doc.content.push(this.createParagraph(currentParagraph));
            currentParagraph = [];
            this.paragraphState = {};
          }
          continue;
        }

        if (this.isHeaderControlWord(name)) {
          this.parseHeaderControlWord(doc);
          continue;
        }

        if (this.isFormattingControlWord(name)) {
          this.parseFormattingControlWord();
          continue;
        }

        if (this.isParagraphControlWord(name)) {
          this.parseParagraphControlWord();
          continue;
        }

        this.advance();
      } else if (token?.type === 'groupStart') {
        // SECURITY FIX: Check group depth
        this.groupDepth++;
        if (this.groupDepth > MAX_GROUP_DEPTH) {
          throw new Error(
            `Maximum group nesting depth (${MAX_GROUP_DEPTH}) exceeded. ` +
            `This may indicate a malicious or malformed RTF document.`
          );
        }

        try {
          this.advance(); // consume {
          const nextToken = this.peek();

          // Check for ignorable destination ({\* ...})
          if (nextToken?.type === 'text' && nextToken.value === '*') {
            this.advance();
            const destToken = this.peek();
            if (destToken?.type === 'controlWord' && destToken.name === 'revtbl') {
              this.parseRevisionTable(doc);
              continue;
            }
            this.skipGroup();
            continue;
          }

          if (nextToken?.type === 'controlWord') {
            const { name } = nextToken;

            if (name === 'fonttbl') {
              this.parseFontTable(doc);
              continue;
            } else if (name === 'colortbl') {
              this.parseColorTable(doc);
              continue;
            } else if (name === 'revised' || name === 'deleted') {
              const revisionNode = this.parseRevisionGroup(name);
              if (revisionNode) {
                currentParagraph.push(revisionNode);
                doc.hasRevisions = true;
              }
              if (!this.isEOF() && this.match('groupEnd')) {
                this.advance();
              }
              continue;
            }
          }

          this.pushFormatting();
          const savedParaState = { ...this.paragraphState };

          const groupContent = this.parseContentGroup();
          currentParagraph.push(...groupContent);

          this.popFormatting();
          this.paragraphState = savedParaState;

          if (!this.isEOF() && this.match('groupEnd')) {
            this.advance();
          }
        } finally {
          // SECURITY FIX: Always decrement depth
          this.groupDepth--;
        }
      } else if (token?.type === 'text') {
        const textNode = this.createTextNode(String(token.value || ''));
        currentParagraph.push(textNode);
        this.advance();
      } else {
        this.advance();
      }
    }

    if (currentParagraph.length > 0) {
      doc.content.push(this.createParagraph(currentParagraph));
    }
  }

  /**
   * Parse content within a group
   */
  private parseContentGroup(): InlineNode[] {
    const nodes: InlineNode[] = [];

    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.peek();

      if (token?.type === 'controlWord') {
        const { name } = token;

        if (this.isFormattingControlWord(name)) {
          this.parseFormattingControlWord();
        } else {
          this.advance();
        }
      } else if (token?.type === 'groupStart') {
        // SECURITY FIX: Check depth in nested groups
        this.groupDepth++;
        if (this.groupDepth > MAX_GROUP_DEPTH) {
          throw new Error(
            `Maximum group nesting depth (${MAX_GROUP_DEPTH}) exceeded. ` +
            `This may indicate a malicious or malformed RTF document.`
          );
        }

        try {
          this.advance();
          this.pushFormatting();

          const groupContent = this.parseContentGroup();
          nodes.push(...groupContent);

          this.popFormatting();

          if (!this.isEOF() && this.match('groupEnd')) {
            this.advance();
          }
        } finally {
          this.groupDepth--;
        }
      } else if (token?.type === 'text') {
        nodes.push(this.createTextNode(String(token.value || '')));
        this.advance();
      } else {
        this.advance();
      }
    }

    return nodes;
  }

  /**
   * Parse individual font descriptor
   */
  private parseFontDescriptor(): FontDescriptor | null {
    this.expect('groupStart');

    let fontIndex: number | null = null;
    let fontFamily: string | undefined;
    let fontName = '';

    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.advance();

      if (token?.type === 'controlWord') {
        const { name, param } = token;

        if (name === 'f' && param !== null) {
          // SECURITY FIX: Validate font index
          if (param < 0 || param >= MAX_FONT_INDEX) {
            throw new Error(
              `Font index ${param} out of valid range [0, ${MAX_FONT_INDEX})`
            );
          }
          fontIndex = param;
        } else if (name?.startsWith('f') && name.length > 1) {
          fontFamily = name.substring(1);
        }
      } else if (token?.type === 'text') {
        fontName += token.value || '';
      }
    }

    this.expect('groupEnd');

    fontName = fontName.replace(/;$/, '').trim();

    if (fontIndex !== null && fontName) {
      return {
        index: fontIndex,
        family: fontFamily,
        name: fontName,
      };
    }

    return null;
  }

  /**
   * Parse color table
   */
  private parseColorTable(doc: RTFDocument): void {
    this.advance(); // Skip \colortbl

    doc.colorTable.push({ r: 0, g: 0, b: 0 }); // Index 0

    let currentColor: Partial<RGBColor> = {};

    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.advance();

      if (token?.type === 'controlWord') {
        const { name, param } = token;

        // SECURITY FIX: Validate RGB values
        const validateRGB = (value: number | null): number => {
          if (value === null) return 0;
          if (typeof value !== 'number' || !isFinite(value)) return 0;
          return Math.max(0, Math.min(255, Math.floor(value)));
        };

        if (name === 'red') {
          currentColor.r = validateRGB(param);
        } else if (name === 'green') {
          currentColor.g = validateRGB(param);
        } else if (name === 'blue') {
          currentColor.b = validateRGB(param);
        }
      } else if (token?.type === 'text' && token.value === ';') {
        if (
          currentColor.r !== undefined &&
          currentColor.g !== undefined &&
          currentColor.b !== undefined
        ) {
          // SECURITY FIX: Check color table size
          if (doc.colorTable.length >= MAX_COLOR_INDEX) {
            throw new Error(
              `Color table exceeds maximum size (${MAX_COLOR_INDEX})`
            );
          }
          doc.colorTable.push(currentColor as RGBColor);
        }
        currentColor = {};
      }
    }

    this.expect('groupEnd');
  }

  /**
   * Parse revision table ({\*\revtbl ...})
   */
  private parseRevisionTable(doc: RTFDocument): void {
    this.advance(); // Skip \revtbl

    let authorIndex = 0;

    while (!this.isEOF() && !this.match('groupEnd')) {
      if (this.match('groupStart')) {
        this.expect('groupStart');

        let authorName = '';

        while (!this.isEOF() && !this.match('groupEnd')) {
          const token = this.advance();

          if (token?.type === 'text') {
            authorName += token.value || '';
          }
        }

        this.expect('groupEnd');

        authorName = authorName.replace(/;$/, '').trim();

        if (authorName) {
          // SECURITY FIX: Check author table size
          if (doc.revisionTable.length >= MAX_AUTHOR_INDEX) {
            throw new Error(
              `Revision table exceeds maximum size (${MAX_AUTHOR_INDEX})`
            );
          }

          doc.revisionTable.push({
            index: authorIndex++,
            name: authorName,
          });
        }
      } else {
        this.advance();
      }
    }

    this.expect('groupEnd');
  }
}

/**
 * Parse RTF string to AST
 */
export function parseRTF(rtf: string): RTFDocument {
  // SECURITY FIX: Validate input
  if (typeof rtf !== 'string') {
    throw new TypeError('Input must be a string');
  }

  if (rtf.length === 0) {
    throw new Error('Input RTF string cannot be empty');
  }

  const tokens = tokenize(rtf);
  const parser = new Parser(tokens);
  return parser.parseDocument();
}
```

---

## Fix #2: Document Size Limits

### File: `/Users/jonahschulte/git/rtf-toolkit/src/parser/tokenizer.ts`

```typescript
/**
 * RTF Tokenizer/Lexer
 */

// Security constants
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TEXT_CHUNK_SIZE = 1024 * 1024; // 1MB per text chunk
const MAX_CONTROL_WORD_LENGTH = 32; // RTF spec limit
const MAX_PARAM_DIGITS = 10; // Allows up to 9,999,999,999

/**
 * Scanner class for tokenizing RTF
 */
class Scanner {
  public pos = 0;
  private line = 1;
  private column = 1;
  private input: string;
  private length: number;

  constructor(input: string) {
    // SECURITY FIX: Validate document size
    if (input.length > MAX_DOCUMENT_SIZE) {
      throw new Error(
        `Document size (${input.length} bytes) exceeds maximum allowed size ` +
        `(${MAX_DOCUMENT_SIZE} bytes). This may indicate a malicious document.`
      );
    }

    this.input = input;
    this.length = input.length;
  }

  // ... existing methods ...

  /**
   * Scan a control word (\word or \word123 or \word-123)
   */
  scanControlWord(): Token {
    const startPos = this.pos - 1;
    const position = this.getPosition();

    // Extract control word name
    let name = '';
    // SECURITY FIX: Limit control word length
    while (!this.isEOF() && /[a-zA-Z]/.test(this.peek())) {
      if (name.length >= MAX_CONTROL_WORD_LENGTH) {
        // Silently truncate or throw error based on strictness
        break;
      }
      name += this.advance();
    }

    // Parse optional numeric parameter
    let param: number | null = null;
    if (!this.isEOF() && (this.peek() === '-' || /\d/.test(this.peek()))) {
      let paramStr = '';

      if (this.peek() === '-') {
        paramStr += this.advance();
      }

      // SECURITY FIX: Limit parameter length
      while (!this.isEOF() && /\d/.test(this.peek())) {
        if (paramStr.length >= MAX_PARAM_DIGITS) {
          break;
        }
        paramStr += this.advance();
      }

      if (paramStr && paramStr !== '-') {
        const parsed = parseInt(paramStr, 10);
        // SECURITY FIX: Validate safe integer
        if (Number.isSafeInteger(parsed)) {
          param = parsed;
        } else {
          // Clamp to safe range
          param = parsed > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        }
      }
    }

    if (!this.isEOF() && this.peek() === ' ') {
      this.advance();
    }

    return {
      type: 'controlWord',
      name,
      param,
      pos: startPos,
      position,
    };
  }
}

/**
 * Tokenize RTF string
 */
export function tokenize(rtf: string): Token[] {
  // SECURITY FIX: Validate input type
  if (typeof rtf !== 'string') {
    throw new TypeError('Input must be a string');
  }

  const scanner = new Scanner(rtf);
  const tokens: Token[] = [];

  while (!scanner.isEOF()) {
    const char = scanner.peek();

    if (char === '\\') {
      const backslashPos = scanner.pos;
      scanner.advance();
      const nextChar = scanner.peek();

      if (/[a-zA-Z]/.test(nextChar)) {
        const controlWord = scanner.scanControlWord();

        // Special handling for \u (Unicode character)
        if (controlWord.name === 'u' && controlWord.param !== null) {
          let charCode = controlWord.param;

          // SECURITY FIX: Validate Unicode range
          if (charCode < -32768 || charCode > 65535) {
            // Skip invalid Unicode values
            if (!scanner.isEOF()) {
              scanner.advance();
            }
            continue;
          }

          if (charCode < 0) {
            charCode = 65536 + charCode;
          }

          // Only create valid Unicode characters
          if (charCode >= 0 && charCode <= 0x10FFFF) {
            const unicodeChar = String.fromCharCode(charCode);

            tokens.push({
              type: 'text',
              value: unicodeChar,
              pos: controlWord.pos,
              position: controlWord.position,
            });
          }

          if (!scanner.isEOF()) {
            scanner.advance();
          }
        } else {
          tokens.push(controlWord);
        }
      } else if (nextChar === "'") {
        scanner.advance();
        tokens.push(scanner.scanHexEscape());
      } else if (['~', '-', '_', '\\', '{', '}'].includes(nextChar)) {
        const symbol = scanner.advance();
        tokens.push(scanner.scanControlSymbol(symbol, backslashPos));
      }
    } else if (char === '{') {
      const startPos = scanner.pos;
      const position = scanner.getPosition();
      scanner.advance();
      tokens.push({
        type: 'groupStart',
        pos: startPos,
        position,
      });
    } else if (char === '}') {
      const startPos = scanner.pos;
      const position = scanner.getPosition();
      scanner.advance();
      tokens.push({
        type: 'groupEnd',
        pos: startPos,
        position,
      });
    } else {
      // SECURITY FIX: Limit text chunk accumulation
      const startPos = scanner.pos;
      const position = scanner.getPosition();
      let text = '';

      while (
        !scanner.isEOF() &&
        scanner.peek() !== '\\' &&
        scanner.peek() !== '{' &&
        scanner.peek() !== '}'
      ) {
        // SECURITY FIX: Check text chunk size
        if (text.length >= MAX_TEXT_CHUNK_SIZE) {
          throw new Error(
            `Text chunk exceeds maximum size (${MAX_TEXT_CHUNK_SIZE} bytes). ` +
            `This may indicate a malicious document.`
          );
        }
        text += scanner.advance();
      }

      if (text.length > 0) {
        tokens.push({
          type: 'text',
          value: text,
          pos: startPos,
          position,
        });
      }
    }
  }

  return tokens;
}
```

---

## Fix #3: HTML/CSS Escaping

### File: `/Users/jonahschulte/git/rtf-toolkit/src/renderers/html.ts`

```typescript
/**
 * RTF to HTML Renderer
 */

import type {
  RTFDocument,
  RTFNode,
  ParagraphNode,
  TextNode,
  RevisionNode,
  InlineNode,
  CharacterFormatting,
  ParagraphFormatting,
} from '../parser/ast-simple.js';

/**
 * Escape HTML special characters (enhanced for security)
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')   // SECURITY FIX: Escape backticks
    .replace(/\//g, '&#x2F;'); // SECURITY FIX: Escape forward slash
}

/**
 * Escape CSS values for safe inclusion in style attributes
 */
function escapeCSSValue(value: string): string {
  // Remove potentially dangerous characters
  return value
    .replace(/[<>"'`]/g, '')  // Remove HTML chars
    .replace(/[^\w\s-]/g, '') // Allow only alphanumeric, space, hyphen
    .trim();
}

/**
 * Sanitize RGB color value
 */
function sanitizeRGBValue(value: number): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.floor(value)));
}

/**
 * Sanitize numeric CSS value (for fonts, spacing, etc.)
 */
function sanitizeNumericValue(value: number): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    return 0;
  }
  if (value < -10000 || value > 10000) {
    return 0; // Reject unreasonable values
  }
  return value;
}

/**
 * Build inline style string from character formatting
 */
function buildCharacterStyle(formatting: CharacterFormatting, doc: RTFDocument): string {
  const styles: string[] = [];

  if (formatting.fontSize !== undefined) {
    // SECURITY FIX: Sanitize font size
    const sanitized = sanitizeNumericValue(formatting.fontSize);
    const points = sanitized / 2;
    if (points > 0 && points < 1000) { // Reasonable range
      styles.push(`font-size: ${points}pt`);
    }
  }

  if (formatting.font !== undefined && doc.fontTable[formatting.font]) {
    // SECURITY FIX: Escape font name
    const fontName = escapeCSSValue(doc.fontTable[formatting.font].name);
    if (fontName) {
      styles.push(`font-family: "${fontName}"`);
    }
  }

  if (formatting.foregroundColor !== undefined && doc.colorTable[formatting.foregroundColor]) {
    // SECURITY FIX: Sanitize color values
    const color = doc.colorTable[formatting.foregroundColor];
    const r = sanitizeRGBValue(color.r);
    const g = sanitizeRGBValue(color.g);
    const b = sanitizeRGBValue(color.b);
    styles.push(`color: rgb(${r}, ${g}, ${b})`);
  }

  if (formatting.backgroundColor !== undefined && doc.colorTable[formatting.backgroundColor]) {
    // SECURITY FIX: Sanitize color values
    const color = doc.colorTable[formatting.backgroundColor];
    const r = sanitizeRGBValue(color.r);
    const g = sanitizeRGBValue(color.g);
    const b = sanitizeRGBValue(color.b);
    styles.push(`background-color: rgb(${r}, ${g}, ${b})`);
  }

  return styles.join('; ');
}

/**
 * Build inline style string from paragraph formatting
 */
function buildParagraphStyle(formatting: ParagraphFormatting): string {
  const styles: string[] = [];

  if (formatting.alignment) {
    // Whitelist valid values
    const validAlignments = ['left', 'center', 'right', 'justify'];
    if (validAlignments.includes(formatting.alignment)) {
      styles.push(`text-align: ${formatting.alignment}`);
    }
  }

  const addSpacingStyle = (value: number | undefined, property: string) => {
    if (value !== undefined) {
      const sanitized = sanitizeNumericValue(value);
      const points = sanitized / 20;
      if (points >= 0 && points < 1000) {
        styles.push(`${property}: ${points}pt`);
      }
    }
  };

  addSpacingStyle(formatting.spaceBefore, 'margin-top');
  addSpacingStyle(formatting.spaceAfter, 'margin-bottom');
  addSpacingStyle(formatting.leftIndent, 'margin-left');
  addSpacingStyle(formatting.rightIndent, 'margin-right');
  addSpacingStyle(formatting.firstLineIndent, 'text-indent');

  return styles.join('; ');
}

/**
 * Render revision node with track changes visualization
 */
function renderRevisionNode(node: RevisionNode, doc: RTFDocument): string {
  const content = node.content.map((child) => renderInlineNode(child, doc)).join('');

  // Get author name with bounds checking
  const authorIndex = node.author !== undefined ? node.author : 0;
  const authorName =
    authorIndex >= 0 && authorIndex < doc.revisionTable.length
      ? doc.revisionTable[authorIndex].name
      : 'Unknown';

  // SECURITY FIX: Escape all attribute values
  const escapedAuthor = escapeHTML(authorName);
  const escapedType = escapeHTML(node.revisionType);

  // Build data attributes
  const dataAttrs = [
    `data-revision-type="${escapedType}"`,
    `data-author="${escapedAuthor}"`,
    `data-author-index="${authorIndex}"`,
  ];

  if (node.timestamp !== undefined) {
    // SECURITY FIX: Validate timestamp
    const MAX_TIMESTAMP = Number.MAX_SAFE_INTEGER / 60000;
    const timestamp = Math.max(0, Math.min(node.timestamp, MAX_TIMESTAMP));

    const date = new Date(timestamp * 60000);

    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2200) {
      const escapedTimestamp = escapeHTML(date.toISOString());
      dataAttrs.push(`data-timestamp="${escapedTimestamp}"`);
    }
  }

  // Whitelist CSS classes
  const validTypes = ['insertion', 'deletion', 'formatting'];
  const cssClass = validTypes.includes(node.revisionType)
    ? `rtf-revision-${node.revisionType}`
    : 'rtf-revision-unknown';

  // Predefined styles (safe)
  const styleMap: Record<string, string> = {
    insertion: 'background-color: #d4edda; border-bottom: 2px solid #28a745;',
    deletion: 'background-color: #f8d7da; text-decoration: line-through; border-bottom: 2px solid #dc3545;',
    formatting: 'background-color: #fff3cd; border-bottom: 2px solid #ffc107;',
  };

  const style = styleMap[node.revisionType] || '';

  return `<span class="${cssClass}" style="${style}" ${dataAttrs.join(' ')}>${content}</span>`;
}

/**
 * Render paragraph node
 */
function renderParagraphNode(node: ParagraphNode, doc: RTFDocument): string {
  const content = node.content.map((child) => renderInlineNode(child, doc)).join('');

  const inlineStyle = buildParagraphStyle(node.formatting);
  const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : '';

  return `<p${styleAttr}>${content || '&nbsp;'}</p>`;
}

// ... rest of the file ...
```

---

## Fix #4: Security Test Suite

### File: `/Users/jonahschulte/git/rtf-toolkit/tests/security/dos.test.ts`

```typescript
/**
 * Security Tests - Denial of Service (DoS) Vulnerabilities
 */

import { describe, it, expect } from 'vitest';
import { parseRTF } from '../../src/parser/parser.js';
import { tokenize } from '../../src/parser/tokenizer.js';

describe('DoS Protection', () => {
  describe('Nested Group Depth Limit', () => {
    it('should reject deeply nested groups (200 levels)', () => {
      const depth = 200;
      const malicious = '{'.repeat(depth) + 'text' + '}'.repeat(depth);

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

  describe('Color Table Validation', () => {
    it('should sanitize out-of-range RGB values', () => {
      const rtf = '{\\rtf1{\\colortbl;\\red999\\green-50\\blue300;}}';
      const doc = parseRTF(rtf);

      expect(doc.colorTable[1].r).toBe(255); // Clamped to max
      expect(doc.colorTable[1].g).toBe(0);   // Clamped to min
      expect(doc.colorTable[1].b).toBe(255); // Clamped to max
    });

    it('should reject color table with > 1000 entries', () => {
      const colors = Array(1100)
        .fill(0)
        .map(() => '\\red0\\green0\\blue0;')
        .join('');
      const malicious = `{\\rtf1{\\colortbl;${colors}}}`;

      expect(() => parseRTF(malicious)).toThrow(/color table exceeds/i);
    });
  });

  describe('Control Word Limits', () => {
    it('should handle extremely long control word names', () => {
      const longWord = '\\' + 'a'.repeat(1000) + ' text';
      const rtf = '{\\rtf1 ' + longWord + '}';

      // Should not crash - may truncate or ignore
      expect(() => parseRTF(rtf)).not.toThrow();
    });

    it('should handle very large parameter values', () => {
      const huge = '{\\rtf1 \\fs999999999999999999 text}';

      // Should clamp to safe integer range
      const doc = parseRTF(huge);
      expect(doc).toBeDefined();
    });
  });

  describe('Unicode Character Validation', () => {
    it('should reject out-of-range Unicode values', () => {
      const malicious = '{\\rtf1 \\u9999999999? text}';

      // Should skip invalid Unicode
      const doc = parseRTF(malicious);
      expect(doc).toBeDefined();
    });

    it('should handle negative Unicode values correctly', () => {
      const rtf = '{\\rtf1 \\u-10179? text}';

      const doc = parseRTF(rtf);
      expect(doc).toBeDefined();
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
});
```

### File: `/Users/jonahschulte/git/rtf-toolkit/tests/security/xss.test.ts`

```typescript
/**
 * Security Tests - Cross-Site Scripting (XSS) Vulnerabilities
 */

import { describe, it, expect } from 'vitest';
import { parseRTF, toHTML } from '../../src/index.js';

describe('XSS Protection', () => {
  describe('HTML Escaping in Text Content', () => {
    it('should escape < and > characters', () => {
      const rtf = '{\\rtf1 <script>alert("XSS")</script>}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape quotes in text', () => {
      const rtf = '{\\rtf1 text with "quotes" and \'apostrophes\'}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('&quot;');
      expect(html).toContain('&#039;');
    });

    it('should escape ampersands', () => {
      const rtf = '{\\rtf1 AT&T & Company}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('&amp;');
    });

    it('should escape backticks', () => {
      const rtf = '{\\rtf1 `backtick` text}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).toContain('&#96;');
      expect(html).not.toContain('`');
    });
  });

  describe('CSS Injection in Font Names', () => {
    it('should sanitize font names with HTML tags', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 Arial</style><script>alert(1)</script><style>;}}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('</style>');
    });

    it('should remove special characters from font names', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 Font<>"\'`Name;}}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should only contain alphanumeric and safe chars
      expect(html).not.toContain('<');
      expect(html).not.toContain('>');
      expect(html).not.toContain('"');
    });

    it('should quote font family names in CSS', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 My Font;}}{\\f0 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Font names should be quoted
      expect(html).toMatch(/font-family:\s*"[^"]*"/);
    });
  });

  describe('Author Name Escaping in Attributes', () => {
    it('should escape quotes in author names', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Alice" onclick="alert(1);}}{\\revised\\revauth1 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('onclick=');
      expect(html).toContain('&quot;');
    });

    it('should escape backticks in author names', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Alice` onmouseover=`alert(1);}}{\\revised\\revauth1 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('onmouseover=');
      expect(html).toContain('&#96;');
    });

    it('should escape HTML entities in author names', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{<script>Evil</script>;}}{\\revised\\revauth1 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
    });

    it('should handle equals signs in author names', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{x=y;}}{\\revised\\revauth1 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Equals should be escaped in attributes
      expect(html).toMatch(/data-author="[^"]*&#61;[^"]*"/);
    });
  });

  describe('RGB Color Value Injection', () => {
    it('should clamp out-of-range color values', () => {
      const rtf = '{\\rtf1{\\colortbl;\\red999\\green-50\\blue300;}{\\cf1 colored}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should contain rgb(255, 0, 255) - all clamped
      expect(html).toContain('rgb(255, 0, 255)');
    });

    it('should handle non-numeric color values safely', () => {
      const rtf = '{\\rtf1{\\colortbl;\\red0\\green0\\blue0;}text}';
      const doc = parseRTF(rtf);

      // Manually corrupt color table
      doc.colorTable[1] = { r: NaN as any, g: Infinity as any, b: -Infinity as any };

      const html = toHTML(doc);

      // Should default to 0 for invalid values
      expect(html).toContain('rgb(0, 0, 0)');
    });
  });

  describe('Timestamp Injection', () => {
    it('should handle extremely large timestamps', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Alice;}}{\\revised\\revauth1\\revdttm999999999999999 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should produce valid ISO date or omit invalid dates
      expect(html).toBeDefined();
    });

    it('should handle negative timestamps', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Bob;}}{\\revised\\revauth1\\revdttm-12345 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should handle gracefully
      expect(html).toBeDefined();
    });

    it('should validate date range', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Carol;}}{\\revised\\revauth1\\revdttm1000000 text}}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should only include valid dates (1900-2200)
      if (html.includes('data-timestamp')) {
        const match = html.match(/data-timestamp="([^"]*)"/);
        if (match) {
          const date = new Date(match[1]);
          expect(date.getFullYear()).toBeGreaterThan(1900);
          expect(date.getFullYear()).toBeLessThan(2200);
        }
      }
    });
  });

  describe('Style Attribute Injection', () => {
    it('should prevent style injection via font size', () => {
      const rtf = '{\\rtf1 \\fs999999 text}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Should clamp to reasonable range
      const match = html.match(/font-size:\s*([0-9.]+)pt/);
      if (match) {
        const size = parseFloat(match[1]);
        expect(size).toBeLessThan(1000);
      }
    });

    it('should prevent negative spacing values', () => {
      const rtf = '{\\rtf1 \\sb-999999 paragraph}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      // Negative values should be rejected or clamped to 0
      if (html.includes('margin-top')) {
        expect(html).not.toMatch(/margin-top:\s*-/);
      }
    });
  });

  describe('Complete XSS Attack Vectors', () => {
    it('should prevent XSS via event handler in all contexts', () => {
      const attacks = [
        '{\\rtf1 <img src=x onerror=alert(1)>}',
        '{\\rtf1{\\fonttbl{\\f0 x" onerror="alert(1);}}}',
        '{\\rtf1{\\*\\revtbl{Unknown;}{x" onclick="alert(1);}}}',
        '{\\rtf1 \\u60?script>alert(1)</script>}',
      ];

      attacks.forEach((attack) => {
        const doc = parseRTF(attack);
        const html = toHTML(doc);

        expect(html).not.toMatch(/on\w+\s*=/i);
        expect(html).not.toContain('alert(1)');
      });
    });

    it('should prevent data URI injection', () => {
      const rtf = '{\\rtf1 <a href="javascript:alert(1)">click</a>}';
      const doc = parseRTF(rtf);
      const html = toHTML(doc);

      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('href=');
    });
  });
});
```

---

## Testing & Validation

Run the security test suite:

```bash
npm run test -- tests/security
```

Run all tests with coverage:

```bash
npm run test:coverage
```

---

## Deployment Checklist

- [ ] All security fixes implemented
- [ ] Security tests passing
- [ ] Code reviewed by senior developer
- [ ] Updated CHANGELOG.md with security fixes
- [ ] Version bumped (patch or minor depending on severity)
- [ ] Security advisory published (if public package)
- [ ] Dependencies audited (`npm audit`)
- [ ] Documentation updated with security best practices

---

## Post-Deployment Monitoring

1. Monitor error logs for:
   - "Maximum group nesting depth exceeded"
   - "Document exceeds maximum size"
   - "Font/color index out of range"

2. Set up alerts for:
   - Repeated security errors from same IP
   - Spike in parser errors
   - Memory usage patterns

3. Regular security reviews:
   - Quarterly dependency audits
   - Annual penetration testing
   - Continuous fuzzing integration

---

**Last Updated:** 2025-12-30
