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
  RevisionNode,
  InlineNode,
  CharacterFormatting,
  ParagraphFormatting,
  FontDescriptor,
  RGBColor,
  RevisionAuthor,
} from './parser/ast-simple.js';

// Parser API
export { parseRTF } from './parser/parser.js';

// Renderers
export { toHTML } from './renderers/html.js';
export type { HTMLOptions } from './renderers/html.js';
export { convertHTMLToRTF } from './renderers/rtf.js';

// Track Changes API
export {
  getTrackChanges,
  getTrackChangeMetadata,
  acceptChange,
  rejectChange,
  acceptAllChanges,
} from './track-changes/parser.js';
export type { TrackChange, TrackChangeMetadata, TrackChangeOptions } from './track-changes/types.js';
