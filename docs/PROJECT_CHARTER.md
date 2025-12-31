# @jonahschulte/rtf-toolkit Project Charter

**Project Type:** Open Source Library Development
**Methodology:** BMAD-Lite (Lightweight tracking without full SDLC overhead)
**Duration:** 3 weeks (15 working days)
**Status:** Active - Sprint 1

---

## Vision

Build the first modern, spec-compliant RTF parsing library for JavaScript/TypeScript that solves real-world document management problems for government contractors and anyone dealing with legacy RTF systems.

---

## Success Criteria

### **Must Have (v1.0):**
✅ Full RTF 1.9.1 specification compliance
✅ Bidirectional conversion (RTF ↔ HTML)
✅ Track changes support (parse, extract, visualize)
✅ React components for track changes UI
✅ 100% test coverage
✅ Published to npm
✅ Integrated into usmax-nda successfully

### **Quality Gates:**
- All tests passing (100% coverage)
- No critical bugs
- Documentation complete
- Performance benchmarks met
- Successful integration with usmax-nda

### **Business Value:**
- Solves usmax-nda RTF workflow problem
- Enables WYSIWYG editing of uploaded RTFs
- Provides track changes visualization
- Open source contribution builds USmax reputation

---

## Scope

### **In Scope:**
- RTF 1.9.1 parsing (all control words)
- RTF → HTML conversion with formatting
- HTML → RTF generation
- Track changes parsing (`\revised`, `\deleted`)
- Author and timestamp extraction
- React components for track changes visualization
- TypeScript type definitions
- Comprehensive test suite
- Documentation and examples
- npm package publication

### **Out of Scope (Future Versions):**
- Image embedding (v1.1)
- Headers/footers (v1.2)
- Footnotes/endnotes (v1.2)
- DOCX support (v2.0)
- PDF generation (v2.0)
- Collaborative editing (v2.0)

---

## Epics & Stories

### **Epic 1: RTF Tokenizer** (2 days)
6 stories - Lexical analysis, control words, special characters

### **Epic 2: RTF Parser** (2 days)
5 stories - AST building, font/color tables, content hierarchy

### **Epic 3: Basic HTML Rendering** (1 day)
4 stories - Paragraphs, character formatting, alignment

### **Epic 4: Advanced HTML Rendering** (2 days)
6 stories - Tables, lists, colors, complex formatting

### **Epic 5: HTML to RTF Generator** (3 days)
7 stories - Bidirectional conversion, round-trip testing

### **Epic 6: Track Changes** (2 days)
5 stories - Revision parsing, author tracking, diff generation

### **Epic 7: React Components** (2 days)
4 stories - TrackChangesViewer, controls, styling

### **Epic 8: Testing** (3 days, ongoing)
8 stories - Unit tests, integration tests, fixtures, benchmarks

### **Epic 9: Documentation & Release** (3 days)
6 stories - API docs, examples, CI/CD, npm publish

**Total:** 47 stories across 9 epics

---

## Timeline

### **Sprint 1: Foundation (Week 1)**
**Dec 30 - Jan 5**
- EPIC-1: Tokenizer ✓
- EPIC-2: Parser ✓
- EPIC-3: Basic HTML ✓
- **Goal:** Can parse simple RTF and output HTML

### **Sprint 2: Conversion (Week 2)**
**Jan 6 - Jan 12**
- EPIC-4: Advanced HTML
- EPIC-5: HTML → RTF
- EPIC-6: Track Changes
- **Goal:** Full bidirectional conversion + track changes working

### **Sprint 3: Release (Week 3)**
**Jan 13 - Jan 20**
- EPIC-7: React Components
- EPIC-8: Test Suite (finalize)
- EPIC-9: Documentation & Publish
- **Goal:** v1.0.0 published to npm

---

## Tracking & Reviews

### **Daily:**
- Update story status in epic files
- Commit working code
- Run tests
- Update sprint-status.yaml

### **Weekly:**
- Review epic completion
- Update metrics
- Adjust timeline if needed
- Demo progress

### **End of Sprint:**
- Retrospective
- Update phase status
- Plan next sprint
- Risk review

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RTF spec too complex | High | Medium | Focus on 80/20 rule - common control words first |
| Round-trip conversion quality | Medium | High | Extensive testing, accept "good enough" for v1.0 |
| Performance issues | Medium | Low | Benchmark early, optimize if needed |
| Track changes edge cases | Low | Medium | Support Word format only for v1.0 |
| Timeline slippage | Medium | Low | Buffer days built into estimates |

---

## Tools & Resources

**Development:**
- TypeScript 5.3+
- Vitest (testing)
- ESLint + Prettier (code quality)
- GitHub Actions (CI/CD)

**Reference:**
- RTF 1.9.1 Specification (Microsoft, 2008)
- Existing RTF files from usmax-nda
- Real-world government NDA templates

**Tracking:**
- sprint-status.yaml (overall status)
- Epic story files (detailed tasks)
- Git commits (progress history)
- GitHub Issues (bugs/features)

---

## Stakeholders

**Primary:** USmax (funding, integration into usmax-nda)
**Secondary:** Open Source Community (future users/contributors)

---

## Definition of Done (Project)

- [ ] All 9 epics completed
- [ ] 100% test coverage achieved
- [ ] Documentation complete
- [ ] Published to npm as @jonahschulte/rtf-toolkit v1.0.0
- [ ] Successfully integrated into usmax-nda
- [ ] GitHub repo public with CI/CD
- [ ] Announced to JavaScript community
- [ ] Contributing guidelines in place

---

**Charter Approved By:** Jonah Schulte (USmax)
**Project Start:** December 30, 2025
**Target Completion:** January 20, 2026
