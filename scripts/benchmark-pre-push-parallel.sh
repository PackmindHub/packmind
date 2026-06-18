#!/usr/bin/env bash
#
# Benchmark `nx affected --parallel=N` to find the sweet spot for the pre-push
# hook on this machine.
#
# Methodology:
#   - Runs the exact same target set as .husky/pre-push, with --skip-nx-cache
#     so every measured run does real work.
#   - For each --parallel value, performs N runs (default 3) and records
#     min / median / mean / stddev of wall-clock time.
#   - **Every measured run starts from a fully cold tool-cache state** —
#     Nx cache, Nx daemon, webpack filesystem cache, TypeScript .tsbuildinfo
#     files, Jest cache, Vite cache, ESLint cache, and dist/ outputs are
#     wiped before each run. The OS page cache cannot be cleared without
#     sudo, but a warmup run primes it so all measured runs share the same
#     OS-cache state.
#   - --skip-nx-cache and --nx-bail=false keep Nx from short-circuiting.
#   - Environment is sanity-checked (AC power, load average, clean worktree)
#     before starting; you're warned if anything looks off.
#
# Usage:
#   scripts/benchmark-pre-push-parallel.sh                 # defaults
#   scripts/benchmark-pre-push-parallel.sh -p "4 6 8 10"   # custom values
#   scripts/benchmark-pre-push-parallel.sh -r 5            # 5 runs per value
#   scripts/benchmark-pre-push-parallel.sh --no-warmup     # skip warmup
#   scripts/benchmark-pre-push-parallel.sh --force         # skip sanity checks
#
# Results:
#   - Per-run logs:   $TMPDIR/nx-bench-<ts>/parallel-<N>-run-<i>.log
#   - Raw TSV:        $TMPDIR/nx-bench-<ts>/results.tsv
#   - JSON summary:   $TMPDIR/nx-bench-<ts>/summary.json
#   - Printed table at the end.

set -euo pipefail

cd "$(dirname "$0")/.."

# ---------- defaults --------------------------------------------------------
PARALLEL_VALUES=(4 6 8 10 12)
RUNS_PER_VALUE=3
DO_WARMUP=1
FORCE=0
TARGETS=(lint test typecheck build)
EXCLUDES="cli-e2e-tests,@packmind/integration-tests"

# ---------- argument parsing ------------------------------------------------
usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    -p|--parallel)
      # shellcheck disable=SC2206
      PARALLEL_VALUES=($2)
      shift 2 ;;
    -r|--runs)
      RUNS_PER_VALUE=$2
      shift 2 ;;
    --no-warmup)
      DO_WARMUP=0
      shift ;;
    --force)
      FORCE=1
      shift ;;
    -t|--targets)
      # shellcheck disable=SC2206
      TARGETS=($2)
      shift 2 ;;
    -h|--help)
      usage ;;
    *)
      printf "Unknown option: %s\n" "$1" >&2
      usage ;;
  esac
done

# ---------- helpers ---------------------------------------------------------
now_ms() {
  # macOS has no `date +%s%N`, but Python is always around.
  python3 -c 'import time; print(int(time.time()*1000))'
}

# Compute min, median, mean, stddev of a list of integers (ms).
# Reads from stdin (one number per line). Prints as tab-separated values.
stats() {
  python3 - <<'PY'
import sys, statistics
vals = [int(x.strip()) for x in sys.stdin if x.strip()]
if not vals:
    print("\t".join(["-"]*4))
    sys.exit()
mn = min(vals)
md = int(statistics.median(vals))
mean = int(statistics.mean(vals))
sd = int(statistics.pstdev(vals)) if len(vals) > 1 else 0
print(f"{mn}\t{md}\t{mean}\t{sd}")
PY
}

