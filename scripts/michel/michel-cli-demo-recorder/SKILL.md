---
name: michel-cli-demo-recorder
description: Produce proof-of-execution demos of the Packmind CLI (`packmind-cli`) as terminal-styled images (colors and formatting preserved exactly), for embedding in a GitHub PR. Renders a crisp master SVG and rasterizes it to a PNG — the PNG is what you embed, because GitHub does not render SVG in PR/issue bodies. Use this whenever a dev task touches the CLI — new command, changed output, new flag, bug fix in terminal rendering — and the PR would benefit from showing the tool actually running. Trigger it when the user says "record a CLI demo", "show the command output", "add a terminal screenshot to the PR", "prove the CLI works", "capture the CLI", "demo the command", or whenever you finish CLI work and are about to open or update a PR. Default to running this for any PR whose diff includes CLI source, even if the user didn't explicitly ask for a screenshot — a CLI PR without a visual of the output is an incomplete deliverable.
---

# CLI Demo Recorder

Turn a local `packmind-cli` invocation into a polished, colored terminal **screenshot** that drops straight into a GitHub PR. The renderer writes a crisp master **SVG** and, by default, rasterizes it to a **PNG** next to it — the PNG is the artifact you embed, because GitHub refuses to render SVG in a PR/issue body (its image proxy rejects `image/svg+xml`). The companion to `michel-ui-demo-recorder` — that one records the browser UI; this one captures the terminal.

## When to reach for this skill

- You just implemented or changed a CLI command/flag/output and are opening or updating a PR.
- "Add a screenshot of the CLI to the PR", "show what the command prints", "prove it runs".
- A bug was about terminal rendering (colors, alignment, truncation) and the fix needs visual evidence.
- Anytime the PR diff includes CLI source (`apps/cli/`) — attach a demo by default; reviewers shouldn't have to clone and run it to see the output.

The deliverable is one or more terminal-window images, each showing a fake prompt line (`user@host dir % <command>`) followed by the command's real, fully-colored output. The renderer emits **two files per demo**: a `.svg` master (crisp at any zoom, a few KB, exact-color — keep it as the source) and a `.png` rasterized from it. **Embed the PNG in the PR** — GitHub does not render SVG in PR/issue bodies, so an embedded SVG shows up broken. The PNG is what reviewers actually see.

## Why a skill exists for this

Capturing colored CLI output correctly has several non-obvious traps that waste time if you hit them mid-task:

