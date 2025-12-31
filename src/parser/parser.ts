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

/**
 * Formatting state for tracking character properties
 */
interface FormattingState {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  font?: number;
  foregroundColor?: number;
  backgroundColor?: number;
}

/**
 * Paragraph state for tracking paragraph properties
 */
interface ParagraphState {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spaceBefore?: number;
  spaceAfter?: number;
  leftIndent?: number;
  rightIndent?: number;
  firstLineIndent?: number;
}

/**
 * Parser class for building AST from tokens
 */
class Parser {
  private tokens: Token[];
  private pos = 0;
  private formattingStack: FormattingState[] = [{}];
  private paragraphState: ParagraphState = {};

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
   * Get current formatting state
   */
  private getCurrentFormatting(): FormattingState {
    return { ...this.formattingStack[this.formattingStack.length - 1] };
  }

  /**
   * Push new formatting state
   */
  private pushFormatting(): void {
    this.formattingStack.push(this.getCurrentFormatting());
  }

  /**
   * Pop formatting state
   */
  private popFormatting(): void {
    if (this.formattingStack.length > 1) {
      this.formattingStack.pop();
    }
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

    // Parse document until closing }
    this.parseDocumentContent(doc);

    // If there's accumulated content, create final paragraph
    if (!this.isEOF()) {
      this.expect('groupEnd'); // Closing }
    }

    return doc;
  }

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