fmt_secs() {
  # Turn milliseconds into "Xm YY.Zs" for readability.
  python3 -c "
ms = int('$1')
s = ms/1000
m = int(s//60)
rem = s - m*60
print(f'{m}m {rem:05.2f}s' if m else f'{rem:5.2f}s')
"
}

# ---------- output dir ------------------------------------------------------
TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="${TMPDIR:-/tmp}/nx-bench-$TS"
mkdir -p "$OUT_DIR"
RESULTS_TSV="$OUT_DIR/results.tsv"
SUMMARY_JSON="$OUT_DIR/summary.json"
printf "parallel\trun\tduration_ms\tstatus\n" > "$RESULTS_TSV"

# ---------- machine info ----------------------------------------------------
CPU_MODEL=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo unknown)
PHYS_CORES=$(sysctl -n hw.physicalcpu 2>/dev/null || echo 0)
P_CORES=$(sysctl -n hw.perflevel0.physicalcpu 2>/dev/null || echo 0)
E_CORES=$(sysctl -n hw.perflevel1.physicalcpu 2>/dev/null || echo 0)
LOG_CORES=$(sysctl -n hw.logicalcpu 2>/dev/null || echo 0)
MEM_GB=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", $1/1073741824}')
NODE_VER=$(node --version 2>/dev/null || echo ?)
NX_VER=$(./node_modules/.bin/nx --version 2>/dev/null | tail -1 || echo ?)
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo ?)

printf "\n==== Machine ====\n"
printf "  CPU:                %s\n" "$CPU_MODEL"
printf "  Physical cores:     %s\n" "$PHYS_CORES"
printf "  Performance cores:  %s\n" "${P_CORES:-n/a}"
printf "  Efficiency cores:   %s\n" "${E_CORES:-n/a}"
printf "  Logical cores:      %s\n" "$LOG_CORES"
printf "  Memory:             %s GB\n" "$MEM_GB"
printf "  Node:               %s\n" "$NODE_VER"
printf "  Nx:                 %s\n" "$NX_VER"
printf "  Git HEAD:           %s\n" "$GIT_SHA"

# ---------- sanity checks ---------------------------------------------------
WARNINGS=()

# AC power (thermal throttling skews results badly on battery).
if command -v pmset >/dev/null 2>&1; then
  PSOURCE=$(pmset -g ps | head -1)
  if echo "$PSOURCE" | grep -qi "battery"; then
    WARNINGS+=("Running on battery — thermal throttling will skew results. Plug in AC.")
  fi
fi

# Load average — if already high, results will be noisy.
LOAD1=$(uptime | awk -F'load averages?:' '{print $2}' | awk '{print $1}' | tr -d ',')
LOAD1_INT=$(printf "%.0f" "$LOAD1" 2>/dev/null || echo 0)
if [ "$LOAD1_INT" -gt "$((PHYS_CORES / 2))" ]; then
  WARNINGS+=("1-minute load avg is $LOAD1 — other processes are competing. Close heavy apps.")
fi

# Uncommitted changes — the exact state matters for affected.
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  WARNINGS+=("Working tree has uncommitted changes. Nx's input hashing is deterministic but partial-file changes may skew cache behavior.")
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
  printf "\n==== Warnings ====\n"
  for w in "${WARNINGS[@]}"; do
    printf "  [!] %s\n" "$w"
  done
  if [ "$FORCE" -ne 1 ]; then
    printf "\nPass --force to run anyway.\n"
    exit 2
  fi
fi

# ---------- affected base ---------------------------------------------------
printf "\n==== Affected set ====\n"
git fetch origin main --quiet 2>/dev/null || true
BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "HEAD~1")
printf "  Base ref:           %s\n" "$BASE"

AFFECTED=$(./node_modules/.bin/nx show projects --affected --base="$BASE" 2>/dev/null || true)
AFFECTED_COUNT=$(printf '%s\n' "$AFFECTED" | grep -c . || true)
printf "  Affected projects:  %s\n" "$AFFECTED_COUNT"

if [ "$AFFECTED_COUNT" = "0" ]; then
  printf "\n[error] Nothing is affected vs %s — the benchmark would be trivial.\n" "$BASE"
  printf "        Add a change to a package or pick a deeper base.\n"
  exit 3
fi

printf "%s\n" "$AFFECTED" > "$OUT_DIR/affected-projects.txt"

# ---------- environment for Nx invocations ---------------------------------
export PACKMIND_LOG_LEVEL=silent
export NODE_OPTIONS='--max-old-space-size=16384'

