#!/usr/bin/env bash
# Installs the Michel-only skills (kept under scripts/michel/ so they are not
# auto-loaded as active skills) into .claude/skills/ so the Michel agent can use
# them at runtime. Idempotent — safe to re-run. Copies, never moves.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/scripts/michel"
DEST="${ROOT}/.claude/skills"

[ -d "${SRC}" ] || { echo "No scripts/michel — nothing to install."; exit 0; }

mkdir -p "${DEST}"
shopt -s nullglob
for d in "${SRC}"/michel-*/; do
  name="$(basename "$d")"
  rm -rf "${DEST}/${name}"
  cp -R "$d" "${DEST}/${name}"
  echo "  installed skill ${name}"
done
echo "✅ Michel skills installed into .claude/skills/"

# Place the compose override at the repo root so docker compose picks it up
# automatically (disabled exec-based healthchecks + the warm-store offline install).
if [ -f "${SRC}/docker-compose.override.yml" ]; then
  cp "${SRC}/docker-compose.override.yml" "${ROOT}/docker-compose.override.yml"
  echo "✅ docker-compose.override.yml installed at repo root"
fi

# Same for the LOCAL production-like stack (dockerfile/local/docker-compose.yaml,
# started by docker-local.sh). docker-local.sh uses an explicit `-f`, which
# disables auto-detection — it includes this override itself when present.
if [ -f "${SRC}/docker-compose.local.override.yaml" ]; then
  cp "${SRC}/docker-compose.local.override.yaml" "${ROOT}/dockerfile/local/docker-compose.override.yaml"
  echo "✅ docker-compose.override.yaml installed at dockerfile/local/"
fi

# Place the MCP server config at the repo root so Claude Code picks it up.
# The root .mcp.json is gitignored; this is the tracked source of truth.
if [ -f "${SRC}/.mcp.json" ]; then
  cp "${SRC}/.mcp.json" "${ROOT}/.mcp.json"
  echo "✅ .mcp.json installed at repo root"
fi
