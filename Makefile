# LuminaFast — Makefile pour automatisation des tâches de développement

.PHONY: help install dev build test clean lint fix fmt check-all

# Par défaut : afficher l'aide
help:
	@echo "LuminaFast — Commandes disponibles:"
	@echo ""
	@echo "Installation & Setup:"
	@echo "  make install        Install dependencies (npm + cargo)"
	@echo "  make setup-hooks    Setup git pre-commit hooks"
	@echo ""
	@echo "Development:"
	@echo "  make dev            Start development server (Tauri)"
	@echo "  make build          Build frontend & backend"
	@echo "  make test           Run all tests (frontend + backend)"
	@echo ""
	@echo "Linting & Formatting:"
	@echo "  make lint           Run all linters (TypeScript + Rust)"
	@echo "  make fix            Auto-fix linting issues"
	@echo "  make fmt            Format all code (Prettier + rustfmt)"
	@echo "  make fmt-check      Check formatting without modifying"
	@echo ""
	@echo "Rust specific:"
	@echo "  make rust-fmt       Format Rust code"
	@echo "  make rust-clippy    Run Clippy linter"
	@echo "  make rust-test      Run Rust tests"
	@echo "  make rust-fix       Auto-fix Rust code (fmt + clippy --fix)"
	@echo ""
	@echo "Verification:"
	@echo "  make check-all      Run all checks (format + lint + tests)"
	@echo "  make ci             Run CI pipeline locally"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          Remove build artifacts"

# Installation
install:
	@echo "📦 Installing npm dependencies..."
	npm ci
	@echo "📦 Installing Rust dependencies..."
	cd src-tauri && cargo build
	@echo "✅ Installation complete"

setup-hooks:
	@echo "🔗 Setting up git hooks..."
	@if [ -f .git ]; then \
		GIT_DIR=$$(cat .git | sed 's/gitdir: //'); \
		mkdir -p "$$GIT_DIR/hooks"; \
		cp scripts/pre-commit "$$GIT_DIR/hooks/pre-commit"; \
		chmod +x "$$GIT_DIR/hooks/pre-commit"; \
	elif [ -d .git ]; then \
		mkdir -p .git/hooks; \
		cp scripts/pre-commit .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
	else \
		echo "❌ Error: .git not found"; \
		exit 1; \
	fi
	@echo "✅ Git hooks installed"

# Development
dev:
	npm run tauri:dev

build:
	@echo "🏗️  Building frontend..."
	npm run build
	@echo "🏗️  Building Tauri app..."
	npm run tauri:build
	@echo "✅ Build complete"

test:
	@echo "🧪 Running frontend tests..."
	npm run test:run
	@echo "🧪 Running Rust tests..."
	cd src-tauri && cargo test
	@echo "✅ All tests passed"

# Linting & Formatting
lint:
	@echo "🔍 Linting TypeScript..."
	npm run lint
	@echo "🔍 Checking Rust formatting..."
	npm run rust:fmt-check
	@echo "🔍 Running Clippy..."
	npm run rust:clippy
	@echo "✅ All linting passed"

fix:
	@echo "🔧 Fixing TypeScript..."
	npm run lint:fix
	npm run format
	@echo "🔧 Fixing Rust..."
	npm run rust:fix
	@echo "✅ Auto-fix complete"

fmt:
	@echo "✨ Formatting TypeScript..."
	npm run format
	@echo "✨ Formatting Rust..."
	npm run rust:fmt
	@echo "✅ Formatting complete"

fmt-check:
	@echo "🔍 Checking TypeScript formatting..."
	npx prettier --check "src/**/*.{ts,tsx}"
	@echo "🔍 Checking Rust formatting..."
	npm run rust:fmt-check
	@echo "✅ Format check passed"

# Rust specific
rust-fmt:
	cd src-tauri && cargo fmt --all

rust-clippy:
	cd src-tauri && cargo clippy --lib -- -D warnings -A dead_code -A unused_variables

rust-test:
	cd src-tauri && cargo test

rust-fix:
	cd src-tauri && cargo fmt --all
	cd src-tauri && cargo clippy --lib --fix --allow-dirty --allow-staged

# Verification
check-all:
	@echo "🚀 Running all checks..."
	@$(MAKE) fmt-check
	@$(MAKE) lint
	@$(MAKE) test
	@echo "✅ All checks passed! Ready to commit."

ci:
	@echo "🔄 Running CI pipeline locally..."
	@$(MAKE) fmt-check
	@$(MAKE) lint
	@npm run type-check
	@$(MAKE) test
	@$(MAKE) build
	@echo "✅ CI pipeline passed!"

# Cleanup
clean:
	@echo "🧹 Cleaning build artifacts..."
	npm run clean
	@echo "✅ Cleanup complete"
