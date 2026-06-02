---
name: michel-ui-demo-recorder
description: Record polished UI demo videos and screenshots of a running web app using Playwright MCP — for client deliverables, release notes, feature walkthroughs, or bug repros. Produces an HD WebM video with chapter markers, a mandatory animated cursor overlay, and a mandatory subtitle bar that narrates each step (positioned deliberately so it never masks the UI being demonstrated), plus full-page screenshots at each step. Use this whenever the user asks to "record a demo", "create a screencast", "make a UI walkthrough video", "document this feature with video", "show the client how X works", "capture screenshots of the app", or anything similar — even when the user only says "make a video" or "take screenshots" in the context of a running frontend. Also use it when the user wants to demonstrate a workflow, generate marketing-quality footage of an app, or produce repeatable visual documentation.
---

# UI Demo Recorder

Produce client-ready UI documentation (HD video + screenshots) from a running web app using the Playwright MCP video tools.

## When to reach for this skill

- "Record a demo / walkthrough / screencast / video of the app"
- "Take screenshots of the feature working"
- "Show the client what X looks like"
- "Document this flow visually"
- "Make a GIF/video of clicking through Y"

The deliverable is always one or more of:

- WebM video (1440×900 HD by default), with optional chapter cards
- Full-page PNG screenshots at key moments
- An animated cursor overlay so viewers can follow what's being clicked (**always present**)
- A subtitle bar narrating each step (**always present**)

**Non-negotiable:** every video this skill produces MUST carry both the cursor overlay and the subtitle bar. They are injected via `browser_evaluate` (pure DOM), independent of `.mcp.json` — a run that omits them is a defective deliverable, not a stylistic choice. If you cannot inject them, stop and report why rather than shipping a bare recording.

## Why a skill exists for this

The Playwright MCP video tools work, but they have several non-obvious gotchas that waste a lot of time if you discover them mid-recording:

1. The video tools live behind an opt-in flag (`--caps=devtools`) and are silently absent if the MCP server wasn't launched with it.
2. There are usually **two different Playwright MCP tool prefixes** in the deferred-tools list (a stock one and a plugin one). They use **different browser contexts**, and only one of them can record video. Mixing them mid-session causes "Browser is already in use" errors.
3. The recorder doesn't render the OS cursor — videos look like the app is operating itself unless you inject a fake cursor.
4. Any `location.reload()` wipes the injected cursor — it must be reinjected.
5. The output file lands at the _project root_, not in whatever `--output-dir` says.

This skill codifies the working recipe so the model doesn't relearn it every time.

## Pre-flight check (do this first, every time)

### 1. Confirm the Playwright MCP has `--caps=devtools`

Open `.mcp.json` (project root or `~/.claude/.mcp.json`). The Playwright server entry **must** include `--caps=devtools` in its args. If it doesn't, video tools won't be exposed.

Working config:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--caps=devtools",
        "--output-dir=./videos"
      ]
    }
  }
}
```

If you have to add the flag, tell the user — they have to reload MCP (`/mcp` reconnect or restart Claude Code) before `browser_start_video` becomes callable.

### 2. Confirm the right tool prefix

Use `ToolSearch` for `mcp__playwright__browser_start_video`. The video tools belong to the `mcp__playwright__browser_*` family. Use the **same prefix** for every browser interaction in the recording — `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, `browser_wait_for`, `browser_evaluate`, `browser_close`. **Do not mix in `mcp__plugin_playwright_playwright__browser_*`** — that's a different MCP server with a different browser context; mixing causes "Browser is already in use".

### 3. Get the app running — from a clean volume

See the **`michel-run-local-dev-stack`** skill for the full stack lifecycle. Packmind runs as a Docker Compose stack (PostgreSQL, Redis, NestJS API on **:3000**, React/Vite frontend on **:4200**, MCP server). For recordings, start from **wiped volumes** so stale Postgres schema/rows from a prior run don't leak into the footage, then confirm it's serving before recording:

```bash
PACKMIND_EDITION=oss docker compose down -v && PACKMIND_EDITION=oss docker compose up -d --build
# wait for the API (it runs migrations on boot — this can take a minute on a cold build)
until curl -sf localhost:3000/api/v0 >/dev/null; do sleep 1; done
# then wait for the frontend you'll actually record
until curl -sf localhost:4200/ >/dev/null; do sleep 1; done
```

The frontend you record lives at **<http://localhost:4200>** — navigate there, not at the API port.

On a freshly wiped database there is no account, so the first screen is the **sign-up / login** page. Create an account (or seed via the API) before recording the feature, otherwise the demo is just the auth screen. If a populated workspace matters, seed it via the UI or the API after the stack is up — do not record over stale state.

