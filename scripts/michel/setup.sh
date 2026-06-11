#!/usr/bin/env bash
# Post-clone setup for a Michel run. Idempotent — safe to re-run. Run from
# anywhere; it cds to the repo root itself.
#
# Consolidates the steps a fresh clone needs before any nx/tsc command works:
#   1. Install dependencies (pnpm install --frozen-lockfile --prefer-offline).
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

# Pinned pnpm version — keep in sync with package.json `packageManager` (pnpm@11.5.0).
# Overridable via env; the default satisfies `set -u` (nounset) below.
PNPM_VERSION="${PNPM_VERSION:-11.5.0}"

# 0a. Install/activate pnpm. Prefer corepack (ships with Node); fall back to a
#    global npm install if corepack is unavailable or refuses to activate.
echo "==> Installing pnpm@${PNPM_VERSION}"
if command -v corepack >/dev/null 2>&1 && corepack enable 2>/dev/null; then
  corepack prepare "pnpm@${PNPM_VERSION}" --activate
elif command -v pnpm >/dev/null 2>&1; then
  echo "    corepack unavailable — using already-installed pnpm $(pnpm --version)"
else
  echo "    corepack unavailable — installing pnpm globally via npm"
  npm install -g "pnpm@${PNPM_VERSION}"
fi

# Verify pnpm is callable before proceeding
if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm is not on PATH after install. Aborting." >&2
  exit 1
fi
echo "    pnpm $(pnpm --version) ready"

# 0c. Pin the content-addressable store OUTSIDE the checkout. Without a proper
#     pnpm home, pnpm falls back to an in-repo .pnpm-store/ holding 80k+ files,
#     which makes IDEs (WebStorm/IntelliJ) index/watch them and crash.
PNPM_STORE_DIR="${PNPM_STORE_DIR:-$HOME/.pnpm-store}"
echo "==> Pinning pnpm store -> ${PNPM_STORE_DIR}"
# On a machine that never ran `pnpm setup`, the global bin dir isn't on PATH and
# `pnpm config set --global` aborts. Putting it on PATH for this one call lets the
# write succeed regardless.
PATH="${HOME}/Library/pnpm/bin:${HOME}/.local/share/pnpm:${PATH}" \
  pnpm config set --global store-dir "$PNPM_STORE_DIR" >/dev/null 2>&1 || true
echo "    store-dir = $(pnpm config get store-dir)"

# 1. Dependencies
if [ -f package.json ]; then
  echo "📦 Installing dependencies (pnpm install)..."
  pnpm install --frozen-lockfile --prefer-offline
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
