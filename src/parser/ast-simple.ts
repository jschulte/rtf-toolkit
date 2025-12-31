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
  content: TextNode[];
  formatting: ParagraphFormatting;
}

export type RTFNode = ParagraphNode | TextNode;

export interface RTFDocument {
  type: 'document';
  rtfVersion: number;
  charset: string;
  defaultFont?: number;
  fontTable: FontDescriptor[];
  colorTable: RGBColor[];
  stylesheetTable: any[];
  revisionTable: any[];
  content: RTFNode[];
}
