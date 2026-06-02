#!/usr/bin/env bash
#
# One-shot local migration of a developer checkout from npm to pnpm.
#
# Safe to re-run. Run from the repo root:
#
#   ./pnpm_migrate.sh
#
# What it does:
#   1. Verifies the active Node version matches .nvmrc
#   2. Activates the pinned pnpm version via corepack
#   3. Pins the pnpm store outside the checkout (keeps IDEs from indexing 80k+ files)
#   4. Removes stale npm artifacts (package-lock.json + all node_modules)
#   5. Installs dependencies with pnpm against the committed lockfile
#   6. Regenerates the effective tsconfig (PACKMIND_EDITION=oss)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PNPM_VERSION="11.5.0"

echo "==> Packmind npm -> pnpm migration"

# 1. Node version sanity check (we don't call nvm: it's a shell function, not
#    invocable from a script — we just warn so the dev fixes it themselves).
EXPECTED_NODE="$(tr -d 'v[:space:]' < .nvmrc 2>/dev/null || true)"
CURRENT_NODE="$(node -v 2>/dev/null | tr -d 'v' || true)"
if [ -n "$EXPECTED_NODE" ] && [ "$CURRENT_NODE" != "$EXPECTED_NODE" ]; then
  echo "WARNING: Node $CURRENT_NODE is active but the repo expects $EXPECTED_NODE." >&2
  echo "         Run 'nvm use' (or install Node $EXPECTED_NODE) before continuing." >&2
fi

# 2. Install/activate pnpm. Prefer corepack (ships with Node); fall back to a
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

# 2b. Pin the content-addressable store OUTSIDE the checkout. Without a proper
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

# 3. Remove npm artifacts (root lockfile + every node_modules in the workspace)
echo "==> Removing stale npm artifacts (package-lock.json, node_modules)"
rm -f package-lock.json
find . -name node_modules -type d -prune -exec rm -rf '{}' +
rm -rf .pnpm-store   # stray in-repo store from an earlier pnpm fallback

# 4. Install with pnpm
echo "==> Installing dependencies with pnpm"
if ! pnpm install --frozen-lockfile; then
  echo "WARNING: frozen-lockfile install failed (lockfile drift?)." >&2
  echo "         Retrying with a lockfile update — commit pnpm-lock.yaml if it changes." >&2
  pnpm install
fi

# 5. Regenerate the effective tsconfig
echo "==> Selecting tsconfig (PACKMIND_EDITION=${PACKMIND_EDITION:-oss})"
PACKMIND_EDITION="${PACKMIND_EDITION:-oss}" node scripts/select-tsconfig.mjs

echo ""
echo "==> Done. Start the stack with:"
echo "      docker compose --profile=dev up"
