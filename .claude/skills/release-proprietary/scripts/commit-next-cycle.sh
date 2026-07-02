#!/usr/bin/env bash
# Stage CHANGELOG.MD in <repo-dir>, commit with the exact subject
# `chore: prepare next development cycle`, and push main to origin.
#
# Usage: commit-next-cycle.sh <repo-dir>

set -euo pipefail

REPO_DIR="${1:?usage: commit-next-cycle.sh <repo-dir>}"

cd "${REPO_DIR}"

git add -- CHANGELOG.MD

if git diff --cached --quiet; then
  echo "❌ ${REPO_DIR}: nothing staged for next-cycle commit — did changelog-next.mjs run?" >&2
  exit 1
fi

git commit -m "chore: prepare next development cycle"
git push origin main

echo "✅ ${REPO_DIR}: pushed \"chore: prepare next development cycle\""
