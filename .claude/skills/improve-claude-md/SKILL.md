---
name: 'improve-claude-md'
description: 'Audit and improve the CLAUDE.md files listed in the run worklist: apply only high/medium priority fixes, create the ones that are missing, and delete instructions already fully covered by a repository skill. Driven non-interactively by a GitHub workflow (.github/workflows/weekly-claude-md-improver.yml owns the schedule and resolves the worklist, which differs per repository); not intended for interactive use.'
model: opus
allowed-tools: Read Edit Write Glob Grep Skill
disable-model-invocation: true
---

# CLAUDE.md Improver

Audit and improve the `CLAUDE.md` files this run owns, create the ones that are missing, then report
what changed.

You are running **NON-INTERACTIVELY in CI**: no human is available to confirm anything. Never ask a
question — either apply a change that is clearly correct, or skip it and say so in the final summary.
Apply fixes directly to the files as you go.

These are standing instructions for the whole run, not a one-time checklist.

## Step 1 — Build the skill inventory

Before touching any `CLAUDE.md`, list every skill available in this repository.

Use `Glob` with the pattern `**/.claude/skills/**/SKILL.md`. Match at any depth: a `.claude/skills`
directory can itself live in a sub-directory, and skills may be nested. Ignore any hit under
`node_modules`. Ignore **this** skill (`improve-claude-md`) — it is CI tooling, not a
developer convention, so it never justifies deleting anything.

For each remaining `SKILL.md`, collect **only** the YAML frontmatter `name` and `description`. Do not
read skill bodies at this stage — inlining them wastes the context you need for the audit itself.

Then state the count out loud, for example `Loaded frontmatter for 10 skill(s)`, and list the paths.
This line matters: a regression that silently empties the inventory (a gitignored `.claude/skills`, a
narrowed checkout, a changed glob) must be visible in the run log instead of quietly degrading into
"skip deduplication".

If the inventory is empty, say so explicitly and **skip Step 5 (deduplication) entirely** for the
whole run.

## Step 2 — Read the worklist

`Read` `tmp/claude-md-worklist.txt`. It holds one repository-relative `CLAUDE.md` path per line, and
it is **authoritative**: the workflow resolved it for this repository, and the scope differs between
repositories on purpose. In the open-source repository it is every `CLAUDE.md` in the tree; in the
proprietary fork it is only the packages that do not exist upstream, because every shared file is
owned by the other repository's run of this same workflow. Editing a file outside the worklist
diverges it between the two repositories and conflicts on the next sync.

So: **do not glob for `CLAUDE.md` files, and never add a path of your own.** If the worklist is
missing or empty, stop immediately — do not fall back to a glob — and end the run with a single line
starting `INCOMPLETE RUN:` that says the worklist could not be read. A silent full-tree fallback is
exactly the failure this file exists to prevent.

Print the paths, numbered, followed by the count — for example `Worklist: 8 file(s)`. This printed
list is the only record of what the run was supposed to cover, so print it in full before editing
anything.

Some paths may not exist yet. That is intentional: a listed path with no file behind it is an app or
a package whose `CLAUDE.md` has to be **created** (Step 3).

Process the files **one at a time**, in worklist order. Announce each path as `[n/total] <path>`
before you start on it, so the CI log shows progress and a run that stops early is visible at a glance.

Never narrow the worklist on your own: no sampling, no "the rest look fine", no stopping once the
edits feel sufficient. Every file in the list gets its own pass through Steps 3-5.

## Step 3 — Create a missing CLAUDE.md

When a worklist path does not exist, author it. Call its directory `<root>/`: the worklist path with
the trailing `/CLAUDE.md` removed. `<root>` is an Nx project root, and it is `apps/<app>/` as often
as `packages/<pkg>/` — the workflow puts both kinds on the worklist. Every path below is relative to
`<root>`, so resolve them against the entry you were actually given: never look under `packages/`
for an `apps/` entry, or you will count zero source files and skip a real application as a stub.

**First, check the project is worth documenting.** `Glob` `<root>/src/**/*`. If it holds two files or
fewer, the project is a stub barrel with nothing to say: **skip it**, create nothing, and record it
in the Step 6 report as deliberately skipped with its file count. A `CLAUDE.md` that only restates
the project name is worse than no file at all.

