#!/usr/bin/env bash
set -e

echo "🚀 Migration Node 24 — Nettoyage du workspace"
echo "================================================"

# 1. Arrêter les containers Docker
echo ""
echo "⏹️  Arrêt des containers Docker..."
docker compose stop

# 2. Supprimer le cache Nx
echo ""
echo "🗑️  Suppression du répertoire .nx..."
rm -rf .nx

# 3. Reset Nx (tant que node_modules existe encore)
echo ""
echo "🔄 Reset Nx..."
./node_modules/.bin/nx reset

# 4. Supprimer le dossier dist
echo ""
echo "🗑️  Suppression du dossier dist..."
rm -rf dist

# 5. Supprimer les caches frontend (Vite, Storybook, tsbuildinfo)
echo ""
echo "🗑️  Suppression des caches frontend..."
find . -name ".vite" -type d -prune -exec rm -rf {} +
find . -name ".cache" -type d -prune -exec rm -rf {} +
find . -name "storybook-static" -type d -prune -exec rm -rf {} +
find . -name "*.tsbuildinfo" -type f -delete

# 6. Supprimer tous les node_modules récursivement
echo ""
echo "🗑️  Suppression de tous les node_modules..."
find . -name "node_modules" -type d -prune -exec rm -rf {} +

# 7. Installer et activer Node 24.14.0 via nvm
echo ""
echo "📦 Installation de Node 24.14.0..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 24.14.0
nvm use 24.14.0

# 8. Réinstaller les dépendances
echo ""
echo "📦 npm install..."
npm install

echo ""
echo "✅ Migration terminée ! Node version : $(node -v)"
