#!/usr/bin/env bash
# Verify there is no open `oss-sync` PR on the proprietary repository.
#
# Background: the sync-from-oss-repository workflow fast-forwards OSS commits
# onto proprietary main when there are no conflicts. When conflicts occur, it
# pushes branch `oss-sync` and opens a PR for manual review instead. If such
# a PR is open when we run a release, Phase 2 polling will never find the
# release commit on origin/main and will time out.
#
# Usage: check-oss-sync-pr.sh <owner/repo>
# Exit codes:
#   0 - no open oss-sync PR
#   1 - open oss-sync PR found (PR details printed to stderr)
#   2 - gh CLI / auth issue

set -euo pipefail

REPO="${1:?usage: check-oss-sync-pr.sh <owner/repo>}"

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI not found in PATH" >&2
  exit 2
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh is not authenticated — run \`gh auth login\` first" >&2
  exit 2
fi

PR_JSON=$(gh pr list \
  --repo "${REPO}" \
  --head oss-sync \
  --state open \
  --json number,url,title)

COUNT=$(echo "${PR_JSON}" | jq 'length')

if [ "${COUNT}" -gt 0 ]; then
  echo "❌ ${REPO}: an open oss-sync PR is blocking the auto-sync — resolve it before releasing." >&2
  echo "${PR_JSON}" | jq -r '.[] | "   - PR #\(.number) \(.title) — \(.url)"' >&2
  exit 1
fi

echo "✅ ${REPO}: no open oss-sync PR"
