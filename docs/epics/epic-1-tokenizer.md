# Epic 1: RTF Tokenizer/Lexer

**Status:** ready-for-dev
**Priority:** P0 - Critical Path
**Epic Goal:** Build lexical analyzer that converts RTF string to token stream
**Estimated Effort:** 2 days
**Dependencies:** None (foundation)

---

## Epic Overview

The tokenizer is the foundation of the RTF parser. It performs lexical analysis, converting a raw RTF string into a structured stream of tokens that the parser can consume.

**Why This Matters:**
- Foundation for entire library
- Must handle all RTF 1.9.1 syntax correctly
- Performance critical (will be called for every RTF file)
- Error recovery determines parser robustness

**Technical Approach:**
- Character-by-character scanning
- State machine for control word recognition
- Position tracking for error reporting
- Efficient string handling for performance

---

## User Stories

### Story 1.1: Basic Control Word Recognition
**As a** developer using the RTF toolkit
**I want** the tokenizer to recognize RTF control words
**So that** I can parse formatted RTF documents

**Acceptance Criteria:**
- [ ] Recognizes `\word` format control words
- [ ] Extracts control word name (alphabetic characters)
- [ ] Parses numeric parameters (positive/negative)
- [ ] Handles control words without parameters
- [ ] Correctly identifies word boundaries

**Test Cases:**
```typescript
tokenize('\\rtf1') // → { type: 'controlWord', name: 'rtf', param: 1 }
tokenize('\\b')    // → { type: 'controlWord', name: 'b', param: null }
tokenize('\\li-720') // → { type: 'controlWord', name: 'li', param: -720 }
```

**Tasks:**
- [ ] Implement Scanner class with position tracking
- [ ] Add scanControlWord() method
- [ ] Parse alphabetic control word name
- [ ] Parse optional numeric parameter (with negative support)
- [ ] Detect control word boundary (space or non-alpha)
- [ ] Write 10 unit tests
- [ ] Handle edge cases (empty name, overflow)

**Definition of Done:**
- All tests passing
- Handles all control word variations
- Error messages include position
- Code reviewed

---

### Story 1.2: Group Delimiters
**As a** RTF parser
**I want** to identify group boundaries
**So that** I can build nested document structure

**Acceptance Criteria:**
- [ ] Recognizes `{` as group start
- [ ] Recognizes `}` as group end
- [ ] Tracks nesting depth
- [ ] Detects unbalanced groups

**Test Cases:**
```typescript
tokenize('{\\rtf1}') // → [groupStart, controlWord, groupEnd]
tokenize('{{nested}}') // → [groupStart, groupStart, text, groupEnd, groupEnd]
```

**Tasks:**
- [ ] Add groupStart and groupEnd token types
- [ ] Track group depth counter
- [ ] Validate balanced groups
- [ ] Report unbalanced group errors
- [ ] Write 8 unit tests

**Definition of Done:**
- Correct group nesting
- Error on unbalanced groups
- Tests cover nested scenarios

---

### Story 1.3: Control Symbols & Escape Sequences
**As a** tokenizer
**I want** to handle RTF control symbols
**So that** special characters are properly represented

**Acceptance Criteria:**
- [ ] Handles `\'XX` hex escapes (character codes)
- [ ] Converts hex to character (`\'41` → 'A')
- [ ] Recognizes special symbols (`\~`, `\-`, `\_`)
- [ ] Handles literal escapes (`\\`, `\{`, `\}`)
- [ ] Preserves meaning of each symbol

**Test Cases:**
```typescript
tokenize("\\'41")     // → text{'A'}
tokenize("\\'e9")     // → text{'é'}
tokenize("\\~")       // → controlSymbol{nonBreakingSpace}
tokenize("\\\\")      // → text{'\'}
tokenize("\\{test\\}") // → text{'{test}'}
```

**Tasks:**
- [ ] Implement parseHexEscape() method
- [ ] Convert hex string to character
- [ ] Add controlSymbol token type
- [ ] Map symbols to meanings
- [ ] Handle escape sequences
- [ ] Write 15 unit tests
- [ ] Test extended ASCII codes (128-255)

**Definition of Done:**
- All hex codes convert correctly
- Special symbols preserved
- Escape sequences work
- Tests for all symbol types

---

### Story 1.4: Binary Data Support
**As a** parser
**I want** to handle binary data in RTF
**So that** embedded images and objects are preserved

