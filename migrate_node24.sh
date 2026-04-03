#!/usr/bin/env bash
set -e

echo "🚀 Migration Node 24 — Nettoyage du workspace"
echo "================================================"

# 1. Arrêter les containers Docker
echo ""
echo "⏹️  Arrêt des containers Docker..."
docker compose stop

# 2. Reset Nx (tant que node_modules et .nx existent encore)
echo ""
echo "🔄 Reset Nx..."
if [ -x ./node_modules/.bin/nx ]; then
  ./node_modules/.bin/nx reset
else
  echo "   ⚠️  nx introuvable, skip nx reset"
fi

# 3. Supprimer le cache et workspace data Nx
echo ""
echo "🗑️  Suppression du répertoire .nx..."
rm -rf .nx

# 4. Supprimer les artefacts de build
echo ""
echo "🗑️  Suppression des artefacts de build (dist/, docs/, tmp/)..."
rm -rf dist
rm -rf docs
rm -rf tmp

# 5. Supprimer les caches frontend (Vite, Storybook, tsbuildinfo, timestamp files)
echo ""
echo "🗑️  Suppression des caches frontend..."
find . -name ".vite" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +
find . -name ".cache" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +
find . -name "storybook-static" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +
find . -name ".docusaurus" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +
find . -name "*.tsbuildinfo" -type f -not -path "*/node_modules/*" -delete
find . -name "vite.config.*.timestamp*" -type f -not -path "*/node_modules/*" -delete
find . -name "vitest.config.*.timestamp*" -type f -not -path "*/node_modules/*" -delete

# 6. Supprimer les caches de test (coverage, test-results, SWC, Jest)
echo ""
echo "🗑️  Suppression des caches de test..."
find . -name "coverage" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +
find . -name "test-results" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +
find . -name ".swc" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +

# 7. Supprimer les fichiers générés à la racine
echo ""
echo "🗑️  Suppression des fichiers générés..."
rm -f graph.json
rm -f tsconfig.base.effective.json

# 8. Supprimer tous les node_modules récursivement
echo ""
echo "🗑️  Suppression de tous les node_modules..."
find . -name "node_modules" -type d -prune -exec rm -rf {} +

# 9. Supprimer le lock file pour repartir proprement
echo ""
echo "🗑️  Suppression du package-lock.json..."
rm -f package-lock.json

# 10. Installer et activer Node 24.14.0 via nvm
echo ""
echo "📦 Installation de Node 24.14.0..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 24.14.0
nvm use 24.14.0

# 11. Réinstaller les dépendances
echo ""
echo "📦 npm install..."
npm install

echo ""
echo "✅ Migration terminée ! Node version : $(node -v)"
