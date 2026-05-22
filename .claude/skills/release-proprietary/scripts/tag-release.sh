#!/usr/bin/env bash
# Create the `release/<version>` tag in <repo-dir> and push it to origin.
#
# Usage: tag-release.sh <repo-dir> <version> [sha]
#
# If <sha> is provided, the tag is created at that exact commit AND the
# commit's subject is verified to equal `chore: release <version>` before
# tagging. This is essential on the proprietary side where the auto-sync
# workflow may have landed additional commits (e.g. "prepare next dev cycle")
# on top of the release commit by the time we tag — tagging HEAD would point
# `release/<version>` at the wrong code.
#
# If <sha> is omitted, the tag is created at HEAD (use on the OSS repo
# immediately after pushing the release commit, before any next-cycle commit).

set -euo pipefail

REPO_DIR="${1:?usage: tag-release.sh <repo-dir> <version> [sha]}"
VERSION="${2:?usage: tag-release.sh <repo-dir> <version> [sha]}"
SHA_ARG="${3:-}"
TAG="release/${VERSION}"
EXPECTED_SUBJECT="chore: release ${VERSION}"

cd "${REPO_DIR}"

if [ -n "${SHA_ARG}" ]; then
  TARGET_SHA=$(git rev-parse --verify "${SHA_ARG}" 2>/dev/null || true)
  if [ -z "${TARGET_SHA}" ]; then
    echo "❌ ${REPO_DIR}: provided SHA '${SHA_ARG}' is not a valid object" >&2
    exit 1
  fi
  ACTUAL_SUBJECT=$(git log -1 --format='%s' "${TARGET_SHA}")
  if [ "${ACTUAL_SUBJECT}" != "${EXPECTED_SUBJECT}" ]; then
    echo "❌ ${REPO_DIR}: commit ${TARGET_SHA:0:7} subject is \"${ACTUAL_SUBJECT}\", expected \"${EXPECTED_SUBJECT}\"" >&2
    exit 1
  fi
else
  TARGET_SHA=$(git rev-parse HEAD)
  ACTUAL_SUBJECT=$(git log -1 --format='%s' HEAD)
  if [ "${ACTUAL_SUBJECT}" != "${EXPECTED_SUBJECT}" ]; then
    echo "❌ ${REPO_DIR}: HEAD subject is \"${ACTUAL_SUBJECT}\", expected \"${EXPECTED_SUBJECT}\"" >&2
    echo "   Refusing to tag a commit that isn't the release commit." >&2
    exit 1
  fi
fi

if git rev-parse --verify --quiet "refs/tags/${TAG}" >/dev/null; then
  EXISTING_SHA=$(git rev-parse "refs/tags/${TAG}")
  if [ "${EXISTING_SHA}" != "${TARGET_SHA}" ]; then
    echo "❌ ${REPO_DIR}: tag ${TAG} already exists at ${EXISTING_SHA:0:7}, refusing to retag at ${TARGET_SHA:0:7}" >&2
    exit 1
  fi
  echo "ℹ️  ${REPO_DIR}: tag ${TAG} already exists at target — skipping creation"
else
  git tag "${TAG}" "${TARGET_SHA}"
fi

git push origin "${TAG}"

echo "✅ ${REPO_DIR}: pushed tag ${TAG} at ${TARGET_SHA:0:7}"
