/**
 * RTF Parser
 * Converts token stream to Abstract Syntax Tree
 */

import type { RTFDocument, FontDescriptor, RGBColor } from './ast.js';
import { tokenize, Token } from './tokenizer.js';

/**
 * Parser class for building AST from tokens
 */
class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Check if we've consumed all tokens
   */
  isEOF(): boolean {
    return this.pos >= this.tokens.length;
  }

  /**
   * Peek at current token without advancing
   */
  peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  /**
   * Advance and return current token
   */
  advance(): Token | undefined {
    return this.tokens[this.pos++];
  }

  /**
   * Check if current token matches type
   */
  match(type: string): boolean {
    const token = this.peek();
    return token?.type === type;
  }

  /**
   * Expect a specific token type
   */
  expect(type: string): Token {
    const token = this.advance();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type} but got ${token?.type || 'EOF'}`);
    }
    return token;
  }

  /**
   * Parse complete RTF document
   */
  parseDocument(): RTFDocument {
    this.expect('groupStart'); // Opening {

    const doc: RTFDocument = {
      type: 'document',
      rtfVersion: 1,
      charset: 'ansi',
      fontTable: [],
      colorTable: [],
      stylesheetTable: [],
      revisionTable: [],
      content: [],
    };

    // Parse document content until closing }
    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.peek();

      if (token?.type === 'controlWord') {
        this.parseControlWord(doc);
      } else if (token?.type === 'groupStart') {
        this.parseGroup(doc);
      } else if (token?.type === 'text') {
        // Content text - will be handled in Phase 2
        this.advance();
      } else {
        this.advance(); // Skip unknown tokens
      }
    }

    if (!this.isEOF()) {
      this.expect('groupEnd'); // Closing }
    }

    return doc;
  }

  /**
   * Parse control word and update document
   */
  private parseControlWord(doc: RTFDocument): void {
    const token = this.advance();
    if (!token || token.type !== 'controlWord') return;

    const { name, param } = token;

    switch (name) {
      case 'rtf':
        if (param !== null) doc.rtfVersion = param;
        break;
      case 'ansi':
      case 'mac':
      case 'pc':
      case 'pca':
        doc.charset = name;
        break;
      case 'deff':
        if (param !== null) doc.defaultFont = param;
        break;
      // Additional control words will be handled in Phase 2
    }
  }

  /**
   * Parse group (destination or formatting)
   */
  private parseGroup(doc: RTFDocument): void {
    this.expect('groupStart');

    // Check if this is a destination group
    const token = this.peek();
    if (token?.type === 'controlWord') {
      const { name } = token;

      if (name === 'fonttbl') {
        this.parseFontTable(doc);
        return;
      } else if (name === 'colortbl') {
        this.parseColorTable(doc);
        return;
      }
    }

    // Skip other groups for now (will handle in later phases)
    let depth = 1;
    while (!this.isEOF() && depth > 0) {
      const t = this.advance();
      if (t?.type === 'groupStart') depth++;
      if (t?.type === 'groupEnd') depth--;
    }
  }

  /**
   * Parse font table
   */
  private parseFontTable(doc: RTFDocument): void {
    this.advance(); // Skip \fonttbl

    while (!this.isEOF() && !this.match('groupEnd')) {
      if (this.match('groupStart')) {
        const font = this.parseFontDescriptor();
        if (font) {
          doc.fontTable.push(font);
        }
      } else {
        this.advance();
      }
    }

    this.expect('groupEnd'); // Close font table group
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
          fontIndex = param;
        } else if (name?.startsWith('f') && name.length > 1) {
          // Font family: fnil, froman, fswiss, fmodern, fscript, fdecor, ftech, fbidi
          fontFamily = name.substring(1); // Remove 'f' prefix
        }
      } else if (token?.type === 'text') {
        // Accumulate font name (ends with semicolon)
        fontName += token.value || '';
      }
    }

    this.expect('groupEnd');

    // Clean up font name (remove trailing semicolon)
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

    // First entry is always auto/default (empty)
    doc.colorTable.push({ r: 0, g: 0, b: 0 }); // Index 0

    let currentColor: Partial<RGBColor> = {};

    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.advance();

      if (token?.type === 'controlWord') {
        const { name, param } = token;

        if (name === 'red' && param !== null) {
          currentColor.r = param;
        } else if (name === 'green' && param !== null) {
          currentColor.g = param;
        } else if (name === 'blue' && param !== null) {
          currentColor.b = param;
        }
      } else if (token?.type === 'text' && token.value === ';') {
        // Semicolon marks end of color definition
        if (
          currentColor.r !== undefined &&
          currentColor.g !== undefined &&
          currentColor.b !== undefined
        ) {
          doc.colorTable.push(currentColor as RGBColor);
        }
        currentColor = {};
      }
    }

    this.expect('groupEnd'); // Close color table group
  }
}

/**
 * Parse RTF string to AST
 *
 * @param rtf - RTF document string
 * @returns RTF Document AST
 *
 * @example
 * ```typescript
 * const doc = parseRTF('{\\rtf1\\ansi\\b Hello\\b0}');
 * console.log(doc.rtfVersion); // 1
 * console.log(doc.charset); // 'ansi'
 * ```
 */
export function parseRTF(rtf: string): RTFDocument {
  const tokens = tokenize(rtf);
  const parser = new Parser(tokens);
  return parser.parseDocument();
}
