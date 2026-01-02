/**
 * Track Changes Parser Unit Tests
 * Epic 6: Track Changes Parser
 */

import { describe, it, expect } from 'vitest';
import { parseRTF } from '../../../src/parser/parser.js';
import {
  getTrackChanges,
  getTrackChangeMetadata,
  acceptChange,
  rejectChange,
  acceptAllChanges,
  rejectAllChanges,
} from '../../../src/track-changes/parser.js';

describe('Epic 6 Phase 1: Revision Table Parsing', () => {
  it('should parse simple revision table', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John Doe;}}}';
    const doc = parseRTF(rtf);

    expect(doc.revisionTable).toBeDefined();
    expect(doc.revisionTable).toHaveLength(2);
    expect(doc.revisionTable[0]).toMatchObject({ index: 0, name: 'Unknown' });
    expect(doc.revisionTable[1]).toMatchObject({ index: 1, name: 'John Doe' });
  });

  it('should parse revision table with multiple authors', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John Doe;}{Jane Smith;}{Bob Wilson;}}}';
    const doc = parseRTF(rtf);

    expect(doc.revisionTable).toHaveLength(4);
    expect(doc.revisionTable[1].name).toBe('John Doe');
    expect(doc.revisionTable[2].name).toBe('Jane Smith');
    expect(doc.revisionTable[3].name).toBe('Bob Wilson');
  });

  it('should handle empty revision table', () => {
    const rtf = '{\\rtf1{\\*\\revtbl}}';
    const doc = parseRTF(rtf);

    expect(doc.revisionTable).toBeDefined();
    expect(Array.isArray(doc.revisionTable)).toBe(true);
  });
});

describe('Epic 6 Phase 2: Revision Group Parsing', () => {
  it('should parse inserted text', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John Doe;}}Text {\\revised\\revauth1\\revdttm0 inserted} more.}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const revisionNode = para.content.find((n: any) => n.type === 'revision');

    expect(revisionNode).toBeDefined();
    expect(revisionNode.revisionType).toBe('insertion');
    expect(revisionNode.author).toBe(1);
  });

  it('should parse deleted text', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Jane Smith;}}Before {\\deleted\\revauth1\\revdttm0 removed} after.}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const revisionNode = para.content.find((n: any) => n.type === 'revision');

    expect(revisionNode).toBeDefined();
    expect(revisionNode.revisionType).toBe('deletion');
    expect(revisionNode.author).toBe(1);
  });

  it('should parse revision with timestamp', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\revdttm1234567890 new} text.}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const revisionNode = para.content.find((n: any) => n.type === 'revision');

    expect(revisionNode).toBeDefined();
    expect(revisionNode.timestamp).toBe(1234567890);
  });

  it('should parse revision content correctly', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted text} more.}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const revisionNode = para.content.find((n: any) => n.type === 'revision');

    expect(revisionNode).toBeDefined();
    expect(revisionNode.content).toHaveLength(1);
    expect(revisionNode.content[0].content).toBe('inserted text');
  });

  it('should handle formatted text in revisions', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\b bold insert\\b0} more.}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const revisionNode = para.content.find((n: any) => n.type === 'revision');

    expect(revisionNode).toBeDefined();
    expect(revisionNode.content[0].formatting.bold).toBe(true);
  });

  it('should handle multiple revisions in one paragraph', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author 1;}{Author 2;}}Text {\\revised\\revauth1 first} middle {\\deleted\\revauth2 second} end.}';
    const doc = parseRTF(rtf);

    const para = doc.content[0] as any;
    const revisions = para.content.filter((n: any) => n.type === 'revision');

    expect(revisions).toHaveLength(2);
    expect(revisions[0].revisionType).toBe('insertion');
    expect(revisions[1].revisionType).toBe('deletion');
  });

  it('should set hasRevisions flag', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 new} text.}';
    const doc = parseRTF(rtf);

    expect(doc.hasRevisions).toBe(true);
  });
});

