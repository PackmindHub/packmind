#!/usr/bin/env sh
# Install the runtime dependencies of the bundled CLI inside dist/apps/cli.
#
# pnpm's strict node_modules layout no longer hoists the CLI's runtime deps to
# the workspace root, so the dist binary needs its own node_modules tree. The
# workspace pnpm-lock.yaml cannot be reused here because --ignore-workspace
# makes pnpm compare against the workspace-root specifiers (not the CLI's),
# so we resolve fresh against the CLI's package.json.
#
# To avoid serving a stale dependency tree, we fingerprint the CLI package.json
# and only short-circuit when an existing node_modules was installed from the
# exact same manifest. Any change to the CLI's deps invalidates the cache and
# triggers a fresh install. (Full lockfile pinning is not achievable here given
# the --ignore-workspace constraint above; CI runners rebuild from scratch.)
set -e

DIST_DIR="dist/apps/cli"

if [ ! -d "$DIST_DIR" ]; then
  echo "[install-dist-cli-deps] $DIST_DIR not built yet — run 'nx run packmind-cli:build' first" >&2
  exit 1
fi

PKG_JSON="$DIST_DIR/package.json"
HASH_FILE="$DIST_DIR/node_modules/.deps-hash"

# Fingerprint the manifest with node (always available in this repo) so the
# check is portable across alpine/macOS/Windows runners.
CURRENT_HASH="$(node -e "process.stdout.write(require('crypto').createHash('sha256').update(require('fs').readFileSync('$PKG_JSON')).digest('hex'))")"

if [ -d "$DIST_DIR/node_modules" ] && [ -f "$HASH_FILE" ] && [ "$(cat "$HASH_FILE")" = "$CURRENT_HASH" ]; then
  exit 0
fi

(cd "$DIST_DIR" && pnpm install --prod --ignore-scripts --no-frozen-lockfile --ignore-workspace)
printf '%s' "$CURRENT_HASH" > "$HASH_FILE"
