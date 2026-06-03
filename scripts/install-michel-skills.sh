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
# automatically. Disables exec-based healthchecks blocked by the sprite sandbox.
if [ -f "${SRC}/docker-compose.override.yml" ]; then
  cp "${SRC}/docker-compose.override.yml" "${ROOT}/docker-compose.override.yml"
  echo "✅ docker-compose.override.yml installed at repo root"
fi
