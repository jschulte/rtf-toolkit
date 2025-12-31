---
name: Bug Report
about: Report a bug or unexpected behavior
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of the bug.

## To Reproduce

**RTF Input:**
```rtf
{Your RTF document that causes the issue}
```

**Code:**
```typescript
import { parseRTF, toHTML } from '@jonahschulte/rtf-toolkit';

const doc = parseRTF(rtfString);
// ... your code
```

**Steps:**
1. Parse RTF document
2. Call toHTML
3. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

**Error Message:**
```
Paste error message and stack trace here
```

## Environment

- **Package version**: (e.g., 0.1.0)
- **Node.js version**: (run `node --version`)
- **TypeScript version**: (if applicable)
- **Browser**: (if client-side)
- **Operating System**: (e.g., macOS 13, Windows 11, Ubuntu 22.04)

## Additional Context

Any other relevant information or context about the problem.

## Sample RTF File

If possible, attach a minimal RTF file that reproduces the issue.
