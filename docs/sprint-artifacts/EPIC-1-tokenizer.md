# EPIC-1: RTF Tokenizer/Lexer

**Epic:** Foundation - Week 1
**Status:** Not Started
**Estimated:** 2 days
**Priority:** P0 (Critical Path)

---

## Overview

Build the lexical analyzer that converts RTF string into a stream of tokens. This is the foundation for the entire parser.

## Acceptance Criteria

- [ ] Tokenizer can parse all RTF control word types
- [ ] Handles all escape sequences and special characters
- [ ] Correctly identifies group boundaries
- [ ] Supports binary data (`\bin`)
- [ ] Unicode support (`\u` keyword)
- [ ] Position tracking (line, column) for error reporting
- [ ] Handles malformed RTF gracefully
- [ ] Performance: >1 MB/s tokenization speed
- [ ] 100% test coverage for tokenizer module

---

## Stories/Tasks

### Story 1.1: Basic Token Recognition
**Estimated:** 4 hours

**Tasks:**
- [ ] Create Token interface with all token types
- [ ] Implement Scanner class with position tracking
- [ ] Recognize group start/end (`{`, `}`)
- [ ] Recognize control word start (`\`)
- [ ] Extract control word name (alpha characters)
- [ ] Parse control word parameter (numeric)
- [ ] Handle control word with no parameter
- [ ] Tests: 10 unit tests

**Acceptance:**
```typescript
tokenize('{\\rtf1}') // → [groupStart, controlWord{rtf, 1}, groupEnd]
tokenize('\\b Hello\\b0') // → [controlWord{b}, text{Hello}, controlWord{b, 0}]
```

---

### Story 1.2: Control Symbols & Special Characters
**Estimated:** 3 hours

**Tasks:**
- [ ] Recognize `\'XX` (hex escape for characters)
- [ ] Convert hex to character (`\'41` → 'A')
- [ ] Handle `\~` (non-breaking space)
- [ ] Handle `\-` (optional hyphen)
- [ ] Handle `\_` (non-breaking hyphen)
- [ ] Handle `\\`, `\{`, `\}` (escape sequences)
- [ ] Handle `\*` (destination ignorable)
- [ ] Tests: 15 unit tests

**Acceptance:**
```typescript
tokenize("\\'41") // → text{A}
tokenize("\\~")   // → controlSymbol{nonBreakingSpace}
```

---

### Story 1.3: Binary Data & Unicode
**Estimated:** 3 hours

**Tasks:**
- [ ] Parse `\bin` keyword with length parameter
- [ ] Read N bytes of binary data
- [ ] Store binary as Buffer/Uint8Array
- [ ] Parse `\u` keyword (Unicode character)
- [ ] Handle Unicode parameter (signed 16-bit)
- [ ] Skip alternate character representation
- [ ] Tests: 10 unit tests

**Acceptance:**
```typescript
tokenize('\\bin4 data') // → binary{Buffer[4]}
tokenize('\\u1234?')    // → text{Unicode(1234)}
```

---

### Story 1.4: Text Extraction
**Estimated:** 2 hours

**Tasks:**
- [ ] Accumulate plain text between control words
- [ ] Handle whitespace after control words
- [ ] Preserve intentional whitespace
- [ ] Handle line breaks in RTF source
- [ ] Normalize line endings
- [ ] Tests: 8 unit tests

**Acceptance:**
```typescript
tokenize('Hello World') // → text{Hello World}
tokenize('\\par\nNext') // → controlWord{par}, text{Next}
```

---

### Story 1.5: Error Handling & Edge Cases
**Estimated:** 3 hours

**Tasks:**
- [ ] Handle unclosed groups (missing `}`)
- [ ] Handle invalid control words
- [ ] Handle truncated files
- [ ] Maximum recursion depth tracking
- [ ] Detailed error messages with position
- [ ] Throw or recover based on options
- [ ] Tests: 12 error condition tests

**Acceptance:**
```typescript
// Strict mode: throw on errors
tokenize('\\unknownword', { strict: true }) // → throws

// Lenient mode: skip unknown
tokenize('\\unknownword', { strict: false }) // → continues
```

---

### Story 1.6: Performance & Optimization
**Estimated:** 2 hours

**Tasks:**
- [ ] Benchmark tokenizer speed
- [ ] Optimize string concatenation
- [ ] Use efficient data structures
- [ ] Minimize memory allocations
- [ ] Stream processing for large files (optional)
- [ ] Performance tests with 1MB+ files

**Target:** >1 MB/s tokenization speed

---

## Test Fixtures Needed

**Simple RTF files (5):**
- Hello World with bold
- Multiple paragraphs
- Different fonts
- Colors
- Special characters

**Medium complexity (10):**
- Lists (numbered, bulleted)
- Tables (2x2, 3x3)
- Mixed formatting
- Unicode text
- Indented paragraphs

**Complex (5):**
- Nested tables
- Multi-level lists
- Track changes
- Headers/footers
- Real government NDA templates

---

## Definition of Done

- [ ] All 6 stories completed
- [ ] 50+ unit tests passing
- [ ] Test coverage >95% for tokenizer module
- [ ] Can tokenize all test fixtures without errors
- [ ] Performance benchmark meets >1 MB/s target
- [ ] Code reviewed and documented
- [ ] Ready for parser implementation (Epic 2)

---

## Dependencies

**Blocks:**
- EPIC-2 (Parser needs tokenizer)
- EPIC-3 (HTML renderer needs parser)

**Blocked By:**
- None (foundation epic)

---

## Technical Notes

**RTF Control Word Format:**
```
\controlword[-]parameter delimiter

Examples:
\b          - Bold (no parameter)
\fs24       - Font size 24 half-points
\li-720     - Left indent -720 twips
```

**Special Cases:**
- Parameter is optional
- Parameter can be negative
- Delimiter is space or non-alphanumeric
- Some control words have multiple parameters (rare)

**Reference:**
- RTF 1.9.1 Specification, Section 2: "RTF Syntax"
- Control words defined throughout spec (400+ total)

---

**Epic Owner:** Claude
**Created:** 2025-12-30
**Last Updated:** 2025-12-30
