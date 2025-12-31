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
  public pos = 0;
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

  /**
   * Scan a hex escape (\\'XX)
   */
  scanHexEscape(): Token {
    const startPos = this.pos - 2; // -2 because we already consumed \ and '
    const position = this.getPosition();

    // Read two hex digits
    let hexStr = '';
    for (let i = 0; i < 2 && !this.isEOF(); i++) {
      const char = this.peek();
      if (/[0-9a-fA-F]/.test(char)) {
        hexStr += this.advance();
      } else {
        break;
      }
    }

    // Convert hex to character
    const charCode = parseInt(hexStr, 16);
    const value = String.fromCharCode(charCode);

    return {
      type: 'text',
      value,
      pos: startPos,
      position,
    };
  }

  /**
   * Scan a control symbol (\~, \-, \_, \\, \{, \})
   */
  scanControlSymbol(symbol: string, backslashPos: number): Token {
    const startPos = backslashPos;
    const position = this.getPosition();

    // Map symbols to their meanings
    const symbolMap: Record<string, string> = {
      '~': '\u00A0', // non-breaking space
      '-': '\u00AD', // optional (soft) hyphen
      _: '\u2011', // non-breaking hyphen
      '\\': '\\', // escaped backslash
      '{': '{', // escaped opening brace
      '}': '}', // escaped closing brace
    };

    const value = symbolMap[symbol] || symbol;

    // For literal escapes (\\, \{, \}), return as text
    if (['\\', '{', '}'].includes(symbol)) {
      return {
        type: 'text',
        value,
        pos: startPos,
        position,
      };
    }

    // For special symbols, return as controlSymbol
    return {
      type: 'controlSymbol',
      name: symbol,
      value,
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
      const backslashPos = scanner.pos; // Save position before consuming backslash
      scanner.advance(); // Consume backslash
      const nextChar = scanner.peek();

      // Check if it's a control word (starts with alphabetic character)
      if (/[a-zA-Z]/.test(nextChar)) {
        const controlWord = scanner.scanControlWord();

        // Special handling for \u (Unicode character)
        if (controlWord.name === 'u' && controlWord.param !== null) {
          // Convert Unicode code point to character
          let charCode = controlWord.param;

          // Handle negative values (treat as unsigned 16-bit)
          if (charCode < 0) {
            charCode = 65536 + charCode;
          }

          const unicodeChar = String.fromCharCode(charCode);

          // Add as text token
          tokens.push({
            type: 'text',
            value: unicodeChar,
            pos: controlWord.pos,
            position: controlWord.position,
          });

          // Skip the alternate representation character (usually '?')
          if (!scanner.isEOF()) {
            scanner.advance();
          }
        } else {
          tokens.push(controlWord);
        }
      }
      // Check if it's a hex escape (\'XX)
      else if (nextChar === "'") {
        scanner.advance(); // Consume the apostrophe
        tokens.push(scanner.scanHexEscape());
      }
      // Check if it's a control symbol
      else if (['~', '-', '_', '\\', '{', '}'].includes(nextChar)) {
        const symbol = scanner.advance();
        tokens.push(scanner.scanControlSymbol(symbol, backslashPos));
      }
    } else if (char === '{') {
      // Handle group start
      const startPos = scanner.pos;
      const position = scanner.getPosition();
      scanner.advance();
      tokens.push({
        type: 'groupStart',
        pos: startPos,
        position,
      });
    } else if (char === '}') {
      // Handle group end
      const startPos = scanner.pos;
      const position = scanner.getPosition();
      scanner.advance();
      tokens.push({
        type: 'groupEnd',
        pos: startPos,
        position,
      });
    } else {
      // Accumulate text (basic implementation, will be enhanced in Story 1.6)
      const startPos = scanner.pos;
      const position = scanner.getPosition();
      let text = '';

      while (
        !scanner.isEOF() &&
        scanner.peek() !== '\\' &&
        scanner.peek() !== '{' &&
        scanner.peek() !== '}'
      ) {
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
