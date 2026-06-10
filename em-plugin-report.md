# QA Review Report

**Spec**: em-plugin.md | **Date**: 2026-05-29 | **Branch**: main | **Commit**: 82a829f85
**Rules**: 4 | **Examples**: 8 | **Tech Rules**: 2 | **Events**: 2

## Summary

| Metric               | Count                                       |
| -------------------- | ------------------------------------------- |
| Covered              | 11                                          |
| Partially Covered    | 0                                           |
| Not Covered          | 0                                           |
| Code Findings        | 5 (Critical: 0, High: 1, Medium: 3, Low: 1) |
| Standards Violations | 0                                           |

All spec rules and examples are functionally covered with strong test coverage (unit + e2e). The code review surfaced one High-severity destructive-delete risk and several edge/spec-deviation findings worth addressing.

## Functional Coverage

### Coverage Matrix

| ID         | Rule / Item                                                                                   | Layer               | Status                | Evidence                                                                                                                                                                                                                                                                  | Test Coverage                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------- | ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-E1      | Render into marketplace root → files under `plugins/security`, entry added alongside existing | CLI + Backend       | Covered               | `renderPluginHandler.ts:107-129` (default `plugins/<name>/`, `upsertPluginEntry` `source:./plugins/<name>`, desc from response); `RenderPackageAsPluginUseCase.ts:96-126`; entry shape `{name,source,description}` `pluginsContext.ts:23-27`; siblings preserved `:55-68` | `renderPluginHandler.spec.ts:91-187` (exact entry equals); e2e `plugins.spec.ts:139-185`. Strong                                                                 |
| R1-E2      | Update existing plugin → confirm; writes to EXISTING source path                              | CLI                 | Covered               | `renderPluginHandler.ts:54-105`: prompt; no→exit0; yes→`existingPluginRoot` from `existing.source` (`./backend/plugins/security`→`backend/plugins/security/`), renders there                                                                                              | `renderPluginHandler.spec.ts:189-299` (prompt path, renders at existing path, decline=no-op); e2e `:218-285`. Strong                                             |
| R1-E3      | Delete → folder deleted AND marketplace.json entry removed                                    | CLI                 | Covered               | `deletePluginHandler.ts:59-72`: `rmSync(join(cwd,entry.source))` + `removePluginEntry` + write                                                                                                                                                                            | `deletePluginHandler.spec.ts:71-132` (folder gone, entry undefined, sibling kept); e2e `:187-216`. Strong                                                        |
| R1-E4 / T2 | Remote git source not rendered; user told to use remote workspace                             | CLI                 | Covered               | `renderPluginHandler.ts:55-61` + `deletePluginHandler.ts:59-65`: `isRemoteSource` `pluginsContext.ts:44-46` → error + exit1, no mutation                                                                                                                                  | `renderPluginHandler.spec.ts:301-342`; `deletePluginHandler.spec.ts:134-168`; e2e `:286-314`. Strong. Message wording differs slightly from spec                 |
| R2-E1      | Only plugin.json `{name:security}` → confirm; no→nothing, yes→render in folder                | CLI + Backend       | Covered               | standalone detect `pluginsContext.ts:11-21`; `renderPluginHandler.ts:133-169`: match→confirm; no→exit0; yes→render `pluginRoot:'/'`                                                                                                                                       | `renderPluginHandler.spec.ts:344-425`; e2e `:317-355`. Strong                                                                                                    |
| R2-E2      | plugin.json name mismatch → exact error string                                                | CLI                 | Covered               | `renderPluginHandler.ts:139-143` `The plugin '${name}' is not handled in this repo.`; same `deletePluginHandler.ts:81-85`                                                                                                                                                 | `renderPluginHandler.spec.ts:432-438` (exact assert); `deletePluginHandler.spec.ts:281-288`; e2e `:357-378`. **Note: trailing period vs spec — see MED finding** |
| R3-E1      | Standards skipped; skills+commands rendered + message                                         | Backend + CLI       | Covered               | `ClaudePluginDeployer.ts:125-147` (empty + `lastSkippedStandardsCount`); `RenderPackageAsPluginUseCase.ts:120-144`; CLI msg `renderPluginHandler.ts:176-185`                                                                                                              | `RenderPackageAsPluginUseCase.spec.ts:280-353` (count=5); `renderPluginHandler.spec.ts:154-170`; e2e `:380-411`. Strong                                          |
| R4-E1      | Render in marketplace tracked + distribution-history line                                     | Backend             | Covered (conditional) | `RenderPackageAsPluginUseCase.ts:157-291`: writes `Distribution` `renderModes:[CLAUDE_PLUGIN]`, `source:'cli'`, success. **Condition:** row written only when `gitRemoteUrl` present (`:175`); marketplace=git repo so holds                                              | `RenderPackageAsPluginUseCase.spec.ts:401-512` + `:515-551` (no remote→no row); e2e `:446-464`, `:548-552`. Strong. **See MED finding**                          |
| T1         | Works with marketplace.json; out-of-marketplace (only plugin.json) defined                    | CLI                 | Covered               | `detectPluginMode` `pluginsContext.ts:11-21` → marketplace/standalone/none; `none`→error+exit1 `renderPluginHandler.ts:35-41`, `deletePluginHandler.ts:35-41`                                                                                                             | both specs cover all 3 modes (`renderPluginHandler.spec.ts:79-89`); e2e `:413-431`. Strong                                                                       |
| T2         | Remote sources must NOT render locally                                                        | CLI                 | Covered               | `isRemoteSource` guard both handlers (same as R1-E4)                                                                                                                                                                                                                      | same as R1-E4. Strong. **See MED finding on heuristic**                                                                                                          |
| EV1        | PluginRenderedEvent/`plugin_rendered` + PluginDeletedEvent/`plugin_deleted`                   | Backend + Amplitude | Covered               | emit `RenderPackageAsPluginUseCase.ts:188-199` (always; `marketplaceRepo` when remote), `TrackPluginDeletedUseCase.ts:62-71`; subscribed `AmplitudeEventListener.ts:136-137`, mapped `:535-551`                                                                           | `RenderPackageAsPluginUseCase.spec.ts:478-540`; `AmplitudeEventListener.spec.ts:992-1097`. Strong                                                                |

