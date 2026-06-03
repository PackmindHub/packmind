#!/usr/bin/env bash
# Post-clone setup for a Michel run. Idempotent — safe to re-run. Run from
# anywhere; it cds to the repo root itself.
#
# Consolidates the steps a fresh clone needs before any nx/tsc command works:
#   1. Install dependencies (npm ci, lockfile-exact; fall back to npm install).
#   2. Generate tsconfig.base.effective.json — the edition-specific effective
#      tsconfig that nx/tsc/chakra extend. It is gitignored (generated), so a
#      fresh clone has none and lint/test/build fail with
#      "Cannot find base config file ../../tsconfig.base.effective.json"
#      until this runs.
#   3. Install the Michel skills + sprite compose overrides.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"
export PACKMIND_EDITION="${PACKMIND_EDITION:-oss}"

# 1. Dependencies
if [ -f package.json ]; then
  echo "📦 Installing dependencies (npm ci)..."
  npm ci || npm install
else
  echo "No package.json — skipping dependency install."
fi

# 2. Effective tsconfig (required by nx/tsc/chakra)
echo "📝 Generating tsconfig.base.effective.json (PACKMIND_EDITION=${PACKMIND_EDITION})..."
node scripts/select-tsconfig.mjs

# 3. Michel skills + sprite compose overrides
if [ -f scripts/install-michel-skills.sh ]; then
  bash scripts/install-michel-skills.sh
else
  echo "No scripts/install-michel-skills.sh — skipping skill install."
fi

echo "✅ Michel setup complete."
