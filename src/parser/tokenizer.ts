/**
 * RTF Tokenizer/Lexer
 * Performs lexical analysis on RTF string
 */

export type TokenType =
  | 'groupStart' // {
  | 'groupEnd' // }
  | 'controlWord' // \word123
  | 'controlSymbol' // \'XX, \~, \-, \_
  | 'text' // Plain text
  | 'binary'; // \bin data

export interface Token {
  type: TokenType;
  value?: string | number;
  name?: string; // For control words
  param?: number | null; // For control word parameters
  pos: number; // Character offset in source
  position: {
    offset: number;
    line: number;
    column: number;
  };
}

/**
 * Scanner class for tokenizing RTF
 */
class Scanner {
  private pos = 0;
  private line = 1;
  private column = 1;
  private input: string;
  private length: number;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
  }

  /**
   * Check if we've reached end of input
   */
  isEOF(): boolean {
    return this.pos >= this.length;
  }

  /**
   * Peek at current character without advancing
   */
  peek(offset = 0): string {
    const index = this.pos + offset;
    return index < this.length ? this.input[index] : '';
  }

  /**
   * Advance position and return current character
   */
  advance(): string {
    if (this.isEOF()) return '';

    const char = this.input[this.pos];
    this.pos++;

    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    return char;
  }

  /**
   * Get current position
   */
  getPosition(): { offset: number; line: number; column: number } {
    return {
      offset: this.pos,
      line: this.line,
      column: this.column,
    };
  }

  /**
   * Scan a control word (\word or \word123 or \word-123)
   */
  scanControlWord(): Token {
    const startPos = this.pos - 1; // -1 because we already consumed the backslash
    const position = this.getPosition();

    // Extract control word name (alphabetic characters only)
    let name = '';
    while (!this.isEOF() && /[a-zA-Z]/.test(this.peek())) {
      name += this.advance();
    }

    // Parse optional numeric parameter
    let param: number | null = null;
    if (!this.isEOF() && (this.peek() === '-' || /\d/.test(this.peek()))) {
      let paramStr = '';

      // Handle negative sign
      if (this.peek() === '-') {
        paramStr += this.advance();
      }

      // Collect digits
      while (!this.isEOF() && /\d/.test(this.peek())) {
        paramStr += this.advance();
      }

      if (paramStr && paramStr !== '-') {
        param = parseInt(paramStr, 10);
      }
    }

    // Control words are delimited by space (which is consumed) or non-alphabetic character (not consumed)
    if (!this.isEOF() && this.peek() === ' ') {
      this.advance(); // Consume the delimiting space
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
 *
 * @param rtf - RTF document string
 * @returns Array of tokens
 */
export function tokenize(rtf: string): Token[] {
  const scanner = new Scanner(rtf);
  const tokens: Token[] = [];

  while (!scanner.isEOF()) {
    const char = scanner.peek();

    if (char === '\\') {
      scanner.advance(); // Consume backslash
      const nextChar = scanner.peek();

      // Check if it's a control word (starts with alphabetic character)
      if (/[a-zA-Z]/.test(nextChar)) {
        tokens.push(scanner.scanControlWord());
      }
      // TODO: Handle control symbols in Story 1.3
    } else if (char === '{') {
      // TODO: Handle group start in Story 1.2
      scanner.advance();
    } else if (char === '}') {
      // TODO: Handle group end in Story 1.2
      scanner.advance();
    } else {
      // TODO: Handle text in Story 1.6
      scanner.advance();
    }
  }

  return tokens;
}