All rules and examples functionally covered. No reproduction-step gaps.

## Code Review

### Findings

#### [HIGH] Marketplace delete does irreversible `rmSync` with no confirmation and can wipe unintended directories

- **Category**: Bug / Edge Case
- **File**: `apps/cli/src/infra/commands/plugins/deletePluginHandler.ts:67`
- **Description**: Marketplace `delete` runs `rmSync(join(cwd, entry.source), { recursive: true, force: true })` immediately — no `confirmOverwrite` prompt, unlike standalone mode (`:87-94`) which always confirms. `entry.source` is taken verbatim from `marketplace.json`. A hand-edited/malformed entry like `source:"./"` is classified local (`"./".startsWith("./")` → not remote), and `join(cwd,"./")` resolves to `cwd`, so the whole working dir (incl. `.claude-plugin/`) is force-deleted. No guard that source resolves strictly inside `cwd`.
- **Spec Reference**: R1-E3; categories B (destructive ops), E (path handling)
- **Suggested Fix**: Add confirmation prompt for marketplace delete (parity with standalone); resolve `entry.source` to absolute and assert it is a strict subdir of `cwd` (reject `.`/`./`/`/` and `..` escapes) before `rmSync`.

---

#### [MEDIUM] `isRemoteSource` misclassifies bare relative paths as remote

