# DealBase Guardrails Implementation

## Overview
Lightweight guardrails to prevent small changes from breaking pushes/merges while keeping the workflow fast and minimal.

## ✅ Implemented Features

### 1. Local Guardrails
- **Pre-commit hooks**: TypeScript check, linting, formatting, unit tests
- **Pre-push hooks**: Smoke tests for golden paths (typecheck, lint, build, test)
- **Commit message validation**: Conventional commits format enforced
- **Git hooks directory**: `.githooks/` with executable pre-push script

### 2. CI Guardrails
- **Basic Check workflow**: Runs on all PRs and pushes to main/develop
- **Test Application workflow**: Comprehensive testing on PRs
- **Status checks**: All workflows must pass before merge
- **Fast feedback**: Quick failure detection for common issues

### 3. Quality Assurance
- **PR Template**: Structured template for consistent PR quality
- **CONTRIBUTING.md**: Minimal guide for development workflow
- **Commit template**: `.gitmessage` with conventional commit format
- **Accessibility fixes**: Resolved linting warnings

### 4. Branch Protection (Manual Setup Required)
- **Branch protection rules** need to be configured in GitHub Settings
- **Required checks**: basic-check, test-frontend, test-backend
- **PR requirements**: Review + passing checks
- **No direct pushes** to main branch

## 🚀 Usage

### Local Development
```bash
# Install dependencies
pnpm install

# Run all checks
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Commit (hooks run automatically)
git commit -m "feat(web): add new feature"

# Push (pre-push hooks run automatically)
git push
```

### Emergency Bypass (Not Recommended)
```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency: brief description"

# Skip pre-push hooks
git push --no-verify
```

## 📋 Branch Protection Setup

To complete the setup, configure branch protection in GitHub:

1. Go to **Settings > Branches**
2. Click **Add rule** for `main` branch
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Select: `basic-check`, `test-frontend`, `test-backend`
   - ✅ Require branches to be up to date before merging
   - ✅ Restrict pushes to matching branches
   - ✅ Require linear history

## 🎯 Acceptance Criteria Status

- ✅ **Commits fail locally** if type/lint/unit tests fail
- ✅ **Pushes are blocked** if smoke tests fail
- ✅ **PRs require passing CI** (workflows configured)
- ⚠️ **PR review requirement** (needs GitHub Settings configuration)
- ⚠️ **Default branch protection** (needs GitHub Settings configuration)
- ✅ **PR template exists** (`.github/pull_request_template.md`)
- ✅ **CONTRIBUTING guide exists** (`CONTRIBUTING.md`)

## 🔧 Configuration Files

- `.pre-commit-config.yaml` - Pre-commit hooks configuration
- `.githooks/pre-push` - Pre-push smoke tests
- `.gitmessage` - Commit message template
- `.github/pull_request_template.md` - PR template
- `CONTRIBUTING.md` - Development guide
- `.github/workflows/` - CI/CD workflows

## 🚨 No Behavior Drift

- ✅ No API routes renamed
- ✅ No cache keys changed
- ✅ No types renamed
- ✅ All existing functionality preserved
- ✅ Only added guardrails, no breaking changes
