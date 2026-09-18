# Comment-ratio history

Measures how much of the TypeScript written in this repository is comment, over
time and per Claude model, straight from the git history.

## Why two measures

- **Stock** — at each sampling date, the share of non-blank lines in the whole
  codebase that are comment lines. Moves slowly: it is dominated by code written
  months ago.
- **Flow** — of the lines _added_ during a period (net diff between two
  boundaries), the share that are comment lines. This is the one that reflects
  how code is being written right now.

The history is sampled on the 1st **and** the 15th of each month. Models ship
mid-month, so a monthly step cannot separate the weeks before a release from the
weeks after it. `--step month` falls back to monthly boundaries.

A third view attributes the flow to the model that produced it, using the
`Co-Authored-By: Claude <model>` trailer that Claude Code writes on its commits.

## Running it

```bash
pnpm install                                # provides the `typescript` parser
node tools/comment-ratio/selftest.mjs       # check the line classifier
node tools/comment-ratio/collect.mjs        # monthly stock + flow
node tools/comment-ratio/by-model.mjs       # per-model flow (~1 min)
node tools/comment-ratio/render.mjs         # build the HTML report
```

Everything lands in `tools/comment-ratio/output/`:

| File                          | What it holds                                 |
| ----------------------------- | --------------------------------------------- |
| `comment-ratio.json` / `.csv` | monthly stock and flow, per file category     |
| `by-model.json` / `.csv`      | per-model flow, with per-commit distribution  |
| `comment-ratio.html`          | self-contained report, no external dependency |

`collect.mjs` takes `--repo`, `--ref`, `--to YYYY-MM` and `--out`; `by-model.mjs`
takes `--repo`, `--ref` and `--out`. The full history must be present — a shallow
clone silently produces a truncated series, so run `git fetch --unshallow` first
if needed.

## How a line is classified

Same convention as `cloc`: a line is a **comment** only when every non-whitespace
character on it belongs to a comment. `const a = 1; // why` is therefore code.

Comments are located with the official TypeScript parser rather than a regex, so
strings, template literals, regex literals and JSX text containing `//` are not
mistaken for comments. Two cases are handled explicitly and covered by
`selftest.mjs`:

- JSX text (`<div>// this is rendered</div>`) is content, not a comment.
- `{/* ... */}` is the JSX comment idiom: the braces of an expression-less JSX
  expression belong to the comment, so a JSX comment spanning several lines is a
  comment on its `{/*` and `*/}` lines too.

`.d.ts` files are excluded. Renames are detected, so moving a file does not look
like newly written code.

## Files

| File                  | Role                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `classify.mjs`        | blank / code / comment classification of a TypeScript source     |
| `git.mjs`             | the git plumbing wrappers (`ls-tree`, `cat-file --batch`, diffs) |
| `collect.mjs`         | monthly stock and flow                                           |
| `by-model.mjs`        | per-model flow from commit trailers                              |
| `render.mjs`          | builds the HTML report                                           |
| `model-releases.json` | Anthropic model release dates, with their provenance             |
| `page/`               | stylesheet and chart runtime inlined into the report             |
| `selftest.mjs`        | classifier expectations                                          |

## Caveats worth repeating

- The public history starts on 2025-09-05 with an import of an already existing
  codebase. That first delta is not a month of development and is excluded from
  the trend charts.
- The trailer records the model of the session that produced a commit, not
  necessarily the author of every line in it, and pull requests are squashed, so
  one trailer covers one pull request.
- Commits with no trailer (most of 2025) are of unknown attribution — not
  "human". A squashed pull request whose message names several different models
  goes to a `several models named` bucket rather than being credited, by message
  order, to whichever appears first.
- A `#!` shebang counts as code, not as a comment — the convention `cloc` uses.
  Three files in this repository are affected.
- The flow series (net diff per period) and the per-model series (sum of
  per-commit diffs) are different measures and do not yield the same
  generational multiplier. Per-commit sums count churn written and rewritten
  inside a period; the net diff cancels it. Never quote one as the other.
- A trailer may carry a suffix (`Claude Opus 5 (1M context)`); it names the same
  model and lands in the same bucket. The model is read from the raw commit
  message rather than through `git`'s trailer parser, which only exposes a
  trailer sitting unindented in the message's last paragraph.
- `git log <pathspec>` prunes history by default; 14 commits from one 2026-01
  merge are therefore not counted. None of them carry a generation-5 trailer.