# Wipe every tool-level cache we know about in this repo.
# Run BEFORE every measured run (and before warmup) so every run is cold.
# Note: the OS page cache (files recently read by the kernel) cannot be
# purged without `sudo purge`. The warmup run brings it into a consistent
# state so it's fair across --parallel values.
clean_caches() {
  # Nx task cache + daemon + workspace data.
  ./node_modules/.bin/nx reset >/dev/null 2>&1 || true

  # Webpack persistent filesystem cache (see apps/api/webpack.config.js:23).
  rm -rf .cache 2>/dev/null || true

  # TypeScript incremental build info.
  # Scope to repo sources; node_modules may legitimately ship .tsbuildinfo.
  find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete 2>/dev/null || true

  # ESLint cache files (enabled per-project if at all).
  find . -name ".eslintcache" -not -path "*/node_modules/*" -delete 2>/dev/null || true

  # Vite dep-optimization cache. Lives inside the workspace package copy.
  find . -type d -name ".vite" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  # The one inside node_modules/.vite is shared dep optimization — clear too.
  rm -rf node_modules/.vite 2>/dev/null || true

  # SWC and other generic tool caches under node_modules/.cache.
  rm -rf node_modules/.cache 2>/dev/null || true

  # Jest's on-disk cache (per-user, under system temp dir).
  rm -rf "${TMPDIR:-/tmp}"/jest_* 2>/dev/null || true
  rm -rf /tmp/jest_* 2>/dev/null || true

  # Build outputs — force webpack/vite/swc to emit from scratch. Without
  # this, incremental builders can short-circuit even with tool caches cleared.
  rm -rf dist 2>/dev/null || true
}

# Build the nx command once; only --parallel changes between runs.
# We use --skip-nx-cache so every run does real work, and --nxBail=false
# so one failing target doesn't shortcut the run (we want representative timing).
run_nx() {
  local p="$1"
  local log="$2"
  ./node_modules/.bin/nx affected \
    -t "${TARGETS[@]}" \
    --base="$BASE" \
    --parallel="$p" \
    --skip-nx-cache \
    --nxBail=false \
    --tuiAutoExit \
    --exclude="$EXCLUDES" \
    > "$log" 2>&1
}

