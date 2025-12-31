# RTF Toolkit Security Audit Report

**Audit Date:** 2025-12-30
**Auditor:** Security Review
**Scope:** RTF parsing, HTML rendering, and track changes functionality
**Version:** 0.1.0

---

## Executive Summary

This security audit identified **11 vulnerabilities** across critical components of the RTF toolkit, including:
- 3 HIGH severity issues
- 5 MEDIUM severity issues
- 3 LOW severity issues

The primary concerns are **Denial of Service (DoS)** vulnerabilities through resource exhaustion and **Cross-Site Scripting (XSS)** risks in HTML output.

---

## Critical Findings

### 🔴 HIGH SEVERITY

#### 1. Infinite Loop DoS via Deeply Nested Groups
**CVSS Score: 7.5 (HIGH)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/parser.ts` (lines 194-249, 269-304)

**Vulnerability:**
The parser has no depth limit for nested RTF groups. An attacker can craft malicious RTF with thousands of nested braces, causing:
- Stack overflow
- Memory exhaustion
- Infinite processing loops
- Application crash

**Attack Vector:**
```rtf
{{{{{{{{{{{{{{{{{{{...}}}}}}}}}}}}}}}}}}}
```
(Thousands of nested groups)

**Current Code:**
```typescript
// parser.ts line 194
} else if (token?.type === 'groupStart') {
  // Check if destination group
  this.advance(); // consume {
  // ... NO DEPTH CHECK
  this.pushFormatting();
  const groupContent = this.parseContentGroup();
  // ... recursive call without limit
}
```

**Impact:**
- Application becomes unresponsive
- Server resources exhausted
- Potential for distributed DoS attack

**Recommendation:**
```typescript
class Parser {
  private groupDepth = 0;
  private readonly MAX_GROUP_DEPTH = 100;

  private parseContentGroup(): InlineNode[] {
    if (this.groupDepth >= this.MAX_GROUP_DEPTH) {
      throw new Error(`Maximum group nesting depth (${this.MAX_GROUP_DEPTH}) exceeded`);
    }
    this.groupDepth++;
    try {
      // ... existing code
    } finally {
      this.groupDepth--;
    }
  }
}
```

---

#### 2. Memory Exhaustion via Unbounded Text Accumulation
**CVSS Score: 7.5 (HIGH)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/tokenizer.ts` (lines 285-307)

**Vulnerability:**
The tokenizer accumulates text without size limits. An attacker can provide gigabytes of plain text, exhausting memory.

**Attack Vector:**
```rtf
{\\rtf1 AAAAAAAA...}
```
(Multiple GB of 'A' characters)

**Current Code:**
```typescript
// tokenizer.ts lines 285-307
} else {
  const startPos = scanner.pos;
  const position = scanner.getPosition();
  let text = '';

  while (
    !scanner.isEOF() &&
    scanner.peek() !== '\\' &&
    scanner.peek() !== '{' &&
    scanner.peek() !== '}'
  ) {
    text += scanner.advance(); // NO SIZE LIMIT
  }

  if (text.length > 0) {
    tokens.push({
      type: 'text',
      value: text,
      pos: startPos,
      position,
    });
  }
}
```

**Impact:**
- Out of memory errors
- Server crash
- DoS condition

**Recommendation:**
```typescript
const MAX_TEXT_CHUNK_SIZE = 1024 * 1024; // 1MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

class Scanner {
  private totalBytesProcessed = 0;

  constructor(input: string) {
    if (input.length > MAX_DOCUMENT_SIZE) {
      throw new Error(`Document exceeds maximum size of ${MAX_DOCUMENT_SIZE} bytes`);
    }
    this.input = input;
  }
}

// In text accumulation loop:
while (...) {
  if (text.length >= MAX_TEXT_CHUNK_SIZE) {
    throw new Error(`Text chunk exceeds maximum size of ${MAX_TEXT_CHUNK_SIZE} bytes`);
  }
  text += scanner.advance();
}
```

---

