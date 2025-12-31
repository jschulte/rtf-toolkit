# Contributing to @jonahschulte/rtf-toolkit

Thank you for your interest in contributing! This document provides guidelines for contributing to the RTF toolkit.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** describing the issue
- **RTF sample** that reproduces the problem (if possible)
- **Expected behavior** vs **actual behavior**
- **Environment details** (Node.js version, browser, OS)
- **Error messages** and stack traces

**Use the bug report template** when creating issues.

### Suggesting Features

Feature requests are welcome! Please:

- Check existing issues/PRs for similar requests
- Provide clear use case and motivation
- Include example RTF input/output if applicable
- Consider implementation complexity

### Security Vulnerabilities

**DO NOT** report security vulnerabilities via public issues!

See [SECURITY.md](SECURITY.md) for instructions on responsible disclosure.

## Development Process

### Setup

```bash
# Clone the repository
git clone https://github.com/jonahschulte/rtf-toolkit.git
cd rtf-toolkit

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

### Making Changes

1. **Fork the repository** and create a branch from `main`
2. **Write tests** for your changes (TDD approach preferred)
3. **Implement your changes** following the coding standards below
4. **Run the test suite** - all tests must pass
5. **Run the linter** - `npm run lint`
6. **Build successfully** - `npm run build`
7. **Update documentation** if needed

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add table parsing support
fix: handle nested revision groups correctly
docs: update API reference for track changes
test: add security tests for DoS protection
perf: optimize string concatenation in tokenizer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `perf`: Performance improvements
- `refactor`: Code refactoring
- `chore`: Build process or tooling changes

### Pull Request Process

1. **Update tests** - Ensure your changes are covered
2. **Update README** - If adding new features
3. **Update CHANGELOG.md** - Add entry under "Unreleased"
4. **Ensure CI passes** - All checks must be green
5. **Request review** - Maintainers will review your PR
6. **Address feedback** - Make requested changes promptly

### Testing Guidelines

- Write tests **before** implementing (TDD)
- Aim for **high coverage** (we target 95%+)
- Test edge cases and error conditions
- Include **security tests** for parsing features

```typescript
describe('Feature Name', () => {
  it('should handle normal case', () => {
    // Test expected behavior
  });

  it('should handle edge case', () => {
    // Test boundaries
  });

  it('should reject malicious input', () => {
    // Test security
  });
});
```

### Coding Standards

**TypeScript:**
- Use **TypeScript** (strict mode when possible)
- Provide **type definitions** for all public APIs
- Avoid `any` - use proper types
- Document complex types with JSDoc

**Code Style:**
- Run `npm run format` before committing (Prettier)
- Follow existing code patterns
- Keep functions **small and focused**
- Use **descriptive names**

**Performance:**
- Avoid O(n²) algorithms
- Use **array accumulation** instead of string concatenation in loops
- Consider memory impact for large documents

**Security:**
- **Validate all inputs** at API boundaries
- **Escape output** properly (HTML, CSS, attributes)
- Add **bounds checking** for loops and allocations
- Include **security tests**

## Project Structure

```
rtf-toolkit/
├── src/
│   ├── parser/          # Tokenizer and parser
│   ├── renderers/       # Output renderers (HTML, text, etc.)
│   ├── track-changes/   # Track changes API
│   └── index.ts         # Public API
├── tests/
│   ├── unit/            # Unit tests
│   └── security/        # Security tests
├── examples/            # Usage examples
└── docs/                # Additional documentation
```

## Architecture Guidelines

### Parser Pipeline

The library follows a clear pipeline:

```
RTF String → Tokenizer → Token Stream → Parser → AST → Renderer → Output
```

Each stage should be:
- **Independent** and testable
- **Single responsibility**
- **Type-safe**

### Adding New Features

**New Control Words:**
1. Add to appropriate handler in `parser.ts`
2. Update AST types if needed
3. Add tests
4. Update documentation

**New Renderers:**
1. Create `src/renderers/[format].ts`
2. Implement render functions for all node types
3. Export from `src/index.ts`
4. Add comprehensive tests
5. Update README with examples

**New RTF Features:**
1. Update tokenizer if new syntax needed
2. Update parser to build AST nodes
3. Update all renderers to handle new nodes
4. Add tests at each layer
5. Document in README

## Review Criteria

Pull requests will be reviewed for:

- ✅ **Functionality** - Does it work as intended?
- ✅ **Tests** - Are changes well-tested?
- ✅ **Performance** - No algorithmic regressions?
- ✅ **Security** - Input validation and output escaping?
- ✅ **Documentation** - README and JSDoc updated?
- ✅ **Code Quality** - Follows style guide?
- ✅ **Breaking Changes** - Are they necessary and documented?

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Create git tag: `git tag v0.x.0`
4. Push tag: `git push origin v0.x.0`
5. Publish to npm: `npm publish --access public`
6. Create GitHub release with notes

## Getting Help

- **Questions?** Open a discussion on GitHub
- **Stuck?** Ask in PR comments
- **Found a bug?** Create an issue
- **Security issue?** See SECURITY.md

## Recognition

Contributors are recognized in:
- GitHub contributors graph
- Release notes
- Special thanks in major releases

Thank you for helping make RTF parsing better for everyone! 🎉
