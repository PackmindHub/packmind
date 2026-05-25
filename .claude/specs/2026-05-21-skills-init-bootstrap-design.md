# `skills init` Empty-Directory Bootstrap — Design Spec

**Goal:** When `packmind-cli skills init` runs in a directory with neither `packmind.json` nor `packmind-lock.json`, fetch the organization's configured render modes from the server, map them to coding agents, and persist them to a new `packmind.json` before installing default skills.

**Scope:**
- In: the `skills init` (a.k.a. `install-default`) CLI command path only.
- Out: the same behavior for `install <pkg>`, refactoring `configAgentsHandler` to share its render-mode-fetch logic, and migrating partially-populated existing `packmind.json` files.

## Source

None (fresh idea — surfaced during manual testing of the `default-skills-lockfile-tracking` sprint).

## Architecture

Add a private bootstrap step at the top of `InstallDefaultSkillsUseCase.execute()`:

1. Read `packmind.json` via `configFileRepository.readConfig(baseDirectory)`.
2. Read `packmind-lock.json` via `lockFileRepository.read(baseDirectory)`.
3. If **both** are absent (each returns `null`):
   a. Call `packmindGateway.deployment.getRenderModeConfiguration({})`.
   b. Map `configuration.activeRenderModes` to `CodingAgent[]` via `RENDER_MODE_TO_CODING_AGENT`.
   c. If the gateway throws OR the mapped agents array is empty → throw `SkillsInitBootstrapError`.
   d. Otherwise call `configFileRepository.updateAgentsConfig(baseDirectory, agents)` to write `packmind.json`.
4. Re-read config (so the downstream `getDefaults` call picks up the freshly-written `agents`).
5. Proceed with the existing install flow unchanged.

The CLI handler (`installDefaultSkillsCommand`) gains an `instanceof SkillsInitBootstrapError` branch in its `catch`. When matched, it prints the directive message and exits with code 1.

```
Couldn't determine your organization's coding agents.
Run `packmind init` to configure them interactively.
```

The error is checked first (before the generic `error instanceof Error` branch) so the directive message wins.

### Why `InstallDefaultSkillsUseCase` and not a separate use case

The use case already injects every port we need (`configFileRepository`, `lockFileRepository`, `packmindGateway`). It already reads config; adding the lockfile read and a conditional bootstrap-write is contained. No new ports, no new injection, no new application-layer scaffolding. The `init` (full onboarding) command path is unaffected because `configAgentsHandler` always writes `packmind.json` first, so the bootstrap conditional is never satisfied when reached from `init`.

### Triggering condition (locked in)

`config === null && lockFile === null`. If only the lockfile is present (anomalous state — manual deletion of `packmind.json`), we do **not** bootstrap. The use case will proceed with `agents: undefined` exactly as today.

## Data Model

No schema changes. The shape of `packmind.json` we write is the existing `{ packages: {}, agents: CodingAgent[] }` form already produced by `configFileRepository.updateAgentsConfig`.

## Use Cases / Services

| Item | Change |
|---|---|
| `apps/cli/src/application/useCases/InstallDefaultSkillsUseCase.ts` | Add `bootstrapEmptyDirectory()` private method; call from `execute()` start. Re-read config after bootstrap. |
| `apps/cli/src/domain/useCases/IInstallDefaultSkillsUseCase.ts` | Export new `SkillsInitBootstrapError` class (or co-locate in the use case file — final placement decided in the plan). |
| `apps/cli/src/infra/commands/skills/InstallDefaultSkillsCommand.ts` | Add `instanceof SkillsInitBootstrapError` branch in the catch ahead of the generic error branch. |

## API / CLI / Frontend Surface

- **CLI behavior change** for `packmind-cli skills init`:
  - In a truly fresh directory, the command now performs an extra preflight call to the server (`getRenderModeConfiguration`) and writes `packmind.json` before installing skills.
  - When that preflight fails or yields zero modes, the command **errors out** with the directive message and exits 1 (today: silently passes `agents: undefined` to the server and proceeds with org defaults).
  - In all other cases (config present, or only lockfile present), behavior is unchanged.
- **No public TypeScript API surface change** beyond the new exported error class.
- **No HTTP API change** — `getRenderModeConfiguration` is already deployed.

## Testing Approach

### Unit (`InstallDefaultSkillsUseCase.spec.ts`)

Four new test cases:

1. **Bootstrap happy path.** Both `readConfig` and `lockFileRepository.read` return `null`. Stub `getRenderModeConfiguration` to return `{ configuration: { activeRenderModes: [<some modes>] } }`. Assert:
   - `updateAgentsConfig` was called once with the mapped agents.
   - `getDefaults` was then called with `agents` equal to the mapped agents (proving the re-read).
   - Install path proceeded normally.
2. **Bootstrap — gateway throws.** Stub `getRenderModeConfiguration` to throw. Assert `execute()` rejects with `SkillsInitBootstrapError`.
3. **Bootstrap — empty active modes.** Stub `getRenderModeConfiguration` to return `{ configuration: { activeRenderModes: [] } }`. Assert `execute()` rejects with `SkillsInitBootstrapError`.
4. **No bootstrap when only lockfile present.** `readConfig` returns null, `lockFileRepository.read` returns a non-null lockfile. Assert `getRenderModeConfiguration` was NOT called, `updateAgentsConfig` was NOT called, and `getDefaults` received `agents: undefined`.

A fifth case — **no bootstrap when config present** — is implicitly covered by existing tests that already mock `readConfig` to return a non-null config. We'll verify the existing assertions still hold (regression).

### Unit (`InstallDefaultSkillsCommand.spec.ts` if it exists; else inline equivalent)

One new case: when the use case throws `SkillsInitBootstrapError`, the handler prints the directive message to stderr and exits with code 1. Will mock the hexa accordingly. If no `.spec.ts` exists for the command file today, we don't add one — the e2e covers it.

### E2E (`apps/cli-e2e-tests/src/skills-init.spec.ts` — new describe block)

**Happy path:** fresh git-init'd dir, **no** seeded `packmind.json`, no `packmind-lock.json`. Run `skills init`. Assert:
- Process exits 0.
- `packmind.json` now exists at the dir root.
- Its `agents` array matches the fresh-test-org server defaults: `['packmind', 'agents_md']`.
- `packmind-lock.json` was created with `lockfileVersion: 2` (the deployers for `packmind`/`agents_md` produce no `default:skill:*` entries — see sprint discovery #2 — but the lockfile is still emitted by the existing merge logic in this use case).

**Failure path (zero modes):** stays unit-only. Provoking a zero-active-modes response from the real local API in e2e would require fixture work that isn't worth it for a single assertion the unit test already covers cleanly.

## Out of Scope

- Applying the same bootstrap to `install <pkg>` when `packmind.json` is missing. Tracked as a separate follow-up — the existing pre-existing bugs in `InstallUseCase.ts` (per the TODO at `apps/cli/src/application/useCases/InstallUseCase.ts:111`) need addressing first.
- Sharing render-mode-fetch code between `configAgentsHandler.getPreselectedAgents` and the new bootstrap. Two callers, both small; extraction is YAGNI for now.
- Repairing an existing `packmind.json` that lacks an `agents` key. Today `readConfig` returns the parsed object even without `agents`, so the bootstrap condition (`config === null`) is false and we leave it alone. Intentional.
