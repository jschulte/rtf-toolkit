/**
 * RTF Tokenizer/Lexer
 * Performs lexical analysis on RTF string
 */

export type TokenType =
  | 'groupStart'      // {
  | 'groupEnd'        // }
  | 'controlWord'     // \word123
  | 'controlSymbol'   // \'XX, \~, \-, \_
  | 'text'            // Plain text
  | 'binary';         // \bin data

export interface Token {
  type: TokenType;
  value?: string | number;
  name?: string;      // For control words
  param?: number | null;  // For control word parameters
  position: {
    offset: number;
    line: number;
    column: number;
  };
}

/**
 * Tokenize RTF string
 *
 * @param rtf - RTF document string
 * @returns Array of tokens
 */
export function tokenize(rtf: string): Token[] {
  // TODO: Implement tokenizer - Day 1-2 deliverable
  throw new Error('Tokenizer not yet implemented');
}
