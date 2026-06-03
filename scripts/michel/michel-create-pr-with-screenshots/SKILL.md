---
name: michel-create-pr-with-screenshots
description: Best practices for creating GitHub pull requests that include inline images — CLI terminal screenshots (from cli-demo-recorder), UI screenshots/videos (from ui-demo-recorder), or any other visual artifact. Use this skill whenever opening or updating a PR that has visual artifacts to embed, or when images aren't rendering in a PR description. Also use it when asked "how do I add screenshots to a PR", "why isn't my image showing", or "embed a demo in the PR".
---

# Create PR with Screenshots

GitHub PR descriptions behave differently from README files: **relative paths don't resolve** and **SVG files don't render** (sanitized for XSS). This skill codifies the two-step fix every time: convert to PNG, reference with an absolute raw URL.

## The core rule

| Artifact                 | Renders in PR?             | Fix                  |
| ------------------------ | -------------------------- | -------------------- |
| PNG via absolute raw URL | ✅ always                  | nothing              |
| PNG via relative path    | ❌                         | use absolute URL     |
| SVG via raw URL          | ❌ (blocked by GitHub CSP) | convert to PNG first |
| WebM video               | ❌ inline                  | link, don't embed    |

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

### 3. Build the absolute raw URL

```
https://github.com/<owner>/<repo>/raw/<branch>/<path-to-file>
```

Example:

```
https://github.com/PackmindHub/packmind/raw/feat/my-branch/docs/cli-demos/my-demo.png
```

Get owner/repo/branch from:

```bash
git remote get-url origin   # → https://github.com/PackmindHub/packmind
git branch --show-current   # → feat/my-branch
```

### 4. Embed in the PR body

````markdown
## CLI demo

![description](https://github.com/<owner>/<repo>/raw/<branch>/docs/cli-demos/my-demo.png)

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
![list-tasks](https://github.com/PackmindHub/packmind/raw/feat/my-branch/docs/cli-demos/list-tasks.png)

**Empty board:**
![list-tasks-empty](https://github.com/PackmindHub/packmind/raw/feat/my-branch/docs/cli-demos/list-tasks-empty.png)
```

For **WebM videos** (from ui-demo-recorder): GitHub doesn't play video inline in PR descriptions. Link it instead:

```markdown
[▶ demo.webm](https://github.com/<owner>/<repo>/raw/<branch>/videos/demo.webm) (click to play/download)
```

## Quick checklist

Before opening/updating the PR:

- [ ] PNG committed and pushed (not just SVG)
- [ ] URL uses `https://github.com/<owner>/<repo>/raw/<branch>/...` (absolute, not relative)
- [ ] Branch name in URL matches the actual branch
- [ ] Verify by opening the URL directly in a browser — if it returns 404, the file isn't pushed yet

## Where to store images

| Source                       | Recommended path                                                    |
| ---------------------------- | ------------------------------------------------------------------- |
| cli-demo-recorder            | `docs/cli-demos/<name>.png`                                         |
| ui-demo-recorder (manual PR) | `docs/screenshots/<name>.png`                                       |
| Michel agent artifacts       | `.agent/artifacts/issue-<N>/<name>.png` (agent writes here already) |

Pick a stable path — the URL in old PR descriptions will keep pointing there forever.
