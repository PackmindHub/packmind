#!/usr/bin/env bash
# ~/run-michel.sh — usage: ./run-michel.sh <repo> <issue-number>
#
# Two-phase, one-shot agent:
#   1. TRIAGE  — assess whether the issue is clear enough to implement. Writes a
#      JSON verdict (READY | NEEDS_INFO). On NEEDS_INFO it posts the questions to
#      the issue and STOPS — no PR. On READY it posts a short confirmation +
#      collapsed analysis and continues.
#   2. IMPLEMENT — runs only when READY. The triage analysis is fed into the
#      implementation prompt so it does not re-explore the repo from scratch.
#
# Prompts live as templates in prompts/*.md next to this script (see render_template) so the
# bash stays orchestration-only and the prompts stay easy to maintain.

set -euo pipefail

# Use the pinned Node that provision-worker.sh installed to /usr/local (Packmind
# .nvmrc = 24.15.0) ahead of the older sprite-managed node in /.sprite/bin. This
# script is invoked directly (not via a login shell), so profile-based version
# managers would not apply — prepend explicitly so `npm ci` / `nx` / the CLI
# build all run on the correct major. No-op if /usr/local/bin isn't present.
export PATH="/usr/local/bin:${PATH}"

REPO="${1:?usage: $0 <owner/repo> <issue-number>}"
ISSUE="${2:?usage: $0 <owner/repo> <issue-number>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_DIR="${MICHEL_PROMPT_DIR:-${SCRIPT_DIR}/prompts}"

ERROR_LOG="${MICHEL_ERROR_LOG:-/tmp/michel-runs/last-error.log}"
mkdir -p "$(dirname "${ERROR_LOG}")"

# Hidden marker stamped into EVERY comment Michel posts. The webhook ignores any
# comment containing it, so Michel's own comments (authored by the owner's token,
# and mentioning @michel to guide the human) never re-trigger Michel. Changing
# this string requires the same change in webhook-server.ts (MICHEL_MARKER).
MICHEL_MARKER='<!-- michel-bot -->'

# --- Claude auth preflight -------------------------------------------------
# Claude's subscription OAuth token expires every few hours; while expired,
# every model call fails (org managed-settings can't load) and emits non-JSON.
# Catch that BEFORE cloning/installing so a dead-auth window costs nothing and
# gives a clear message instead of a cryptic mid-run failure. `claude auth
# status` is NOT enough — it returns exit 0 even while calls fail — so we do a
# real tiny generation (cheap Haiku) and require the exact sentinel back.
# Set MICHEL_SKIP_PREFLIGHT=1 to bypass (e.g. local testing).
# Model for the triage + implementation passes. Default Sonnet 4.6 — cheaper
# than Opus, fine for the test phase. Override with MICHEL_MODEL.
# Set MICHEL_1M=1 to request the 1M-token context window (appends the `[1m]`
# suffix Claude Code uses to opt into the long-context beta, e.g.
# claude-sonnet-4-6[1m]). No-op if the id already carries a `[...]` suffix.
MICHEL_MODEL="${MICHEL_MODEL:-claude-sonnet-4-6}"
if [ "${MICHEL_1M:-0}" = "1" ] && [ "${MICHEL_MODEL}" = "${MICHEL_MODEL%[*]}" ]; then
  MICHEL_MODEL="${MICHEL_MODEL}[1m]"
fi
# Model for the triage/assessment pass. Opus 4.7 by default — the assessment
# verdict gates everything downstream, so spend the stronger model here even
# though implementation runs on the cheaper MICHEL_MODEL. Override with
# MICHEL_ASSESS_MODEL.
MICHEL_ASSESS_MODEL="${MICHEL_ASSESS_MODEL:-claude-opus-4-7}"
if [ "${MICHEL_1M:-0}" = "1" ] && [ "${MICHEL_ASSESS_MODEL}" = "${MICHEL_ASSESS_MODEL%[*]}" ]; then
  MICHEL_ASSESS_MODEL="${MICHEL_ASSESS_MODEL}[1m]"
fi
PREFLIGHT_MODEL="${MICHEL_PREFLIGHT_MODEL:-claude-haiku-4-5-20251001}"
if [ "${MICHEL_SKIP_PREFLIGHT:-0}" != "1" ]; then
  echo "==> [0/10] Claude auth preflight (${PREFLIGHT_MODEL})"
  PING=$(printf 'Reply with exactly this token and nothing else: MICHEL_PREFLIGHT_OK' \
    | claude --print --model "${PREFLIGHT_MODEL}" --dangerously-skip-permissions 2>/dev/null || true)
  if ! printf '%s' "${PING}" | grep -q 'MICHEL_PREFLIGHT_OK'; then
    echo "❌ Claude auth preflight failed — model unreachable (likely expired token). No work done."
    gh issue comment "${ISSUE}" --repo "${REPO}" --body "$(printf '%s\n' \
      '⏸️ **Michel paused — Claude is temporarily unavailable.**' \
      '' \
      'The agent could not reach Claude (usually an expired auth token or a transient managed-settings load failure). **No work was done and no PR was created.** Re-trigger with a new `@michel` comment once it is back.' \
      '' \
      "${MICHEL_MARKER}")" >/dev/null 2>&1 || true
    exit 0
  fi
