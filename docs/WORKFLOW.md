# Development Workflow

**Approach:** BMAD Story-Pipeline for Library Development

This project uses BMAD autonomous-epic principles adapted for open-source library development.

---

## Story-Pipeline Process

For each story, follow these steps:

### 1️⃣ **Create** - Story Definition
- Read story from epic file
- Understand acceptance criteria
- Review test cases
- Clarify any ambiguities

### 2️⃣ **Validate** - Requirements Check
- Acceptance criteria clear and testable? ✓
- Tasks specific and actionable? ✓
- Definition of done unambiguous? ✓
- Dependencies resolved? ✓

### 3️⃣ **ATDD** - Write Failing Tests First
- Create test file for story
- Write tests for all acceptance criteria
- Tests should fail (red phase)
- Commit: `test: add failing tests for Story X.Y`

### 4️⃣ **Implement** - Make Tests Pass
- Write minimal code to pass tests
- Follow TDD green phase
- Focus on correctness, not perfection
- Commit frequently: `feat: implement Story X.Y - [description]`

### 5️⃣ **Refactor** - Clean Up
- Optimize code
- Add documentation
- Remove duplication
- Improve readability
- Commit: `refactor: clean up Story X.Y implementation`

### 6️⃣ **Review** - Quality Check
- All tests passing? ✓
- Coverage target met? ✓
- Code documented? ✓
- Acceptance criteria satisfied? ✓

### 7️⃣ **Complete** - Mark Done
- Update story checkbox in epic file
- Update `sprint-status.yaml` story count
- Update `PROGRESS.md`
- Move to next story

---

## Epic Workflow

### **Starting an Epic:**

1. Open epic file: `docs/epics/epic-X-name.md`
2. Review epic goal and overview
3. Understand dependencies
4. Check test fixtures needed
5. Update epic status to "in-progress"

### **Working Through Epic:**

1. Take first story (sequential order)
2. Run story-pipeline (7 steps above)
3. When story done, mark checkbox ✓
4. Move to next story
5. Repeat until all stories complete

### **Completing an Epic:**

1. Verify all stories ✓
2. Run all epic tests
3. Check epic acceptance criteria
4. Update `sprint-status.yaml`:
   - Epic status → "completed"
   - Stories completed → X/X
   - Actual days recorded
5. Commit: `feat: complete Epic X - [epic name]`
6. Move to next epic

---

## Daily Workflow

### **Morning:**
1. Check `PROGRESS.md` - Where am I?
2. Review current story in epic file
3. Plan today's work (which step of story-pipeline)

### **During Work:**
- Follow TDD cycle (red → green → refactor)
- Commit frequently (1-3x per story)
- Update story checkboxes as tasks complete
- Run tests continuously

### **End of Day:**
1. Commit any uncommitted work
2. Update `PROGRESS.md` with today's accomplishments
3. Update story status in epic file
4. Note any blockers or learnings

---

## Testing Philosophy

### **Test-First Development:**
Every story starts with tests:
```
1. Write test (ATDD)
2. Run test (should fail)
3. Write code
4. Run test (should pass)
5. Refactor
6. Repeat
```

### **Coverage Targets:**
- **Unit tests:** 100% coverage of public APIs
- **Integration tests:** All major workflows
- **Fixture tests:** Real RTF files from the wild

### **Test Organization:**
```
tests/
├── unit/
│   ├── tokenizer.test.ts
│   ├── parser.test.ts
│   └── html-renderer.test.ts
├── integration/
│   ├── rtf-to-html.test.ts
│   ├── html-to-rtf.test.ts
│   └── round-trip.test.ts
└── fixtures/
    ├── tokenizer/ (20 files)
    ├── parser/ (20 files)
    └── real-world/ (10 files)
```

---

## Commit Message Format

Use conventional commits:

**For Stories:**
```
feat: implement Story 1.1 - basic control word recognition

Adds Scanner class with control word parsing:
- Recognizes \word and \word123 format
- Handles negative parameters
- Position tracking for errors

Tests: 10 unit tests
Coverage: 100% of scanControlWord method

Story: Epic 1, Story 1.1
```

**For Tests:**
```
test: add failing tests for Story 1.2 - group delimiters

Tests cover:
- Group start/end recognition
- Nesting depth tracking
- Unbalanced group detection

Story: Epic 1, Story 1.2
```

**For Epic Completion:**
```
feat: complete Epic 1 - RTF Tokenizer

All 8 stories implemented and tested:
✓ Story 1.1 - Control words
✓ Story 1.2 - Groups
✓ Story 1.3 - Control symbols
✓ Story 1.4 - Binary data
✓ Story 1.5 - Unicode
✓ Story 1.6 - Text accumulation
✓ Story 1.7 - Error handling
✓ Story 1.8 - Performance

Metrics:
- Tests: 78 passing
- Coverage: 98.5%
- Performance: 1.2 MB/s

Ready for Epic 2: Parser
```

---

## Progress Tracking

### **sprint-status.yaml**
Central tracking - update after each story:
```yaml
EPIC-1:
  stories_completed: 3  # Increment
  current_story: "Story 1.4 - Binary Data"  # Update
```

### **PROGRESS.md**
Daily snapshot - update at end of day:
- What completed today
- Current task
- Blockers
- Notes

### **Epic Story Files**
Checkboxes - update as tasks complete:
- [ ] Task → [x] Task
- Track which tests written
- Mark acceptance criteria met

---

## Quality Gates

Before moving to next story:
- ✅ All story tests passing
- ✅ Acceptance criteria met
- ✅ Code documented
- ✅ No TODO comments left

Before moving to next epic:
- ✅ All stories complete
- ✅ Epic acceptance criteria met
- ✅ All epic tests passing
- ✅ Coverage target reached

Before releasing:
- ✅ All epics complete
- ✅ 100% test coverage
- ✅ Documentation complete
- ✅ Integration tested with usmax-nda

---

## Autonomous Epic Adaptation

Since this is library development (not app feature), we adapt autonomous-epic:

**Instead of:**
- UI implementation → Test library functions
- Database changes → Test data structures (AST)
- API endpoints → Test public APIs
- User acceptance → Test acceptance criteria

**Story-Pipeline Steps:**
1. ATDD (write tests) ✓
2. Implement (make tests pass) ✓
3. Review (check quality) ✓
4. Commit (save progress) ✓

**Result:** Same systematic, test-driven approach, adapted for library context.

---

## When to Ask for Help

**Ask User:**
- API design decisions (breaking changes)
- Tradeoffs (performance vs features)
- Scope questions (include feature or defer to v2?)

**Don't Ask:**
- Implementation details (follow plan)
- Test specifics (write comprehensive tests)
- Internal refactoring (just do it)

---

## Success Indicators

**Daily:**
- At least 1 story completed
- All tests passing
- Code committed

**Weekly:**
- At least 1 epic completed
- Sprint goal on track
- No major blockers

**Project:**
- All 9 epics done
- 100% test coverage
- Published to npm
- Integrated successfully

---

**Remember:** Story-pipeline is about systematic, quality-focused development. Don't skip steps. Don't leave stories half-done. Always finish what you start.

**Let's build something great!** 🚀
