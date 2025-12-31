/**
 * HTML to RTF Generator
 * Converts HTML content to RTF format with formatting preservation
 */

/**
 * Convert HTML to RTF string
 *
 * @param html - HTML content (from WYSIWYG editor)
 * @returns RTF string
 *
 * @example
 * ```typescript
 * const html = '<p><strong>Bold</strong> text</p>';
 * const rtf = convertHTMLToRTF(html);
 * // {\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24{\\b Bold} text\\par}
 * ```
 */
export function convertHTMLToRTF(html: string): string {
  let rtfContent = '';

  // Parse HTML into a simple DOM-like structure
  // For now, use regex-based parsing (good enough for Quill output)
  let content = html;

  // Extract paragraph spacing from inline styles
  // Example: <p style="margin-top: 10pt; margin-bottom: 10pt">
  const paragraphSpacing: Record<number, { before?: number; after?: number }> = {};
  let paragraphIndex = 0;

  // Replace paragraphs while extracting spacing
  content = content.replace(/<p([^>]*)>(.*?)<\/p>/gis, (match, attrs, innerHtml) => {
    let spaceBefore: number | undefined;
    let spaceAfter: number | undefined;

    // Extract margin-top and margin-bottom from style attribute
    const styleMatch = attrs.match(/style="([^"]*)"/i);
    if (styleMatch) {
      const style = styleMatch[1];

      // margin-top: Xpt → \sb (space before)
      const marginTopMatch = style.match(/margin-top:\s*(\d+(?:\.\d+)?)pt/i);
      if (marginTopMatch) {
        spaceBefore = Math.round(parseFloat(marginTopMatch[1]) * 20); // Convert pt to twips
      }

      // margin-bottom: Xpt → \sa (space after)
      const marginBottomMatch = style.match(/margin-bottom:\s*(\d+(?:\.\d+)?)pt/i);
      if (marginBottomMatch) {
        spaceAfter = Math.round(parseFloat(marginBottomMatch[1]) * 20);
      }
    }

    paragraphSpacing[paragraphIndex] = { before: spaceBefore, after: spaceAfter };

    // Replace with placeholder that includes spacing info
    const placeholder = `__PARAGRAPH_${paragraphIndex}__${innerHtml}__ENDPARAGRAPH_${paragraphIndex}__`;
    paragraphIndex++;
    return placeholder;
  });

  // Convert common HTML tags to RTF
  content = content
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '{\\b\\fs32 $1}\\par\\par')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '{\\b\\fs28 $1}\\par\\par')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '{\\b\\fs24 $1}\\par\\par')

    // Bold
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '{\\b $1}')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '{\\b $1}')

    // Italic
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '{\\i $1}')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '{\\i $1}')

    // Underline
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '{\\ul $1}')

    // Line breaks
    .replace(/<br\s*\/?>/gi, '\\line ')

    // Lists - convert to simple indented items
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<li[^>]*>(.*?)<\/li>/gis, '\\tab $1\\par')

    // Divs (common in Quill output)
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\\par')

    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')

    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Process paragraph placeholders and add spacing
  for (let i = 0; i < paragraphIndex; i++) {
    const spacing = paragraphSpacing[i];
    const startPlaceholder = `__PARAGRAPH_${i}__`;
    const endPlaceholder = `__ENDPARAGRAPH_${i}__`;

    const regex = new RegExp(`${startPlaceholder}(.*?)${endPlaceholder}`, 's');
    content = content.replace(regex, (match, paragraphContent) => {
      let rtfParagraph = '';

      // Add paragraph formatting
      if (spacing?.before) {
        rtfParagraph += `\\sb${spacing.before} `;
      }
      if (spacing?.after) {
        rtfParagraph += `\\sa${spacing.after} `;
      }

      rtfParagraph += paragraphContent + '\\par';
      return rtfParagraph;
    });
  }

  // Build complete RTF document
  const rtfDocument = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Times New Roman;}}
\\f0\\fs24
${content}
}`;

  return rtfDocument;
}

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use convertHTMLToRTF instead
 */
export function fromHTML(html: string): any {
  throw new Error('fromHTML returns RTFDocument - use convertHTMLToRTF for string output');
}
