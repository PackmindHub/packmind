# Playwright MCP — UI demo recording tool reference

Quick lookup for the tools used by this skill, with the gotchas that bit us in the past.

## Tool prefixes

The Playwright MCP often shows up twice in `ToolSearch` — once with the stock prefix and once with a `_plugin_` prefix. They are different MCP servers with **different browser contexts**. The video tools belong to the stock prefix. Mixing prefixes in one recording causes `Browser is already in use` errors.

| Family used here             | Family to avoid mixing in                      |
| ---------------------------- | ---------------------------------------------- |
| `mcp__playwright__browser_*` | `mcp__plugin_playwright_playwright__browser_*` |

Pick one and stay with it for the whole recording.

## Video tools (require `--caps=devtools`)

| Tool                     | Purpose                                                 | Notes                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browser_start_video`    | Begin recording                                         | Accepts `filename` and `size: {width, height}`. **Always call `stop_video` first (ignore its error)** — prior sessions routinely leave a recorder open and this errors with `Screencast is already started`. Errors with `Browser is already in use` if a non-recording session has the profile locked — `browser_close` first. |
| `browser_stop_video`     | End recording                                           | Returns one or more `[Video](./<name>.webm)` paths. The actual file lands at the **project root**, not `--output-dir`. Move it afterwards.                                                                                                                                                                                      |
| `browser_video_chapter`  | Render a full-screen chapter card with blurred backdrop | `title` (required), optional `description` and `duration` in ms. Use 1500–3000ms.                                                                                                                                                                                                                                               |
| `browser_highlight`      | Persistent overlay around an element                    | `target` (snapshot ref), optional `style` for inline CSS. Pairs with `browser_hide_highlight`.                                                                                                                                                                                                                                  |
| `browser_hide_highlight` | Remove a highlight                                      | `target` and `element` must match what was passed to `browser_highlight`.                                                                                                                                                                                                                                                       |
| `browser_annotate`       | Open Playwright Dashboard in annotation mode            | Interactive — waits for human input. Not useful for automated recordings.                                                                                                                                                                                                                                                       |

## Driver tools used during a recording

| Tool               | Notes                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browser_navigate` | After this, reinject the cursor overlay.                                                                                                                         |
| `browser_snapshot` | Always take a fresh snapshot right before a click — refs change after re-renders.                                                                                |
| `browser_click`    | `target` is the ref from the latest snapshot.                                                                                                                    |
| `browser_type`     | Pass `slowly: true` for text the viewer should read.                                                                                                             |
| `browser_wait_for` | Prefer `text` / `textGone` over `time` — recordings made of `wait_for` text look like a real user; recordings made of fixed sleeps look robotic.                 |
| `browser_evaluate` | The only way to inject the cursor overlay. Also a fallback for state changes that don't propagate through MCP-synthesized events (drag-drop is the common case). |
| `browser_resize`   | Use only when the size of the actual viewport matters; `start_video`'s `size` already sets the recording dimensions.                                             |
| `browser_close`    | Closes the tab. Useful between sessions when `start_video` complains about a locked profile.                                                                     |

## Drag-and-drop gotcha

`browser_drag` dispatches mouse events but does not reliably trigger libraries that rely on PointerEvents (`@dnd-kit`, some custom DnD setups). Symptoms:

- The drop "lands" back on the source.
- Accessibility live-region announces a drop, but no state changes.
- The visual reorder doesn't happen.

When this happens, switch to driving state via the app's API from inside `browser_evaluate`, then `location.reload()`. The video still shows the UI visually reordering — viewers can't tell the difference. Remember to reinject the cursor overlay after the reload.

## What's missing

- No `mouse_move` for free-form cursor animation. Cursor only moves on actual click/type events. To animate the cursor between actions, fire dummy hovers (`browser_hover` on a neutral element).
- No `initScript` exposed via MCP — the cursor injection must be repeated after every navigate/reload.
- No native screen capture of the OS cursor. Hence the DOM overlay.
- `--output-dir` config arg is honored for snapshots and logs but **not** for the WebM file. The WebM is written to the process CWD.
- **No `browser_triple_click`** (and `browser_type` appends rather than replacing). To clear a text input, set its value via `browser_evaluate` using the native `HTMLInputElement.prototype.value` setter and dispatch an `input` event — a plain `el.value = ''` is ignored by React-controlled inputs. See "Clearing a text input" in SKILL.md.

## Screenshots gotcha

`browser_take_screenshot(filePath=...)` throws `ENOENT` when the directory in `filePath` does not exist — it will not create it. Run `mkdir -p screenshots` (or whatever dir you target) before the first capture.
