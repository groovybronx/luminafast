#!/bin/bash
#
# Build WASM Module — Phase 4.2 Part B
# Compile le module WASM et le copie vers src/wasm/ pour intégration Vite
#

set -e

echo "🔧 Building WASM module..."
cd luminafast-wasm
wasm-pack build --target web --release



echo "✅ WASM module built  successfully"

