#!/usr/bin/env sh
# Install the runtime dependencies of the bundled CLI inside dist/apps/cli.
#
# pnpm's strict node_modules layout no longer hoists the CLI's runtime deps to
# the workspace root, so the dist binary needs its own node_modules tree. The
# workspace pnpm-lock.yaml cannot be reused here because --ignore-workspace
# makes pnpm compare against the workspace-root specifiers (not the CLI's),
# so we resolve fresh against the CLI's package.json.
#
# A short-circuit avoids re-installing when node_modules already exists.
set -e

DIST_DIR="dist/apps/cli"

if [ ! -d "$DIST_DIR" ]; then
  echo "[install-dist-cli-deps] $DIST_DIR not built yet — run 'nx run packmind-cli:build' first" >&2
  exit 1
fi

if [ -d "$DIST_DIR/node_modules" ]; then
  exit 0
fi

(cd "$DIST_DIR" && pnpm install --prod --ignore-scripts --no-frozen-lockfile --ignore-workspace)
