/**
 * Track Changes Parser & API
 * Extract and manipulate track changes from RTF documents
 */

import type { RTFDocument, RTFNode, ParagraphNode, RevisionNode, InlineNode } from '../parser/ast-simple.js';
import type { TrackChange, TrackChangeMetadata } from './types.js';

/**
 * Extract text content from inline nodes
 */
function extractText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.content;
      } else if (node.type === 'revision') {
        return extractText(node.content);
      }
      return '';
    })
    .join('');
}

/**
 * Extract all track changes from a document
 *
 * @param doc - Parsed RTF document
 * @returns Array of track changes with metadata
 *
 * @example
 * ```typescript
 * const doc = parseRTF(rtfWithChanges);
 * const changes = getTrackChanges(doc);
 * console.log(changes[0].author, changes[0].type, changes[0].text);
 * ```
 */
export function getTrackChanges(doc: RTFDocument): TrackChange[] {
  const changes: TrackChange[] = [];
  let changeIdCounter = 0;

  // Walk through all paragraphs
  doc.content.forEach((node, paragraphIndex) => {
    if (node.type === 'paragraph') {
      let characterOffset = 0;

      // Walk through all inline nodes
      (node as ParagraphNode).content.forEach((inlineNode) => {
        if (inlineNode.type === 'revision') {
          const revNode = inlineNode as RevisionNode;
          const text = extractText(revNode.content);

          // Get author name from revision table
          const authorIndex = revNode.author !== undefined ? revNode.author : 0;
          const authorName =
            authorIndex < doc.revisionTable.length
              ? doc.revisionTable[authorIndex].name
              : 'Unknown';

          changes.push({
            id: `change-${changeIdCounter++}`,
            type: revNode.revisionType,
            author: authorName,
            authorIndex,
            text,
            timestamp: revNode.timestamp !== undefined ? new Date(revNode.timestamp * 60000) : undefined,
            position: {
              paragraphIndex,
              characterOffset,
            },
          });

          characterOffset += text.length;
        } else if (inlineNode.type === 'text') {
          characterOffset += inlineNode.content.length;
        }
      });
    }
  });

  return changes;
}

/**
 * Get track change metadata summary
 *
 * @param doc - Parsed RTF document
 * @returns Summary metadata
 *
 * @example
 * ```typescript
 * const metadata = getTrackChangeMetadata(doc);
 * console.log(`${metadata.totalChanges} changes by ${metadata.authors.length} authors`);
 * ```
 */
export function getTrackChangeMetadata(doc: RTFDocument): TrackChangeMetadata {
  const changes = getTrackChanges(doc);

  const insertions = changes.filter((c) => c.type === 'insertion').length;
  const deletions = changes.filter((c) => c.type === 'deletion').length;

  const uniqueAuthors = [...new Set(changes.map((c) => c.author))];

  return {
    totalChanges: changes.length,
    insertions,
    deletions,
    authors: uniqueAuthors,
    hasRevisions: doc.hasRevisions || false,
  };
}

/**
 * Accept a tracked change (apply the change to the document)
 *
 * @param doc - RTF document
 * @param changeId - ID of the change to accept
 * @returns Modified document
 */
export function acceptChange(doc: RTFDocument, changeId: string): RTFDocument {
  // TODO: Implement accept logic
  // For insertions: remove revision markup, keep content
  // For deletions: remove entire revision node
  return doc;
}

/**
 * Reject a tracked change (remove the change from the document)
 *
 * @param doc - RTF document
 * @param changeId - ID of the change to reject
 * @returns Modified document
 */
export function rejectChange(doc: RTFDocument, changeId: string): RTFDocument {
  // TODO: Implement reject logic
  // For insertions: remove entire revision node
  // For deletions: remove revision markup, keep content
  return doc;
}

/**
 * Accept all tracked changes in the document
 *
 * @param doc - RTF document
 * @returns Modified document with all changes accepted
 */
export function acceptAllChanges(doc: RTFDocument): RTFDocument {
  // TODO: Implement accept all logic
  // Walk through AST and remove all revision markup
  return doc;
}