fi

# Remove the per-run workspace. cd out first since WORKDIR lives inside RUN_ROOT.
cleanup_workspace() {
  cd /tmp 2>/dev/null || true
  [ -n "${RUN_ROOT:-}" ] && rm -rf "${RUN_ROOT}" 2>/dev/null || true
}

# Post feedback to the issue so a failed run isn't silent, then log it.
on_failure() {
  local rc=$1 line=$2
  echo "[$(date -Is)] run-michel.sh failed (rc=${rc}) repo=${REPO} issue=${ISSUE} run=${RUN_ID:-?} line=${line}" >> "${ERROR_LOG}"
  local body
  body=$(printf '%s\n' \
    "🛑 **Michel run failed** (exit code ${rc})." \
    "" \
    "The automated agent hit an error while working on this issue and did **not** open a PR." \
    "" \
    "- Run ID: \`${RUN_ID:-?}\`" \
    "- Failed near line ${line} of \`run-michel.sh\`" \
    "- Workspace kept for debugging: \`${RUN_ROOT:-?}\`" \
    "" \
    "Check the sprite logs with \`tail -n 100 /.sprite/logs/services/michel-webhook.log\`, then re-trigger with a new \`@michel\` comment once the cause is fixed." \
    "" \
    "${MICHEL_MARKER}")
  gh issue comment "${ISSUE}" --repo "${REPO}" --body "${body}" >/dev/null 2>&1 || true
}

# Capture the real failing line (the EXIT trap's $LINENO points at the trap itself).
FAIL_LINE=0
trap 'FAIL_LINE=$LINENO' ERR
# On success: clean up the workspace. On failure: comment on the issue and keep
# the workspace so the failure can be inspected.
trap 'rc=$?; if [ $rc -ne 0 ]; then on_failure "$rc" "$FAIL_LINE"; else cleanup_workspace; fi' EXIT