describe('Epic 6 Phase 3: Track Changes API', () => {
  it('should extract all track changes', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John Doe;}}Text {\\revised\\revauth1 inserted} more.}';
    const doc = parseRTF(rtf);
    const changes = getTrackChanges(doc);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      type: 'insertion',
      author: 'John Doe',
      authorIndex: 1,
      text: 'inserted',
    });
  });

  it('should extract multiple changes', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author 1;}{Author 2;}}Text {\\revised\\revauth1 first} and {\\deleted\\revauth2 second} end.}';
    const doc = parseRTF(rtf);
    const changes = getTrackChanges(doc);

    expect(changes).toHaveLength(2);
    expect(changes[0].type).toBe('insertion');
    expect(changes[1].type).toBe('deletion');
  });

  it('should include author names from revision table', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Jane Smith;}}Text {\\revised\\revauth1 new} text.}';
    const doc = parseRTF(rtf);
    const changes = getTrackChanges(doc);

    expect(changes[0].author).toBe('Jane Smith');
    expect(changes[0].authorIndex).toBe(1);
  });

  it('should generate unique IDs for each change', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 first} and {\\revised\\revauth1 second}.}';
    const doc = parseRTF(rtf);
    const changes = getTrackChanges(doc);

    expect(changes[0].id).toBeDefined();
    expect(changes[1].id).toBeDefined();
    expect(changes[0].id).not.toBe(changes[1].id);
  });

  it('should include position information', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Para 1\\par Para 2 {\\revised\\revauth1 new} text.}';
    const doc = parseRTF(rtf);
    const changes = getTrackChanges(doc);

    expect(changes[0].position).toBeDefined();
    expect(changes[0].position.paragraphIndex).toBe(1);
  });

  it('should get track change metadata', () => {
    const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{John;}{Jane;}}Text {\\revised\\revauth1 a} {\\deleted\\revauth2 b} {\\revised\\revauth1 c}.}';
    const doc = parseRTF(rtf);
    const metadata = getTrackChangeMetadata(doc);

    expect(metadata.totalChanges).toBe(3);
    expect(metadata.insertions).toBe(2);
    expect(metadata.deletions).toBe(1);
    expect(metadata.authors).toContain('John');
    expect(metadata.authors).toContain('Jane');
    expect(metadata.hasRevisions).toBe(true);
  });

  it('should handle documents without revisions', () => {
    const rtf = '{\\rtf1 Plain text without changes}';
    const doc = parseRTF(rtf);
    const changes = getTrackChanges(doc);
    const metadata = getTrackChangeMetadata(doc);

    expect(changes).toHaveLength(0);
    expect(metadata.totalChanges).toBe(0);
    expect(metadata.hasRevisions).toBe(false);
  });
});

