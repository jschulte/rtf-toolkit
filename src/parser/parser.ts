/**
 * RTF Parser
 * Converts token stream to Abstract Syntax Tree
 */

import type { RTFDocument, ParseOptions } from './ast.js';
import { tokenize } from './tokenizer.js';

/**
 * Parse RTF string to AST
 *
 * @param rtf - RTF document string
 * @param options - Parser options
 * @returns Parsed RTF document as AST
 *
 * @example
 * ```typescript
 * const doc = parseRTF('{\\rtf1\\ansi\\b Hello\\b0}');
 * console.log(doc.content); // Array of nodes
 * ```
 */
export function parseRTF(rtf: string, options?: ParseOptions): RTFDocument {
  // TODO: Implement full parser
  // For now, return minimal stub
  throw new Error('Parser not yet implemented - Week 1 deliverable');
}
