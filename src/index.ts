/**
 * @usmax/rtf-toolkit
 * Modern TypeScript RTF parser with track changes support
 *
 * @packageDocumentation
 */

// Core types
export type {
  RTFDocument,
  RTFNode,
  ParagraphNode,
  TextNode,
  TableNode,
  RevisionNode,
  CharacterFormatting,
  ParagraphFormatting,
  ParseOptions,
  HTMLOptions,
  RTFOptions,
} from './parser/ast.js';

// Parser API
export { parseRTF } from './parser/parser.js';

// Renderers
export { toHTML } from './renderers/html.js';
export { toText } from './renderers/text.js';
export { fromHTML } from './renderers/rtf.js';

// Track Changes API
export { getTrackChanges, acceptChange, rejectChange, acceptAllChanges } from './track-changes/parser.js';
export type { TrackChange, TrackChangeMetadata } from './track-changes/types.js';

// Utilities
export { validateRTF } from './utils/validator.js';

/**
 * Quick API for simple use cases
 */
export const RTF = {
  /**
   * Parse RTF string to HTML
   * @param rtf - RTF string
   * @param options - HTML rendering options
   * @returns HTML string
   */
  toHTML: async (rtf: string, options?: import('./parser/ast.js').HTMLOptions): Promise<string> => {
    const { parseRTF } = await import('./parser/parser.js');
    const { toHTML } = await import('./renderers/html.js');
    const doc = parseRTF(rtf, options);
    return toHTML(doc, options);
  },

  /**
   * Convert HTML string to RTF
   * @param html - HTML string
   * @param options - RTF generation options
   * @returns RTF string
   */
  fromHTML: async (html: string, options?: import('./parser/ast.js').RTFOptions): Promise<string> => {
    const { fromHTML } = await import('./renderers/rtf.js');
    const doc = fromHTML(html);
    return doc.toRTF(options);
  },

  /**
   * Extract plain text from RTF
   * @param rtf - RTF string
   * @returns Plain text
   */
  toText: async (rtf: string): Promise<string> => {
    const { parseRTF } = await import('./parser/parser.js');
    const { toText } = await import('./renderers/text.js');
    const doc = parseRTF(rtf);
    return toText(doc);
  },
};