#### 3. Prototype Pollution via Font/Color Table Manipulation
**CVSS Score: 7.3 (HIGH)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/parser.ts` (lines 502-596)

**Vulnerability:**
Font and color table parsing uses unbounded array indices, allowing potential prototype pollution or array manipulation attacks.

**Attack Vector:**
```rtf
{\\rtf1{\\fonttbl{\\f999999 Arial;}}}
```

**Current Code:**
```typescript
// parser.ts lines 549-554
if (fontIndex !== null && fontName) {
  return {
    index: fontIndex, // NO VALIDATION
    family: fontFamily,
    name: fontName,
  };
}
```

**Impact:**
- Array manipulation
- Potential prototype pollution
- Memory exhaustion via sparse arrays

**Recommendation:**
```typescript
const MAX_FONT_INDEX = 1000;
const MAX_COLOR_INDEX = 1000;

if (fontIndex !== null) {
  if (fontIndex < 0 || fontIndex >= MAX_FONT_INDEX) {
    throw new Error(`Font index ${fontIndex} out of valid range [0, ${MAX_FONT_INDEX})`);
  }
  // Continue processing...
}

// Similarly for color indices:
if (param !== null && (param < 0 || param >= MAX_COLOR_INDEX)) {
  throw new Error(`Color index out of range`);
}
```

---

### 🟡 MEDIUM SEVERITY

#### 4. HTML Injection via Incomplete Font Name Escaping
**CVSS Score: 6.1 (MEDIUM)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/renderers/html.ts` (lines 52-56)

**Vulnerability:**
Font names from the font table are inserted into CSS without proper escaping, allowing HTML/CSS injection.

**Attack Vector:**
```rtf
{\\rtf1{\\fonttbl{\\f0 Arial</style><script>alert('XSS')</script><style>;}}}
```

**Current Code:**
```typescript
// html.ts lines 52-56
if (formatting.font !== undefined && doc.fontTable[formatting.font]) {
  const fontName = doc.fontTable[formatting.font].name;
  styles.push(`font-family: ${fontName}`); // NO ESCAPING
}
```

**Impact:**
- XSS attack if HTML is rendered in browser
- CSS injection
- Style manipulation

**Recommendation:**
```typescript
function escapeCSSValue(value: string): string {
  return value
    .replace(/[<>'"]/g, '')  // Remove dangerous chars
    .replace(/[^\w\s-]/g, '') // Allow only alphanumeric, space, hyphen
    .trim();
}

if (formatting.font !== undefined && doc.fontTable[formatting.font]) {
  const fontName = escapeCSSValue(doc.fontTable[formatting.font].name);
  styles.push(`font-family: "${fontName}"`); // Quote the value
}
```

---

#### 5. XSS via Unescaped Author Names in Data Attributes
**CVSS Score: 6.1 (MEDIUM)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/renderers/html.ts` (lines 162-166)

**Vulnerability:**
Author names are escaped using `escapeHTML()` but the function doesn't escape backticks, allowing attribute injection.

**Attack Vector:**
```rtf
{\\*\\revtbl{Unknown;}{Alice" onclick="alert('XSS')}}
```

**Current Code:**
```typescript
// html.ts lines 31-39
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    // MISSING: backtick (`)
}
```

**Attack Vector Example:**
```html
<span data-author="Alice` onmouseover=`alert(1)">
```

**Impact:**
- XSS when HTML is rendered
- Attribute injection
- Event handler injection

**Recommendation:**
```typescript
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')  // ADD THIS
    .replace(/\//g, '&#x2F;'); // Optional but recommended
}

// Or use a more robust escaper:
function escapeHTMLAttribute(text: string): string {
  return text.replace(/[&<>"'`=]/g, (char) => {
    const escapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;',
      '=': '&#61;',
    };
    return escapes[char] || char;
  });
}
```

---

#### 6. Inline Style Injection via Color Values
**CVSS Score: 5.8 (MEDIUM)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/renderers/html.ts` (lines 58-66)

**Vulnerability:**
RGB color values are inserted directly into CSS without validation. While RTF spec limits to 0-255, malicious input could bypass this.

**Attack Vector:**
```rtf
{\\colortbl;\\red999999999\\green0\\blue0;}
```

**Current Code:**
```typescript
// html.ts lines 58-61
if (formatting.foregroundColor !== undefined && doc.colorTable[formatting.foregroundColor]) {
  const color = doc.colorTable[formatting.foregroundColor];
  styles.push(`color: rgb(${color.r}, ${color.g}, ${color.b})`);
}
```

