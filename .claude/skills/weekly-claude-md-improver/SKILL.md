---
name: 'weekly-claude-md-improver'
description: 'Audit and improve every CLAUDE.md in the Packmind monorepo: apply only high/medium priority fixes and delete instructions already fully covered by a repository skill. Invoked non-interactively by the "Weekly CLAUDE.md Improvement" GitHub workflow (.github/workflows/weekly-claude-md-improver.yml); not intended for interactive use.'
model: opus
allowed-tools: Read Edit Glob Grep Skill
disable-model-invocation: true
---

# Weekly CLAUDE.md Improver

Audit and improve every `CLAUDE.md` file in this repository, then report what changed.

You are running **NON-INTERACTIVELY in CI**: no human is available to confirm anything. Never ask a
question — either apply a change that is clearly correct, or skip it and say so in the final summary.
Apply fixes directly to the files as you go.

These are standing instructions for the whole run, not a one-time checklist.

## Step 1 — Build the skill inventory

Before touching any `CLAUDE.md`, list every skill available in this repository.

Use `Glob` with the pattern `**/.claude/skills/**/SKILL.md`. Match at any depth: a `.claude/skills`
directory can itself live in a sub-directory, and skills may be nested. Ignore any hit under
`node_modules`. Ignore **this** skill (`weekly-claude-md-improver`) — it is CI tooling, not a
developer convention, so it never justifies deleting anything.

For each remaining `SKILL.md`, collect **only** the YAML frontmatter `name` and `description`. Do not
read skill bodies at this stage — inlining them wastes the context you need for the audit itself.

Then state the count out loud, for example `Loaded frontmatter for 10 skill(s)`, and list the paths.
This line matters: a regression that silently empties the inventory (a gitignored `.claude/skills`, a
narrowed checkout, a changed glob) must be visible in the run log instead of quietly degrading into
"skip deduplication".

If the inventory is empty, say so explicitly and **skip Step 4 (deduplication) entirely** for the
whole run.

## Step 2 — Enumerate the target files

Use `Glob` with the pattern `**/CLAUDE.md`, ignoring anything under `node_modules`. State how many
files you found.

Process them **one at a time**, in the order returned. Announce each file path before you start on it,
so the CI log shows progress.

## Step 3 — Audit each file

For each `CLAUDE.md`, use the `claude-md-improver` skill (from the `claude-md-management` plugin,
installed by the workflow) to audit and improve that file.

Apply only **HIGH** and **MEDIUM** priority fixes that have a clear, unambiguous positive impact —
for example:

- outdated or incorrect commands
- broken links or wrong file paths
- stale structure or architecture references

Do **not** make low-priority, subjective, or stylistic changes, and skip anything ambiguous. When in
doubt, leave the text alone and note it in the summary.

## Step 4 — Deduplicate against skills

`CLAUDE.md` must not restate what a skill already carries. Any instruction, procedure, convention, or
example in the file that is already covered by one of the skills from Step 1 is duplicate content:
delete it outright, leaving **no** pointer or cross-reference in its place.

Rules:

- Delete only when the skill **clearly and fully** owns that topic. If a skill covers the topic only
  partially, or you are in any doubt, leave the `CLAUDE.md` text untouched.
- You may read a `SKILL.md` body when its frontmatter description alone cannot settle whether
  coverage is full. Read it only for that decision.
- Never delete content that no skill covers.
- If the Step 1 inventory was empty, skip this step entirely.

## Guardrails

**Packmind standards regions are untouchable.** Never modify content inside sections delimited by the
markers `<!-- start: Packmind standards -->` and `<!-- end: Packmind standards -->`. Leave those
regions byte-for-byte unchanged and only edit content outside them. This outranks the deduplication
rules above, even if a skill appears to cover that content.

**Edit only, never restructure the tree.** Do not create, delete, or rename any file. The only
permitted writes are `Edit` calls against existing `CLAUDE.md` files. In particular, do not move
content from a `CLAUDE.md` into a new skill or doc.

## Step 5 — Report

End the run with a summary the pull-request reviewer can scan:

- the skill count and the `CLAUDE.md` count from Steps 1-2;
- one line per file you edited, with what you fixed;
- every deletion made for deduplication, naming the skill that justified it, so a reviewer can check
  none of them went too far;
- anything you deliberately skipped as ambiguous.

Files you left unchanged need no more than a single closing line listing them.
