# Contributing to DealBase

## Quick Start

1. **Branch off main**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Code, test, commit
3. **Push & PR**: `git push -u origin feature/your-feature-name`
4. **Wait for review**: All PRs require review + passing CI

## Development Workflow

### Branching Model
- **Main branch**: `main` - stable, deployable code
- **Feature branches**: `feature/*` - new features off main
- **No direct pushes** to main - use PRs only

### Local Development
```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Run checks before committing
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Pre-commit Hooks

We use pre-commit hooks to catch issues early:

- **TypeScript check**: Ensures type safety
- **Linting**: Code style and quality
- **Formatting**: Auto-format code
- **Unit tests**: Fast test suite

### Bypassing Hooks (Emergency Only)
```bash
# NOT RECOMMENDED - only for emergencies
git commit --no-verify -m "emergency: brief description"
```

## Commit Messages

Use conventional commits:
```
feat(web): add deal creation form
fix(api): resolve database timeout
docs: update contributing guide
chore: update dependencies
```

## CI/CD

- **PRs**: Must pass all checks + 1 review
- **Main branch**: Protected from direct pushes
- **Checks**: TypeScript, linting, tests, build

## Common Issues

### TypeScript Errors
```bash
pnpm typecheck
# Fix errors, then commit
```

### Linting Failures
```bash
pnpm lint
# Fix issues, then commit
```

### Test Failures
```bash
pnpm test
# Fix tests, then commit
```

### Build Failures
```bash
pnpm build
# Fix build issues, then commit
```

## Getting Help

- Check existing issues first
- Create detailed issue reports
- Ask questions in PR comments