**Acceptance Criteria:**
- [ ] Recognizes `\bin` keyword
- [ ] Parses length parameter
- [ ] Reads N bytes of binary data
- [ ] Stores as Buffer/Uint8Array
- [ ] Skips binary data during text extraction

**Test Cases:**
```typescript
tokenize('\\bin4 abcd') // → binary{Buffer[97,98,99,100]}
tokenize('\\bin0 ')     // → binary{Buffer[]}
```

**Tasks:**
- [ ] Add binary token type
- [ ] Parse \bin with length parameter
- [ ] Read exact N bytes
- [ ] Store as Buffer
- [ ] Handle binary in middle of text
- [ ] Write 8 unit tests
- [ ] Test with real embedded images

**Definition of Done:**
- Binary data preserved exactly
- Length parameter correct
- Tests with various sizes

---

### Story 1.5: Unicode Character Support
**As a** tokenizer
**I want** to handle Unicode characters
**So that** international text is properly represented

**Acceptance Criteria:**
- [ ] Recognizes `\u` keyword
- [ ] Parses signed 16-bit parameter
- [ ] Converts to Unicode character
- [ ] Handles alternate representation (skip character)
- [ ] Supports negative values (surrogate pairs)

**Test Cases:**
```typescript
tokenize('\\u1234?')  // → text{'\u1234'}, skip '?'
tokenize('\\u-10179') // → text{surrogate pair}
```

**Tasks:**
- [ ] Parse \u control word
- [ ] Handle signed 16-bit integer
- [ ] Convert to JavaScript string
- [ ] Skip alternate character representation
- [ ] Handle surrogate pairs (>0xFFFF)
- [ ] Write 10 unit tests
- [ ] Test with various languages (Chinese, Arabic, etc.)

**Definition of Done:**
- Unicode text displays correctly
- Surrogate pairs work
- Alternate chars skipped
- Tests for multiple languages

---

### Story 1.6: Text Accumulation & Whitespace
**As a** tokenizer
**I want** to properly handle plain text and whitespace
**So that** document content is preserved accurately

**Acceptance Criteria:**
- [ ] Accumulates consecutive text characters
- [ ] Handles whitespace after control words
- [ ] Preserves intentional spaces
- [ ] Normalizes line endings in RTF source
- [ ] Handles empty text runs

**Test Cases:**
```typescript
tokenize('Hello World')   // → text{'Hello World'}
tokenize('\\par Next')    // → controlWord{par}, text{' Next'}
tokenize('\\b \\i text')  // → controlWord{b}, controlWord{i}, text{' text'}
```

**Tasks:**
- [ ] Implement text accumulation logic
- [ ] Handle space after control word (delimiter vs content)
- [ ] Preserve leading/trailing spaces
- [ ] Normalize \r\n to \n in source
- [ ] Write 12 unit tests
- [ ] Edge cases: empty strings, whitespace-only

**Definition of Done:**
- Text preserved exactly
- Whitespace handling correct
- No lost characters
- Tests for all whitespace scenarios

---

### Story 1.7: Error Handling & Position Tracking
**As a** developer using the tokenizer
**I want** clear error messages with positions
**So that** I can debug malformed RTF quickly

**Acceptance Criteria:**
- [ ] Tracks line and column position
- [ ] Reports errors with position info
- [ ] Handles truncated files gracefully
- [ ] Detects infinite loops
- [ ] Provides helpful error messages

**Test Cases:**
```typescript
tokenize('\\unknown', { strict: true })
// → Error: Unknown control word '\unknown' at line 1, column 1

tokenize('{\\rtf1')
// → Error: Unclosed group starting at line 1, column 1
```

**Tasks:**
- [ ] Add position tracking (line, column, offset)
- [ ] Update position on each character
- [ ] Create detailed error messages
- [ ] Add strict vs lenient mode
- [ ] Maximum group depth check (prevent stack overflow)
- [ ] Write 15 error condition tests
- [ ] Test recovery strategies

**Definition of Done:**
- All errors have positions
- Helpful error messages
- Graceful failure modes
- Tests for all error types

---

### Story 1.8: Performance Optimization
**As a** library user
**I want** fast tokenization
**So that** large documents process quickly

**Acceptance Criteria:**
- [ ] Tokenizes >1 MB/s on typical hardware
- [ ] Memory efficient (O(n) space)
- [ ] No unnecessary allocations
- [ ] Optimized string operations

**Test Cases:**
- Small file (10KB): <10ms
- Medium file (100KB): <100ms
- Large file (1MB): <1s

