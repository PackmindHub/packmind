# Coding Agent Package

Renders and deploys Packmind artifacts (standards, commands, skills) into the file layout each
supported AI coding agent expects.

## The deployer registry

`src/infra/repositories/CodingAgentDeployerRegistry.ts` maps a `CodingAgent` value from
`@packmind/types` to a deployer, via a `switch` in its private `createDeployer`. The agent keys are
snake_case strings, not the folder names:

| Key | Folder |
| --- | --- |
| `packmind` | `packmind/` |
| `claude` | `claude/` |
| `claude_plugin` | `claudePlugin/` |
| `cursor` | `cursor/` |
| `copilot` | `copilot/` |
| `agents_md` | `agentsmd/` |
| `gitlab_duo` | `gitlabDuo/` |
| `junie` | `junie/` |
| `continue` | `continue/` |
| `opencode` | `opencode/` |
| `codex` | `codex/` |

Two sibling folders are **not** agents:

- `genericSectionWriter/` — shared writers for agents whose output is a single marked-up file
  (`GenericSectionWriter`, `GenericStandardSectionWriter`, `GenericCommandSectionWriter`,
  `SingleFileDeployer`). Most single-file agents should compose these rather than re-implement
  marker handling.
- `defaultSkillsDeployer/` — deploys the built-in skills (`OnboardDeployer`,
  `UpdatePlaybookDeployer`) on top of `AbstractDefaultSkillDeployer`.

## Adding an agent

Adding the key to `CodingAgent` (`packages/types/src/coding-agent/CodingAgent.ts`) is step one, and
it splits the remaining work into two kinds: places the compiler forces you to update, and places
that fail **silently**.

The compiler catches these — they are total `Record<CodingAgent, …>` maps, so the build breaks until
each has an entry:

- `CodingAgents` — `packages/types/src/coding-agent/CodingAgent.ts`
- `AGENT_CAPABILITIES` — `packages/types/src/coding-agent/AgentCapabilities.ts`
- `AGENT_FILE_PATHS` — `src/domain/AgentConfiguration.ts`, the agent's config-file path
  (`CLAUDE.md`, `.cursor/rules/…`); `DeployerService` reads it to load existing content before
  rendering. Use `''` when the agent has no single config file, as `claude_plugin` does.

These do **not** fail at compile time — miss one and the agent misbehaves at runtime:

- **`canCreateDeployer` in `CodingAgentDeployerRegistry.ts`** — a hand-maintained
  `agent === 'x' || agent === 'y' || …` chain that duplicates `createDeployer`'s switch. Forget it and
  `hasDeployer()` returns `false` for a perfectly registered agent, so callers skip it instead of
  erroring.
- **`createDeployer`'s switch** in the same file — its `default` throws at runtime rather than
  failing the build.
- **`CODING_AGENT_ARTEFACT_PATHS`** — `packages/types/src/coding-agent/CodingAgentArtefactPaths.ts`.
  It is a `Partial<Record<…>>`, so a missing entry compiles fine; needed only for agents that write
  artefacts to their own directories.

Then:

1. Create `src/infra/repositories/<agent>/<Agent>Deployer.ts` implementing `ICodingAgentDeployer`,
   reusing `genericSectionWriter/` where the output is one file.
2. Add `packages/integration-tests/src/coding-agents-deployments/<agent>-deployment.spec.ts` —
   **that** directory, not this package, is where each agent's emitted files are actually asserted.

## Gotcha

Interfaces are split across two similarly named directories: `src/domain/repository/` (singular —
`ICodingAgentDeployer`, `ICodingAgentDeployerRegistry`) and `src/domain/repositories/`
(`ICodingAgentRepositories`). Check both before concluding an interface is missing.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
