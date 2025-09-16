# Contributing to DealBase

Thank you for your interest in contributing to DealBase! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branching Model](#branching-model)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- pnpm 8+
- Git

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/dealbase.git
   cd dealbase
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Build shared package**
   ```bash
   pnpm --filter @dealbase/shared build
   ```

5. **Install API dependencies**
   ```bash
   cd apps/api
   pip install -r requirements.txt
   cd ../..
   ```

6. **Install pre-commit hooks**
   ```bash
   pre-commit install
   ```

7. **Start development servers**
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branching Model

We use a Git branching model with the following branches:

- `main` - Production-ready code
- `develop` - Main development branch
- `feature/*` - Feature branches (e.g., `feature/user-authentication`)
- `bugfix/*` - Bug fix branches (e.g., `bugfix/calculation-error`)
- `hotfix/*` - Critical production fixes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add user authentication system"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Guidelines

- **One commit per PR**: Squash commits before submitting
- **Conventional Commits**: Use the conventional commit format
- **Link to issues**: Reference related issues in your PR
- **Review required**: At least one maintainer must approve
- **CI must pass**: All checks must be green before merging

## Coding Standards

### TypeScript/JavaScript

- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is handled automatically
- **TypeScript**: Use strict mode, prefer explicit types
- **Naming**: Use camelCase for variables and functions, PascalCase for components

```typescript
// Good
interface UserProfile {
  id: number;
  name: string;
  email: string;
}

const fetchUserProfile = async (id: number): Promise<UserProfile> => {
  // implementation
};

// Bad
interface userprofile {
  Id: number;
  Name: string;
  Email: string;
}
```

### Python

- **Black**: Code formatting (line length: 88)
- **Ruff**: Linting and import sorting
- **MyPy**: Type checking
- **Naming**: Use snake_case for variables and functions, PascalCase for classes

```python
# Good
from typing import Optional, List
from pydantic import BaseModel

class UserProfile(BaseModel):
    id: int
    name: str
    email: str

def fetch_user_profile(user_id: int) -> Optional[UserProfile]:
    # implementation
    pass

# Bad
from typing import *
import pydantic

class userprofile:
    Id: int
    Name: str
    Email: str
```

### React Components

- **Functional Components**: Use function components with hooks
- **Props Interface**: Define explicit prop interfaces
- **Error Boundaries**: Wrap components in error boundaries when appropriate

```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ variant, children, onClick, disabled }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

## Testing

### Frontend Testing

- **Framework**: Vitest with React Testing Library
- **Coverage**: Aim for >80% code coverage
- **Test Files**: `*.test.tsx` or `*.test.ts`

```typescript
// Example test
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Backend Testing

- **Framework**: pytest
- **Coverage**: Aim for >80% code coverage
- **Test Files**: `test_*.py`

```python
# Example test
import pytest
from fastapi.testclient import TestClient
from dealbase_api.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

### Running Tests

```bash
# All tests
pnpm test

# Frontend only
cd apps/web && pnpm test

# Backend only
cd apps/api && pytest
```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Good
git commit -m "feat(auth): add user login functionality"
git commit -m "fix(api): resolve calculation error in valuation endpoint"
git commit -m "docs: update README with installation instructions"

# Bad
git commit -m "added stuff"
git commit -m "fix"
git commit -m "WIP"
```

## Development Commands

### Frontend (Next.js)

```bash
cd apps/web

# Development
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

### Backend (FastAPI)

```bash
cd apps/api

# Development
python -m uvicorn dealbase_api.main:app --reload

# Test
pytest

# Lint
ruff check .

# Format
black .

# Type check
mypy .
```

### Shared Package

```bash
cd packages/shared

# Build
pnpm build

# Type check
pnpm typecheck
```

## Getting Help

- **Documentation**: Check the [README](README.md) and code comments
- **Issues**: Search existing [GitHub Issues](https://github.com/your-org/dealbase/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/your-org/dealbase/discussions) for questions
- **Code Review**: Ask questions in PR comments

## Release Process

1. **Version Bump**: Update version numbers in package.json files
2. **Changelog**: Update CHANGELOG.md with new features and fixes
3. **Tag Release**: Create a git tag for the release
4. **Deploy**: Deploy to production environment

## Thank You

Thank you for contributing to DealBase! Your contributions help make commercial real estate valuation more accessible and efficient for everyone.

---

For questions or concerns, please reach out to the maintainers or open an issue.