**Tasks:**
- [ ] Benchmark current implementation
- [ ] Profile with large files
- [ ] Optimize hot paths
- [ ] Use efficient data structures
- [ ] Minimize string concatenation
- [ ] Consider streaming for huge files
- [ ] Write performance tests
- [ ] Document performance characteristics

**Definition of Done:**
- Meets >1 MB/s target
- No memory leaks
- Performance tests passing
- Benchmarks documented

---

## Epic Acceptance Criteria

**Functional:**
- [ ] All 8 stories completed
- [ ] Can tokenize all RTF 1.9.1 control words
- [ ] Handles all test fixtures
- [ ] Error messages clear and actionable

**Quality:**
- [ ] 60+ unit tests passing
- [ ] Test coverage >95% for tokenizer module
- [ ] No critical bugs
- [ ] Code documented with JSDoc

**Performance:**
- [ ] Tokenization speed >1 MB/s
- [ ] Memory usage reasonable (<2x input size)

**Readiness:**
- [ ] Ready for Epic 2 (Parser)
- [ ] API stable (won't break parser)
- [ ] Examples working

---

## Test Fixtures Required

Create these test files in `tests/fixtures/tokenizer/`:

**Basic (10 files):**
- `01-hello-world.rtf` - Simplest possible RTF
- `02-bold-italic.rtf` - Character formatting
- `03-multiple-paragraphs.rtf` - Paragraph breaks
- `04-fonts.rtf` - Font table and font changes
- `05-colors.rtf` - Color table and colored text
- `06-special-chars.rtf` - `\'XX` escapes
- `07-unicode.rtf` - `\u` Unicode characters
- `08-groups-nested.rtf` - Nested group structure
- `09-binary.rtf` - `\bin` binary data
- `10-whitespace.rtf` - Various whitespace scenarios

**Error Cases (5 files):**
- `err-01-unclosed-group.rtf` - Missing }
- `err-02-invalid-hex.rtf` - Bad \'XX sequence
- `err-03-truncated.rtf` - File cuts off mid-control
- `err-04-deep-nesting.rtf` - 200+ nested groups
- `err-05-unknown-control.rtf` - Invalid control words

**Real World (5 files):**
- `real-01-word-simple.rtf` - From Microsoft Word
- `real-02-libreoffice.rtf` - From LibreOffice
- `real-03-nda-template.rtf` - Government NDA template
- `real-04-track-changes.rtf` - With revision marks
- `real-05-complex-table.rtf` - Multi-row table

---

## Technical References

**RTF 1.9.1 Spec Sections:**
- Section 2: RTF Syntax (control words, groups, text)
- Section 3: Document Structure
- Appendix A: Control Word Index

**Key Control Word Categories:**
- Document properties: `\rtf`, `\ansi`, `\deff`
- Character formatting: `\b`, `\i`, `\ul`, `\strike`, `\fs`
- Paragraph formatting: `\par`, `\pard`, `\qc`, `\qj`, `\li`, `\ri`
- Special characters: `\'XX`, `\~`, `\-`, `\_`, `\u`
- Binary data: `\bin`
- Tables: Font/color/revision tables in preamble

---

## Story Development Order

Follow story-pipeline approach for each story:

1. **Create** - Write detailed story with acceptance criteria ✓
2. **Validate** - Review requirements, ensure clarity ✓
3. **ATDD** - Write failing tests first (TDD red phase)
4. **Implement** - Write code to make tests pass (TDD green)
5. **Refactor** - Clean up, optimize (TDD refactor)
6. **Review** - Check quality, coverage, docs
7. **Commit** - Git commit with story reference

Work through stories **sequentially**, completing each before moving to next.

---

## Definition of Done (Epic Level)

- [ ] All 8 stories completed and tested
- [ ] Epic acceptance criteria met
- [ ] All test fixtures pass
- [ ] Code reviewed and refactored
- [ ] Documentation updated
- [ ] Ready for Epic 2 (no blockers)
- [ ] Committed to git with epic tag

**Epic Owner:** Claude
**Created:** 2025-12-30
**Target Completion:** 2026-01-01

---

## Notes

This epic follows BMAD story-pipeline principles:
- Each story is independently testable
- Acceptance criteria are clear and measurable
- Tasks are specific and actionable
- Definition of done prevents incomplete work
- Sequential development (no skipping ahead)

**Next Action:** Start Story 1.1 - Basic Control Word Recognition