1. **Color dies when stdout isn't a TTY.** `packmind-cli` colors its output with `chalk` (see `apps/cli/src/infra/utils/consoleLogger.ts`), which — like most well-behaved CLIs — emits ANSI only when it detects a real terminal _or_ `FORCE_COLOR` is set. Pipe the output to a file with neither and you get plain, colorless text — the exact opposite of the goal. The bundled converter both sets `FORCE_COLOR=3` and runs the command under a **pseudo-terminal (PTY)**, so color survives even for commands that gate strictly on `isTTY`. Don't hand-roll the capture.
2. **The PTY tool differs by OS.** macOS ships BSD `script` (`script -q <file> <cmd>`); Linux ships util-linux `script` (`script -qec "<cmd>" <file>`). And BSD `script` only writes the full session to its _typescript file_, not to a piped stdout. The bundled converter handles both — don't hand-roll it.
3. **GitHub does not render SVG in PR/issue bodies — at all.** Its image proxy (Camo) refuses `image/svg+xml`, so an `![…](…svg)` embed shows up broken no matter whether you use a relative path, a `/raw/` URL, or `raw.githubusercontent.com`. (A committed `.svg` does render on the github.com _file_ view, but that's not where a PR demo lives.) PNG has no such restriction. So: rasterize the SVG to PNG and embed the **PNG**. The renderer does this automatically.
4. **No SVG rasterizer = no PNG.** The PNG step shells out to `rsvg-convert` (package `librsvg2-bin`), which is baked into the Michel worker image (`fly/Dockerfile.worker`). On a dev Mac without it, the script falls back to `qlmanage` (ships with macOS); install `brew install librsvg` for the primary path. If neither exists the script errors with the install hint — don't paper over it with `--no-png` and then embed a broken SVG.

`scripts/render-cli-demo.mjs` codifies the working recipe so you don't relearn it each time.

## The one command you run

```bash
PACKMIND_EDITION="$(bash scripts/michel/resolve-edition.sh)" node .claude/skills/michel-cli-demo-recorder/scripts/render-cli-demo.mjs \
  --out docs/cli-demos/standards-list.svg \
  --text-out docs/cli-demos/standards-list.txt \
  --title "packmind-cli — standards list" \
  --prompt-cmd "packmind-cli standards list" \
  -- node dist/apps/cli/main.cjs standards list
```

This writes three files: `standards-list.svg` (master), `standards-list.png` (rasterized — **this is what you embed**), and `standards-list.txt` (plain-text sidecar). The PNG name is derived from `--out` unless you pass `--png`.

| Flag              | Meaning                                                                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--out`           | where to write the master SVG (**required**)                                                                                                                                                                                                                                 |
| `--png`           | where to write the rasterized PNG (default: `--out` with the extension swapped to `.png`). The PNG is what you embed in the PR.                                                                                                                                              |
| `--no-png`        | skip rasterization, emit the SVG only. Use only when you are _not_ embedding in a PR body (e.g. for a committed file-view link); a PR demo needs the PNG.                                                                                                                    |
| `-- <command...>` | everything after `--` is the command run under the PTY (**required**). For this repo that is `node dist/apps/cli/main.cjs <subcommand…>`.                                                                                                                                    |
| `--prompt-cmd`    | the text drawn on the fake prompt line. Defaults to the actual executed command. Since the real invocation is the verbose `node dist/apps/cli/main.cjs …`, pass the friendly `packmind-cli …` form here so the demo reads cleanly — that _is_ how an installed user runs it. |
| `--title`         | window title-bar caption. Omit for no caption.                                                                                                                                                                                                                               |
| `--cwd`           | directory to run the command in (default: current dir — i.e. the repo root, where `dist/apps/cli/main.cjs` lives).                                                                                                                                                           |
| `--text-out`      | also write an ANSI-stripped plain-text copy. Always pass this — see "Verify".                                                                                                                                                                                                |
| `--theme`         | `dark` (default) or `light`.                                                                                                                                                                                                                                                 |

Runs under `node`. The PNG step needs `rsvg-convert` (`librsvg2-bin`) — baked into the Michel worker image; on a dev Mac it falls back to `qlmanage` or you `brew install librsvg`.

## Recipe

1. **Build the CLI first.** This repo's CLI runs from `dist/`, so build it with `npm run packmind-cli:build`. It produces `dist/apps/cli/main.cjs`, which you then run with `node dist/apps/cli/main.cjs`. A demo of stale `dist/` proves nothing about your change.
2. **Set the edition.** Resolve it from the git remote — `export PACKMIND_EDITION="$(bash scripts/michel/resolve-edition.sh)"` (`oss` for the OSS repo, `proprietary` for packmind-proprietary) — or the CLI may behave differently than expected.
3. **Start anything the CLI talks to.** Commands that hit the Packmind API (`login`, `whoami`, `standards`/`commands`/`skills` pulls, `playbook`) need the local stack up, or they only print the error/unauthenticated path. If you want populated, colorful output, bring the stack up and confirm it's serving before recording — see the **`michel-run-local-dev-stack`** skill (`docker compose up -d`). Local-only commands (`--help`, `--version`, `lint`, `diff`, `config`) need no server. If the _point_ of the demo is the error message, skip the server deliberately.
4. **Pick representative commands.** Choose the invocations that show off the change. Good defaults: the headline command (populated output), `--help`, and any new/changed flag. One demo per invocation — small focused images beat one giant scroll.
5. **Render** each with the command above, writing into a stable folder (`docs/cli-demos/` is a good home; create it). Each render produces both the `.svg` master and the `.png` you'll embed.
6. **Verify** (next section) before trusting the image.
7. **Embed in the PR** (section after).
8. **Clean up** any background stack you started (`docker compose down` — see the `michel-run-local-dev-stack` skill).

## Verify before you commit

Verify by content first, then by eye:

- **Read the `--text-out` sidecar** (primary gate). It's the exact text that got captured, ANSI stripped. Confirm it shows what your change should produce — right rows, right counts, the new flag's effect, aligned columns. If the sidecar is empty or shows an error you didn't intend, the demo is wrong regardless of how the image looks.
- **Read the `.png`** (every host). The rasterizer that produces the PNG also makes it directly viewable — Read the `.png` to confirm colors, bold/dim, and alignment look right. This works on the Linux worker now (the image bakes in `librsvg2-bin`), not just macOS.

A demo that captured the wrong state (server down, stale build, not logged in, empty DB) is worse than no demo — it misleads the reviewer. Treat the sidecar as a required gate.

## Embed in the PR

Commit the **PNG** (and the `.svg` master + optional `.txt`) into the repo on the PR's branch, then embed the **PNG** by **absolute `/raw/` URL** in the PR body — never the SVG (it renders broken). Relative paths and `/blob/` URLs do **not** render in a PR description either; use `https://github.com/<org>/<repo>/raw/<branch-or-commit-sha>/<path>` (pin to the commit sha for a stable image). Directly under the image, add a short **What the demo shows:** bullet list — the written scenario — so a reviewer who can't or won't open the image still understands what was run and what it proves:

````markdown
## CLI demo

![packmind-cli standards list](https://github.com/PackmindHub/packmind/raw/<commit-sha>/docs/cli-demos/standards-list.png)

**What the demo shows:**

- Run `packmind-cli standards list` against a seeded org
- Output lists the 3 active standards with their rule counts, colored by status
- Confirms the new `--status active` flag narrows the list to active standards only

<details><summary>Plain text</summary>

```text
<paste docs/cli-demos/standards-list.txt here, or link it>
```
````

</details>
```

The **What the demo shows:** bullets follow the same rules as the UI demo scenario: synthetic, essentials only (what command runs → what the output proves), one line per bullet, readable without opening the image. The plain-text `<details>` block is a courtesy fallback for anyone whose viewer won't render the image, and it's searchable/diff-able in a way an image isn't.

## What "good" looks like

- The output shown is the **real** output of your changed CLI, against a realistic state — verified via the text sidecar.
- Colors, bold, dim, and column alignment match a real terminal (the converter preserves SGR: 16-color, 256-color, truecolor, bold, dim, italic, underline).
- The prompt line shows the friendly `packmind-cli …` form (via `--prompt-cmd`) — that's how an installed user invokes it — while the command actually executed under the PTY is the repo's `node dist/apps/cli/main.cjs …`.
- One tight demo per invocation (SVG master + PNG); a few KB each.
- The **PNG** is embedded in the PR (renders on GitHub); the SVG is kept as the crisp source.
- For a multi-step change, a small set of demos (headline command + the new flag + an error/edge case) tells the whole story.

## Bundled files

- `scripts/render-cli-demo.mjs` — the whole pipeline: PTY capture (OS-aware) → ANSI/SGR parse → terminal-styled SVG → PNG rasterization (`rsvg-convert`, with a macOS `qlmanage` fallback), plus an optional plain-text sidecar. No npm dependencies; PNG needs `rsvg-convert` (`librsvg2-bin`) on the host.