## Recording recipe

The recipe in plain English:

1. Make sure no browser tab is currently open on the Playwright side, and **always call `browser_stop_video` first (ignore any error it returns)** to clear a recorder a prior session may have left open. Delete any stub WebMs it drops at the project root.
2. Start the video.
3. Navigate to the app.
4. **Inject BOTH overlays — cursor and subtitle bar — in one `browser_evaluate`. This step is mandatory, never skip it.**
5. Add a chapter card.
6. Drive the UI (click, type slowly, wait for visible feedback). Call `window.__setSubtitle(...)` before every step.
7. Whenever the page reloads, **reinject BOTH overlays** (cursor + subtitle bar). A reload wipes them.
8. Add chapter cards between major sections.
9. Stop the video.
10. Move the file from project root into `videos/`.
11. Stop the app stack (`docker compose down` — see the `michel-run-local-dev-stack` skill).

### Starting the video (with the common pitfall)

**Always call `browser_stop_video` before `start_video`, even on the first recording** — wrap it so its error is ignored. A prior session (or a crashed run on the same sprite) frequently leaves a screencast open, and `start_video` then fails with `Error: Screencast is already started`. Stopping first is idempotent: if nothing was recording it's a harmless no-op; if something was, it clears it.

```
mcp__playwright__browser_stop_video()   # ignore any error; deletes/returns stub WebMs at project root
mcp__playwright__browser_start_video(
  filename="<name>.webm",
  size={"width": 1440, "height": 900}
)
```

If you still get `Error: Screencast is already started` after that, call `browser_stop_video` again, delete the stub WebMs it drops at the project root, then retry `start_video`.

If you get `Browser is already in use for ... use --isolated`, a non-recording Playwright session has the persistent profile locked. Call `mcp__playwright__browser_close` first, then start_video.

### Injecting the cursor overlay

