/**
 * @jonahschulte/rtf-toolkit
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
  CharacterFormatting,
  ParagraphFormatting,
  FontDescriptor,
  RGBColor,
} from './parser/ast-simple.js';

// Parser API
export { parseRTF } from './parser/parser.js';

// Renderers
export { toHTML } from './renderers/html.js';
export type { HTMLOptions } from './renderers/html.js';
