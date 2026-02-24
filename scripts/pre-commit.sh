#!/bin/bash
# Pre-commit hook for LuminaFast
# Runs formatting and linting checks before allowing commit

set -e

echo "🔍 Running pre-commit checks..."

# Check if this is a merge commit
if git rev-parse -q --verify MERGE_HEAD > /dev/null; then
    echo "⚠️  Merge commit detected, skipping pre-commit hooks"
    exit 0
fi

# Get list of staged files
STAGED_RS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.rs$' || true)
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

# Rust checks (only if Rust files are staged)
if [ -n "$STAGED_RS_FILES" ]; then
    echo "📝 Checking Rust formatting..."
    cd src-tauri

    # Format Rust code
    cargo fmt --all

    # Run Clippy
    echo "🔍 Running Clippy..."
    cargo clippy --lib -- -D warnings -A dead_code -A unused_variables

    cd ..

    # Re-stage formatted Rust files
    echo "$STAGED_RS_FILES" | xargs git add
fi

# TypeScript checks (only if TS files are staged)
if [ -n "$STAGED_TS_FILES" ]; then
    echo "📝 Checking TypeScript formatting..."
    npx prettier --write $STAGED_TS_FILES

    echo "🔍 Running ESLint..."
    npx eslint $STAGED_TS_FILES --fix

    # Re-stage formatted TS files
    echo "$STAGED_TS_FILES" | xargs git add
fi

# Type check
if [ -n "$STAGED_TS_FILES" ]; then
    echo "🔍 Running type check..."
    npm run type-check
fi

echo "✅ Pre-commit checks passed!"
exit 0