The Playwright video recorder is a CDP screencast of the viewport — the real OS cursor is never in the frame. To make the video readable, inject a DOM cursor that listens to `mousemove`/`mousedown`/`mouseup` (Playwright's pointer events do dispatch these in capture phase).

Run the script in `scripts/inject-cursor.js` (relative to **this skill's directory**, not the project repo you're working in — the agent cwd is usually a checked-out repo that has no such file) via `browser_evaluate` immediately after every navigate or reload. **Inject the cursor and the subtitle bar (next section) together in a single `browser_evaluate`** so neither is ever forgotten — call both injector bodies in one function:

```
mcp__playwright__browser_evaluate(function=`() => {
  (<contents of scripts/inject-cursor.js>)();
  (<contents of scripts/inject-subtitles.js>)({position: 'bottom'});
}`)
```

The cursor is:

- A blue radial-gradient disk with a soft glow
- Animates with a 220ms CSS transition so jumps look smooth
- Turns red and shrinks on `mousedown`
- Emits an expanding ring "ripple" on click

Reinject after every `location.reload()` — there is no `initScript` equivalent exposed in MCP, so it has to be a manual step.

### Chapter cards

`mcp__playwright__browser_video_chapter` renders a full-screen card with a blurred backdrop over the page for a configurable duration.

**Scale to flow complexity — do not use 3-6 cards by default:**

- ≤5 action steps → **0-1 cards max** (one opener only if the flow needs context)
- 6-12 steps → 2-3 cards (intro + sections)
- 12+ steps → up to 5 cards

Every card adds dead time. For short demos like "create a standard" or "open a recipe", skip chapter cards entirely or use a single 1000ms opener.

**Duration is raw recording time — multiply by your speedup factor to get on-screen time.** A `duration: 2000` card at 4× speedup shows for only 500 ms after ffmpeg — too fast to read. Formula: `duration = desired_screen_ms × speedup`. For a 2 s on-screen hold at 4×, set `duration: 8000`. At 2× use `4000`, at 3× use `6000`.

### Subtitle bar (continuous narration) — mandatory

Chapter cards interrupt the action. For inline narration that doesn't hide the UI — short captions that explain each step while the viewer watches the click happen — inject a subtitle bar via `scripts/inject-subtitles.js`. **This is required on every recording, not optional.** Bundle it with the cursor injection so both go in with one `browser_evaluate` (see the combined snippet above), and reinject both after every reload.

The script exposes `window.__setSubtitle(text)`. Call it before each step:

```
mcp__playwright__browser_evaluate(function="() => window.__setSubtitle('Type the task name')")
```

Pass an empty string or `null` to hide the bar.

**Pick the position deliberately.** The default is bottom-center. A subtitle that sits over the very area the viewer needs to watch defeats the purpose — they'll either miss the action or miss the caption.

- If the action happens in the **header/top bar** (a form, search input, primary CTA at the top), use the **bottom** position (default).
- If the action happens in a **footer, sticky action bar, or fixed bottom CTA**, switch to the **top** position by passing `{position: 'top'}` to the injector, or call `window.__moveSubtitle('top')` mid-recording.
- If a single screen has critical content at both top and bottom, reposition between steps with `window.__moveSubtitle` so the bar always sits on the inert side of the UI.

The bar fades + slides on text change (280ms) so swaps look intentional rather than glitchy. Reinject after `location.reload()` along with the cursor.

### Lead-in dead air

The recorder buffers for a second or two after `start_video` before useful frames appear. Combined with MCP tool round-trip latency, the first ~10–25 seconds of the WebM can show an empty page or `about:blank`. Mitigations:

1. Set the first subtitle and a chapter card **before** the first `wait_for` — gives the viewer something to read during the lead-in.
2. Keep the gap between `start_video`, `navigate`, and the inject-overlays `browser_evaluate` as tight as possible — no intermediate snapshots.
3. **Always trim dead air in post** — add `-ss 5` before the speedup step (see post-processing section). This cuts the first 5 seconds from the raw file before any speedup is applied, removing blank openers at essentially zero quality cost.

### Typing and clicking — make it watchable

- `browser_type(..., slowly=true)` types one character at a time. Use it for any text the viewer should read.
- Before each `browser_click`, take a fresh `browser_snapshot` to get current refs (refs change after re-renders).
- After actions that change the DOM, call `browser_wait_for(text=<expected new content>)` instead of arbitrary sleeps — recordings made of `wait_for` look like a real user; recordings made of fixed sleeps look robotic.
- **`wait_for(text=...)` must use the label the UI actually renders, not the one you assume.** A guessed string that never appears burns the full 30s timeout. Read the real text from a fresh `browser_snapshot` first, then wait on it. If a step is flaky to wait on by text, drive it via `browser_evaluate` instead of waiting.

### Do not use snapshot `ref=` tokens as click selectors

`browser_snapshot` output contains `ref=eXX` tokens. They look like selectors but are snapshot-internal handles, **not** selector-engine names — passing one to `browser_click` fails with `Error: Unknown engine ref`. Target elements by text or CSS instead: `:text('Add task')`, `input[name="assignee"]`, etc. — or drive the interaction with `browser_evaluate`.

### Clearing a text input (there is no `browser_triple_click`)

The Playwright MCP exposes **no** `browser_triple_click`, and `browser_type` appends — it does not replace existing text. The Packmind frontend is React (Chakra UI / `@packmind/ui`), so its inputs are controlled. To clear a field (e.g. before retyping into an edit drawer), set the value via `browser_evaluate` and dispatch an `input` event so React's controlled state updates:

```
mcp__playwright__browser_evaluate(function=`() => {
  const el = document.querySelector('<selector>');   // e.g. input[name="name"]
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, '');                                 // native setter so React sees the change
  el.dispatchEvent(new Event('input', { bubbles: true }));
}`)
```

Using the native value setter (not `el.value = ''`) is required for React-controlled inputs — a plain assignment is silently overwritten on the next render. After clearing, `browser_type(slowly=true)` the new text so the viewer reads it.

### When a click doesn't propagate (drag-drop and friends)

The Playwright `browser_drag` tool dispatches mouse events but does **not** reliably trigger libraries that use pointer-event sensors (e.g. `@dnd-kit`'s `PointerSensor`). If you see the drag "land" on the wrong drop zone or no state change happens, don't fight it. Switch to driving state via the app's API:

```
mcp__playwright__browser_evaluate(function=`async () => {
  // fetch + PATCH the relevant endpoint
  // then location.reload()
}`)
```

Then reinject the cursor. The video still shows the UI visually changing — viewers don't see the difference.

### Screenshots

**Create the target dir before the first capture.** `browser_take_screenshot` throws `ENOENT` if the directory in `filePath` doesn't exist — it will not create it. Run `mkdir -p screenshots` once up front:

```bash
mkdir -p screenshots
```

Use `browser_take_screenshot(filePath=..., fullPage=true)` for full-page PNGs at moments worth capturing as stills. Number them (`01-initial.png`, `02-typing.png`, ...) so they sort correctly. Save them under `screenshots/` inside the project.

If the project doesn't have ffmpeg/ImageMagick installed and you also want a GIF or MP4 from a sequence of stills (for an environment that can't play WebM), use a Python venv with `Pillow` (GIF) or `imageio-ffmpeg` (MP4) — both ship a usable binary so brew install isn't needed.

## Stopping and packaging

