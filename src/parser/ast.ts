/**
 * RTF Abstract Syntax Tree (AST) Definitions
 *
 * Represents the parsed structure of an RTF document.
 * Based on RTF 1.9.1 Specification.
 */

/**
 * RTF Document Node - Root of the AST
 */
export interface RTFDocument {
  type: 'document';
  version: number; // Usually 1
  charset: 'ansi' | 'mac' | 'pc' | 'pca';
  fontTable: FontTable;
  colorTable: ColorTable;
  stylesheet?: Stylesheet;
  revisionTable?: RevisionTable;
  content: RTFNode[];
  metadata: DocumentMetadata;
}

/**
 * Document-level metadata
 */
export interface DocumentMetadata {
  defaultFont?: number;
  defaultLanguage?: number;
  createdDate?: Date;
  modifiedDate?: Date;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  generator?: string;
  hasTrackChanges?: boolean;
}

/**
 * Font Table - Defines fonts used in document
 */
export interface FontTable {
  fonts: Font[];
}

export interface Font {
  index: number;
  name: string;
  family?: 'roman' | 'swiss' | 'modern' | 'script' | 'decor' | 'tech' | 'bidi';
  charset?: number;
  pitch?: number;
  alternateFont?: string;
}

/**
 * Color Table - Defines colors used in document
 */
export interface ColorTable {
  colors: Color[];
}

export interface Color {
  index: number;
  red: number;
  green: number;
  blue: number;
}

/**
 * Stylesheet - Named styles for paragraphs/characters
 */
export interface Stylesheet {
  styles: Style[];
}

export interface Style {
  index: number;
  type: 'paragraph' | 'character';
  name: string;
  basedOn?: number;
  next?: number;
  formatting: FormattingProperties;
}

/**
 * Revision Table - Authors of tracked changes
 */
export interface RevisionTable {
  authors: RevisionAuthor[];
}

export interface RevisionAuthor {
  index: number;
  name: string;
}

/**
 * Base RTF Node type
 */
export type RTFNode =
  | ParagraphNode
  | TextNode
  | TableNode
  | ListNode
  | SectionBreakNode
  | PageBreakNode
  | RevisionNode;

/**
 * Paragraph Node
 */
export interface ParagraphNode {
  type: 'paragraph';
  content: InlineNode[];
  formatting: ParagraphFormatting;
}

/**
 * Text Node (inline)
 */
export interface TextNode {
  type: 'text';
  content: string;
  formatting: CharacterFormatting;
}

/**
 * Revision Node - Tracks changes
 */
export interface RevisionNode {
  type: 'revision';
  revisionType: 'insertion' | 'deletion' | 'formatting';
  content: InlineNode[];
  author?: number; // Index into revision table
  timestamp?: Date;
  formatting?: CharacterFormatting;
}

/**
 * Table Node
 */
export interface TableNode {
  type: 'table';
  rows: TableRow[];
  formatting: TableFormatting;
}

export interface TableRow {
  cells: TableCell[];
  height?: number;
  formatting: RowFormatting;
}

export interface TableCell {
  content: RTFNode[];
  width?: number;
  formatting: CellFormatting;
}

/**
 * List Node
 */
export interface ListNode {
  type: 'list';
  listType: 'ordered' | 'unordered';
  level: number;
  items: ListItem[];
}

export interface ListItem {
  content: RTFNode[];
  formatting: ParagraphFormatting;
}

/**
 * Section/Page Break Nodes
 */
export interface SectionBreakNode {
  type: 'section-break';
}

export interface PageBreakNode {
  type: 'page-break';
}

/**
 * Inline nodes (can appear within paragraphs)
 */
export type InlineNode = TextNode | RevisionNode;

/**
 * Character Formatting Properties
 */
export interface CharacterFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean | 'single' | 'double' | 'dotted' | 'word';
  strikethrough?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  fontSize?: number; // Half-points (24 = 12pt)
  fontIndex?: number; // Index into font table
  colorIndex?: number; // Index into color table
  backgroundColor?: number;
  hidden?: boolean;
  smallCaps?: boolean;
  allCaps?: boolean;
  highlight?: number;
}

/**
 * Paragraph Formatting Properties
 */
export interface ParagraphFormatting {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  leftIndent?: number; // Twips (1440 = 1 inch)
  rightIndent?: number;
  firstLineIndent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  lineSpacing?: number;
  keepWithNext?: boolean;
  keepTogether?: boolean;
  pageBreakBefore?: boolean;
  widowControl?: boolean;
}

/**
 * Table Formatting
 */
export interface TableFormatting {
  alignment?: 'left' | 'center' | 'right';
  leftIndent?: number;
  preferredWidth?: number;
  borders?: BorderFormatting;
}

export interface RowFormatting {
  height?: number;
  header?: boolean; // Repeat on new page
  cantSplit?: boolean;
}

export interface CellFormatting {
  width?: number;
  verticalAlignment?: 'top' | 'center' | 'bottom';
  borders?: BorderFormatting;
  shading?: number; // Color index
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface BorderFormatting {
  top?: BorderStyle;
  right?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
}

export interface BorderStyle {
  width?: number;
  style?: 'single' | 'double' | 'dotted' | 'dashed' | 'none';
  color?: number; // Color index
}

/**
 * Combined formatting properties
 */
export interface FormattingProperties extends CharacterFormatting, ParagraphFormatting {}

/**
 * Parser Options
 */
export interface ParseOptions {
  /** Include track changes in AST (default: true) */
  includeTrackChanges?: boolean;

  /** Include hidden text (default: false) */
  includeHiddenText?: boolean;

  /** Strict mode - throw on unknown control words (default: false) */
  strict?: boolean;

  /** Maximum recursion depth for groups (default: 100) */
  maxGroupDepth?: number;
}

/**
 * HTML Conversion Options
 */
export interface HTMLOptions {
  /** Preserve exact formatting (default: true) */
  preserveFormatting?: boolean;

  /** Include track changes as visual marks (default: false) */
  showTrackChanges?: boolean;

  /** Sanitize HTML output (default: true) */
  sanitize?: boolean;

  /** CSS class prefix (default: 'rtf-') */
  classPrefix?: string;

  /** Inline styles vs. CSS classes (default: 'inline') */
  styleMode?: 'inline' | 'classes';
}

/**
 * RTF Generation Options
 */
export interface RTFOptions {
  /** RTF version (default: 1) */
  version?: number;

  /** Default font (default: 0 = Times New Roman) */
  defaultFont?: number;

  /** Default font size in half-points (default: 24 = 12pt) */
  defaultFontSize?: number;

  /** Include track changes (default: false) */
  includeRevisions?: boolean;
}
