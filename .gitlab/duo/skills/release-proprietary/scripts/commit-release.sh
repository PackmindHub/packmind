#!/usr/bin/env bash
# Stage the 4 release files in <repo-dir>, commit with the exact subject
# `chore: release <version>`, and push main to origin.
#
# Usage: commit-release.sh <repo-dir> <version>
#
# Never uses --no-verify. If a hook fails, fix the root cause and re-run.

set -euo pipefail

REPO_DIR="${1:?usage: commit-release.sh <repo-dir> <version>}"
VERSION="${2:?usage: commit-release.sh <repo-dir> <version>}"

FILES=(
  "package.json"
  "apps/api/docker-package.json"
  "package-lock.json"
  "CHANGELOG.MD"
)

cd "${REPO_DIR}"

for f in "${FILES[@]}"; do
  if [ ! -f "${f}" ]; then
    echo "❌ ${REPO_DIR}: expected release file is missing: ${f}" >&2
    exit 1
  fi
done

git add -- "${FILES[@]}"

if git diff --cached --quiet; then
  echo "❌ ${REPO_DIR}: nothing staged for release commit — did the bump/changelog scripts run?" >&2
  exit 1
fi

git commit -m "chore: release ${VERSION}"
git push origin main

echo "✅ ${REPO_DIR}: pushed release commit \"chore: release ${VERSION}\""
