# Epic 6: Track Changes Parser

**Status:** in-progress
**Priority:** P0 - Critical (Original Use Case)
**Epic Goal:** Parse and extract track changes (revisions) from RTF documents
**Estimated Effort:** 6-8 hours
**Dependencies:** Epic 1 (Tokenizer) ✓, Epic 2 (Parser) ✓

---

## Epic Overview

Track changes (also called "redlining" or "revision marks") are critical for legal and government documents. RTF documents use specific control words and groups to mark insertions, deletions, and formatting changes with author and timestamp information.

**Why This Matters:**
- Original use case for this library
- Essential for government contract NDAs
- Enables programmatic review of document changes
- Foundation for accept/reject functionality
- Critical for compliance and audit trails

**Technical Approach:**
- Parse revision groups (\revised, \deleted)
- Extract author information from revision table
- Parse timestamps (\revdttm control words)
- Build TrackChange objects
- Provide extraction API (getTrackChanges)
- Enable accept/reject operations

---

## RTF Track Changes Syntax

### Revision Table
```rtf
{\*\revtbl
  {Unknown;}
  {Author 1;}
  {Author 2;}
}
```

### Inserted Text
```rtf
{\revised\revauth1\revdttm1234567890 inserted text}
```

### Deleted Text
```rtf
{\deleted\revauth2\revdttm1234567891 deleted text}
```

### Complete Example
```rtf
{\rtf1{\*\revtbl{Unknown;}{John Doe;}{Jane Smith;}}
Original text {\revised\revauth1\revdttm0 new text} more text.
{\deleted\revauth2\revdttm0 removed text}
}
```

---

## Implementation Phases

### Phase 1: Revision Table Parsing (2 hours)
- Parse `{\*\revtbl ...}` destination group
- Extract author names
- Build revision table array
- **Tests:** Parse various revision tables

### Phase 2: Revision Group Parsing (3 hours)
- Recognize `\revised` and `\deleted` groups
- Extract revision author (`\revauth`)
- Parse revision timestamp (`\revdttm`)
- Create RevisionNode in AST
- Handle nested content within revisions
- **Tests:** Parse documents with track changes

### Phase 3: Track Changes API (2 hours)
- Implement `getTrackChanges(doc)` extraction
- Return array of TrackChange objects
- Include metadata (author, timestamp, type, content)
- Implement `acceptChange()` and `rejectChange()`
- **Tests:** API functionality

### Phase 4: HTML Visualization (1 hour)
- Render insertions with highlighting (green background)
- Render deletions with strikethrough (red background)
- Add data attributes for metadata
- Optional tooltip with author/date
- **Tests:** HTML output includes track changes markup

---

## Acceptance Criteria

**Phase 1: Revision Table**
- [ ] Parses `{\*\revtbl ...}` groups
- [ ] Extracts author names from entries
- [ ] Populates doc.revisionTable array
- [ ] Handles unknown author (index 0)
- [ ] Tests cover various author counts

**Phase 2: Revision Groups**
- [ ] Recognizes `\revised` groups as insertions
- [ ] Recognizes `\deleted` groups as deletions
- [ ] Extracts `\revauth` author index
- [ ] Parses `\revdttm` timestamps
- [ ] Creates RevisionNode in AST
- [ ] Handles nested formatting within revisions
- [ ] Tests cover complex revision scenarios

**Phase 3: Track Changes API**
- [ ] `getTrackChanges(doc)` returns all changes
- [ ] Each TrackChange has: type, author, timestamp, content, position
- [ ] `acceptChange(doc, changeId)` removes markup
- [ ] `rejectChange(doc, changeId)` applies change
- [ ] Tests cover API usage

**Phase 4: HTML Visualization**
- [ ] Insertions render with `.rtf-revision-inserted` class
- [ ] Deletions render with `.rtf-revision-deleted` class
- [ ] Includes data attributes: `data-author`, `data-timestamp`
- [ ] Visual distinction (colors, strikethrough)
- [ ] Tests verify HTML markup

---

## Definition of Done

- All acceptance criteria met
- 25+ unit tests passing
- Parser handles real government RTF documents with track changes
- API provides easy access to revision information
- HTML renderer shows track changes visually
- Documentation includes track changes examples
- Ready for production use

---

## Test Cases

### Revision Table Tests
```typescript
parseRTF('{\*\revtbl{Unknown;}{John Doe;}}')
// → doc.revisionTable = [{index: 0, name: 'Unknown'}, {index: 1, name: 'John Doe'}]
```

### Insertion Tests
```typescript
parseRTF('{\revised\revauth1 new text}')
// → RevisionNode{type: 'insertion', author: 1, content: 'new text'}
```

### Deletion Tests
```typescript
parseRTF('{\deleted\revauth2 old text}')
// → RevisionNode{type: 'deletion', author: 2, content: 'old text'}
```

### API Tests
```typescript
const changes = getTrackChanges(doc);
// → [{id: 1, type: 'insertion', author: 'John Doe', content: '...', timestamp: Date}]

acceptChange(doc, 1); // Accepts the change
rejectChange(doc, 2); // Rejects the change
```

---

## Technical Notes

### RTF Track Changes Control Words
- `\revtbl` - Revision table
- `\revised` - Inserted text
- `\deleted` - Deleted text
- `\revauth` - Author index
- `\revdttm` - Revision date/time (Windows DTTM format)
- `\revisions` - Document has revisions flag

### Date/Time Format
RTF uses Windows DTTM format (minutes since 1/1/1970). Need to convert to JavaScript Date.

### Edge Cases
- Multiple revisions by same author
- Nested revisions
- Revisions spanning paragraph breaks
- Empty revisions
- Revisions with formatting

---

## Success Metrics

- Parse government RTF documents with track changes
- Extract all revision information accurately
- Visual HTML rendering shows changes clearly
- API is intuitive and easy to use
- Performance: <200ms for typical documents
- Zero data loss during accept/reject operations

---

**This epic delivers the core value proposition of the library!**
