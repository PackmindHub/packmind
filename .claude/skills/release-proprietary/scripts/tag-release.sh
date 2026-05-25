#!/usr/bin/env bash
# Create the `release/<version>` tag in <repo-dir> and push it to origin.
#
# Usage: tag-release.sh <repo-dir> <version> [sha]
#
# If <sha> is provided, the tag is created at that exact commit. The
# commit's subject is verified before tagging — but for proprietary, the
# SHA we tag is a merge commit (subject "Merge remote-tracking branch
# 'upstream/main'") whose 2nd parent is the OSS release commit. So the
# check accepts EITHER:
#   - a commit whose subject is `chore: release <version>` (OSS side, or
#     a direct release commit), OR
#   - a merge commit whose 2nd parent's subject is `chore: release <version>`
#     (proprietary sync-merge of the OSS release).
# This safety net ensures we don't tag the wrong commit when the SHA is
# passed in by hand or by a partially recovered flow.
#
# If <sha> is omitted, the tag is created at HEAD (use on the OSS repo
# immediately after pushing the release commit, before any next-cycle commit).
# HEAD's subject must be exactly `chore: release <version>` in that case.

set -euo pipefail

REPO_DIR="${1:?usage: tag-release.sh <repo-dir> <version> [sha]}"
VERSION="${2:?usage: tag-release.sh <repo-dir> <version> [sha]}"
SHA_ARG="${3:-}"
TAG="release/${VERSION}"
EXPECTED_SUBJECT="chore: release ${VERSION}"

cd "${REPO_DIR}"

# Verify that <sha> is either the release commit itself OR a merge commit
# whose 2nd parent is the release commit. Returns 0 if OK, 1 otherwise,
# and prints a human-readable description of the match on success.
verify_release_target() {
  local sha=$1
  local actual_subject
  actual_subject=$(git log -1 --format='%s' "${sha}")
  if [ "${actual_subject}" = "${EXPECTED_SUBJECT}" ]; then
    echo "direct release commit"
    return 0
  fi
  # Maybe it's a merge commit whose 2nd parent is the release.
  local second_parent
  second_parent=$(git log -1 --format='%P' "${sha}" | awk '{print $2}')
  if [ -n "${second_parent}" ]; then
    local parent_subject
    parent_subject=$(git log -1 --format='%s' "${second_parent}")
    if [ "${parent_subject}" = "${EXPECTED_SUBJECT}" ]; then
      echo "merge commit (2nd parent ${second_parent:0:7} is the release)"
      return 0
    fi
  fi
  echo "neither subject \"${actual_subject}\" nor any merged parent matches \"${EXPECTED_SUBJECT}\""
  return 1
}

if [ -n "${SHA_ARG}" ]; then
  TARGET_SHA=$(git rev-parse --verify "${SHA_ARG}" 2>/dev/null || true)
  if [ -z "${TARGET_SHA}" ]; then
    echo "❌ ${REPO_DIR}: provided SHA '${SHA_ARG}' is not a valid object" >&2
    exit 1
  fi
  if ! MATCH_DESC=$(verify_release_target "${TARGET_SHA}"); then
    echo "❌ ${REPO_DIR}: ${TARGET_SHA:0:7} ${MATCH_DESC}" >&2
    exit 1
  fi
  echo "ℹ️  ${REPO_DIR}: ${TARGET_SHA:0:7} accepted — ${MATCH_DESC}"
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