```
mcp__playwright__browser_stop_video()
mcp__playwright__browser_close()
```

The WebM lands at the **project root**, not in `videos/`, regardless of what `--output-dir` says. Move it:

```bash
mv ./<name>.webm ./videos/
```

Stop the app stack you started in the background (`docker compose down`) — don't leave it running. See the `michel-run-local-dev-stack` skill for the teardown rationale.

## Post-processing: trim dead air and speed up

Playwright recordings run at real-time wall-clock speed, which includes MCP round-trip latency. The raw WebM always feels sluggish. **Always apply both steps after moving the file:**

### Step 1: check raw duration and choose speed multiplier

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 ./videos/<name>.webm
```

Pick multiplier based on raw duration:

- < 60s → **2×** (`setpts=0.5*PTS`)
- 60–120s → **3×** (`setpts=0.333*PTS`)
- > 120s → **4×** (`setpts=0.25*PTS`)

### Step 2: trim lead-in and apply speedup in one pass

```bash
# Replace SETPTS with the value chosen above (0.5, 0.333, or 0.25)
ffmpeg -i ./videos/<name>.webm \
  -vf "setpts=SETPTS*PTS,fps=30" \
  -an -c:v libvpx-vp9 -b:v 2M \
  -ss 5 \
  ./videos/<name>-fast.webm && mv ./videos/<name>-fast.webm ./videos/<name>.webm
```

`-ss 5` (placed **after** `-i`, output-side) trims the first 5 seconds (blank lead-in) accurately. `-an` drops the silent audio track.

**The `fps=30` and explicit `-c:v libvpx-vp9 -b:v 2M` are mandatory — do not drop them.** Playwright's recorder is a CDP screencast: a **variable-frame-rate** stream that emits a frame only when the page changes, leaving large gaps between PTS timestamps. Applying `setpts` alone and re-encoding with libvpx defaults keeps those sparse frames, producing a file that _reports_ the full duration in its container metadata but holds almost no real frames — it plays for a few seconds then freezes or won't play at all. (Symptom seen in the wild: a 169s source produced a 256 KB "fast" file that still claimed 169s duration but only showed ~4s of content.) The `fps=30` filter resamples the VFR stream to a **constant 30 fps**, regenerating real frames across the whole timeline; the explicit codec + bitrate guarantee a clean VP9 re-encode instead of a degenerate passthrough.

**Verify the output before shipping it.** A correct fast file's duration ≈ source duration × SETPTS, and its size is a meaningful fraction of the source. Check:

```bash
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 ./videos/<name>.webm
```

If the duration didn't shrink by the multiplier, or the file collapsed to a tiny fraction of the source (e.g. 6 MB source → 256 KB output), the re-encode is corrupt — do **not** hand it over. Re-run with `fps=30` present.

If the recording has a real audio track (rare for app demos), remove `-an` and add `-af "atempo=2.0"` (only valid for 2×; higher speedups need chained atempo filters).

**Why the subtitle `minHold` is 2500ms:** at 2× speed that becomes ≈1.25 s on screen — long enough to read a short caption comfortably. At 3× it becomes ≈0.83 s — still readable for short captions. Do not lower `minHold` below 2000ms or subtitles will flash too fast after the speed-up. If you skip the ffmpeg step, the default hold will make subtitles feel unnecessarily long — only skip if ffmpeg is not available.

## What "good" looks like

- Resolution 1440×900 or larger
- Smooth cursor that's clearly visible against the app's UI — **present the whole time** (no bare frames)
- A subtitle caption visible for **every** step, repositioned so it never masks the active UI
- 3–6 chapter cards (intro, 2–4 sections, outro)
- ~15–60 seconds total for focused flows (single feature/action); 60–90 s for multi-section walkthroughs — anything longer should be split or sped up more aggressively
- File size 4–15 MB for typical demos; if it's bigger, the run was too long
- No console errors visible in the video (close DevTools if it was open)

## What to tell the user at the end

Hand over:

- The path of the final WebM
- A one-line summary of the chapters
- Anything that was faked (e.g. "drag-drop was driven via the API because dnd-kit doesn't respond to MCP drag synth")
- A reminder that WebM may need a modern browser or VLC to play; offer to also produce an MP4 if the client uses a tool that doesn't accept WebM

## Reference material

- `scripts/inject-cursor.js` — paste-ready cursor overlay
- `scripts/inject-subtitles.js` — paste-ready subtitle bar with `__setSubtitle` / `__moveSubtitle` helpers
- `scripts/check-mcp-config.sh` — one-liner to confirm `--caps=devtools` is set
- `references/playwright-mcp-tools.md` — table of the relevant tools and their gotchas
