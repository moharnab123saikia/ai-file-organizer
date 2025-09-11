#!/bin/bash

# CI Validation Script
# Runs the same checks as the CI pipeline locally for fast feedback

set -e  # Exit on any error

echo "🚀 AI File Organizer - CI Validation Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    print_error "Please run this script from the ai-file-organizer root directory"
    exit 1
fi

# Track overall success
OVERALL_SUCCESS=true

# Function to run command with status tracking
run_check() {
    local name="$1"
    local command="$2"
    
    print_status "Running: $name"
    
    if eval "$command"; then
        print_success "$name passed"
        return 0
    else
        print_error "$name failed"
        OVERALL_SUCCESS=false
        return 1
    fi
}

echo "📋 Pre-flight Checks"
echo "-------------------"

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js version: $NODE_VERSION"
else
    print_error "Node.js not found"
    exit 1
fi

# Check Rust version
if command -v cargo >/dev/null 2>&1; then
    RUST_VERSION=$(cargo --version)
    print_success "Rust version: $RUST_VERSION"
else
    print_error "Rust/Cargo not found"
    exit 1
fi

echo ""
echo "🔧 Installing Dependencies"
echo "-------------------------"
run_check "Installing Node.js dependencies" "npm ci"

echo ""
echo "🧪 Frontend Tests & Checks"
echo "--------------------------"
run_check "TypeScript type checking" "npm run type-check"
run_check "ESLint linting" "npm run lint"
run_check "Unit tests (Vitest)" "npm test -- --run --reporter=verbose"
run_check "Frontend build" "npm run build"

echo ""
echo "🦀 Rust Backend Tests & Checks"
echo "------------------------------"
run_check "Rust tests" "(cd src-tauri && cargo test --verbose)"
run_check "Rust linting (Clippy)" "(cd src-tauri && cargo clippy -- -W clippy::all -W clippy::pedantic -A unused -A dead_code)"
run_check "Rust formatting check" "(cd src-tauri && cargo fmt -- --check)"

echo ""
echo "🎭 E2E Tests"
echo "-----------"
print_status "Installing Playwright browsers (if needed)"
if npx playwright install --with-deps; then
    print_success "Playwright browsers ready"
else
    print_warning "Playwright browser installation had issues (continuing anyway)"
fi

# Note: E2E tests require the application to be running
print_warning "E2E tests skipped in validation script (require running application)"
print_status "To run E2E tests manually: npm run test:e2e"

echo ""
echo "🔒 Security Audits"
echo "------------------"
print_status "Running npm security audit"
if npm audit --audit-level=high; then
    print_success "No high-severity npm vulnerabilities found"
else
    print_warning "npm audit found issues (check output above)"
fi

print_status "Running Rust security audit"
if command -v cargo-audit >/dev/null 2>&1; then
    if (cd src-tauri && cargo audit); then
        print_success "No Rust security vulnerabilities found"
    else
        print_warning "Rust audit found issues (check output above)"
    fi
else
    print_warning "cargo-audit not installed (run: cargo install cargo-audit)"
fi

echo ""
echo "📊 Final Results"
echo "================"

if [ "$OVERALL_SUCCESS" = true ]; then
    print_success "🎉 All CI checks passed! Your code is ready for CI/CD pipeline."
    echo ""
    echo "Next steps:"
    echo "  1. Commit your changes: git add . && git commit -m 'Your message'"
    echo "  2. Push to trigger CI: git push origin your-branch"
    echo "  3. Create pull request if needed"
    echo ""
    exit 0
else
    print_error "❌ Some CI checks failed. Please fix the issues above before pushing."
    echo ""
    echo "Common fixes:"
    echo "  - TypeScript errors: Fix type issues in your code"
    echo "  - Linting errors: Run 'npm run lint:fix' to auto-fix some issues"
    echo "  - Test failures: Check test output and fix failing tests"
    echo "  - Rust errors: Fix Rust code issues in src-tauri/"
    echo ""
    exit 1
fi