# ---------- warmup ----------------------------------------------------------
# Use the middle parallel value; we just want OS file cache + node module
# resolution primed. Duration is not recorded.
if [ "$DO_WARMUP" -eq 1 ]; then
  WARMUP_P=${PARALLEL_VALUES[$(( ${#PARALLEL_VALUES[@]} / 2 ))]}
  printf "\n==== Warmup (parallel=%s, not measured) ====\n" "$WARMUP_P"
  printf "  Cleaning all caches...\n"
  clean_caches
  set +e
  run_nx "$WARMUP_P" "$OUT_DIR/warmup.log"
  WARMUP_STATUS=$?
  set -e
  if [ "$WARMUP_STATUS" -ne 0 ]; then
    printf "  [warn] warmup run failed (status=%s). See %s\n" "$WARMUP_STATUS" "$OUT_DIR/warmup.log"
    printf "  Continuing — measured runs may also fail. Use --force to suppress this.\n"
  else
    printf "  Done.\n"
  fi
fi

# ---------- measured runs ---------------------------------------------------
TOTAL_RUNS=$(( ${#PARALLEL_VALUES[@]} * RUNS_PER_VALUE ))
RUN_IDX=0

printf "\n==== Measured runs: %d value(s) x %d run(s) = %d total ====\n" \
  "${#PARALLEL_VALUES[@]}" "$RUNS_PER_VALUE" "$TOTAL_RUNS"
printf "  Output dir: %s\n" "$OUT_DIR"
printf "  Note: every run is cold (tool caches wiped, dist/ removed), so each\n"
printf "        takes noticeably longer than a normal pre-push. Go get coffee.\n"

for p in "${PARALLEL_VALUES[@]}"; do
  for i in $(seq 1 "$RUNS_PER_VALUE"); do
    RUN_IDX=$((RUN_IDX + 1))
    LOG_FILE="$OUT_DIR/parallel-$p-run-$i.log"

    # Wipe every tool cache so each measured run does real work.
    clean_caches

    printf "\n[%d/%d] parallel=%s run=%s ... " "$RUN_IDX" "$TOTAL_RUNS" "$p" "$i"
    START=$(now_ms)
    set +e
    run_nx "$p" "$LOG_FILE"
    STATUS=$?
    set -e
    END=$(now_ms)
    DURATION=$((END - START))

    if [ "$STATUS" -eq 0 ]; then
      LABEL="OK"
    else
      LABEL="FAIL($STATUS)"
    fi

    printf "%s in %s\n" "$LABEL" "$(fmt_secs "$DURATION")"
    printf "%s\t%s\t%s\t%s\n" "$p" "$i" "$DURATION" "$LABEL" >> "$RESULTS_TSV"
  done
done

# ---------- aggregation -----------------------------------------------------
printf "\n==== Summary ====\n"
printf "%-10s %-6s %-12s %-12s %-12s %-10s %s\n" \
  "parallel" "runs" "min" "median" "mean" "stddev" "status"
printf "%-10s %-6s %-12s %-12s %-12s %-10s %s\n" \
  "--------" "----" "---" "------" "----" "------" "------"

declare -a ROWS=()
for p in "${PARALLEL_VALUES[@]}"; do
  # Collect durations only for OK runs; report separately how many failed.
  OK_MS=$(awk -F'\t' -v p="$p" '$1==p && $4=="OK" {print $3}' "$RESULTS_TSV")
  OK_COUNT=$(printf '%s\n' "$OK_MS" | grep -c . || true)
  FAIL_COUNT=$(awk -F'\t' -v p="$p" '$1==p && $4!="OK"' "$RESULTS_TSV" | grep -c . || true)

  if [ "$OK_COUNT" -gt 0 ]; then
    STATS=$(printf '%s\n' "$OK_MS" | stats)
    MIN_MS=$(echo "$STATS" | cut -f1)
    MED_MS=$(echo "$STATS" | cut -f2)
    MEAN_MS=$(echo "$STATS" | cut -f3)
    SD_MS=$(echo "$STATS" | cut -f4)

    STATUS_LABEL="$OK_COUNT ok"
    [ "$FAIL_COUNT" -gt 0 ] && STATUS_LABEL="$STATUS_LABEL, $FAIL_COUNT fail"

    printf "%-10s %-6s %-12s %-12s %-12s %-10s %s\n" \
      "$p" "$OK_COUNT" \
      "$(fmt_secs "$MIN_MS")" \
      "$(fmt_secs "$MED_MS")" \
      "$(fmt_secs "$MEAN_MS")" \
      "$(fmt_secs "$SD_MS")" \
      "$STATUS_LABEL"

    ROWS+=("$p	$MED_MS	$OK_COUNT	$FAIL_COUNT")
  else
    printf "%-10s %-6s %-12s %-12s %-12s %-10s %s\n" \
      "$p" "0" "-" "-" "-" "-" "all failed"
  fi
done

# ---------- pick the winner -------------------------------------------------
if [ ${#ROWS[@]} -gt 0 ]; then
  BEST=$(printf '%s\n' "${ROWS[@]}" | sort -t$'\t' -k2 -n | head -1)
  BEST_P=$(echo "$BEST" | cut -f1)
  BEST_MED=$(echo "$BEST" | cut -f2)
  printf "\nWinner: --parallel=%s (median %s)\n" "$BEST_P" "$(fmt_secs "$BEST_MED")"
  printf "Suggested change in .husky/pre-push: --parallel=%s\n" "$BEST_P"
else
  printf "\nNo successful runs. Inspect logs in %s\n" "$OUT_DIR"
fi

# ---------- machine-readable summary ---------------------------------------
python3 - "$RESULTS_TSV" "$SUMMARY_JSON" "$CPU_MODEL" "$PHYS_CORES" "$P_CORES" \
  "$MEM_GB" "$GIT_SHA" "$AFFECTED_COUNT" <<'PY'
import csv, json, statistics, sys
tsv, out, cpu, phys, pcores, mem, sha, affected = sys.argv[1:9]
rows = list(csv.DictReader(open(tsv), delimiter='\t'))
by_p = {}
for r in rows:
    by_p.setdefault(r['parallel'], []).append(r)

summary = {
    "machine": {
        "cpu": cpu, "physical_cores": int(phys or 0),
        "performance_cores": int(pcores or 0), "memory_gb": int(mem or 0),
    },
    "repo": {"git_sha": sha, "affected_projects": int(affected)},
    "runs": []
}
for p, runs in sorted(by_p.items(), key=lambda x: int(x[0])):
    ok = [int(r['duration_ms']) for r in runs if r['status'] == 'OK']
    entry = {
        "parallel": int(p),
        "runs_total": len(runs),
        "runs_ok": len(ok),
        "min_ms": min(ok) if ok else None,
        "median_ms": int(statistics.median(ok)) if ok else None,
        "mean_ms": int(statistics.mean(ok)) if ok else None,
        "stddev_ms": int(statistics.pstdev(ok)) if len(ok) > 1 else 0,
    }
    summary["runs"].append(entry)

json.dump(summary, open(out, 'w'), indent=2)
print(f"\nJSON summary: {out}")
PY