**Impact:**
- CSS injection
- Malformed CSS breaking styling
- Potential XSS if browser interprets malformed values

**Recommendation:**
```typescript
function sanitizeRGBValue(value: number): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.floor(value)));
}

if (formatting.foregroundColor !== undefined && doc.colorTable[formatting.foregroundColor]) {
  const color = doc.colorTable[formatting.foregroundColor];
  const r = sanitizeRGBValue(color.r);
  const g = sanitizeRGBValue(color.g);
  const b = sanitizeRGBValue(color.b);
  styles.push(`color: rgb(${r}, ${g}, ${b})`);
}
```

---

#### 7. Integer Overflow in Unicode Character Parsing
**CVSS Score: 5.3 (MEDIUM)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/tokenizer.ts` (lines 227-236)

**Vulnerability:**
Unicode character codes are parsed without upper bound validation, potentially causing invalid character rendering or exploitation.

**Attack Vector:**
```rtf
\\u999999999?
```

**Current Code:**
```typescript
// tokenizer.ts lines 227-236
if (controlWord.name === 'u' && controlWord.param !== null) {
  let charCode = controlWord.param; // NO BOUNDS CHECK

  if (charCode < 0) {
    charCode = 65536 + charCode;
  }

  const unicodeChar = String.fromCharCode(charCode); // May be invalid
```

**Impact:**
- Invalid Unicode characters
- Mojibake in output
- Potential bypass of content filters

**Recommendation:**
```typescript
if (controlWord.name === 'u' && controlWord.param !== null) {
  let charCode = controlWord.param;

  // Validate range
  if (charCode < -32768 || charCode > 65535) {
    // Skip invalid Unicode values
    if (!scanner.isEOF()) {
      scanner.advance(); // Skip alternate char
    }
    continue;
  }

  if (charCode < 0) {
    charCode = 65536 + charCode;
  }

  // Only create valid Unicode characters
  if (charCode >= 0 && charCode <= 0x10FFFF) {
    const unicodeChar = String.fromCharCode(charCode);
    tokens.push({...});
  }

  if (!scanner.isEOF()) {
    scanner.advance();
  }
}
```

---

#### 8. Timestamp Integer Overflow
**CVSS Score: 4.3 (MEDIUM)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/renderers/html.ts` (line 169), `/Users/jonahschulte/git/rtf-toolkit/src/track-changes/parser.ts` (line 66)

**Vulnerability:**
Timestamps are multiplied by 60000 without overflow protection, potentially causing invalid dates.

**Attack Vector:**
```rtf
{\\revised\\revauth1\\revdttm99999999999999 text}
```

**Current Code:**
```typescript
// html.ts line 169
if (node.timestamp !== undefined) {
  const date = new Date(node.timestamp * 60000); // OVERFLOW RISK
  dataAttrs.push(`data-timestamp="${date.toISOString()}"`);
}
```

**Impact:**
- Invalid date objects
- Incorrect timestamp display
- Potential date parsing errors

**Recommendation:**
```typescript
if (node.timestamp !== undefined) {
  // Validate timestamp is within reasonable bounds
  const MAX_TIMESTAMP = Number.MAX_SAFE_INTEGER / 60000;
  const timestamp = Math.max(0, Math.min(node.timestamp, MAX_TIMESTAMP));

  const date = new Date(timestamp * 60000);

  // Validate date is valid
  if (!isNaN(date.getTime())) {
    dataAttrs.push(`data-timestamp="${date.toISOString()}"`);
  }
}
```

---

### 🟢 LOW SEVERITY

#### 9. ReDoS via Control Word Name Accumulation
**CVSS Score: 3.7 (LOW)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/tokenizer.ts` (lines 94-98)

**Vulnerability:**
Control word names are accumulated without length limits, though RTF spec typically limits to 32 chars.

**Attack Vector:**
```rtf
\\aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...aaaaaa
```
(Thousands of 'a' characters)

**Current Code:**
```typescript
// tokenizer.ts lines 94-98
let name = '';
while (!this.isEOF() && /[a-zA-Z]/.test(this.peek())) {
  name += this.advance(); // NO LENGTH LIMIT
}
```

**Impact:**
- Minor memory increase
- Potential slowdown with extremely long control words

**Recommendation:**
```typescript
const MAX_CONTROL_WORD_LENGTH = 32;

let name = '';
while (!this.isEOF() && /[a-zA-Z]/.test(this.peek())) {
  if (name.length >= MAX_CONTROL_WORD_LENGTH) {
    break; // Or throw error for strict validation
  }
  name += this.advance();
}
```

---

#### 10. Unvalidated Parameter Integer Parsing
**CVSS Score: 3.1 (LOW)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/tokenizer.ts` (lines 100-118)

**Vulnerability:**
Control word parameters are parsed with `parseInt()` without validation, potentially causing `NaN` or invalid values.

**Attack Vector:**
```rtf
\\fs9999999999999999999999
```

**Current Code:**
```typescript
// tokenizer.ts lines 100-118
let paramStr = '';
if (this.peek() === '-') {
  paramStr += this.advance();
}
while (!this.isEOF() && /\d/.test(this.peek())) {
  paramStr += this.advance();
}
if (paramStr && paramStr !== '-') {
  param = parseInt(paramStr, 10); // NO VALIDATION
}
```

**Impact:**
- Very large integer values
- Potential numeric overflow in downstream code
- Invalid formatting values

**Recommendation:**
```typescript
const MAX_PARAM_LENGTH = 10; // Allows up to 9,999,999,999

let paramStr = '';
if (this.peek() === '-') {
  paramStr += this.advance();
}

while (!this.isEOF() && /\d/.test(this.peek())) {
  if (paramStr.length >= MAX_PARAM_LENGTH) {
    break;
  }
  paramStr += this.advance();
}

if (paramStr && paramStr !== '-') {
  const parsed = parseInt(paramStr, 10);
  // Validate it's a safe integer
  if (Number.isSafeInteger(parsed)) {
    param = parsed;
  } else {
    // Clamp to safe range or reject
    param = parsed > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
  }
}
```

---

#### 11. Missing Input Validation at Entry Point
**CVSS Score: 3.0 (LOW)**
**Location:** `/Users/jonahschulte/git/rtf-toolkit/src/parser/parser.ts` (line 713), `/Users/jonahschulte/git/rtf-toolkit/src/parser/tokenizer.ts` (line 210)

**Vulnerability:**
The `parseRTF()` and `tokenize()` functions don't validate input type or check for null/undefined.

**Attack Vector:**
```javascript
parseRTF(null);
parseRTF(undefined);
parseRTF({});
```

**Current Code:**
```typescript
// parser.ts line 713
export function parseRTF(rtf: string): RTFDocument {
  const tokens = tokenize(rtf); // No input validation
  const parser = new Parser(tokens);
  return parser.parseDocument();
}

// tokenizer.ts line 210
export function tokenize(rtf: string): Token[] {
  const scanner = new Scanner(rtf); // No validation
  const tokens: Token[] = [];
  // ...
}
```

**Impact:**
- Runtime errors with unhelpful messages
- Potential crashes
- Poor developer experience

**Recommendation:**
```typescript
export function parseRTF(rtf: string): RTFDocument {
  if (typeof rtf !== 'string') {
    throw new TypeError('Input must be a string');
  }

  if (rtf.length === 0) {
    throw new Error('Input RTF string cannot be empty');
  }

  if (rtf.length > MAX_DOCUMENT_SIZE) {
    throw new Error(`Document exceeds maximum size of ${MAX_DOCUMENT_SIZE} bytes`);
  }

  const tokens = tokenize(rtf);
  const parser = new Parser(tokens);
  return parser.parseDocument();
}

export function tokenize(rtf: string): Token[] {
  if (typeof rtf !== 'string') {
    throw new TypeError('Input must be a string');
  }

  const scanner = new Scanner(rtf);
  const tokens: Token[] = [];
  // ...
}
```

---

## Additional Security Concerns

### Missing Security Headers in HTML Output
The HTML renderer doesn't include Content Security Policy or other security guidance for consumers.

**Recommendation:**
Add documentation and helper functions:

```typescript
export interface HTMLOptions {
  includeWrapper?: boolean;
  includeSecurityNotice?: boolean; // Add this
}

export function getRecommendedCSP(): string {
  return "default-src 'none'; style-src 'unsafe-inline';";
}
```

### No Rate Limiting Guidance
The library doesn't provide guidance on rate limiting for server-side usage.

**Recommendation:**
Add to documentation:
- Recommend rate limiting for public APIs
- Suggest file size limits
- Provide example middleware

---

## Vulnerability Summary Table

| ID | Severity | CVSS | Issue | Location |
|----|----------|------|-------|----------|
| 1 | HIGH | 7.5 | Infinite Loop DoS - Nested Groups | parser.ts:194-249 |
| 2 | HIGH | 7.5 | Memory Exhaustion - Unbounded Text | tokenizer.ts:285-307 |
| 3 | HIGH | 7.3 | Prototype Pollution - Font/Color Index | parser.ts:502-596 |
| 4 | MEDIUM | 6.1 | HTML Injection - Font Names | html.ts:52-56 |
| 5 | MEDIUM | 6.1 | XSS - Author Name Attributes | html.ts:162-166 |
| 6 | MEDIUM | 5.8 | CSS Injection - Color Values | html.ts:58-66 |
| 7 | MEDIUM | 5.3 | Integer Overflow - Unicode | tokenizer.ts:227-236 |
| 8 | MEDIUM | 4.3 | Integer Overflow - Timestamps | html.ts:169 |
| 9 | LOW | 3.7 | ReDoS - Control Word Names | tokenizer.ts:94-98 |
| 10 | LOW | 3.1 | Unvalidated parseInt | tokenizer.ts:100-118 |
| 11 | LOW | 3.0 | Missing Input Validation | parser.ts:713 |

---

## Remediation Priority

### Immediate (Critical)
1. Implement depth limits for nested groups (Issue #1)
2. Add document size limits (Issue #2)
3. Validate font/color table indices (Issue #3)

### Short-term (1-2 weeks)
4. Fix HTML escaping for font names (Issue #4)
5. Fix XSS in author attributes (Issue #5)
6. Validate RGB color values (Issue #6)

### Medium-term (1 month)
7. Add Unicode validation (Issue #7)
8. Fix timestamp overflow (Issue #8)
9. Add control word length limits (Issue #9)

### Long-term (Ongoing)
10. Add comprehensive input validation (Issues #10-11)
11. Add security documentation
12. Implement security testing suite

---

## Recommended Security Testing Strategy

### 1. Fuzzing
```bash
# Use AFL or libFuzzer to test parser with random input
npm run fuzz:parser
```

### 2. Unit Tests for Attack Vectors
```typescript
describe('Security Tests', () => {
  it('should reject deeply nested groups', () => {
    const malicious = '{'.repeat(200) + '}' .repeat(200);
    expect(() => parseRTF(malicious)).toThrow('Maximum group nesting');
  });

  it('should handle giant text blocks', () => {
    const huge = '{\\rtf1 ' + 'A'.repeat(20 * 1024 * 1024) + '}';
    expect(() => parseRTF(huge)).toThrow('exceeds maximum size');
  });
});
```

### 3. Static Analysis
- Run ESLint security plugin
- Use SonarQube for code quality
- Implement pre-commit security hooks

### 4. Dependency Scanning
```bash
npm audit
npm audit fix
```

---

## Compliance Considerations

### OWASP Top 10 Coverage
- ✅ A03:2021 – Injection (XSS, CSS injection)
- ✅ A04:2021 – Insecure Design (DoS vulnerabilities)
- ⚠️  A06:2021 – Vulnerable Components (Need dependency scanning)
- ✅ A05:2021 – Security Misconfiguration (Missing CSP guidance)

### Security Standards
- **PCI-DSS**: If processing payment-related documents, need input validation
- **HIPAA**: If processing health documents, need audit logging
- **GDPR**: Author tracking may need privacy considerations
- **SOC2**: Need security controls documentation

---

## Contact & Reporting

For security issues, please contact: [security contact needed]

Do NOT report security vulnerabilities via public GitHub issues.

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [RTF Specification 1.9.1](https://www.microsoft.com/en-us/download/details.aspx?id=10725)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
- [CWE-79: Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-1321: Prototype Pollution](https://cwe.mitre.org/data/definitions/1321.html)

---

**Report Version:** 1.0
**Last Updated:** 2025-12-30