describe('Epic 6 Phase 4: Accept/Reject Single Changes', () => {
  describe('acceptChange', () => {
    it('should accept an insertion (keep inserted text)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('insertion');

      const updatedDoc = acceptChange(doc, changes[0].id);
      expect(updatedDoc).not.toBeNull();
      const updatedChanges = getTrackChanges(updatedDoc!);

      // No more changes after accepting
      expect(updatedChanges).toHaveLength(0);
      expect(updatedDoc!.hasRevisions).toBe(false);

      // Text content should still exist (unwrapped from revision)
      const para = updatedDoc!.content[0] as any;
      const textNodes = para.content.filter((n: any) => n.type === 'text');
      const fullText = textNodes.map((n: any) => n.content).join('');
      expect(fullText).toContain('inserted');
    });

    it('should accept a deletion (remove deleted text)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Before {\\deleted\\revauth1 removed} after.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('deletion');

      const updatedDoc = acceptChange(doc, changes[0].id);
      expect(updatedDoc).not.toBeNull();
      const updatedChanges = getTrackChanges(updatedDoc!);

      // No more changes after accepting
      expect(updatedChanges).toHaveLength(0);
      expect(updatedDoc!.hasRevisions).toBe(false);

      // Deleted text should be gone
      const para = updatedDoc!.content[0] as any;
      const textNodes = para.content.filter((n: any) => n.type === 'text');
      const fullText = textNodes.map((n: any) => n.content).join('');
      expect(fullText).not.toContain('removed');
      expect(fullText).toContain('Before');
      expect(fullText).toContain('after');
    });

    it('should not modify original document (immutability)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);

      const changesBefore = getTrackChanges(doc);
      const updatedDoc = acceptChange(doc, changesBefore[0].id);
      expect(updatedDoc).not.toBeNull();
      const changesAfter = getTrackChanges(doc);

      // Original document should be unchanged
      expect(changesAfter).toHaveLength(1);
      expect(doc.hasRevisions).toBe(true);

      // Updated document should have change accepted
      expect(getTrackChanges(updatedDoc!)).toHaveLength(0);
    });

    it('should return null for invalid changeId', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);

      const updatedDoc = acceptChange(doc, 'invalid-id');

      // Should return null for invalid ID
      expect(updatedDoc).toBeNull();
    });

    it('should handle multiple changes - accept one', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{A;}{B;}}Text {\\revised\\revauth1 first} and {\\deleted\\revauth2 second} end.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(2);

      // Accept first change only
      const updatedDoc = acceptChange(doc, changes[0].id);
      expect(updatedDoc).not.toBeNull();
      const updatedChanges = getTrackChanges(updatedDoc!);

      expect(updatedChanges).toHaveLength(1);
      expect(updatedChanges[0].type).toBe('deletion'); // Second change should remain
    });
  });

  describe('rejectChange', () => {
    it('should reject an insertion (remove inserted text)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('insertion');

      const updatedDoc = rejectChange(doc, changes[0].id);
      expect(updatedDoc).not.toBeNull();
      const updatedChanges = getTrackChanges(updatedDoc!);

      // No more changes after rejecting
      expect(updatedChanges).toHaveLength(0);
      expect(updatedDoc!.hasRevisions).toBe(false);

      // Inserted text should be gone
      const para = updatedDoc!.content[0] as any;
      const textNodes = para.content.filter((n: any) => n.type === 'text');
      const fullText = textNodes.map((n: any) => n.content).join('');
      expect(fullText).not.toContain('inserted');
      expect(fullText).toContain('Text');
      expect(fullText).toContain('more');
    });

    it('should reject a deletion (restore deleted text)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Before {\\deleted\\revauth1 removed} after.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('deletion');

      const updatedDoc = rejectChange(doc, changes[0].id);
      expect(updatedDoc).not.toBeNull();
      const updatedChanges = getTrackChanges(updatedDoc!);

      // No more changes after rejecting
      expect(updatedChanges).toHaveLength(0);
      expect(updatedDoc!.hasRevisions).toBe(false);

      // Deleted text should be restored (unwrapped)
      const para = updatedDoc!.content[0] as any;
      const textNodes = para.content.filter((n: any) => n.type === 'text');
      const fullText = textNodes.map((n: any) => n.content).join('');
      expect(fullText).toContain('removed');
    });

    it('should not modify original document (immutability)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Before {\\deleted\\revauth1 removed} after.}';
      const doc = parseRTF(rtf);

      const changesBefore = getTrackChanges(doc);
      const updatedDoc = rejectChange(doc, changesBefore[0].id);
      expect(updatedDoc).not.toBeNull();
      const changesAfter = getTrackChanges(doc);

      // Original document should be unchanged
      expect(changesAfter).toHaveLength(1);
      expect(doc.hasRevisions).toBe(true);

      // Updated document should have change rejected
      expect(getTrackChanges(updatedDoc!)).toHaveLength(0);
    });

    it('should return null for invalid changeId', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 inserted} more.}';
      const doc = parseRTF(rtf);

      const updatedDoc = rejectChange(doc, 'invalid-id');

      // Should return null for invalid ID
      expect(updatedDoc).toBeNull();
    });
  });
});

