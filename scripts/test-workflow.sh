#!/bin/bash

# Test Workflow Script
# Simule les étapes du workflow GitHub Actions en local
# Usage: ./scripts/test-workflow.sh [frontend|backend|all]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Fonctions
print_section() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

run_frontend() {
  print_section "🎨 FRONTEND TESTS"
  
  echo -e "${YELLOW}Type checking...${NC}"
  npm run type-check
  
  echo -e "${YELLOW}Linting...${NC}"
  npm run lint
  
  echo -e "${YELLOW}Running tests...${NC}"
  npm run test:ci
  
  echo -e "${YELLOW}Building...${NC}"
  npm run build
  
  echo -e "${GREEN}✅ Frontend tests passed${NC}"
}

run_backend() {
  print_section "🔧 BACKEND TESTS"
  
  cd src-tauri
  
  echo -e "${YELLOW}Format checking...${NC}"
  cargo fmt --all -- --check
  
  echo -e "${YELLOW}Clippy linting...${NC}"
  cargo clippy --all-targets --all-features -- -D warnings -A dead_code -A unused_variables
  
  echo -e "${YELLOW}Building...${NC}"
  cargo build --verbose
  
  echo -e "${YELLOW}Running tests...${NC}"
  cargo test -- --ignored
  
  cd ..
  
  echo -e "${GREEN}✅ Backend tests passed${NC}"
}

run_all() {
  run_frontend
  run_backend
}

# Main
case "${1:-all}" in
  frontend)
    run_frontend
    ;;
  backend)
    run_backend
    ;;
  all)
    run_all
    ;;
  *)
    echo -e "${RED}Usage: $0 [frontend|backend|all]${NC}"
    echo ""
    echo "Examples:"
    echo "  ./scripts/test-workflow.sh              # Run all tests"
    echo "  ./scripts/test-workflow.sh frontend     # Run frontend only"
    echo "  ./scripts/test-workflow.sh backend      # Run backend only"
    exit 1
    ;;
esac

print_section "🎉 All Checks Passed!"
echo -e "${GREEN}Ready to commit or push!${NC}\n"
