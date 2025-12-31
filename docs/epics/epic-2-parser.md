# Epic 2: RTF Parser & AST Builder

**Status:** ready-for-dev
**Priority:** P0 - Critical Path
**Epic Goal:** Build parser that converts token stream to Abstract Syntax Tree
**Estimated Effort:** 2-3 days
**Dependencies:** Epic 1 (Tokenizer) ✓

---

## Epic Overview

The parser consumes tokens from the tokenizer and builds an Abstract Syntax Tree (AST) representing the RTF document structure. This is the core of the RTF parsing library.

**Why This Matters:**
- Enables programmatic access to RTF document structure
- Foundation for all rendering (HTML, text, etc.)
- Must handle nested groups and state properly
- Performance critical for large documents

**Technical Approach:**
- Recursive descent parser
- State stack for font/color/formatting tables
- Group nesting with state inheritance
- Destination groups (\fonttbl, \colortbl, \stylesheet, etc.)

---

## Implementation Strategy

Rather than individual stories, we'll implement the parser in functional chunks:

### Phase 1: Basic Document Structure (4 hours)
- Parse RTF header (\rtf1, \ansi, \deff, etc.)
- Handle font table (\fonttbl)
- Handle color table (\colortbl)
- Create RTF Document root node
- **Tests:** Parse simple RTF documents with font/color tables

### Phase 2: Content Parsing (6 hours)
- Parse paragraphs and text runs
- Handle formatting properties (bold, italic, underline, font size)
- Track formatting state through groups
- Handle paragraph properties (alignment, spacing, indentation)
- **Tests:** Parse documents with formatted text

### Phase 3: Complex Structures (4 hours)
- Parse tables (\trowd, \cellx, \cell, \row)
- Parse lists (\pn, list tables)
- Handle nested groups properly
- **Tests:** Parse documents with tables and lists

### Phase 4: Special Content (2 hours)
- Handle revision tracking groups (\revised, \deleted)
- Parse embedded objects
- Handle destination groups
- **Tests:** Parse documents with track changes

---

## Acceptance Criteria

**Phase 1:**
- [ ] Parses RTF header correctly
- [ ] Extracts font table with all fonts
- [ ] Extracts color table with RGB values
- [ ] Creates valid RTF Document AST node
- [ ] Tests cover various font/color configurations

**Phase 2:**
- [ ] Parses text content accurately
- [ ] Handles all basic formatting (b, i, u, fs, etc.)
- [ ] Maintains formatting state through nested groups
- [ ] Handles paragraph properties
- [ ] Tests cover complex formatting scenarios

**Phase 3:**
- [ ] Parses table structure correctly
- [ ] Handles nested tables
- [ ] Parses list structures
- [ ] Maintains proper nesting depth
- [ ] Tests cover complex document structures

**Phase 4:**
- [ ] Preserves track changes information
- [ ] Handles embedded objects
- [ ] Correctly identifies destination groups
- [ ] Tests cover track changes scenarios

---

## Definition of Done

- All acceptance criteria met
- 25+ unit tests passing
- Parser handles real-world RTF documents
- Performance: <100ms for typical documents (<100KB)
- Code documented with JSDoc comments
- Ready for Epic 3 (HTML Renderer)
