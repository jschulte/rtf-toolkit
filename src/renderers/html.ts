/**
 * RTF to HTML Renderer
 * Converts RTF Document AST to HTML
 */

import type {
  RTFDocument,
  RTFNode,
  ParagraphNode,
  TextNode,
  RevisionNode,
  InlineNode,
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
 * Escape HTML special characters (enhanced for security)
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;'); // Security: Escape backticks to prevent attribute injection
}

/**
 * Escape CSS values for safe inclusion in style attributes
 */
function escapeCSSValue(value: string): string {
  // Remove potentially dangerous characters
  return value
    .replace(/[<>"'`]/g, '') // Remove HTML chars
    .replace(/[^\w\s-]/g, '') // Allow only alphanumeric, space, hyphen
    .trim();
}

/**
 * Sanitize RGB color value to prevent CSS injection
 */
function sanitizeRGBValue(value: number): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.floor(value)));
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
    // Security: Escape font name to prevent CSS injection
    const fontName = escapeCSSValue(doc.fontTable[formatting.font].name);
    if (fontName) {
      styles.push(`font-family: "${fontName}"`); // Quote the font name
    }
  }

  if (formatting.foregroundColor !== undefined && doc.colorTable[formatting.foregroundColor]) {
    // Security: Sanitize RGB values to prevent CSS injection
    const color = doc.colorTable[formatting.foregroundColor];
    const r = sanitizeRGBValue(color.r);
    const g = sanitizeRGBValue(color.g);
    const b = sanitizeRGBValue(color.b);
    styles.push(`color: rgb(${r}, ${g}, ${b})`);
  }

  if (formatting.backgroundColor !== undefined && doc.colorTable[formatting.backgroundColor]) {
    // Security: Sanitize RGB values to prevent CSS injection
    const color = doc.colorTable[formatting.backgroundColor];
    const r = sanitizeRGBValue(color.r);
    const g = sanitizeRGBValue(color.g);
    const b = sanitizeRGBValue(color.b);
    styles.push(`background-color: rgb(${r}, ${g}, ${b})`);
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
 * Render inline node (text or revision)
 */
function renderInlineNode(node: InlineNode, doc: RTFDocument): string {
  if (node.type === 'text') {
    return renderTextNode(node, doc);
  } else if (node.type === 'revision') {
    return renderRevisionNode(node, doc);
  }
  return '';
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
 * Render revision node with track changes visualization
 */
function renderRevisionNode(node: RevisionNode, doc: RTFDocument): string {
  // Render the content
  const content = node.content.map((child) => renderInlineNode(child, doc)).join('');

  // Get author name
  const authorIndex = node.author !== undefined ? node.author : 0;
  const authorName =
    authorIndex < doc.revisionTable.length ? doc.revisionTable[authorIndex].name : 'Unknown';

  // Build data attributes
  const dataAttrs = [
    `data-revision-type="${node.revisionType}"`,
    `data-author="${escapeHTML(authorName)}"`,
    `data-author-index="${authorIndex}"`,
  ];

  if (node.timestamp !== undefined) {
    const date = new Date(node.timestamp * 60000);
    dataAttrs.push(`data-timestamp="${date.toISOString()}"`);
  }

  // Apply CSS class based on revision type
  const cssClass = node.revisionType === 'insertion' ? 'rtf-revision-inserted' : 'rtf-revision-deleted';

  // Build style for visual distinction
  const style =
    node.revisionType === 'insertion'
      ? 'background-color: #d4edda; border-bottom: 2px solid #28a745;'
      : 'background-color: #f8d7da; text-decoration: line-through; border-bottom: 2px solid #dc3545;';

  return `<span class="${cssClass}" style="${style}" ${dataAttrs.join(' ')}>${content}</span>`;
}

/**
 * Render paragraph node
 */
function renderParagraphNode(node: ParagraphNode, doc: RTFDocument): string {
  const content = node.content.map((child) => renderInlineNode(child, doc)).join('');

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
