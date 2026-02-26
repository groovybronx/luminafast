#!/bin/bash
#
# Build WASM Module — Phase 4.2 Part B
# Compile le module WASM et le copie vers src/wasm/ pour intégration Vite
#

set -e

echo "🔧 Building WASM module..."
cd luminafast-wasm
wasm-pack build --target web --release

echo "📦 Copying WASM module to src/wasm/..."
mkdir -p ../src/wasm
cp pkg/* ../src/wasm/

echo "✅ WASM module built and copied successfully"
ls -lh ../src/wasm/
