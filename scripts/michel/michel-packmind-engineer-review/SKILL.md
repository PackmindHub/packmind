---
name: michel-packmind-engineer-review
description: "Review an implemented GitHub issue the way a senior Packmind engineer would — the human-judgment checks that ESLint, the TypeScript compiler, and e2e tests cannot catch (authorization scoping, hexagonal-architecture conformance, analytics-event wiring, UX copy, UI reactivity, CLI behavior, multi-tenancy safety, and more). Use this skill once an issue has been implemented and you have a diff to inspect — before opening or merging the PR. Trigger on 'review this implementation', 'engineer review', 'packmind review', 'QC this issue', 'is this issue done well', 'review issue #NNN', or any post-implementation quality gate. Reach for it even when the user just says the work is done and asks 'anything I missed?' — automated checks already ran; this is the layer they don't cover."
argument-hint: '["issue-number-or-url"]'
---

# Packmind Engineer Review

Review an implemented issue against the checks that **human Packmind engineers** actually raise in
review — the judgment calls that pass CI but still get flagged by a reviewer. The full catalogue lives
in `references/engineer-checklist.md`; this file is the workflow that applies it.

**This skill only detects issues — it does not fix them.** Findings are evidence-grounded and humble:
a static reviewer can be wrong, so findings that need runtime confirmation say so, and uncertain calls
are posed as questions, exactly as the team does ("Should not we…? WDYT?").

## Why this exists

Linters check style, the compiler checks types, e2e tests check the happy path. None of them notice that
a `PinSpaceUseCase` extends `AbstractMemberUseCase` instead of `AbstractSpaceMemberUseCase`, that a
`SpacePinnedEvent` is emitted but no Amplitude subscriber listens to it, that a non-admin can reach an
admin page by URL, that a list doesn't refresh after a delete, or that an error toast leaks a raw UUID.
Those are the things reviewers spend their attention on. This skill encodes that attention so it runs
every time, consistently, instead of depending on who happens to review.

## 1. Resolve the two inputs

The review needs the **intent** (what the issue asked for) and the **implementation** (what changed).

### Intent — the issue

If given an issue number or URL, fetch it:

```bash
gh issue view <number> --json number,title,body,comments
```

Read the title, body, and existing comments. Extract: the user-facing goal, any explicit rules/scenarios,
mentioned edge cases, and named code references (backtick terms, event names, file paths). If the issue
references an Example Mapping spec or links a PRD, note it. If no issue is available, ask the user for one;
do not invent intent — without it you can only judge code quality, not whether the right thing was built.

**Ignore CodeRabbit / bot noise.** Auto-generated `@coderabbitai` plan and "Issue enrichment" blocks are
not human intent — skip them.

### Implementation — the diff

**If the caller named an explicit scope, use it** — don't auto-detect over it:

- A commit range (`a1b2c3d~1..f4e5d6c`): `git diff --stat <range>` and `git diff <range>`.
- A PR: `gh pr diff <number>` for the patch, `gh pr view <number>` for context.

**Otherwise auto-detect.** This repo uses trunk-based development, so the change may be committed, staged,
or unstaged. Build the changed-file set from all three and review their union:

```bash
git fetch origin main --quiet 2>/dev/null || true
BASE=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD~1)
git diff --stat "$BASE"...HEAD     # committed since diverging from main
git status --porcelain             # staged + unstaged
git diff "$BASE"...HEAD            # full committed diff
git diff                           # unstaged
git diff --staged                  # staged
```

If the union is empty, stop and ask the user which commit range or PR to review — a review of nothing is
misleading.

**Review the whole feature, not one slice.** The team commits each sub-task separately (one logical
increment per commit), so a single commit is usually a fragment — a data layer with no use case, a use case
with no endpoint. Reviewing one commit in isolation produces phantom "it's not wired up!" findings for code
that lands in the next commit. Always span the full set of commits that implement the issue (the
merge-base range, or the range the caller gave), so you judge the finished feature, not a half-built one.

Record the changed files and the diff hunks — every finding must cite a real `file:line` from this set.

## 2. Classify the touched layers

The checklist is organized by architectural layer because that scopes which checks apply. Map each changed
file to a layer (a diff usually touches several):

| Layer             | Paths                                                                     | Checklist section                 |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------- |
| Domain / packages | `packages/*/src/**` (use cases, commands, adapters, events, services)     | Domain                            |
| API               | `apps/api/src/**` (NestJS controllers, modules)                           | API                               |
| Frontend          | `apps/frontend/**` (routes, components, gateways)                         | Frontend                          |
| CLI               | `apps/cli/src/**`                                                         | CLI                               |
| MCP               | `apps/mcp-server/src/**`                                                  | API (same controller/error rules) |
| Tests & infra     | `**/*.spec.ts`, `apps/*-e2e*/**`, `Dockerfile*`, `.gitignore`, migrations | Tests & Infra                     |

