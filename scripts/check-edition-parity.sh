#!/usr/bin/env bash
# Guards the OSS <-> proprietary source parity contract locally, so a divergence
# is caught before the push instead of by the check-oss-sync CI job.
#
# Only two path sets are under the contract - the same ones CI compares:
#   - apps/cli/src
#   - packages/* that exist in BOTH repos (minus the deny-list)
# Everything else (apps/frontend, apps/api, proprietary-only packages) is meant
# to differ and is never looked at.
#
# The counterpart repo is found through a git remote, so the script is inert for
# anyone who does not have one - public contributors included.
#
# macOS-friendly (bash 3.2): no mapfile, no associative arrays.
set -euo pipefail

SKIP_PACKAGES="integration-tests"

# Regenerated per-repo by each side's own agent deployment; comparing them is noise.
EXCLUDE_RE='(^|/)(\.packmind|\.claude|\.claude-plugin|\.cursor|\.github|\.continue|\.gitlab|\.opencode|\.agents|\.junie|node_modules|dist|coverage)/|(^|/)(AGENTS\.md|CLAUDE\.md|\.packmind\.md|packmind\.json|packmind-lock\.json)$|\.tsbuildinfo$'

log() { printf '%s\n' "$*" >&2; }
remote_url() { git remote get-url "$1" 2>/dev/null || true; }

# --- Which side are we on? -------------------------------------------------
# Decided by the tree, never by remote names: an external contributor's fork of
# the public repo also has an `upstream` remote, and must never land in block
# mode against the very repo it is contributing to.
#
# These packages exist only in the proprietary repo (OSS aliases them to
# packages/editions stubs via tsconfig.paths.oss.json).
#
# Asked of the git tree and not of the filesystem: pnpm leaves a bare
# `packages/<name>/node_modules` behind in the OSS clone for every workspace
# package it once linked, so `[ -d ]` reported an OSS checkout as proprietary
# and put it in block mode against its own origin, where every outgoing commit
# is a difference by definition. It refused every push from OSS.
IS_PROPRIETARY=0
for marker in linter marketplaces spaces-management; do
  if git rev-parse -q --verify "HEAD:packages/$marker" >/dev/null 2>&1; then
    IS_PROPRIETARY=1
    break
  fi
done

if [ "$IS_PROPRIETARY" = "1" ]; then
  # proprietary: the fork is the superset, so divergence here is ours to fix -> BLOCK
  MODE=block; COUNTERPART_NAME="OSS"
  REMOTE=""
  for r in $(git remote); do
    if [[ "$(remote_url "$r")" =~ [Pp]ackmind[Hh]ub/[Pp]ackmind(\.git)?$ ]]; then REMOTE="$r"; break; fi
  done
  [ -z "$REMOTE" ] && exit 0   # no OSS remote configured - nothing to compare against
else
  # oss: upstream of the pair. Pushing shared code here is the correct direction,
  # so this side never blocks - it only flags a likely sync conflict. Opt-in:
  #   git remote add proprietary git@github.com:PackmindHub/packmind-proprietary.git
  MODE=warn; COUNTERPART_NAME="proprietary"; REMOTE="proprietary"
  git remote get-url "$REMOTE" >/dev/null 2>&1 || exit 0
fi

REF="$REMOTE/main"
if ! git fetch "$REMOTE" main --quiet 2>/dev/null; then
  log "parity: could not reach '$REMOTE', skipping the ${COUNTERPART_NAME} parity check."
  exit 0
fi
git rev-parse -q --verify "$REF" >/dev/null || exit 0

# --- What are we about to push, and where did we fork from? ----------------
git fetch origin main --quiet 2>/dev/null || true
OUTGOING_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git rev-parse HEAD~1)

# --- Shared path set -------------------------------------------------------
PATHS_FILE=$(mktemp); CHANGED_FILE=$(mktemp)
trap 'rm -f "$PATHS_FILE" "$CHANGED_FILE"' EXIT

git ls-tree --name-only "HEAD:packages" 2>/dev/null | while IFS= read -r pkg; do
  [ -z "$pkg" ] && continue
  case " $SKIP_PACKAGES " in *" $pkg "*) continue ;; esac
  # A package the counterpart does not have is edition-only: nothing to compare.
  # Must not be a bare `&&` list - it is the last command of the loop, and a
  # final miss would make the whole pipeline fail under `set -e`.
  if git rev-parse -q --verify "$REF:packages/$pkg" >/dev/null 2>&1; then
    echo "packages/$pkg"
  fi
done > "$PATHS_FILE" || true
echo "apps/cli/src" >> "$PATHS_FILE"

blob() { git rev-parse -q --verify "$1:$2" 2>/dev/null || echo "-"; }

# xargs keeps the pathspec list out of a bash-3.2 array
tr '\n' '\0' < "$PATHS_FILE" \
  | xargs -0 git diff --name-only "$OUTGOING_BASE" HEAD -- 2>/dev/null \
  | grep -Ev "$EXCLUDE_RE" > "$CHANGED_FILE" || true

SYNC_BASE=$(git merge-base HEAD "$REF" 2>/dev/null || echo "$OUTGOING_BASE")

# The two sides ask different questions.
#
# proprietary (block): "does MY change make this file differ from OSS?"  Compared
#   against the file as it stood before my outgoing commits. If it already
#   differed, OSS moved first and a pending sync - not this push - owns it.
#
# oss (warn): pushing shared code to OSS is the correct direction, so a plain
#   difference is not worth a word. What is worth a word is proprietary having
#   independently edited a file I am touching: that is a sync conflict waiting
#   to happen. Compared against the last sync point.
HITS=""; MISC=""; n_hits=0; n_misc=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  mine=$(blob HEAD "$f"); theirs=$(blob "$REF" "$f")
  [ "$mine" = "$theirs" ] && continue
  if [ "$MODE" = "block" ]; then
    if [ "$(blob "$OUTGOING_BASE" "$f")" = "$theirs" ]; then
      HITS="${HITS}  x ${f}
"; n_hits=$((n_hits + 1))
    else
      MISC="${MISC}  ~ ${f}
"; n_misc=$((n_misc + 1))
    fi
  else
    if [ "$(blob "$SYNC_BASE" "$f")" != "$theirs" ]; then
      HITS="${HITS}  ! ${f}
"; n_hits=$((n_hits + 1))
    fi
  fi
done < "$CHANGED_FILE"

if [ "$n_misc" -gt 0 ]; then
  log ""
  log "parity: ${n_misc} file(s) you touched are already out of sync because ${COUNTERPART_NAME} moved first (pending sync, not this push):"
  printf '%s' "$MISC" >&2
fi

[ "$n_hits" -eq 0 ] && exit 0

if [ "$MODE" = "warn" ]; then
  log ""
  log "parity: ${COUNTERPART_NAME} has its own edits to ${n_hits} file(s) you are pushing - the OSS->proprietary sync will likely conflict here:"
  printf '%s' "$HITS" >&2
  log ""
  log "Not blocking: OSS is upstream and this push is the right direction."
  exit 0
fi

log ""
log "parity: this push makes ${n_hits} shared file(s) differ from ${COUNTERPART_NAME} main:"
printf '%s' "$HITS" >&2
log ""
log "Shared packages and apps/cli/src must stay identical across editions."
log "Backport to OSS main first, then push - otherwise the check-oss-sync CI job fails."
log "If a file is genuinely meant to diverge, add its package to SKIP_PACKAGES here"
log "and to the same list in .github/workflows/quality.yml."
exit 1
