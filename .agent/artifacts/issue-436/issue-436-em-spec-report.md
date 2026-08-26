# Code Review — Issue #436 (branch `agent/issue-436`)

## Scope

- **Subject:** all commits on this branch vs `main`.
  - `git log --oneline main..HEAD`: `55e5b7a3a ⚡️ perf(frontend): split Vitest into shared/isolated projects to reuse the module graph`
  - `git diff --stat main...HEAD`: `apps/frontend/vite.config.ts | 74 +++++--- (70 insertions, 4 deletions)` — **one file changed**.
- **Spec basis:** No EM spec — this is an unstructured issue. There is no functional spec to map; the diff was assessed for correctness, architecture, and Packmind conventions.
- **Target domains:** `apps/frontend` (Vitest/Vite test configuration only). No `packages/*`, `apps/api`, `apps/cli`, or `apps/mcp-server` code is touched. Packages layer: not affected.

## Code map (by layer)

| Layer                         | File                           | Change                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend — build/test tooling | `apps/frontend/vite.config.ts` | Adds `INCLUDE_GLOBS` + `LEAKY_SPECS` module constants; imports `defaultExclude` from `vitest/config`; removes root `test.include`; introduces a two-entry `test.projects` array (`shared` with `isolate: false`, `isolated` with `isolate: true`). |

No application/runtime code, no domain logic, no ports/adapters, no persistence, no API contract, and no user-facing behavior is affected. This is a test-runner performance change: sharing the module registry (`isolate: false`) for the bulk of specs, quarantining state-leaking specs into an isolated project.

## Applicable standards (globbed from `**/.claude/rules/packmind/*.md`, matched against the changed path `apps/frontend/vite.config.ts`)

- `standard-typescript-good-practices.md` (`paths: **/*.ts`) — **matches**. Its two rules (no `Object.setPrototypeOf` on errors; use intersection types for enriching DTOs) are not exercised by this diff → **compliant / N/A**.
- `standard-compliance-logging-personal-information.md` (`paths: **/*.ts`) — matches by glob but the diff contains no logging → **N/A**.
- `standard-domain-events.md` (`paths: **/*.ts`) — matches by glob but is about domain events → **N/A**.
- All `apps/frontend/**/*.tsx` standards (UI/design-system, error-management, tanstack-query-keys) and the always-apply frontend-data-flow standard target `.tsx`/route modules — **do not apply** to a `.ts` config file.
- `standard-backend-tests-redaction.md` (`paths: **/*.spec.ts`) — the config is not a spec file → **does not apply**.

**Net: no standard is violated by this change.**

## Verification performed (detection only — no source modified)

- Installed toolchain: `vitest 4.1.10`, `@vitest/coverage-v8 4.1.10`, `vite ^8.1.5`, `@nx/vite 23.1.0`. The `test.projects` array API and `extends: true` are valid in Vitest 4 → config is syntactically supported.
- `defaultExclude` is exported from `vitest/config` and resolves to `['**/node_modules/**', '**/.git/**']` in v4.
- All 13 `LEAKY_SPECS` paths currently exist on disk (verified individually).
- Partition is **complete and disjoint**: `shared` runs `INCLUDE_GLOBS` minus `LEAKY_SPECS`; `isolated` runs exactly `LEAKY_SPECS`. Union = full spec set; intersection = ∅ → every spec runs exactly once, none dropped, none double-run.
- `apps/frontend/app/` exists (justifies the `app/**` include glob); 92 spec files under `src/`.

---

## Findings

### 1. [Medium] Hardcoded `LEAKY_SPECS` denylist has no existence guard — a rename silently re-pollutes the shared registry

