# CI/CD Pipeline Documentation

## Overview

The AI File Organizer project uses a comprehensive CI/CD pipeline built with GitHub Actions to ensure code quality, run tests, and automate deployments across multiple platforms.

## Pipeline Structure

### 🔄 Workflow Triggers

The CI/CD pipeline runs on:
- **Push** to `main` or `develop` branches
- **Pull Requests** targeting `main` or `develop` branches

### 🧪 Test Jobs

#### 1. Frontend Tests (`frontend-tests`)
- **Node.js 18** environment
- **TypeScript type checking** (`npm run type-check`)
- **ESLint linting** (`npm run lint`)
- **Unit tests with Vitest** (`npm test`)
- **Frontend build** (`npm run build`)
- **Test artifact uploads** (coverage reports)

#### 2. Backend Tests (`backend-tests`)
- **Rust stable toolchain**
- **System dependencies** for Ubuntu (WebKit, AppIndicator, etc.)
- **Cargo tests** (`cargo test`)
- **Clippy linting** (`cargo clippy`)
- **Format checking** (`cargo fmt`)
- **Dependency caching** for faster builds

#### 3. E2E Tests (`e2e-tests`)
- **Playwright browser installation**
- **Full application build** (frontend + backend)
- **End-to-end test execution** (`npm run test:e2e`)
- **Test result artifacts** (reports, screenshots)
- **Depends on**: `frontend-tests` and `backend-tests`

### 🔐 Security & Quality (`security-audit`)
- **npm audit** for Node.js dependencies
- **cargo-audit** for Rust dependencies
- **Continues on errors** (informational only)

### 🏗️ Cross-Platform Builds (`build-matrix`)
- **Matrix strategy** across:
  - macOS (latest)
  - Ubuntu (latest) 
  - Windows (latest)
- **Platform-specific dependencies**
- **Release builds** for all platforms
- **Build artifact uploads**
- **Depends on**: `frontend-tests` and `backend-tests`

### 🚀 Deployment (`deploy`)
- **Only runs on**: `main` branch pushes
- **GitHub Releases** for tagged versions
- **Cross-platform artifacts** distribution
- **Depends on**: All previous jobs

## Local Development Integration

### Pre-commit Hooks Setup

```bash
# Install dependencies
npm ci

# Run all checks locally (matches CI)
npm run type-check    # TypeScript
npm run lint          # ESLint
npm test              # Unit tests
npm run test:rust     # Rust tests
npm run test:e2e      # E2E tests
npm run build         # Production build
```

### Script Commands

| Command | Description | CI Usage |
|---------|-------------|----------|
| `npm run type-check` | TypeScript type checking | ✅ Frontend Tests |
| `npm run lint` | ESLint code linting | ✅ Frontend Tests |
| `npm test` | Vitest unit tests | ✅ Frontend Tests |
| `npm run test:e2e` | Playwright E2E tests | ✅ E2E Tests |
| `npm run test:rust` | Cargo tests | ✅ Backend Tests |
| `npm run build` | Production build | ✅ All Build Jobs |

## Artifact Management

### 📊 Test Results
- **Unit test coverage** reports
- **E2E test reports** and screenshots
- **Playwright HTML** reports

### 📦 Build Artifacts
- **Cross-platform** executables
- **Frontend** distribution files
- **Release** binaries

### 🔍 Quality Reports
- **Security audit** results
- **Linting** reports
- **Type checking** outputs

## Branch Strategy

### Main Branch (`main`)
- **Production-ready** code only
- **Full CI pipeline** + deployment
- **Protected branch** with required checks
- **Automatic releases** on tags

### Development Branch (`develop`)
- **Feature integration** branch
- **Full CI pipeline** (no deployment)
- **Merge target** for feature branches

### Feature Branches (`feature/*`)
- **Pull request** workflow
- **Full CI validation** required
- **Squash merge** to develop

## Status Badges

Add these badges to your README.md:

```markdown
[![CI/CD Pipeline](https://github.com/yourusername/ai-file-organizer/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ai-file-organizer/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/yourusername/ai-file-organizer/ci.yml?label=tests)](https://github.com/yourusername/ai-file-organizer/actions)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/yourusername/ai-file-organizer/actions)
```

## Performance Optimizations

### 🚀 Caching Strategy
- **Node.js dependencies** cached by package-lock.json hash
- **Rust dependencies** cached by Cargo.lock hash
- **Playwright browsers** cached automatically

### ⚡ Parallel Execution
- **Independent jobs** run in parallel
- **Matrix builds** for cross-platform efficiency
- **Dependency management** prevents unnecessary waits

### 📈 Build Time Optimization
- **Incremental compilation** for Rust
- **npm ci** for faster, reliable installs
- **Artifact reuse** between jobs

## Troubleshooting

### Common Issues

#### ❌ TypeScript Errors
```bash
# Fix locally
npm run type-check
npm run lint:fix
```

#### ❌ Test Failures
```bash
# Run tests locally
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:rust          # Rust tests
```

#### ❌ Build Failures
```bash
# Clean build
rm -rf node_modules dist
npm ci
npm run build
```

### CI-Specific Debugging

#### Check Job Logs
1. Go to **Actions** tab in GitHub
2. Select failing **workflow run**
3. Click on **failed job**
4. Expand **step logs** for details

#### Artifact Downloads
1. **Test results** available as artifacts
2. **Build outputs** for debugging
3. **Coverage reports** for analysis

## Security Considerations

### 🔒 Secrets Management
- **GITHUB_TOKEN** automatically provided
- **Additional secrets** via repository settings
- **Environment-specific** variables

### 🛡️ Dependency Auditing
- **Automated security** scanning
- **Vulnerability reporting** 
- **Regular updates** recommended

### 🚫 Sensitive Data
- **No credentials** in code
- **Environment variables** for configuration
- **Audit logs** for compliance

## Maintenance

### 📅 Regular Updates
- **GitHub Actions** versions
- **Node.js** LTS versions
- **Rust toolchain** updates
- **Dependencies** security patches

### 📊 Monitoring
- **Build success** rates tracking
- **Test coverage** maintenance
- **Performance** regression monitoring

This CI/CD pipeline ensures consistent code quality, comprehensive testing, and reliable deployments across all supported platforms.