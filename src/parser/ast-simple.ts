/**
 * Simplified RTF AST Types
 * Matches actual parser implementation
 */

export interface FontDescriptor {
  index: number;
  name: string;
  family?: string;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface RevisionAuthor {
  index: number;
  name: string;
}

export interface CharacterFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  font?: number;
  foregroundColor?: number;
  backgroundColor?: number;
}

export interface ParagraphFormatting {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spaceBefore?: number;
  spaceAfter?: number;
  leftIndent?: number;
  rightIndent?: number;
  firstLineIndent?: number;
}

export interface TextNode {
  type: 'text';
  content: string;
  formatting: CharacterFormatting;
}

export interface ParagraphNode {
  type: 'paragraph';
  content: InlineNode[];
  formatting: ParagraphFormatting;
}

export interface RevisionNode {
  type: 'revision';
  revisionType: 'insertion' | 'deletion' | 'formatting';
  content: InlineNode[];
  author?: number;
  timestamp?: number;
  formatting?: CharacterFormatting;
}

export type InlineNode = TextNode | RevisionNode;
export type RTFNode = ParagraphNode | TextNode | RevisionNode;

export interface RTFDocument {
  type: 'document';
  rtfVersion: number;
  charset: string;
  defaultFont?: number;
  fontTable: FontDescriptor[];
  colorTable: RGBColor[];
  stylesheetTable: any[];
  revisionTable: RevisionAuthor[];
  content: RTFNode[];
  hasRevisions?: boolean;
}
