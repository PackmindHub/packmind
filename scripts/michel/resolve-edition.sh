#!/usr/bin/env bash
# Resolve the Packmind edition for a Michel run.
#
# Precedence: explicit env > git remote > oss default.
#   1. PACKMIND_EDITION already set     -> echo it verbatim (caller override).
#   2. origin remote -> packmind-proprietary -> "proprietary".
#   3. anything else (incl. no remote)  -> "oss".
#
# Self-determining: this script returns "proprietary" ONLY when the checkout's
# origin points at packmind-proprietary, so the identical file committed to both
# the OSS and the proprietary repo yields the correct edition based purely on
# where it was cloned — no per-repo divergence, and it works for local devs too.
#
# Prints the resolved edition (oss|proprietary) to stdout; no side effects.
set -euo pipefail

if [ -n "${PACKMIND_EDITION:-}" ]; then
  echo "${PACKMIND_EDITION}"
  exit 0
fi

remote="$(git remote get-url origin 2>/dev/null || true)"
case "${remote}" in
  *packmind-proprietary*) echo "proprietary" ;;
  *)                      echo "oss" ;;
esac
