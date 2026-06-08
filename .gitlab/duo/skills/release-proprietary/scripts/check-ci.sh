#!/usr/bin/env bash
# Verify that the "Main CI/CD Pipeline" workflow on the latest commit of the
# main branch of a given GitHub repository is green.
#
# Usage: check-ci.sh <owner/repo>
# Exit codes:
#   0 - latest run on main concluded successfully (green)
#   1 - latest run failed / cancelled / no run found / gh auth missing
#   2 - latest run is still in progress or queued (not red, just not done)

set -euo pipefail

REPO="${1:?usage: check-ci.sh <owner/repo>}"

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI not found in PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq not found in PATH" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh is not authenticated — run \`gh auth login\` first" >&2
  exit 1
fi

HEAD_SHA=$(gh api "repos/${REPO}/commits/main" --jq .sha 2>/dev/null || true)
if [ -z "${HEAD_SHA}" ]; then
  echo "❌ ${REPO}: could not resolve main HEAD SHA (does the repo exist and do you have access?)" >&2
  exit 1
fi
SHORT_SHA="${HEAD_SHA:0:7}"

RUN_JSON=$(gh run list \
  --repo "${REPO}" \
  --workflow=main.yml \
  --branch=main \
  --limit=20 \
  --json databaseId,status,conclusion,headSha,url,createdAt)

MATCH=$(echo "${RUN_JSON}" | jq --arg sha "${HEAD_SHA}" '
  [ .[] | select(.headSha == $sha) ] | sort_by(.createdAt) | reverse | .[0] // empty
')

if [ -z "${MATCH}" ] || [ "${MATCH}" = "null" ]; then
  echo "❌ ${REPO}: no Main CI/CD Pipeline run found for current main HEAD (${SHORT_SHA})" >&2
  echo "   Most recent runs on main:" >&2
  echo "${RUN_JSON}" | jq -r '.[] | "   - sha=\(.headSha[0:7]) status=\(.status) conclusion=\(.conclusion) \(.url)"' >&2
  exit 1
fi

STATUS=$(echo "${MATCH}" | jq -r '.status')
CONCL=$(echo "${MATCH}" | jq -r '.conclusion')
URL=$(echo "${MATCH}" | jq -r '.url')

case "${STATUS}" in
  completed)
    case "${CONCL}" in
      success)
        echo "✅ ${REPO}: Main CI/CD Pipeline green on main (${SHORT_SHA})"
        echo "   ${URL}"
        exit 0
        ;;
      *)
        echo "❌ ${REPO}: Main CI/CD Pipeline concluded '${CONCL}' on main (${SHORT_SHA})" >&2
        echo "   ${URL}" >&2
        exit 1
        ;;
    esac
    ;;
  queued|in_progress|waiting|requested|pending)
    echo "⏳ ${REPO}: Main CI/CD Pipeline still '${STATUS}' on main (${SHORT_SHA})" >&2
    echo "   ${URL}" >&2
    echo "   This is not a failure — re-run check-ci.sh after the run completes." >&2
    exit 2
    ;;
  *)
    echo "❌ ${REPO}: Main CI/CD Pipeline status '${STATUS}' on main (${SHORT_SHA}) — unexpected state" >&2
    echo "   ${URL}" >&2
    exit 1
    ;;
esac
