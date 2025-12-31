# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Features

The RTF toolkit includes comprehensive security protections:

### DoS (Denial of Service) Protection
- **Group depth limits**: Maximum 100 nested groups
- **Document size limits**: Maximum 50MB
- **Text chunk limits**: Maximum 1MB per text run
- **Table size limits**: Maximum 1000 fonts/colors/authors

### XSS (Cross-Site Scripting) Protection
- **HTML escaping**: All user content properly escaped
- **CSS sanitization**: Font names and color values validated
- **Attribute escaping**: Author names and metadata safely rendered

### Input Validation
- Type checking at all entry points
- Bounds checking for numeric values
- Safe integer validation for parameters

## Reporting a Vulnerability

**DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via email to: [jonah.schulte@gmail.com](mailto:jonah.schulte@gmail.com)

### What to Include

Please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** with example RTF input if possible
3. **Impact assessment** (what could an attacker do?)
4. **Suggested fix** (if you have one)
5. **Your contact information** for follow-up

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity
  - CRITICAL: 1-3 days
  - HIGH: 1-2 weeks
  - MEDIUM/LOW: Next minor release

### Disclosure Policy

- We follow **coordinated disclosure**
- **90-day disclosure deadline** from report
- We'll work with you on public disclosure timing
- Credit will be given to reporters (unless you prefer anonymity)

## Security Best Practices for Users

### Server-Side Usage

When using the library in a server environment:

```typescript
import { parseRTF } from '@jonahschulte/rtf-toolkit';

// 1. Implement rate limiting
app.post('/api/parse-rtf', rateLimit({ max: 10 }), async (req, res) => {
  try {
    // 2. Validate file size before parsing
    if (req.body.rtf.length > 10 * 1024 * 1024) { // 10MB
      return res.status(413).send('File too large');
    }

    // 3. Use timeouts to prevent long-running parses
    const doc = await Promise.race([
      parseRTF(req.body.rtf),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    res.json({ success: true, doc });
  } catch (error) {
    // 4. Don't expose internal errors to clients
    console.error('Parse error:', error);
    res.status(400).send('Invalid RTF document');
  }
});
```

### Client-Side Usage

When rendering HTML in the browser:

```typescript
import { toHTML } from '@jonahschulte/rtf-toolkit';

// 1. Use Content Security Policy
// Add to your HTML:
// <meta http-equiv="Content-Security-Policy"
//       content="default-src 'none'; style-src 'unsafe-inline';">

// 2. Sanitize before inserting into DOM (defense in depth)
const html = toHTML(doc);
element.innerHTML = html; // Already escaped, but consider DOMPurify as well
```

### Known Limitations

- **Maximum document size**: 50MB (configurable in source)
- **Maximum nesting depth**: 100 levels (configurable in source)
- **Maximum table sizes**: 1000 entries each (configurable in source)

Documents exceeding these limits will throw errors. This is intentional security protection.

## Security Testing

Run the security test suite:

```bash
npm test -- tests/security
```

Tests include:
- DoS attack vectors (nested groups, huge files)
- XSS attack vectors (HTML/CSS injection)
- Input validation edge cases

## Hall of Fame

Security researchers who have helped improve the project:

- *Your name could be here!*

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [RTF Specification](https://www.microsoft.com/en-us/download/details.aspx?id=10725)
- [Security Audit Report](SECURITY_AUDIT_REPORT.md)
- [Security Fixes Guide](SECURITY_FIXES.md)

---

**Last Updated**: 2025-12-30