**Cross-cutting checks always apply**, regardless of layer.

## 3. Run the checklist

Read `references/engineer-checklist.md` and apply the **Cross-cutting** section plus every layer section the
diff touched. Skip sections for layers the diff doesn't touch — don't pad the report with N/A items.

Each checklist entry gives you the concern, the **signal** (how to spot it by reading the diff/code), and a
real example from past reviews. Follow the signal: grep the changed files, open neighbouring files for
context, trace a command field from frontend gateway → controller body → use case, look for the matching
event subscriber, and so on. A finding is only worth reporting if you can point at the specific code.

**Confidence discipline** — match how the team actually reviews:

- State a finding plainly only when the diff makes it certain (e.g. a controller that never catches a domain
  error it can throw → guaranteed 500).
- When it depends on runtime behavior you can't observe statically (cache invalidation, a job that swallows
  an error, a toast duration), report it but mark it **needs confirmation** and say how to verify it.
- When it's a genuine design question (is this the right role? should this be a dedicated use case?), pose it
  as a question rather than asserting a defect.
- Don't manufacture findings to look thorough. Zero findings is a valid, good outcome — say `QC ✅`.

**Scope calibration** — the issue almost always describes more than any single diff contains (UI copy, an
endpoint, analytics, ordering). Before flagging "the issue asks for X but I don't see it," decide whether the
diff under review is meant to be the _complete_ implementation or a _slice_ of a larger feature still landing
in sibling commits/PRs. If you reviewed the full feature span (step 1) and a stated behavior is genuinely
absent, that's a real gap — flag it. If you can't tell whether it's deferred, raise it as an **open question
("Is X handled elsewhere / in a follow-up?")**, not a HIGH defect. Severity reflects shipped behavior: missing
wiring in a deliberate slice is a scope note; missing wiring in something claimed done is a real finding.
Don't inflate "not here yet" into "broken."

For a large diff (many files across several layers), you may fan out: launch one review subagent per touched
layer (`subagent_type: general-purpose`), each given the issue summary, that layer's checklist section, and
the relevant changed files, then merge their findings. For a small diff, review inline.

## 4. Write the report

Write to `engineer-review-<issue-number>.md` at the repo root (or `engineer-review.md` if there's no issue
number) — unless the caller specified a different output path, in which case use that. Use this structure:

```markdown
# Engineer Review — #<issue> <title>

**Issue**: #<number> | **Branch**: <branch> | **Base**: <short-sha> | **Files changed**: <N>
**Layers touched**: <list>

## Verdict

<One of:

- `QC ✅` — nothing to flag.
- `LGTM otherwise ✅, <N> point(s) below` — minor/non-blocking findings only.
- `<N> finding(s) to address` — at least one blocking finding.>

## Findings

#### [HIGH|MEDIUM|LOW] <short title>

- [ ] **Category**: <category from the checklist, e.g. "Authorization scoping">
- **File**: `path/to/file.ts:line`
- **What**: <what's wrong / the question, in the reviewer's voice>
- **Why it matters**: <user-visible or maintainability consequence>
- **Suggested check/fix**: <concrete next step; a fix suggestion or how to confirm>
- **Confidence**: certain | needs confirmation (static review)

<repeat per finding, ordered by severity>

## Open questions

<Design/scope questions that aren't defects — "Should this be Admin-only?", "Is this the expected
behavior?". Omit the section if there are none.>

---

_Static review only — no code was executed. Findings marked "needs confirmation" should be reproduced
before acting. Automated checks (lint, build, e2e) are out of scope here by design._
```

### Severity guidance

- **HIGH** — wrong behavior reaching users, a security/authorization gap, data loss, or a guaranteed crash
  (unmapped domain error → 500, non-admin reaching an admin action, dropped command field on the wire).
- **MEDIUM** — incorrect-but-recoverable behavior, missing feedback, drift/duplication that will bite later,
  missing required tests, a type that hides a real contract.
- **LOW / Not blocking** — copy polish, accessibility nice-to-haves, minor consistency, dead code.

### Conventions to mirror

- Findings start as unchecked `- [ ]` — the team checks them off (`- [x]`) as they resolve.
- Prefix genuinely optional items with "Not blocking but…".
- It's fine — encouraged — to end with `QC ✅` or `LGTM otherwise ✅` when warranted. Don't hedge a clean
  review into sounding alarming.

## 5. Print a summary

After writing the file, print to the console: the verdict, finding counts by severity, the count needing
confirmation, and the report path.