- **File:** `apps/frontend/vite.config.ts:25-41` (`LEAKY_SPECS`), consumed at `:188` (`shared` exclude) and `:196` (`isolated` include).
- **Category:** robustness / maintainability (correctness-adjacent).
- **Verdict:** CONFIRMED (mechanism), PLAUSIBLE (impact depends on a future edit).
- **Summary:** The isolation of state-leaking specs depends entirely on literal string paths matching real files. Nothing asserts these paths still resolve, and the `shared` project runs with `isolate: false`.
- **Failure scenario:** A developer renames or moves one of the quarantined specs (e.g. `src/services/api/ApiService.test.ts` → `ApiClient.test.ts`, or a `git mv` into a new folder). The stale `LEAKY_SPECS` entry no longer matches, so the spec is no longer excluded from `shared` and no longer collected by `isolated`. It rejoins the fast `shared` project, where — per the file's own comments — its leaked module/global state (the shared axios instance in `ApiService`, the clipboard global, etc.) corrupts the module registry shared with sibling specs in the same worker. The result is an **intermittent failure in an _unrelated_ spec**, with no signal pointing back to the rename. This is exactly the class of flake the split was meant to eliminate, re-introduced silently.
- **Why it matters here:** The diff itself already shows this fragility in action — two entries (`DeployWithCliModal.spec.tsx`, `MembershipChips.test.tsx`) were added with the note _"Surfaced as leaky once the suite drifted past the issue's original profiling snapshot."_ The denylist is reactive by construction, so a broken entry degrades silently rather than failing loudly.
- **Suggested direction (not applied):** Fail fast on config load — e.g. resolve each `LEAKY_SPECS` entry against the filesystem (`fs.existsSync(path.resolve(__dirname, spec))`) and `throw` on the first miss, so a rename breaks the build immediately instead of leaking into a flaky run. Alternatively drive the list from a marker (a tag/comment or a co-located `// @vitest-isolate` convention) so it moves with the file.

### 2. [Low] `isolate: false` shared-registry strategy is inherently reactive — recurring maintenance tax with no early-warning

- **File:** `apps/frontend/vite.config.ts:169-199` (the whole `projects` block; `shared` at `:184-189`).
- **Category:** design / maintainability.
- **Verdict:** CONFIRMED (acknowledged tradeoff).
- **Summary:** Any newly authored spec that leaks module/global state will pass in isolation locally but flake once it lands in the shared project, and the only remedy is manual triage + appending to `LEAKY_SPECS`.
- **Failure scenario:** A new gateway spec mutates a shared singleton (the pattern the comments call out). Its author runs it alone (or under the old isolated assumption) and sees green; in CI under the shared registry it intermittently breaks a neighbour. Diagnosing "which new spec poisoned the worker" is time-consuming because the failure surfaces in a different file.
- **Note:** This is a deliberate, well-documented tradeoff (the comments explicitly frame `LEAKY_SPECS` as a shrinkable list and name the root causes). Flagged as informational so the cost is visible, not as a blocker. Fixing the underlying leaks (notably the `ApiService` axios singleton) is the durable path and would let entries leave the list — the code comments already point this out.

### 3. [Low] Justifying comment about `extends: true` array concatenation may misstate Vitest 4 merge semantics

- **File:** `apps/frontend/vite.config.ts:9-11` and `:156-159`.
- **Category:** documentation accuracy.
- **Verdict:** PLAUSIBLE (not verified against Vitest 4 internals in this pass).
- **Summary:** The comments assert that leaving `include` at the root `test` level would be _concatenated_ into each project by `extends: true`, causing `isolated` to match every spec — and use this as the reason to move `include` into each project.
- **Impact:** The **code is correct regardless** of whether the merge concatenates or overrides, because `include` is set explicitly on both projects. The only risk is that the stated rationale, if inaccurate for Vitest 4, could mislead a future maintainer (e.g. someone re-adds a root `include` expecting override semantics, or removes a per-project `include` trusting inheritance). Worth confirming the exact v4 behaviour and tightening the comment, or softening it to "set per-project to be explicit and version-independent."

---

## Assessment

The change is small, single-purpose, and unusually well-documented, with the reasoning for each non-obvious decision inline. There are **no correctness defects, no architecture/hexagonal drift, no contract or cross-file drift, and no standards violations** — the partition is provably complete and disjoint, the Vitest 4 APIs used are valid, and every quarantined path currently resolves. The findings are all in the robustness/maintainability band, dominated by **Finding 1** (add an existence guard so a rename fails loudly instead of silently re-introducing flake). Findings 2 and 3 are informational.
