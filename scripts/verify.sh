#!/usr/bin/env bash
set -e

# Script de vérification & build unifié pour CTR Wargame Builder
# Exécute la suite complète : Tests .NET + Typecheck TS + Build Vite + Sync wwwroot

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=================================================="
echo "⚡ [1/4] Exécution des tests unitaires backend (.NET 10)"
echo "=================================================="
~/.dotnet/dotnet test tests/CtrWargameBuilder.Domain.Tests/CtrWargameBuilder.Domain.Tests.csproj --nologo -v minimal

echo ""
echo "=================================================="
echo "🔍 [2/4] Vérification du typage TypeScript (vue-tsc)"
echo "=================================================="
cd "$ROOT_DIR/frontend"
bash dev-env.sh node node_modules/vue-tsc/bin/vue-tsc.js -b

echo ""
echo "=================================================="
echo "📦 [3/4] Compilation du bundle Frontend (Vite)"
echo "=================================================="
bash dev-env.sh node node_modules/vite/bin/vite.js build

echo ""
echo "=================================================="
echo "🚀 [4/4] Déploiement du bundle vers Api wwwroot"
echo "=================================================="
rm -rf "$ROOT_DIR/src/CtrWargameBuilder.Api/wwwroot"/*
cp -r "$ROOT_DIR/frontend/dist"/* "$ROOT_DIR/src/CtrWargameBuilder.Api/wwwroot/"

echo ""
echo "✅ SUCCÈS : Tests 100% verts, TypeScript validé, frontend déployé dans wwwroot !"