- **Category**: Technical Rule Violation (T2)
- **File**: `apps/cli/src/infra/commands/plugins/pluginsContext.ts:44-46`
- **Description**: Returns `true` for any source not starting with `./` or `/`. Legitimate local entries using bare relative paths (`source:"plugins/security"`, `"backend/plugins/security"`) are treated as remote, so render and delete refuse with the "remote source" message and the user can never operate on a valid local plugin. The CLI writes `./`-prefixed sources, but the file is user/tool-editable and other tooling commonly omits `./`.
- **Spec Reference**: T2 (local path OR git remote; remote must not render locally)
- **Suggested Fix**: Treat as remote only when matching a remote URL shape (`^[a-z]+://`, `^git@`, scp-like `host:path`); default unknown/relative strings to local.

---

#### [MEDIUM] R2-E2 error string deviates from spec's "exactly" wording (trailing period)

- **Category**: Inconsistency / Missing Validation
- **File**: `apps/cli/src/infra/commands/plugins/renderPluginHandler.ts:140`, `deletePluginHandler.ts:82`
- **Description**: Spec requires exactly `The plugin 'security' is not handled in this repo`. Impl (and its tests) emit it with a trailing period. Tests assert the period variant, so they pass but lock in the deviation. Fails any acceptance test asserting exact spec match.
- **Spec Reference**: R2-E2
- **Suggested Fix**: Confirm canonical string with spec owner; drop trailing period to match verbatim, or update spec. Keep render+delete consistent.

---

#### [MEDIUM] Marketplace render outside a git repo writes no distribution row, partially contradicting R4

- **Category**: Missing Validation / Technical Rule
- **File**: `packages/deployments/src/application/useCases/renderPackageAsPlugin/RenderPackageAsPluginUseCase.ts:175-186` (gate), `trackRender:157-206`
- **Description**: `writeDistribution` is only invoked when `gitRemoteUrl` is truthy. A marketplace render in a non-git workspace (or repo with no remote) emits the `plugin_rendered` analytics event but creates NO distribution-history record. R4 states marketplace renders must be "tracked in Packmind" with a history line. Deliberate, commented choice (no git target ⇒ no `Target`), but it silently skips R4 tracking for the no-remote case.
- **Spec Reference**: R4
- **Suggested Fix**: Confirm with spec owner whether R4 tracking is required without a git remote. If so, support a remote-less/synthetic local target so the history line still records; otherwise document the limitation in the spec.

---

#### [LOW] Description-only re-render never clears a removed description; absolute-path sources drift from written files

- **Category**: Edge Case
- **File**: `apps/cli/src/infra/commands/plugins/renderPluginHandler.ts:86-97, 72-74`
- **Description**: (1) Entry `description` only rewritten when `response.pluginDescription` is truthy AND differs; if package description was cleared (`undefined`), stale description persists in `marketplace.json`. (2) `existingPluginRoot = existing.source.replace(/^\.?\//,'')` strips one leading `/`, so absolute source `/plugins/security` → `plugins/security/` (written relative to `cwd`) while the entry still records `/plugins/security` — entry no longer points where files were written. Absolute local sources are unusual; limited impact.
- **Spec Reference**: R1-E2
- **Suggested Fix**: Update description unconditionally to mirror rendered value (incl. clearing); reject absolute local sources or write at the declared absolute location.

### Verified correct (no finding)

- Hexa/NestJS wiring complete: `PluginsService` → `IDeploymentPort` (`@InjectDeploymentAdapter`) → `DeploymentsAdapter`; `PluginsController` guarded by `OrganizationAccessGuard` (`plugins.controller.ts:27`).
- Event payload consistency across event class / `emit()` / `AmplitudeEventListener` handlers; contract + event barrels exported (`contracts/index.ts:41-42`, `events/index.ts:4-5`); gateway↔contract↔controller shapes match.
- Standards: no `@packmind/editions` import, no `Object.setPrototypeOf`, PII masked (email/userId first-6-chars + `*`).

## Deferred Items

Not assessed (out of scope per spec):

- Package versioning and plugin auto-update _(separate US)_
- Handling hooks, MCP servers and agents in rendered plugin _(separate US)_
- Rendering standards as part of the plugin _(explicitly excluded by R3)_

---

_Static analysis only. No code was executed during this review._
