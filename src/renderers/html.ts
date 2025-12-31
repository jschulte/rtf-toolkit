/**
 * RTF to HTML Renderer
 * Converts RTF Document AST to HTML
 */

import type {
  RTFDocument,
  RTFNode,
  ParagraphNode,
  TextNode,
  CharacterFormatting,
  ParagraphFormatting,
} from '../parser/ast-simple.js';

/**
 * HTML rendering options
 */
export interface HTMLOptions {
  /** Include CSS classes instead of inline styles */
  useClasses?: boolean;
  /** Custom CSS class prefix */
  classPrefix?: string;
  /** Include document wrapper div */
  includeWrapper?: boolean;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build inline style string from character formatting
 */
function buildCharacterStyle(formatting: CharacterFormatting, doc: RTFDocument): string {
  const styles: string[] = [];

  if (formatting.fontSize !== undefined) {
    // RTF font size is in half-points
    const points = formatting.fontSize / 2;
    styles.push(`font-size: ${points}pt`);
  }

  if (formatting.font !== undefined && doc.fontTable[formatting.font]) {
    const fontName = doc.fontTable[formatting.font].name;
    styles.push(`font-family: ${fontName}`);
  }

  if (formatting.foregroundColor !== undefined && doc.colorTable[formatting.foregroundColor]) {
    const color = doc.colorTable[formatting.foregroundColor];
    styles.push(`color: rgb(${color.r}, ${color.g}, ${color.b})`);
  }

  if (formatting.backgroundColor !== undefined && doc.colorTable[formatting.backgroundColor]) {
    const color = doc.colorTable[formatting.backgroundColor];
    styles.push(`background-color: rgb(${color.r}, ${color.g}, ${color.b})`);
  }

  return styles.join('; ');
}

/**
 * Build inline style string from paragraph formatting
 */
function buildParagraphStyle(formatting: ParagraphFormatting): string {
  const styles: string[] = [];

  if (formatting.alignment) {
    styles.push(`text-align: ${formatting.alignment}`);
  }

  if (formatting.spaceBefore !== undefined) {
    const points = formatting.spaceBefore / 20; // Convert twips to points
    styles.push(`margin-top: ${points}pt`);
  }

  if (formatting.spaceAfter !== undefined) {
    const points = formatting.spaceAfter / 20;
    styles.push(`margin-bottom: ${points}pt`);
  }

  if (formatting.leftIndent !== undefined) {
    const points = formatting.leftIndent / 20;
    styles.push(`margin-left: ${points}pt`);
  }

  if (formatting.rightIndent !== undefined) {
    const points = formatting.rightIndent / 20;
    styles.push(`margin-right: ${points}pt`);
  }

  if (formatting.firstLineIndent !== undefined) {
    const points = formatting.firstLineIndent / 20;
    styles.push(`text-indent: ${points}pt`);
  }

  return styles.join('; ');
}

/**
 * Render text node with formatting
 */
function renderTextNode(node: TextNode, doc: RTFDocument): string {
  let html = escapeHTML(node.content);

  // Apply formatting tags
  if (node.formatting.bold) {
    html = `<strong>${html}</strong>`;
  }

  if (node.formatting.italic) {
    html = `<em>${html}</em>`;
  }

  if (node.formatting.underline) {
    html = `<u>${html}</u>`;
  }

  // Apply inline styles if needed (font size, family, color)
  const inlineStyle = buildCharacterStyle(node.formatting, doc);
  if (inlineStyle) {
    html = `<span style="${inlineStyle}">${html}</span>`;
  }

  return html;
}

/**
 * Render paragraph node
 */
function renderParagraphNode(node: ParagraphNode, doc: RTFDocument): string {
  const content = node.content.map((child) => renderTextNode(child, doc)).join('');

  const inlineStyle = buildParagraphStyle(node.formatting);
  const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : '';

  return `<p${styleAttr}>${content || '&nbsp;'}</p>`;
}

/**
 * Render RTF node to HTML
 */
function renderNode(node: RTFNode, doc: RTFDocument): string {
  switch (node.type) {
    case 'paragraph':
      return renderParagraphNode(node, doc);
    case 'text':
      return renderTextNode(node, doc);
    default:
      return '';
  }
}

/**
 * Convert RTF document to HTML
 *
 * @param doc - RTF document AST
 * @param options - HTML rendering options
 * @returns HTML string
 *
 * @example
 * ```typescript
 * const doc = parseRTF('{\\rtf1\\b Bold text\\b0}');
 * const html = toHTML(doc);
 * console.log(html); // <div class="rtf-content"><p><strong>Bold text</strong></p></div>
 * ```
 */
export function toHTML(doc: RTFDocument, options?: HTMLOptions): string {
  const opts: HTMLOptions = {
    includeWrapper: true,
    ...options,
  };

  // Render all content nodes
  const contentHTML = doc.content.map((node) => renderNode(node, doc)).join('\n');

  // Wrap in container div if requested
  if (opts.includeWrapper) {
    return `<div class="rtf-content">\n${contentHTML}\n</div>`;
  }

  return contentHTML;
}
