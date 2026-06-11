---
name: michel-create-pr-with-screenshots
description: Best practices for creating GitHub pull requests that include inline images — CLI terminal screenshots (from cli-demo-recorder), UI screenshots/videos (from ui-demo-recorder), or any other visual artifact. Use this skill whenever opening or updating a PR that has visual artifacts to embed, or when images aren't rendering in a PR description. Also use it when asked "how do I add screenshots to a PR", "why isn't my image showing", or "embed a demo in the PR".
---

# Create PR with Screenshots

GitHub PR descriptions behave differently from README files: **relative paths don't resolve** and **SVG files don't render** (sanitized for XSS). This skill codifies the two-step fix every time: convert to PNG, reference with an absolute raw URL pinned to the commit SHA.

> **Running as the Michel agent?** You do NOT build these URLs by hand. Write the PR body with the literal `<!-- ARTIFACTS_PLACEHOLDER -->` token (see the implementation prompt's `## Artifacts` section) and drop every file under `.agent/artifacts/issue-<N>/`. The publish step lists each file and injects correctly-formed, SHA-pinned image/video markup at the token. Hand-writing paths or `![](...)` there renders as dead text and the artifacts are lost. The rest of this skill is for the manual case — opening a PR yourself.
>
> The publish step (`fly/lib/phases/publish.sh`) **owns the entire `## Artifacts` section**: it injects the generated block at the heading and discards every line under it — any relative-path images, stray tokens, or hand-written subsections — up to the next `## ` heading. So hand-written junk there is now wiped rather than shipped (it used to survive next to the injected block — see PR #41, where a hand-written `### Screenshots` block with `![](.agent/...)` paths rendered as broken images). This is a backstop, not a license: still emit only the bare token.

## The core rule

| Artifact                         | Renders in PR?              | Fix                   |
| -------------------------------- | --------------------------- | --------------------- |
| PNG via raw URL pinned to SHA    | ✅                          | nothing               |
| PNG via raw URL pinned to branch | ⚠️ dies when branch deleted | pin to the commit SHA |
| PNG via relative path            | ❌                          | use absolute URL      |
| SVG via raw URL                  | ❌ (blocked by GitHub CSP)  | convert to PNG first  |
| WebM / MP4 video                 | ❌ inline                   | link, don't embed     |

On a **private repo**, raw URLs render only for viewers who are logged-in members — fine for internal PR review (the curl-with-token test below will 404 because the `/raw/` route wants a browser session, not a PAT — that's expected, not a failure). There is no anonymous fallback short of uploading the file as a GitHub user-attachment via the web composer.

## Step-by-step

### 1. Get a PNG

**From cli-demo-recorder (SVG output)**

The recorder writes SVG. Convert it to PNG before committing:

```bash
# macOS
qlmanage -t -s 1400 -o docs/cli-demos/ docs/cli-demos/my-demo.svg
# produces docs/cli-demos/my-demo.svg.png — rename for clarity:
mv docs/cli-demos/my-demo.svg.png docs/cli-demos/my-demo.png
```

```bash
# Linux (install once: apt install librsvg2-bin)
rsvg-convert -w 1400 docs/cli-demos/my-demo.svg -o docs/cli-demos/my-demo.png
```

Keep the SVG in the repo (crisp at any zoom in README/docs). Commit **both** — SVG for docs, PNG for PR.

**From ui-demo-recorder (PNG screenshots)**

The recorder already produces PNGs — no conversion needed. They land in `screenshots/` or `.agent/artifacts/`.

### 2. Commit the PNG to the branch

```bash
git add docs/cli-demos/my-demo.png
git commit -m "..."
git push
```

The file must be pushed before the URL resolves. GitHub serves uncommitted files as 404.

### 3. Build the absolute raw URL — pinned to the commit SHA

```
https://github.com/<owner>/<repo>/raw/<commit-sha>/<path-to-file>
```

Pin to the **commit SHA**, not the branch. `raw/<branch>/...` 404s the moment the branch is deleted on merge — silently breaking every image in an already-merged PR. The SHA-pinned blob lives in history forever.

Example:

```
https://github.com/PackmindHub/packmind/raw/9f3c1ab2/docs/cli-demos/my-demo.png
```

Get owner/repo/sha from:

```bash
git remote get-url origin   # → https://github.com/PackmindHub/packmind
git rev-parse HEAD          # → 9f3c1ab2... (the pushed commit that holds the file)
```

### 4. Embed in the PR body

````markdown
## CLI demo

![description](https://github.com/<owner>/<repo>/raw/<commit-sha>/docs/cli-demos/my-demo.png)

<details><summary>Plain text</summary>

```text
<paste .txt sidecar content here>
```
````

</details>
```

For **multiple images**, group them logically — one caption per image, collapsed plain-text fallback for each:

```markdown
**Populated board:**
![list-tasks](https://github.com/PackmindHub/packmind/raw/9f3c1ab2/docs/cli-demos/list-tasks.png)

**Empty board:**
![list-tasks-empty](https://github.com/PackmindHub/packmind/raw/9f3c1ab2/docs/cli-demos/list-tasks-empty.png)
```

For **WebM videos** (from ui-demo-recorder): GitHub doesn't play video inline in PR descriptions. Link it instead:

```markdown
[▶ demo.webm](https://github.com/<owner>/<repo>/raw/<commit-sha>/videos/demo.webm) (click to play/download)
```

## Quick checklist

Before opening/updating the PR:

- [ ] PNG committed and pushed (not just SVG)
- [ ] URL uses `https://github.com/<owner>/<repo>/raw/<commit-sha>/...` (absolute + SHA-pinned, not relative, not branch-pinned)
- [ ] The SHA in the URL is a commit that's been pushed (`git rev-parse HEAD` after push)
- [ ] Verify by opening the URL in a browser **while logged in** — a 404 means the file isn't pushed (or, on a private repo via curl+PAT, just that the route needs a session — check in the browser)

## Where to store images

| Source                       | Recommended path                                                    |
| ---------------------------- | ------------------------------------------------------------------- |
| cli-demo-recorder            | `docs/cli-demos/<name>.png`                                         |
| ui-demo-recorder (manual PR) | `docs/screenshots/<name>.png`                                       |
| Michel agent artifacts       | `.agent/artifacts/issue-<N>/<name>.png` (agent writes here already) |

Pick a stable path — the URL in old PR descriptions will keep pointing there forever.