describe('Epic 6 Phase 5: Accept/Reject All Changes', () => {
  describe('acceptAllChanges', () => {
    it('should accept all changes in document', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{A;}{B;}}Start {\\revised\\revauth1 added} middle {\\deleted\\revauth2 removed} end.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(2);

      const updatedDoc = acceptAllChanges(doc);
      const updatedChanges = getTrackChanges(updatedDoc);

      expect(updatedChanges).toHaveLength(0);
      expect(updatedDoc.hasRevisions).toBe(false);

      // Check text: insertions kept, deletions removed
      const para = updatedDoc.content[0] as any;
      const textNodes = para.content.filter((n: any) => n.type === 'text');
      const fullText = textNodes.map((n: any) => n.content).join('');
      expect(fullText).toContain('added');
      expect(fullText).not.toContain('removed');
    });

    it('should handle document with no changes', () => {
      const rtf = '{\\rtf1 Plain text without changes}';
      const doc = parseRTF(rtf);

      const updatedDoc = acceptAllChanges(doc);

      expect(getTrackChanges(updatedDoc)).toHaveLength(0);
      expect(updatedDoc.hasRevisions).toBe(false);
    });

    it('should not modify original document (immutability)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 new} more.}';
      const doc = parseRTF(rtf);

      const updatedDoc = acceptAllChanges(doc);

      // Original should be unchanged
      expect(getTrackChanges(doc)).toHaveLength(1);
      expect(doc.hasRevisions).toBe(true);

      // Updated should have all changes accepted
      expect(getTrackChanges(updatedDoc)).toHaveLength(0);
    });

    it('should preserve formatted text within revisions', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1\\b bold text\\b0} more.}';
      const doc = parseRTF(rtf);

      const updatedDoc = acceptAllChanges(doc);

      // Formatted text should be preserved after accepting
      const para = updatedDoc.content[0] as any;
      const boldNode = para.content.find((n: any) => n.type === 'text' && n.formatting?.bold);
      expect(boldNode).toBeDefined();
      expect(boldNode.content).toBe('bold text');
    });
  });

  describe('rejectAllChanges', () => {
    it('should reject all changes in document', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{A;}{B;}}Start {\\revised\\revauth1 added} middle {\\deleted\\revauth2 removed} end.}';
      const doc = parseRTF(rtf);
      const changes = getTrackChanges(doc);

      expect(changes).toHaveLength(2);

      const updatedDoc = rejectAllChanges(doc);
      const updatedChanges = getTrackChanges(updatedDoc);

      expect(updatedChanges).toHaveLength(0);
      expect(updatedDoc.hasRevisions).toBe(false);

      // Check text: insertions removed, deletions restored
      const para = updatedDoc.content[0] as any;
      const textNodes = para.content.filter((n: any) => n.type === 'text');
      const fullText = textNodes.map((n: any) => n.content).join('');
      expect(fullText).not.toContain('added');
      expect(fullText).toContain('removed');
    });

    it('should handle document with no changes', () => {
      const rtf = '{\\rtf1 Plain text without changes}';
      const doc = parseRTF(rtf);

      const updatedDoc = rejectAllChanges(doc);

      expect(getTrackChanges(updatedDoc)).toHaveLength(0);
      expect(updatedDoc.hasRevisions).toBe(false);
    });

    it('should not modify original document (immutability)', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\revised\\revauth1 new} more.}';
      const doc = parseRTF(rtf);

      const updatedDoc = rejectAllChanges(doc);

      // Original should be unchanged
      expect(getTrackChanges(doc)).toHaveLength(1);
      expect(doc.hasRevisions).toBe(true);

      // Updated should have all changes rejected
      expect(getTrackChanges(updatedDoc)).toHaveLength(0);
    });

    it('should restore formatted text from deletions', () => {
      const rtf = '{\\rtf1{\\*\\revtbl{Unknown;}{Author;}}Text {\\deleted\\revauth1\\i italic deleted\\i0} more.}';
      const doc = parseRTF(rtf);

      const updatedDoc = rejectAllChanges(doc);

      // Formatted text should be restored after rejecting deletion
      const para = updatedDoc.content[0] as any;
      const italicNode = para.content.find((n: any) => n.type === 'text' && n.formatting?.italic);
      expect(italicNode).toBeDefined();
      expect(italicNode.content).toBe('italic deleted');
    });
  });
});