# --- Templating ------------------------------------------------------------
# Read a prompt template and substitute {{KEY}} placeholders with literal values
# (pure bash string replacement — NO eval / command substitution, so untrusted
# issue text can never be executed). Pass trusted/structural keys first and
# untrusted keys (ISSUE_BODY/TITLE/COMMENTS) LAST so untrusted content cannot
# introduce a placeholder that a later pair would then expand.
render_template() {
  local tpl="$1"; shift
  local out; out="$(cat "${tpl}")"
  while (($#)); do
    local key="$1" val="$2"; shift 2
    out="${out//\{\{${key}\}\}/${val}}"
  done
  printf '%s' "${out}"
}

# --- Claude runner ---------------------------------------------------------
# Run one Claude pass to completion, streaming a readable log, then force-reap
# any background daemons it left alive (dev server, MCP browsers) so Claude can
# exit. Bounded — never an infinite hang. See the long note below for why.
#
# Claude can leave background daemons alive after it finishes — a host-side
# `nx serve`/`vite` dev server (if it serves outside Docker), and the Playwright
# / chrome-devtools MCP browsers. (The Docker Compose stack is torn down
# separately at the end with `docker compose down`.) Those children inherit
# Claude's stdout, so piping `claude | jq`
# directly wedges forever: even after Claude emits its final result it stays
# alive waiting on an undead MCP browser, and `jq` never sees EOF because the
# daemons still hold the pipe's write end. The whole run hangs and the worker is
# never released. Fix: write the raw stream to a FILE (decoupled from any pipe),
# tail it into jq for the live log, then once Claude finishes its work
# force-reap the daemons so Claude itself can exit.
run_claude() {
  local prompt="$1" raw="$2" log_file="${3:-}" model="${4:-${MICHEL_MODEL}}"
  : > "${raw}"

  printf '%s' "${prompt}" | claude \
    --print \
    --model "${model}" \
    --output-format stream-json \
    --verbose \
    --dangerously-skip-permissions \
    > "${raw}" 2>&1 &
  local claude_pid=$!

  # Live-render the stream to the log. `--pid` makes tail exit once Claude is gone.
  # When log_file is set, tee captures the rendered output for the PR body.
  tail -n +1 --pid="${claude_pid}" -f "${raw}" | jq --unbuffered -r '
      # Collapse newlines + clip long strings so one log line stays one line.
      def oneline: (. // "") | tostring | gsub("\\s+"; " ");
      def clip($n): oneline | if (. | length) > $n then .[0:$n] + "…" else . end;

      # Pull the most useful argument out of a tool_use .input, per tool.
      def tool_args:
        .input as $i
        | if   $i.file_path  then $i.file_path
          elif $i.command    then "$ " + ($i.command | clip(300))
          elif $i.pattern    then "/" + $i.pattern + "/" + (if $i.path then " in " + $i.path elif $i.glob then " glob " + $i.glob else "" end)
          elif $i.query      then ($i.query | clip(200))
          elif $i.url        then $i.url
          elif $i.prompt     then ($i.prompt | clip(200))
          elif $i.description then ($i.description | clip(200))
          else "" end;

      # Render a tool_result content block (string or array of parts) to text.
      def result_text:
        (.content // "")
        | if type == "array" then (map(.text? // (.content? // "") // "") | join(" ")) else . end
        | clip(400);

      if .type == "assistant" then
        (.message.content[]? | select(.type == "text") | .text),
        (.message.content[]? | select(.type == "tool_use")
          | "\n[tool: " + .name + "] " + (tool_args))
      elif .type == "user" then
        (.message.content[]? | select(.type == "tool_result")
          | select(.is_error == true)
          | "[tool_result ERROR] " + (result_text))
      elif .type == "system" and .subtype == "init" then
        "[claude session started]"
      elif .type == "result" then
        "\n[done: " + (.subtype // "ok") + "]"
      else empty end
    ' | tee "${log_file:-/dev/null}" &
  local render_pid=$!

  # Heartbeat — keep the controller's `sprite exec` stream warm. dispatch-michel.sh
  # blocks on a single `sprite exec` whose WebSocket transport drops after ~10 min
  # with NO bytes flowing back. Claude streams stream-json continuously MOST of the
  # time, but goes silent for the whole duration of a long, quiet tool call: a
  # 15-min `nx test`, a Docker image build, an `npm ci` — Claude emits the tool_use
  # event, then nothing until the tool_result lands. With no stdout in that window
  # the exec idles out mid-run and dispatch reaps the worker (looks like a hang).
  # Print a short line every MICHEL_HEARTBEAT_SECS while Claude is alive so the
  # stream never goes idle. Goes to stdout only (not log_file) so the PR body stays
  # clean. 120s is well under the ~10-min idle window.
  local hb_secs="${MICHEL_HEARTBEAT_SECS:-120}"
  (
    hb_waited=0
    while kill -0 "${claude_pid}" 2>/dev/null; do
      sleep "${hb_secs}"
      kill -0 "${claude_pid}" 2>/dev/null || break
      hb_waited=$((hb_waited + hb_secs))
      printf '[heartbeat] claude still running (%ds elapsed)\n' "${hb_waited}"
    done
  ) &
  local hb_pid=$!

  # Wait until Claude emits its final result line (or exits on its own). Optional
  # hard cap via MICHEL_CLAUDE_TIMEOUT_SECS (0 = unlimited, the default — the
  # heartbeat above is what unblocks long runs; this is only a backstop against a
  # truly wedged process). When the cap is hit we break and let the reap below
  # force-kill Claude.
  local timeout_secs="${MICHEL_CLAUDE_TIMEOUT_SECS:-0}" elapsed=0
  while kill -0 "${claude_pid}" 2>/dev/null; do
    grep -q '"type":"result"' "${raw}" 2>/dev/null && break
    sleep 2
    elapsed=$((elapsed + 2))
    if [ "${timeout_secs}" -gt 0 ] && [ "${elapsed}" -ge "${timeout_secs}" ]; then
      echo "⏱️  Claude exceeded MICHEL_CLAUDE_TIMEOUT_SECS=${timeout_secs}s — forcing stop."
      break
    fi
  done
  kill "${hb_pid}" 2>/dev/null || true

  # Reap undead daemons so Claude can exit. Patterns match the daemon argv only
  # (not this script, not the `claude`/`tail`/`jq` lines) and pkill skips itself.
  pkill -KILL -f 'nx serve'                 2>/dev/null || true
  pkill -KILL -f 'vite'                     2>/dev/null || true
  pkill -KILL -f 'chrome-devtools-mcp'     2>/dev/null || true
  pkill -KILL -f 'ms-playwright/mcp-chrome' 2>/dev/null || true
  # Claude can return its result while a heavyweight `docker-local.sh` (full Nx +
  # Docker image build) is still running in the background. Left alive, it bleeds
  # CPU into the next phases — including the clone's pre-push hook, starving
  # jest's 5s hook timeout (pg-mem schema init) and flaking the push. Reap it.
  pkill -KILL -f 'docker-local.sh'          2>/dev/null || true

  # Give Claude a short grace period to exit cleanly now that its children are
  # gone; force it if it still lingers. Then collect the background jobs.
  local _
  for _ in $(seq 1 15); do kill -0 "${claude_pid}" 2>/dev/null || break; sleep 1; done
  kill -KILL "${claude_pid}" 2>/dev/null || true
  kill "${hb_pid}" 2>/dev/null || true
  wait "${claude_pid}" 2>/dev/null || true
  wait "${render_pid}"  2>/dev/null || true
  wait "${hb_pid}"      2>/dev/null || true
}

# Fresh per-run workspace so concurrent/retriggered mentions never share state.
# /tmp is used by default because the sprite-env service runs as a user whose
# write access to /home/sprite is not guaranteed. Override with RUNS_BASE.
RUN_ID="issue-${ISSUE}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
RUN_ROOT="${RUNS_BASE:-/tmp/michel-runs}/${RUN_ID}"
WORKDIR="${RUN_ROOT}/repo"
BRANCH="agent/issue-${ISSUE}"
ARTIFACTS_DIR=".agent/artifacts/issue-${ISSUE}"
PR_BODY_PATH=".agent/pr-body-issue-${ISSUE}.md"
ASSESSMENT_PATH="${RUN_ROOT}/assessment.json"

# --- Isolate git config from the service-user's (often unreadable) HOME. ---
# The sprite-env service may run as a user lacking access to /home/sprite, so
# git's default global config and ~/.config/git/ignore are unreadable
# ("warning: unable to access '/home/sprite/.config/git/ignore': Permission
# denied"). Point git at a writable per-run global config, drop the system
# config, and override the excludesFile so git never touches the bad path.
# We do NOT repoint HOME/XDG_CONFIG_HOME — gh reads its auth token from there
# and changing it would break `gh auth setup-git` and `git push`.
mkdir -p "${RUN_ROOT}"
export GIT_CONFIG_GLOBAL="${RUN_ROOT}/.gitconfig"
export GIT_CONFIG_NOSYSTEM=1
git config --global core.excludesFile /dev/null
git config --global init.defaultBranch main

# --- Cap resource use of the agent's validation gates. ---
# The worker is a 16 GB VM (no swap on overlayfs). The repo's `test:staged`
# script forces NODE_OPTIONS='--max-old-space-size=16384' (one node process may
# claim the WHOLE machine) and runs `nx affected:test --parallel=3` — three such
# processes plus their jest workers. On a CI runner that is fine; here it OOMs
# the box, every node child wedges in uninterruptible-sleep (state D), and since
# run_claude() polls forever for a `result` line that never comes, the whole
# worker hangs (observed: issue-345, 15.5G/16G used, ~20 procs in D). These env
# vars are inherited by every Bash tool call the agent makes:
#   NX_DAEMON=false        — the nx daemon deadlocks in headless containers and
#                            is never reaped by run_claude's cleanup.
#   NX_PARALLEL_TESTS=1    — read by package.json's test/test:staged scripts;
#                            collapses 3 concurrent 16 GB-heap runs down to 1.
#   NODE_OPTIONS heap cap  — bounds the targeted `nx test|lint <project>` gates
#                            (which, unlike :staged, do NOT self-set NODE_OPTIONS).
# The prompts also steer the agent to targeted `nx test|lint <project>` over the
# affected-everything `:staged` scripts — see prompts/_project.md.
export NX_DAEMON=false
export NX_PARALLEL_TESTS=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

echo "==> [1/10] Fetching issue #${ISSUE} from ${REPO}"
ISSUE_JSON=$(gh issue view "${ISSUE}" --repo "${REPO}" --json number,title,body,labels,comments)
ISSUE_TITLE=$(echo "${ISSUE_JSON}" | jq -r '.title')
ISSUE_BODY=$(echo "${ISSUE_JSON}" | jq -r '.body')
ISSUE_COMMENTS=$(echo "${ISSUE_JSON}" | jq -r '.comments[] | "[\(.author.login)]: \(.body)"')

echo "Issue: ${ISSUE_TITLE}"

# Reuse: if a prior Michel run already posted a READY assessment to this issue,
# skip triage and reuse its analysis (the exact ANALYSIS implement.md consumes).
# Pick the LATEST comment carrying both our bot marker and the READY heading
# (excludes NEEDS_INFO, failure banners, learning summaries); .comments[] is
# already chronological from the GitHub API, so `last` is the most recent.
EXISTING_READY_COMMENT=$(echo "${ISSUE_JSON}" | jq -r --arg marker "${MICHEL_MARKER}" '
  [ .comments[]
    | select(.body | contains($marker))
    | select(.body | contains("Michel — `READY`"))
  ] | last | (.body // empty)')

REUSED_ANALYSIS=""
if [ -n "${EXISTING_READY_COMMENT}" ]; then
  # Grab the "My analysis & plan" <details> block inclusive, then drop the
  # <summary> and </details> lines, leaving the analysis markdown.
  REUSED_ANALYSIS=$(printf '%s\n' "${EXISTING_READY_COMMENT}" \
    | sed -n '/<summary>My analysis & plan<\/summary>/,/<\/details>/p' \
    | sed '1d;$d')
fi

echo "==> [2/10] Fresh-cloning ${REPO} into ${WORKDIR} (run ${RUN_ID})"
mkdir -p "${RUN_ROOT}"
gh repo clone "${REPO}" "${WORKDIR}" -- --branch main
cd "${WORKDIR}"
git config user.email "michel-agent@users.noreply.github.com"
git config user.name "Michel Agent"
gh auth setup-git
git checkout -b "${BRANCH}"

# Pre-install deps on the HOST so the agent can run the real validation gates
# (`./node_modules/.bin/nx lint|test <project>`) without first discovering a
# fresh clone has no node_modules. Packmind is an npm project (package-lock.json)
# — use `npm ci` (clean, lockfile-exact); fall back to `npm install` if the
# lockfile is out of sync. npm's cache (~/.npm) is shared across runs, so only
# the first run pays full download cost. The Docker Compose stack installs its
# OWN deps into a container volume separately — this host install is what powers
# nx on the worker host. Guarded so a repo without package.json doesn't error.
echo "==> [3/10] Post-clone setup (deps + tsconfig + skills + overrides)"
if [ -f scripts/michel/setup.sh ]; then
  bash scripts/michel/setup.sh
else
  # Fallback for clones predating scripts/michel/setup.sh.
  [ -f package.json ] && { npm ci || npm install; }
  [ -f scripts/select-tsconfig.mjs ] && node scripts/select-tsconfig.mjs || true
  [ -f scripts/install-michel-skills.sh ] && bash scripts/install-michel-skills.sh || true
fi

# Harden the clone's git hooks for this memory-constrained worker, then ASSERT
# the patch took. setup.sh already calls scripts/michel/patch-hooks.sh, but a
# silent skip there left a `--parallel=6` pre-push in place, whose
# `nx affected -t lint test build --parallel=6` (6 workers × 16 GB heap)
# OOM-hangs `git push` for 10+ minutes and never completes. Run the patch
# explicitly here, fall back to an inline sed if the script is missing (older
# clone), and refuse to continue if pre-push is still parallel=6 — failing loud
# beats a guaranteed stuck push.
echo "==> [3b/10] Hardening clone git hooks (pre-push parallelism)"
[ -f scripts/michel/patch-hooks.sh ] && bash scripts/michel/patch-hooks.sh || true
if [ -f .husky/pre-push ] && grep -q -- '--parallel=6' .husky/pre-push; then
  sed -i 's/--parallel=6/--parallel=2/g' .husky/pre-push
fi
if [ -f .husky/pre-push ] && grep -q -- '--parallel=6' .husky/pre-push; then
  echo "❌ pre-push still has --parallel=6 after patch — aborting to avoid a stuck push."
  exit 1  # -> on_failure trap posts the failure banner to the issue
fi
echo "✅ pre-push nx parallelism patched (≤2)."

# Shared, static project context injected into both prompts.
PROJECT_CONTEXT="$(cat "${PROMPT_DIR}/_project.md")"

# ===========================================================================
# Phase 1 — TRIAGE  (skipped entirely when a prior READY assessment is reused)
# ===========================================================================
if [ -z "${REUSED_ANALYSIS}" ]; then
echo "==> [4/10] Triage: assessing whether the issue is clear enough (${MICHEL_ASSESS_MODEL})"
ASSESS_PROMPT="$(render_template "${PROMPT_DIR}/assess.md" \
  REPO "${REPO}" ISSUE "${ISSUE}" WORKDIR "${WORKDIR}" \
  ASSESSMENT_PATH "${ASSESSMENT_PATH}" PROJECT "${PROJECT_CONTEXT}" \
  ISSUE_TITLE "${ISSUE_TITLE}" ISSUE_BODY "${ISSUE_BODY}" ISSUE_COMMENTS "${ISSUE_COMMENTS}")"
run_claude "${ASSESS_PROMPT}" "${RUN_ROOT}/assess-stream.jsonl" "${RUN_ROOT}/assess-log.txt" "${MICHEL_ASSESS_MODEL}"

echo "==> [5/10] Parsing verdict"
if [ ! -f "${ASSESSMENT_PATH}" ] || ! jq -e . "${ASSESSMENT_PATH}" >/dev/null 2>&1; then
  echo "❌ Triage produced no valid assessment JSON at ${ASSESSMENT_PATH}"
  exit 1   # -> on_failure trap posts the failure banner to the issue
fi
VERDICT=$(jq -r '.verdict // "NEEDS_INFO"' "${ASSESSMENT_PATH}")
SUMMARY=$(jq -r '.summary // ""' "${ASSESSMENT_PATH}")
ANALYSIS=$(jq -r '.analysis // ""' "${ASSESSMENT_PATH}")
echo "Verdict: ${VERDICT}"

if [ "${VERDICT}" != "READY" ]; then
  echo "==> Issue needs clarification — posting questions, NO PR will be created"
  # Render each question with its suggested options as a markdown block.
  QUESTIONS_MD=$(jq -r '
    (.questions // [])
    | to_entries
    | map(
        "**\(.key + 1). \(.value.question)**\n"
        + ((.value.options // []) | map("- \(.)") | join("\n"))
      )
    | join("\n\n")
  ' "${ASSESSMENT_PATH}")
  BODY=$(printf '%s\n' \
    "## ❓ Michel — \`NEEDS_INFO\`" \
    "" \
    "I looked at this issue but a few decisions are ambiguous for a one-shot run, so **no PR was created.** Answer below (pick a suggested option or reply freely), then comment \`@michel\` again and I'll start." \
    "" \
    "${QUESTIONS_MD}" \
    "" \
    "<details><summary>What I understood so far</summary>" \
    "" \
    "${SUMMARY}" \
    "" \
    "${ANALYSIS}" \
    "" \
    "</details>" \
    "" \
    "${MICHEL_MARKER}")
  gh issue comment "${ISSUE}" --repo "${REPO}" --body "${BODY}" >/dev/null
  echo "✅ Posted clarification questions to issue #${ISSUE}. Stopping (no PR)."
  exit 0
fi

echo "==> Issue is READY — posting confirmation and starting implementation"
BODY=$(printf '%s\n' \
  "## ✅ Michel — \`READY\`, starting implementation" \
  "" \
  "${SUMMARY}" \
  "" \
  "I'll open a PR against \`${BRANCH}\` when done." \
  "" \
  "<details><summary>My analysis & plan</summary>" \
  "" \
  "${ANALYSIS}" \
  "" \
  "</details>" \
  "" \
  "${MICHEL_MARKER}")
gh issue comment "${ISSUE}" --repo "${REPO}" --body "${BODY}" >/dev/null

else
  echo "==> [4/10] Reusing existing READY assessment from a prior run (skipping triage)"
  ANALYSIS="${REUSED_ANALYSIS}"
  BODY=$(printf '%s\n' \
    "## ♻️ Michel — reusing existing assessment" \
    "" \
    "This issue already has a \`READY\` assessment from a previous run — skipping triage and starting implementation." \
    "" \
    "I'll open a PR against \`${BRANCH}\` when done." \
    "" \
    "${MICHEL_MARKER}")
  gh issue comment "${ISSUE}" --repo "${REPO}" --body "${BODY}" >/dev/null
fi

# ===========================================================================
# Phase 2 — IMPLEMENT
# ===========================================================================
echo "==> [6/10] Building implementation prompt"
# Triage is read-only, but guarantee a pristine tree before implementing in case
# it left stray edits. No `-x`, so .gitignore'd node_modules / tasks.sqlite stay.
git checkout -- . 2>/dev/null || true
git clean -fdq 2>/dev/null || true
mkdir -p "${ARTIFACTS_DIR}"
mkdir -p "$(dirname "${PR_BODY_PATH}")"
IMPL_PROMPT="$(render_template "${PROMPT_DIR}/implement.md" \
  REPO "${REPO}" ISSUE "${ISSUE}" WORKDIR "${WORKDIR}" BRANCH "${BRANCH}" \
  ARTIFACTS_DIR "${ARTIFACTS_DIR}" PR_BODY_PATH "${PR_BODY_PATH}" \
  PROJECT "${PROJECT_CONTEXT}" ANALYSIS "${ANALYSIS}" \
  ISSUE_TITLE "${ISSUE_TITLE}" ISSUE_BODY "${ISSUE_BODY}" ISSUE_COMMENTS "${ISSUE_COMMENTS}")"

echo "==> [7/10] Running Claude implementation (this may take several minutes)"
run_claude "${IMPL_PROMPT}" "${RUN_ROOT}/claude-stream.jsonl" "${RUN_ROOT}/impl-log.txt"

echo "==> [8/10] Verifying PR body was written"
if [ ! -f "${PR_BODY_PATH}" ]; then
  echo "❌ Claude did not write the PR body to ${PR_BODY_PATH}"
  echo "   Falling back to a minimal body. Review carefully before merging."
  cat > "${PR_BODY_PATH}" <<EOF
Closes #${ISSUE}

## Summary
Automated implementation by Michel for issue #${ISSUE}.

⚠️ Claude did not provide a detailed PR description. Please review the diff carefully.

<!-- ARTIFACTS_PLACEHOLDER -->
EOF
fi

echo "==> [9/10] Committing artifacts, building artifacts section, and creating PR"

# Sweep recorded videos into the artifacts dir. The ui-demo-recorder skill /
# Playwright MCP (--output-dir=./videos in .mcp.json) writes the final webm to
# ./videos/, which the artifacts collection below would otherwise miss.
shopt -s nullglob
for v in videos/*.webm videos/*.mp4 ./*.webm; do
  [ -f "$v" ] && mv "$v" "${ARTIFACTS_DIR}/$(basename "$v")" && echo "  collected video $(basename "$v")"
done
shopt -u nullglob

# Commit artifacts si présents
if [ -d "${ARTIFACTS_DIR}" ] && [ -n "$(ls -A "${ARTIFACTS_DIR}" 2>/dev/null)" ]; then
  git add "${ARTIFACTS_DIR}"
  git commit -m "chore(agent): add artifacts for issue #${ISSUE}" || true
fi

# Free the box before pushing. The clone's pre-push hook runs
# `nx affected -t lint test build --parallel=6`; any Docker/Nx build still alive
# from the implementation phase starves CPU enough to blow jest's 5s hook timeout
# (pg-mem schema init in repository specs) → flaky pre-push failures unrelated to
# the change. Kill leftover heavy builds and drop the dev stack so the hook runs
# on an idle worker. The end-of-run cleanup repeats this as a final safety net.
pkill -KILL -f 'docker-local.sh' 2>/dev/null || true
PACKMIND_EDITION=oss docker compose --profile dev down -v >/dev/null 2>&1 || true

# Push la branche. --force-with-lease so a retriggered @michel on the same
# issue replaces the prior attempt instead of failing on non-ff.
git push -u origin "${BRANCH}" --force-with-lease

# Construit le bloc Artifacts
ARTIFACTS_BLOCK=""
if [ -d "${ARTIFACTS_DIR}" ] && [ -n "$(ls -A "${ARTIFACTS_DIR}" 2>/dev/null)" ]; then
  ARTIFACTS_BLOCK=$'\n'
  for file in "${ARTIFACTS_DIR}"/*; do
    [ -e "$file" ] || continue
    filename=$(basename "$file")
    raw_url="https://github.com/${REPO}/raw/${BRANCH}/${ARTIFACTS_DIR}/${filename}"
    blob_url="https://github.com/${REPO}/blob/${BRANCH}/${ARTIFACTS_DIR}/${filename}"
    case "$filename" in
      *.png|*.jpg|*.jpeg|*.gif|*.webp)
        ARTIFACTS_BLOCK+="### ${filename}"$'\n'
        ARTIFACTS_BLOCK+="![${filename}](${raw_url})"$'\n\n'
        ;;
      *.mp4|*.webm|*.mov)
        ARTIFACTS_BLOCK+="### ${filename}"$'\n'
        ARTIFACTS_BLOCK+="[▶ ${filename}](${raw_url}) (click to play/download)"$'\n\n'
        ;;
      *)
        ARTIFACTS_BLOCK+="- [\`${filename}\`](${blob_url})"$'\n'
        ;;
    esac
  done
else
  ARTIFACTS_BLOCK="_No artifacts produced._"
fi

# Remplace le placeholder dans le body
PR_BODY_FINAL=$(mktemp)
# Échappe les caractères spéciaux pour sed via une approche awk plus robuste
awk -v block="${ARTIFACTS_BLOCK}" '{
  if ($0 ~ /<!-- ARTIFACTS_PLACEHOLDER -->/) {
    print block
  } else {
    print
  }
}' "${PR_BODY_PATH}" > "${PR_BODY_FINAL}"

# Append execution logs as a collapsed details block.
# Capped at 500 lines each so the PR body stays within GitHub's 65 536-char limit.
_append_log() {
  local label="$1" file="$2"
  printf '### %s\n\n```\n' "${label}"
  if [ -f "${file}" ]; then
    local total; total=$(wc -l < "${file}")
    if [ "${total}" -gt 500 ]; then
      printf '... (%d lines omitted)\n' "$((total - 500))"
      tail -n 500 "${file}"
    else
      cat "${file}"
    fi
  else
    printf '(no log captured)\n'
  fi
  printf '```\n\n'
}
{
  printf '\n<details>\n<summary>Agent execution logs</summary>\n\n'
  _append_log "Triage phase"         "${RUN_ROOT}/assess-log.txt"
  _append_log "Implementation phase" "${RUN_ROOT}/impl-log.txt"
  printf '</details>\n'
} >> "${PR_BODY_FINAL}"

# Create or update the PR. If one already exists for this branch (retrigger
# of the same issue), force-push above refreshed the commits; just replace
# the body.
EXISTING_PR=$(gh pr list --repo "${REPO}" --head "${BRANCH}" --state open --json url --jq '.[0].url' || true)
if [ -n "${EXISTING_PR}" ]; then
  gh pr edit "${EXISTING_PR}" --repo "${REPO}" --body-file "${PR_BODY_FINAL}" >/dev/null
  PR_URL="${EXISTING_PR}"
else
  PR_URL=$(gh pr create \
    --repo "${REPO}" \
    --base main \
    --head "${BRANCH}" \
    --title "[Michel] ${ISSUE_TITLE}" \
    --body-file "${PR_BODY_FINAL}" \
    --label "agent-generated")
fi

# ===========================================================================
# Phase 3 — LEARNING
# Michel writes a self-critical retrospective. Two outputs:
#  - .agent/michel-learning.md: a persistent log committed to the branch, so
#    learnings survive the ephemeral worker FS and accumulate across runs.
#  - a short summary appended to the PR body.
# ===========================================================================
echo "==> [10/10] Learning — session retrospective"

LEARNINGS_FILE="${WORKDIR}/.agent/michel-learning.md"
LEARNING_SUMMARY_PATH="${RUN_ROOT}/learning-summary.md"

LEARN_PROMPT="$(render_template "${PROMPT_DIR}/learning.md" \
  REPO "${REPO}" ISSUE "${ISSUE}" WORKDIR "${WORKDIR}" BRANCH "${BRANCH}" \
  ASSESS_LOG_PATH       "${RUN_ROOT}/assess-log.txt" \
  IMPL_LOG_PATH         "${RUN_ROOT}/impl-log.txt" \
  PR_URL                "${PR_URL}" \
  LEARNINGS_FILE        "${LEARNINGS_FILE}" \
  LEARNING_SUMMARY_PATH "${LEARNING_SUMMARY_PATH}" \
  ISSUE_TITLE           "${ISSUE_TITLE}")"

run_claude "${LEARN_PROMPT}" \
  "${RUN_ROOT}/learn-stream.jsonl" \
  "${RUN_ROOT}/learn-log.txt"

# Commit + push the persistent learnings log if Michel updated it.
if ! git -C "${WORKDIR}" diff --quiet -- .agent/michel-learning.md 2>/dev/null \
   || [ -n "$(git -C "${WORKDIR}" ls-files --others --exclude-standard -- .agent/michel-learning.md)" ]; then
  git -C "${WORKDIR}" add .agent/michel-learning.md
  git -C "${WORKDIR}" commit -m "📝 docs(michel): record session learnings for issue #${ISSUE}" || true
  git -C "${WORKDIR}" push origin "${BRANCH}" --force-with-lease || \
    echo "⚠️  Could not push learnings log (non-fatal)"
  echo "📚 Learnings log updated: .agent/michel-learning.md"
fi

# Append the short summary to the PR body.
if [ -f "${LEARNING_SUMMARY_PATH}" ]; then
  {
    printf '\n---\n\n'
    cat "${LEARNING_SUMMARY_PATH}"
  } >> "${PR_BODY_FINAL}"
  gh pr edit "${PR_URL}" --repo "${REPO}" --body-file "${PR_BODY_FINAL}" >/dev/null || \
    echo "⚠️  Could not append learning summary to PR body (non-fatal)"
  echo "📚 Learning summary appended to PR: ${PR_URL}"
else
  echo "⚠️  Learning phase produced no summary — skipping PR update"
fi

rm "${PR_BODY_FINAL}"

# Tear down any Docker Compose stack the run started. Compose derives its
# project name from the working-dir basename ("repo"), which is identical for
# every worker — so leftover containers and the persistent dev volumes
# (dev-postgres-data, dev-node_modules, …) would collide with the next run.
# `down -v` drops both. `--profile dev` so the nx-daemon + pgAdmin containers
# are removed too. PACKMIND_EDITION=oss keeps the project/container names
# consistent with `up`. Non-fatal: a run that never started the stack no-ops.
echo "==> Cleaning up Docker Compose stack (--profile dev down -v)"
PACKMIND_EDITION=oss docker compose --profile dev down -v >/dev/null 2>&1 || true

echo ""
echo "✅ Done. PR opened: ${PR_URL}"
