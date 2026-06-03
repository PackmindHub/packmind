---
name: michel-cli-demo-recorder
description: Produce proof-of-execution demos of the Packmind CLI (`packmind-cli`) as static terminal-styled SVG images (colors and formatting preserved exactly), for embedding in a GitHub PR. Use this whenever a dev task touches the CLI — new command, changed output, new flag, bug fix in terminal rendering — and the PR would benefit from showing the tool actually running. Trigger it when the user says "record a CLI demo", "show the command output", "add a terminal screenshot to the PR", "prove the CLI works", "capture the CLI", "demo the command", or whenever you finish CLI work and are about to open or update a PR. Default to running this for any PR whose diff includes CLI source, even if the user didn't explicitly ask for a screenshot — a CLI PR without a visual of the output is an incomplete deliverable. Zero-install: runs on the node already in the repo, no brew/cargo/recording tools needed.
---

# CLI Demo Recorder

Turn a local `packmind-cli` invocation into a polished, colored terminal **screenshot** (SVG) that drops straight into a GitHub PR. The companion to `michel-ui-demo-recorder` — that one records the browser UI; this one captures the terminal.

## When to reach for this skill

- You just implemented or changed a CLI command/flag/output and are opening or updating a PR.
- "Add a screenshot of the CLI to the PR", "show what the command prints", "prove it runs".
- A bug was about terminal rendering (colors, alignment, truncation) and the fix needs visual evidence.
- Anytime the PR diff includes CLI source (`apps/cli/`) — attach a demo by default; reviewers shouldn't have to clone and run it to see the output.

The deliverable is one or more **SVG images**, each a terminal window showing a fake prompt line (`user@host dir % <command>`) followed by the command's real, fully-colored output. SVG because it is crisp at any zoom, a few KB, exact-color, and renders inline on GitHub when committed to the repo and referenced by a relative path.

## Why a skill exists for this

Capturing colored CLI output correctly has three non-obvious traps that waste time if you hit them mid-task:

1. **Color dies when stdout isn't a TTY.** `packmind-cli` colors its output with `chalk` (see `apps/cli/src/infra/utils/consoleLogger.ts`), which — like most well-behaved CLIs — emits ANSI only when it detects a real terminal _or_ `FORCE_COLOR` is set. Pipe the output to a file with neither and you get plain, colorless text — the exact opposite of the goal. The bundled converter both sets `FORCE_COLOR=3` and runs the command under a **pseudo-terminal (PTY)**, so color survives even for commands that gate strictly on `isTTY`. Don't hand-roll the capture.
2. **The PTY tool differs by OS.** macOS ships BSD `script` (`script -q <file> <cmd>`); Linux ships util-linux `script` (`script -qec "<cmd>" <file>`). And BSD `script` only writes the full session to its _typescript file_, not to a piped stdout. The bundled converter handles both — don't hand-roll it.
3. **GitHub is picky about where SVGs render.** A committed SVG referenced by a **relative path** in PR/README markdown renders fine. SVG _pasted_ into the PR description textarea is unreliable. So: commit the file, reference it relatively.

`scripts/render-cli-demo.mjs` codifies the working recipe so you don't relearn it each time.

## The one command you run

```bash
PACKMIND_EDITION=oss node .claude/skills/michel-cli-demo-recorder/scripts/render-cli-demo.mjs \
  --out docs/cli-demos/standards-list.svg \
  --text-out docs/cli-demos/standards-list.txt \
  --title "packmind-cli — standards list" \
  --prompt-cmd "packmind-cli standards list" \
  -- node dist/apps/cli/main.cjs standards list
```