          // Create paragraph from accumulated content
          if (currentParagraph.length > 0 || name === 'par') {
            doc.content.push(this.createParagraph(currentParagraph));
            currentParagraph = [];
            this.paragraphState = {};
          }
          continue;
        }

        // Handle header control words
        if (this.isHeaderControlWord(name)) {
          this.parseHeaderControlWord(doc);
          continue;
        }

        // Handle formatting control words
        if (this.isFormattingControlWord(name)) {
          this.parseFormattingControlWord();
          continue;
        }

        // Handle paragraph formatting
        if (this.isParagraphControlWord(name)) {
          this.parseParagraphControlWord();
          continue;
        }

        // Unknown control word - skip it
        this.advance();
      } else if (token?.type === 'groupStart') {
        // Check if destination group
        this.advance(); // consume {
        const nextToken = this.peek();

        // Check for ignorable destination ({\* ...})
        if (nextToken?.type === 'text' && nextToken.value === '*') {
          this.advance(); // Skip the * text token
          const destToken = this.peek();
          if (destToken?.type === 'controlWord' && destToken.name === 'revtbl') {
            this.parseRevisionTable(doc);
            continue;
          }
          // Other ignorable destinations - skip
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
            // Revision group - parse it
            const revisionNode = this.parseRevisionGroup(name);
            if (revisionNode) {
              currentParagraph.push(revisionNode);
              doc.hasRevisions = true;
            }
            // Consume the closing brace
            if (!this.isEOF() && this.match('groupEnd')) {
              this.advance();
            }
            continue;
          }
        }

        // Regular formatting group - push state and parse content
        this.pushFormatting();
        const savedParaState = { ...this.paragraphState };

        // Parse group content
        const groupContent = this.parseContentGroup();
        currentParagraph.push(...groupContent);

        this.popFormatting();
        this.paragraphState = savedParaState;

        if (!this.isEOF() && this.match('groupEnd')) {
          this.advance(); // consume }
        }
      } else if (token?.type === 'text') {
        // Accumulate text with current formatting
        const textNode = this.createTextNode(String(token.value || ''));
        currentParagraph.push(textNode);
        this.advance();
      } else {
        this.advance(); // Skip unknown tokens
      }
    }

    // Create final paragraph if there's content
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
          this.advance(); // Skip unknown control word
        }
      } else if (token?.type === 'groupStart') {
        this.advance(); // consume {
        this.pushFormatting();

        const groupContent = this.parseContentGroup();
        nodes.push(...groupContent);

        this.popFormatting();

        if (!this.isEOF() && this.match('groupEnd')) {
          this.advance(); // consume }
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
   * Create paragraph node
   */
  private createParagraph(content: InlineNode[]): ParagraphNode {
    const formatting: ParagraphFormatting = {};

    if (this.paragraphState.alignment) {
      formatting.alignment = this.paragraphState.alignment;
    }
    if (this.paragraphState.spaceBefore !== undefined) {
      formatting.spaceBefore = this.paragraphState.spaceBefore;
    }
    if (this.paragraphState.spaceAfter !== undefined) {
      formatting.spaceAfter = this.paragraphState.spaceAfter;
    }
    if (this.paragraphState.leftIndent !== undefined) {
      formatting.leftIndent = this.paragraphState.leftIndent;
    }
    if (this.paragraphState.rightIndent !== undefined) {
      formatting.rightIndent = this.paragraphState.rightIndent;
    }
    if (this.paragraphState.firstLineIndent !== undefined) {
      formatting.firstLineIndent = this.paragraphState.firstLineIndent;
    }

    return {
      type: 'paragraph',
      content,
      formatting,
    };
  }

  /**
   * Create text node with current formatting
   */
  private createTextNode(text: string): TextNode {
    const formatting: CharacterFormatting = {};
    const current = this.getCurrentFormatting();

    if (current.bold) formatting.bold = true;
    if (current.italic) formatting.italic = true;
    if (current.underline) formatting.underline = true;
    if (current.fontSize !== undefined) formatting.fontSize = current.fontSize;
    if (current.font !== undefined) formatting.font = current.font;
    if (current.foregroundColor !== undefined) {
      formatting.foregroundColor = current.foregroundColor;
    }
    if (current.backgroundColor !== undefined) {
      formatting.backgroundColor = current.backgroundColor;
    }

    return {
      type: 'text',
      content: text,
      formatting,
    };
  }

  /**
   * Check if control word is header-related
   */
  private isHeaderControlWord(name: string): boolean {
    return ['rtf', 'ansi', 'mac', 'pc', 'pca', 'deff'].includes(name);
  }

  /**
   * Check if control word is formatting-related
   */
  private isFormattingControlWord(name: string): boolean {
    return ['b', 'i', 'ul', 'fs', 'f', 'cf', 'cb', 'strike', 'scaps', 'sub', 'super'].includes(
      name
    );
  }

  /**
   * Check if control word is paragraph-related
   */
  private isParagraphControlWord(name: string): boolean {
    return ['qc', 'qr', 'ql', 'qj', 'sb', 'sa', 'li', 'ri', 'fi'].includes(name);
  }

  /**
   * Parse header control word
   */
  private parseHeaderControlWord(doc: RTFDocument): void {
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
    }
  }

  /**
   * Parse formatting control word
   */
  private parseFormattingControlWord(): void {
    const token = this.advance();
    if (!token || token.type !== 'controlWord') return;

    const { name, param } = token;
    const current = this.formattingStack[this.formattingStack.length - 1];

    switch (name) {
      case 'b':
        current.bold = param === null || param !== 0;
        break;
      case 'i':
        current.italic = param === null || param !== 0;
        break;
      case 'ul':
        current.underline = param === null || param !== 0;
        break;
      case 'fs':
        current.fontSize = param !== null ? param : undefined;
        break;
      case 'f':
        current.font = param !== null ? param : undefined;
        break;
      case 'cf':
        current.foregroundColor = param !== null ? param : undefined;
        break;
      case 'cb':
        current.backgroundColor = param !== null ? param : undefined;
        break;
    }
  }

  /**
   * Parse paragraph control word
   */
  private parseParagraphControlWord(): void {
    const token = this.advance();
    if (!token || token.type !== 'controlWord') return;

    const { name, param } = token;

    switch (name) {
      case 'qc':
        this.paragraphState.alignment = 'center';
        break;
      case 'qr':
        this.paragraphState.alignment = 'right';
        break;
      case 'ql':
        this.paragraphState.alignment = 'left';
        break;
      case 'qj':
        this.paragraphState.alignment = 'justify';
        break;
      case 'sb':
        this.paragraphState.spaceBefore = param !== null ? param : undefined;
        break;
      case 'sa':
        this.paragraphState.spaceAfter = param !== null ? param : undefined;
        break;
      case 'li':
        this.paragraphState.leftIndent = param !== null ? param : undefined;
        break;
      case 'ri':
        this.paragraphState.rightIndent = param !== null ? param : undefined;
        break;
      case 'fi':
        this.paragraphState.firstLineIndent = param !== null ? param : undefined;
        break;
    }
  }

  /**
   * Skip a group (for destination groups)
   */
  private skipGroup(): void {
    let depth = 1;
    while (!this.isEOF() && depth > 0) {
      const token = this.advance();
      if (token?.type === 'groupStart') depth++;
      if (token?.type === 'groupEnd') depth--;
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

        if (name === 'red' && param !== null) {
          currentColor.r = param;
        } else if (name === 'green' && param !== null) {
          currentColor.g = param;
        } else if (name === 'blue' && param !== null) {
          currentColor.b = param;
        }
      } else if (token?.type === 'text' && token.value === ';') {
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

    this.expect('groupEnd');
  }

  /**
   * Parse revision table ({\*\revtbl ...})
   */
  private parseRevisionTable(doc: RTFDocument): void {
    this.advance(); // Skip \revtbl (we already consumed \*)

    let authorIndex = 0;

    while (!this.isEOF() && !this.match('groupEnd')) {
      if (this.match('groupStart')) {
        this.expect('groupStart');

        let authorName = '';

        // Collect author name (ends with semicolon)
        while (!this.isEOF() && !this.match('groupEnd')) {
          const token = this.advance();

          if (token?.type === 'text') {
            authorName += token.value || '';
          }
        }

        this.expect('groupEnd');

        // Clean up author name
        authorName = authorName.replace(/;$/, '').trim();

        if (authorName) {
          doc.revisionTable.push({
            index: authorIndex++,
            name: authorName,
          });
        }
      } else {
        this.advance();
      }
    }

    this.expect('groupEnd'); // Close revision table group
  }

  /**
   * Parse revision group ({\revised ...} or {\deleted ...})
   */
  private parseRevisionGroup(revisionType: string): RevisionNode | null {
    this.advance(); // Skip \revised or \deleted

    let author: number | undefined;
    let timestamp: number | undefined;
    const revContent: InlineNode[] = [];

    // Parse revision metadata and content
    while (!this.isEOF() && !this.match('groupEnd')) {
      const token = this.peek();

      if (token?.type === 'controlWord') {
        const { name, param } = token;

        if (name === 'revauth' && param !== null) {
          author = param;
          this.advance();
        } else if (name === 'revdttm' && param !== null) {
          timestamp = param;
          this.advance();
        } else if (this.isFormattingControlWord(name)) {
          this.parseFormattingControlWord();
        } else {
          this.advance();
        }
      } else if (token?.type === 'groupStart') {
        this.advance();
        this.pushFormatting();

        const groupContent = this.parseContentGroup();
        revContent.push(...groupContent);

        this.popFormatting();

        if (!this.isEOF() && this.match('groupEnd')) {
          this.advance();
        }
      } else if (token?.type === 'text') {
        revContent.push(this.createTextNode(String(token.value || '')));
        this.advance();
      } else {
        this.advance();
      }
    }

    const node: RevisionNode = {
      type: 'revision',
      revisionType: revisionType === 'revised' ? 'insertion' : 'deletion',
      content: revContent,
      author,
      timestamp,
    };

    return node;
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
 * console.log(doc.content[0].type); // 'paragraph'
 * ```
 */
export function parseRTF(rtf: string): RTFDocument {
  const tokens = tokenize(rtf);
  const parser = new Parser(tokens);
  return parser.parseDocument();
}
