#!/usr/bin/env bash
# Poll the proprietary repo's origin/main until the OSS release commit has
# been merged in by the auto-sync workflow, then emit the SHA of the
# **proprietary merge commit** (NOT the OSS release commit itself).
#
# Why the merge commit and not the release commit:
# The OSS release commit (e.g. `chore: release 1.15.0`) is created on OSS,
# so its tree contains OSS-only files. When the proprietary auto-sync
# brings it into proprietary main, the resulting merge commit's tree
# combines the OSS release with the proprietary-only files. Tagging the
# merge commit is what we want — tagging the raw OSS commit would point
# `release/<version>` at an OSS-only tree, breaking proprietary
# deployments (the build can't find `@packmind/proprietary/*` modules).
#
# The script:
#  1. Polls origin/main for the OSS release commit (by exact subject).
#  2. Once found, locates the proprietary merge commit whose **2nd parent**
#     is that OSS commit. The 2nd parent is the upstream side of the sync
#     merge. Requiring the OSS release commit to be the *direct* upstream
#     parent (not a grandparent) ensures the merge's tree is exactly
#     "OSS at release + proprietary state at that moment" — i.e. version
#     X.Y.Z, not X.Y.(Z+1)-next.
#  3. Emits the merge SHA on stdout. Progress messages go to stderr.
#
# Usage: wait-for-oss-sync.sh <prop-repo-dir> <version> [timeout-seconds]
# Defaults: timeout-seconds=600 (10 minutes)
# Exit codes:
#   0 - proprietary merge commit detected (SHA on stdout)
#   1 - timed out, or sync arrived but no suitable merge commit exists
#       (e.g. fast-forward, or auto-sync batched release + next-cycle into
#       one merge — in that case the operator must resolve manually).

set -euo pipefail

PROP_DIR="${1:?usage: wait-for-oss-sync.sh <prop-repo-dir> <version> [timeout-seconds]}"
VERSION="${2:?usage: wait-for-oss-sync.sh <prop-repo-dir> <version> [timeout-seconds]}"
TIMEOUT="${3:-600}"

SUBJECT="chore: release ${VERSION}"
INTERVAL=5
ELAPSED=0

echo "⏳ Polling ${PROP_DIR} origin/main for OSS commit \"${SUBJECT}\" and its proprietary merge (timeout ${TIMEOUT}s)…" >&2

while [ "${ELAPSED}" -lt "${TIMEOUT}" ]; do
  git -C "${PROP_DIR}" fetch --quiet origin main

  # Step 1: find the OSS release commit on proprietary main (by exact subject)
  OSS_SHA=$(git -C "${PROP_DIR}" log origin/main --format='%H%x09%s' -500 \
    | awk -F '\t' -v subj="${SUBJECT}" '$2 == subj { print $1; exit }')

  if [ -n "${OSS_SHA}" ]; then
    # Step 2: find the proprietary merge commit whose 2nd parent is the OSS release.
    # %P emits parents space-separated; on a merge commit, $2 is parent1
    # (prior proprietary tip) and $3 is parent2 (the upstream side).
    MERGE_SHA=$(git -C "${PROP_DIR}" log origin/main --merges --format='%H %P' -500 \
      | awk -v oss="${OSS_SHA}" '$3 == oss { print $1; exit }')

    if [ -n "${MERGE_SHA}" ]; then
      echo "✅ Found proprietary merge commit: ${MERGE_SHA:0:7} (merges OSS release ${OSS_SHA:0:7})" >&2
      echo "${MERGE_SHA}"
      exit 0
    fi

    echo "⚠️  OSS release commit ${OSS_SHA:0:7} is on proprietary origin/main, but no merge commit has it as its direct upstream (2nd) parent." >&2
    echo "    This can happen if the auto-sync fast-forwarded (unlikely if proprietary has local commits) or batched the release with later OSS commits into one merge." >&2
    echo "    Proprietary cannot be tagged automatically — investigate the sync history before proceeding." >&2
    exit 1
  fi

  sleep "${INTERVAL}"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "❌ Timed out after ${TIMEOUT}s waiting for OSS release commit \"${SUBJECT}\" to land on proprietary origin/main" >&2
echo "   Check the sync-from-oss-repository workflow status and any pending oss-sync PR." >&2
exit 1
