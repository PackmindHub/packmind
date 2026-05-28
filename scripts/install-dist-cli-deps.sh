#!/usr/bin/env sh
# Install the runtime dependencies of the bundled CLI inside dist/apps/cli.
#
# pnpm's strict node_modules layout no longer hoists the CLI's runtime deps to
# the workspace root, so the dist binary needs its own node_modules tree. To
# keep installs reproducible we copy the workspace pnpm-lock.yaml into the dist
# directory and install with --frozen-lockfile. A cmp short-circuit avoids
# re-installing when the lockfile already matches the one stored alongside the
# previous install.
set -e

DIST_DIR="dist/apps/cli"

if [ ! -d "$DIST_DIR" ]; then
  echo "[install-dist-cli-deps] $DIST_DIR not built yet — run 'nx run packmind-cli:build' first" >&2
  exit 1
fi

if [ -d "$DIST_DIR/node_modules" ] && [ -f "$DIST_DIR/pnpm-lock.yaml" ] && cmp -s pnpm-lock.yaml "$DIST_DIR/pnpm-lock.yaml"; then
  exit 0
fi

cp pnpm-lock.yaml "$DIST_DIR/pnpm-lock.yaml"
(cd "$DIST_DIR" && pnpm install --prod --ignore-scripts --frozen-lockfile --ignore-workspace)
