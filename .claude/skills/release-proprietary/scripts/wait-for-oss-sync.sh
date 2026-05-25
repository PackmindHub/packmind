#!/usr/bin/env bash
# Poll the proprietary repo's origin/main every 5 seconds until the OSS
# release commit appears (a commit whose subject is exactly
# `chore: release <version>`). The auto-sync workflow merges OSS commits into
# proprietary main shortly after they land.
#
# On success, the matching commit SHA is written to stdout (and only the SHA),
# so callers can capture it with $(...). All progress / status messages go to
# stderr. The caller MUST use the emitted SHA to tag the release — DO NOT tag
# HEAD, because by the time we detect the release commit on proprietary, the
# subsequent "prepare next development cycle" commit may already be HEAD.
#
# Usage: wait-for-oss-sync.sh <prop-repo-dir> <version> [timeout-seconds]
# Defaults: timeout-seconds=600 (10 minutes)
# Exit codes:
#   0 - release commit detected (SHA on stdout)
#   1 - timed out

set -euo pipefail

PROP_DIR="${1:?usage: wait-for-oss-sync.sh <prop-repo-dir> <version> [timeout-seconds]}"
VERSION="${2:?usage: wait-for-oss-sync.sh <prop-repo-dir> <version> [timeout-seconds]}"
TIMEOUT="${3:-600}"

SUBJECT="chore: release ${VERSION}"
INTERVAL=5
ELAPSED=0

echo "⏳ Polling ${PROP_DIR} origin/main for commit \"${SUBJECT}\" (timeout ${TIMEOUT}s)…" >&2

while [ "${ELAPSED}" -lt "${TIMEOUT}" ]; do
  git -C "${PROP_DIR}" fetch --quiet origin main

  # Scan recent commits on origin/main and select one whose subject equals
  # ${SUBJECT} exactly. Using --grep with anchors is unreliable (dots in the
  # version match any char), so we filter exactly in shell.
  SHA=$(git -C "${PROP_DIR}" log origin/main --format='%H%x09%s' -500 \
    | awk -F '\t' -v subj="${SUBJECT}" '$2 == subj { print $1; exit }')

  if [ -n "${SHA}" ]; then
    echo "✅ Found release commit on proprietary origin/main: ${SHA:0:7}" >&2
    echo "${SHA}"
    exit 0
  fi

  sleep "${INTERVAL}"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "❌ Timed out after ${TIMEOUT}s waiting for OSS sync to land on proprietary origin/main" >&2
echo "   Check the sync-from-oss-repository workflow status and any pending oss-sync PR." >&2
exit 1
