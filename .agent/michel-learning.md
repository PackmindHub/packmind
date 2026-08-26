# Michel — Learnings Log

Retrospectives appended across Michel runs. Each run appends a new section; duplicates across runs are acceptable.

## Issue #436 — Frontend Vitest suite is ~3x slower than it needs to be: every spec re-imports the full module graph

### Technical difficulties

- The biggest miss: the implementation phase validated only on "full suite green locally + benchmark under target" and declared success, but the hand-maintained `LEAKY_SPECS` list was fundamentally fragile. Any spec calling `vi.mock`/`vi.doMock` leaks under `isolate: false` (its hoisted mock may not apply against an already-loaded real module in the shared registry), so the failing set drifted run-to-run and CI flaked with errors like `useAuthService must be used within AuthProvider` / `No QueryClient set`. This took THREE follow-up commits (915c7d8c1, b1a1c0b25, 60c8f3b33) to actually stabilize.
- The eventual robust fix — compute the isolated set at config-eval time by scanning specs for `vi.mock`/`vi.doMock`, unioned with an `ALWAYS_ISOLATE` list for non-mock global leaks — was NOT in the issue's config sketch. The issue's suggested hand-listed approach was itself the trap.
- First edit attempt was wrong because `extends: true` in Vitest **concatenates** array options (`include`), so the `isolated` project ran all 95 files and the suite got slower. Caught locally, but only because per-project file counts were inspected.
- The `localeCompare` follow-up (60c8f3b33) implies a non-deterministic sort in the isolation list ordering also needed fixing after the fact — another sign the config was tweaked reactively rather than designed for determinism up front.

### Missing information

- The issue's profiling numbers (55s baseline, 173 files, ~150 importing @packmind/ui, 35s target) were calibrated on a faster 11-core machine; this worker was 8-core with a heavily-drifted codebase (85s baseline, 95 files, 53 importing @packmind/ui). The literal 35s gate was unreachable here regardless of correctness. A note in project context that benchmark thresholds in issues are machine-relative — and should be judged as a _ratio_ improvement, not an absolute — would prevent second-guessing.
- Nothing surfaced that Vitest `isolate: false` + `vi.mock` is a known correctness hazard. Adding that gotcha to the frontend testing docs / project context would have short-circuited the whole flaky-CI detour.

### Harness improvement ideas

- For test-config / test-isolation changes, the impl phase should run the suite **multiple times AND ideally the actual CI command**, not just back-to-back local runs, before declaring done — flakiness only appeared under CI conditions. Consider a step: "if the change touches test isolation/parallelism, run the suite 3x and treat any run-to-run failure-set drift as a blocker."
- The engineer-review skill ran (issue-436-engineer-review.md exists) but apparently didn't flag the `vi.mock` + `isolate:false` fragility before the PR opened. Adding a check for "hand-maintained allow/deny lists that should be derived programmatically" to that skill would catch this class of issue.
- The retrospective sees the follow-up commits only via git log — the impl-log.txt tail ended at the first commit, so the actual friction (the flaky-CI fix loop) was invisible in the designated logs. The CI-monitor phase's activity should be captured in a log the retrospective is pointed at.
