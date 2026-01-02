/**
 * Track Changes Parser & API
 * Extract and manipulate track changes from RTF documents
 */

import type { RTFDocument, RTFNode, ParagraphNode, RevisionNode, InlineNode, TextNode } from '../parser/ast-simple.js';
import type { TrackChange, TrackChangeMetadata } from './types.js';

/**
 * Deep clone an RTF document for immutable operations
 * @throws Error if document cannot be serialized (e.g., circular references)
 */
function cloneDocument(doc: RTFDocument): RTFDocument {
  try {
    return JSON.parse(JSON.stringify(doc));
  } catch (error) {
    throw new Error(`Failed to clone document: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

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
 * Find a revision node by change ID and return its location
 * Returns null if not found
 */
function findRevisionById(
  doc: RTFDocument,
  changeId: string
): { paragraphIndex: number; inlineIndex: number; revisionNode: RevisionNode } | null {
  let changeIdCounter = 0;

  for (let paragraphIndex = 0; paragraphIndex < doc.content.length; paragraphIndex++) {
    const node = doc.content[paragraphIndex];
    if (node.type === 'paragraph') {
      const paragraph = node as ParagraphNode;
      for (let inlineIndex = 0; inlineIndex < paragraph.content.length; inlineIndex++) {
        const inlineNode = paragraph.content[inlineIndex];
        if (inlineNode.type === 'revision') {
          const currentId = `change-${changeIdCounter++}`;
          if (currentId === changeId) {
            return { paragraphIndex, inlineIndex, revisionNode: inlineNode as RevisionNode };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Process a paragraph's inline content to handle a revision change
 * @param content - The paragraph's inline content array
 * @param inlineIndex - Index of the revision node to process
 * @param action - 'unwrap' to keep content, 'remove' to delete the node
 * @returns New array of inline nodes
 */
function processRevisionInParagraph(
  content: InlineNode[],
  inlineIndex: number,
  action: 'unwrap' | 'remove'
): InlineNode[] {
  const newContent: InlineNode[] = [];

  for (let i = 0; i < content.length; i++) {
    if (i === inlineIndex) {
      if (action === 'unwrap') {
        // Unwrap: insert the revision's content in place of the revision node
        const revisionNode = content[i] as RevisionNode;
        newContent.push(...revisionNode.content);
      }
      // For 'remove', we simply don't add anything
    } else {
      newContent.push(content[i]);
    }
  }

  return newContent;
}

/**
 * Update document metadata after modifying revisions
 */
function updateDocumentMetadata(doc: RTFDocument): void {
  // Check if any revisions remain
  let hasRevisions = false;
  for (const node of doc.content) {
    if (node.type === 'paragraph') {
      for (const inlineNode of (node as ParagraphNode).content) {
        if (inlineNode.type === 'revision') {
          hasRevisions = true;
          break;
        }
      }
    }
    if (hasRevisions) break;
  }
  doc.hasRevisions = hasRevisions;
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
 * For insertions: The inserted text becomes permanent (revision markup removed, content kept)
 * For deletions: The deleted text is permanently removed (entire revision node removed)
 *
 * @param doc - RTF document
 * @param changeId - ID of the change to accept
 * @returns Modified document (new instance, original unchanged), or null if changeId not found
 *
 * @example
 * ```typescript
 * const changes = getTrackChanges(doc);
 * const updatedDoc = acceptChange(doc, changes[0].id);
 * if (updatedDoc) {
 *   // Change was accepted
 * }
 * ```
 */
export function acceptChange(doc: RTFDocument, changeId: string): RTFDocument | null {
  const location = findRevisionById(doc, changeId);
  if (!location) {
    // Change not found
    return null;
  }

  const newDoc = cloneDocument(doc);
  const paragraph = newDoc.content[location.paragraphIndex] as ParagraphNode;
  const revisionNode = paragraph.content[location.inlineIndex] as RevisionNode;

  // For insertions: unwrap (keep content, remove revision markup)
  // For deletions: remove (delete the entire node)
  const action = revisionNode.revisionType === 'deletion' ? 'remove' : 'unwrap';
  paragraph.content = processRevisionInParagraph(paragraph.content, location.inlineIndex, action);

  updateDocumentMetadata(newDoc);
  return newDoc;
}

/**
 * Reject a tracked change (undo the change from the document)
 *
 * For insertions: The inserted text is removed (entire revision node deleted)
 * For deletions: The deleted text is restored (revision markup removed, content kept)
 *
 * @param doc - RTF document
 * @param changeId - ID of the change to reject
 * @returns Modified document (new instance, original unchanged), or null if changeId not found
 *
 * @example
 * ```typescript
 * const changes = getTrackChanges(doc);
 * const updatedDoc = rejectChange(doc, changes[0].id);
 * if (updatedDoc) {
 *   // Change was rejected
 * }
 * ```
 */
export function rejectChange(doc: RTFDocument, changeId: string): RTFDocument | null {
  const location = findRevisionById(doc, changeId);
  if (!location) {
    // Change not found
    return null;
  }

  const newDoc = cloneDocument(doc);
  const paragraph = newDoc.content[location.paragraphIndex] as ParagraphNode;
  const revisionNode = paragraph.content[location.inlineIndex] as RevisionNode;

  // For insertions: remove (delete the entire node - undo the insertion)
  // For deletions: unwrap (keep content - undo the deletion, restore the text)
  const action = revisionNode.revisionType === 'insertion' ? 'remove' : 'unwrap';
  paragraph.content = processRevisionInParagraph(paragraph.content, location.inlineIndex, action);

  updateDocumentMetadata(newDoc);
  return newDoc;
}

/**
 * Accept all tracked changes in the document
 *
 * Applies all changes: insertions become permanent text, deletions are removed.
 *
 * @param doc - RTF document
 * @returns Modified document with all changes accepted (new instance, original unchanged)
 *
 * @example
 * ```typescript
 * const cleanDoc = acceptAllChanges(doc);
 * console.log(getTrackChanges(cleanDoc).length); // 0
 * ```
 */
export function acceptAllChanges(doc: RTFDocument): RTFDocument {
  const newDoc = cloneDocument(doc);

  // Process each paragraph
  for (const node of newDoc.content) {
    if (node.type === 'paragraph') {
      const paragraph = node as ParagraphNode;
      const newContent: InlineNode[] = [];

      for (const inlineNode of paragraph.content) {
        if (inlineNode.type === 'revision') {
          const revisionNode = inlineNode as RevisionNode;
          if (revisionNode.revisionType === 'deletion') {
            // Accept deletion = remove the node entirely
            // (don't add anything to newContent)
          } else {
            // Accept insertion/formatting = unwrap content
            newContent.push(...revisionNode.content);
          }
        } else {
          newContent.push(inlineNode);
        }
      }

      paragraph.content = newContent;
    }
  }

  newDoc.hasRevisions = false;
  return newDoc;
}

/**
 * Reject all tracked changes in the document
 *
 * Undoes all changes: insertions are removed, deletions are restored.
 *
 * @param doc - RTF document
 * @returns Modified document with all changes rejected (new instance, original unchanged)
 *
 * @example
 * ```typescript
 * const originalDoc = rejectAllChanges(doc);
 * console.log(getTrackChanges(originalDoc).length); // 0
 * ```
 */
export function rejectAllChanges(doc: RTFDocument): RTFDocument {
  const newDoc = cloneDocument(doc);

  // Process each paragraph
  for (const node of newDoc.content) {
    if (node.type === 'paragraph') {
      const paragraph = node as ParagraphNode;
      const newContent: InlineNode[] = [];

      for (const inlineNode of paragraph.content) {
        if (inlineNode.type === 'revision') {
          const revisionNode = inlineNode as RevisionNode;
          if (revisionNode.revisionType === 'insertion') {
            // Reject insertion = remove the node entirely
            // (don't add anything to newContent)
          } else {
            // Reject deletion/formatting = unwrap content (restore deleted text)
            newContent.push(...revisionNode.content);
          }
        } else {
          newContent.push(inlineNode);
        }
      }

      paragraph.content = newContent;
    }
  }

  newDoc.hasRevisions = false;
  return newDoc;
}