Otherwise read enough of the project to describe it honestly — never guess:

- `<root>/project.json` (the Nx project name, and the `env:*` tag) and `<root>/package.json`
- `<root>/README.md`, if there is one
- the entry point: `<root>/src/index.ts` (the public barrel) and `<root>/src/<Name>Hexa.ts` for a
  package, `<root>/src/main.ts` for an app
- the shape of `<root>/src/application/`, `<root>/src/domain/`, `<root>/src/infra/`,
  `<root>/src/nest-api/`, `<root>/test/` — whichever are present

Then `Write` the file, matching the house style of the siblings that already have one — and read a
sibling of the **same kind** before you start writing: `packages/git/CLAUDE.md` and
`packages/llm/CLAUDE.md` are the two best models for a package, `apps/api/CLAUDE.md` for an app.

- `# <Name> Package` heading for a package, `# <Name>` for an app, then one or two sentences on what
  it owns.
- Only sections that earn their place: what is non-obvious, what surprises a newcomer, what to reuse
  instead of rewriting, how to add a new case to an existing switch or factory. Concrete file paths
  and type names, not adjectives.
- **Do not restate the shared conventions.** The generic package layout, the `env:*` tags and import
  boundaries, the `/test` subpath rule and branded IDs are all in `packages/CLAUDE.md` — a package
  file that repeats them is duplicate content, which Step 5 would delete anyway. The same holds for
  an app and whatever `apps/CLAUDE.md` already says about it.
- Aim for 30-70 lines, in line with the existing project docs.
- For a **package**, close with the pointer line every sibling package uses, verbatim:

  ``Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)``

  App docs carry no such line — `apps/CLAUDE.md` is an index of the applications, not a conventions
  page — so do not invent one for an app.

- Respect the repository's own standards. In the proprietary fork,
  `.claude/rules/packmind/standard-packmind-proprietary.md` forbids importing from
  `@packmind/editions` — never write an example that does.

Then put the new file through Steps 4 and 5 like any other, so bootstrapped and pre-existing files
meet the same bar.

## Step 4 — Audit each file

For each `CLAUDE.md`, use the `claude-md-improver` skill (from the `claude-md-management` plugin,
installed by the workflow) to audit and improve that file.

Apply only **HIGH** and **MEDIUM** priority fixes that have a clear, unambiguous positive impact —
for example:

- outdated or incorrect commands
- broken links or wrong file paths
- stale structure or architecture references

Do **not** make low-priority, subjective, or stylistic changes, and skip anything ambiguous. When in
doubt, leave the text alone and note it in the summary.

## Step 5 — Deduplicate against skills

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

**The worklist bounds every write.** The only permitted writes are `Edit` on a `CLAUDE.md` that is on
the worklist, and `Write` to **create** a `CLAUDE.md` at a path that is on the worklist. Never delete
or rename any file, never write anywhere else — not to a `CLAUDE.md` outside the worklist, not to any
other file — and never move content from a `CLAUDE.md` into a new skill or doc.

## Step 6 — Report

End the run with a summary the pull-request reviewer can scan:

- the skill count and the worklist count from Steps 1-2;
- one line per file you **created**, saying in a sentence what the project does — these are new files
  with no diff to compare against, so this is the reviewer's only summary of them;
- one line per file you edited, with what you fixed;
- every deletion made for deduplication, naming the skill that justified it, so a reviewer can check
  none of them went too far;
- every project skipped as too thin to document, with its `src/` file count;
- anything you deliberately skipped as ambiguous.

Files you left unchanged need no more than a single closing line listing them.

**Reconcile against the worklist.** Every path printed in Step 2 must appear in this summary, as
created, edited, unchanged, or skipped — the counts have to add up. If any file went unaudited for
any reason (you ran out of room, a read failed, you lost track), do not paper over it: end the
report with a line
that starts `INCOMPLETE RUN:` and names every file you did not audit. A silently partial run is worse
than a loudly partial one, because the pull request it produces looks like a full audit.