| Flag              | Meaning                                                                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--out`           | where to write the SVG (**required**)                                                                                                                                                                                                                                        |
| `-- <command...>` | everything after `--` is the command run under the PTY (**required**). For this repo that is `node dist/apps/cli/main.cjs <subcommand…>`.                                                                                                                                    |
| `--prompt-cmd`    | the text drawn on the fake prompt line. Defaults to the actual executed command. Since the real invocation is the verbose `node dist/apps/cli/main.cjs …`, pass the friendly `packmind-cli …` form here so the demo reads cleanly — that _is_ how an installed user runs it. |
| `--title`         | window title-bar caption. Omit for no caption.                                                                                                                                                                                                                               |
| `--cwd`           | directory to run the command in (default: current dir — i.e. the repo root, where `dist/apps/cli/main.cjs` lives).                                                                                                                                                           |
| `--text-out`      | also write an ANSI-stripped plain-text copy. Always pass this — see "Verify".                                                                                                                                                                                                |
| `--theme`         | `dark` (default) or `light`.                                                                                                                                                                                                                                                 |

Runs under `node`.

## Recipe

1. **Build the CLI first.** This repo's CLI runs from `dist/`, so build it with `npm run packmind-cli:build`. It produces `dist/apps/cli/main.cjs`, which you then run with `node dist/apps/cli/main.cjs`. A demo of stale `dist/` proves nothing about your change.
2. **Set the edition.** Always run with `PACKMIND_EDITION=oss` (per the repo's CLAUDE.md), or the CLI may behave differently than expected.
3. **Start anything the CLI talks to.** Commands that hit the Packmind API (`login`, `whoami`, `standards`/`commands`/`skills` pulls, `playbook`) need the local stack up, or they only print the error/unauthenticated path. If you want populated, colorful output, bring the stack up and confirm it's serving before recording — see the **`michel-run-local-dev-stack`** skill (`docker compose up -d`). Local-only commands (`--help`, `--version`, `lint`, `diff`, `config`) need no server. If the _point_ of the demo is the error message, skip the server deliberately.
4. **Pick representative commands.** Choose the invocations that show off the change. Good defaults: the headline command (populated output), `--help`, and any new/changed flag. One SVG per invocation — small focused images beat one giant scroll.
5. **Render** each with the command above, writing into a stable folder (`docs/cli-demos/` is a good home; create it).
6. **Verify** (next section) before trusting the image.
7. **Embed in the PR** (section after).
8. **Clean up** any background stack you started (`docker compose down` — see the `michel-run-local-dev-stack` skill).

## Verify before you commit

You usually can't _see_ an SVG directly (and Linux CI hosts have no rasterizer), so verify by content, not by eye:

- Read the `--text-out` sidecar. It's the exact text that got captured, ANSI stripped. Confirm it shows what your change should produce — right rows, right counts, the new flag's effect, aligned columns. If the sidecar is empty or shows an error you didn't intend, the demo is wrong regardless of how the SVG looks.
- On macOS you can additionally rasterize to inspect visually: `qlmanage -t -s 1400 -o /tmp <file>.svg` produces `<file>.svg.png`, which you _can_ open/Read. Handy while authoring; not available on Linux workers, which is why the text sidecar is the primary check.

A demo that captured the wrong state (server down, stale build, not logged in, empty DB) is worse than no demo — it misleads the reviewer. Treat the sidecar as a required gate.

## Embed in the PR

Commit the SVG (and optionally the `.txt`) into the repo, then reference it by **relative path** in the PR body:

````markdown
## CLI demo

![packmind-cli standards list](docs/cli-demos/standards-list.svg)

<details><summary>Plain text</summary>

```text
<paste docs/cli-demos/standards-list.txt here, or link it>
```
````

</details>
```

The plain-text `<details>` block is a courtesy fallback for anyone whose viewer won't render the SVG, and it's searchable/diff-able in a way an image isn't.

## What "good" looks like

- The output shown is the **real** output of your changed CLI, against a realistic state — verified via the text sidecar.
- Colors, bold, dim, and column alignment match a real terminal (the converter preserves SGR: 16-color, 256-color, truecolor, bold, dim, italic, underline).
- The prompt line shows the friendly `packmind-cli …` form (via `--prompt-cmd`) — that's how an installed user invokes it — while the command actually executed under the PTY is the repo's `node dist/apps/cli/main.cjs …`.
- One tight SVG per invocation; a few KB each.
- For a multi-step change, a small set of demos (headline command + the new flag + an error/edge case) tells the whole story.

## Bundled files

- `scripts/render-cli-demo.mjs` — the whole pipeline: PTY capture (OS-aware) → ANSI/SGR parse → terminal-styled SVG, plus optional plain-text sidecar. Zero dependencies.
